'use client';
import React, { useState, useEffect } from 'react';
import type { UserProfile, AdAccount } from '../types';
import { CopyIcon } from '../components/icons';
import { Globe, Code, Share2, Save, Bell, Plus, Trash2, UploadCloud } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../supabaseClient';
import Papa from 'papaparse';

// Funções de Sanitização BR
const parseMoneyBR = (val: any) => {
  if (!val) return 0;
  let str = String(val).trim().replace(/[R$\s]/g, ''); // Remove R$ e espaços
  if (str.includes('.') && str.includes(',')) {
    str = str.replace(/\./g, ''); // Se tem 1.500,00, tira o ponto milhar
    str = str.replace(',', '.'); // Troca a vírgula por ponto decimal
  } else if (str.includes(',')) {
    str = str.replace(',', '.'); // Se tem só 150,50, troca por ponto
  }
  return parseFloat(str) || 0;
};

const parseDateBR = (val: any) => {
    if (!val) return new Date().toISOString();
    let str = String(val).trim();
    if (str.includes('/')) {
        const [datePart, timePart] = str.split(' ');
        const [dia, mes, ano] = datePart.split('/');
        const hora = timePart || '12:00:00'; // Trava no meio do dia para não perder fuso
        // Força o fuso brasileiro (-03:00) para não voltar 1 dia no UTC
        const isoString = new Date(`${ano}-${mes}-${dia}T${hora}-03:00`).toISOString();
        return isoString;
    }
    const fallback = new Date(str);
    return !isNaN(fallback.getTime()) ? fallback.toISOString() : new Date().toISOString();
};

const parseStatusBR = (val: any) => {
    if (!val) return 'pending';
    const s = String(val).toLowerCase();
    if (s.includes('aprov') || s.includes('pag') || s.includes('paid') || s.includes('complet')) return 'paid';
    if (s.includes('reembols') || s.includes('refund') || s.includes('devolv')) return 'refunded';
    return 'pending';
};

// Helper de Busca Fuzzy
const findCol = (row: any, keywords: string[]) => {
  const key = Object.keys(row).find(k => keywords.some(kw => k.toLowerCase().includes(kw)));
  return key ? row[key] : null;
};

interface IntegrationsViewProps {
    profile: UserProfile;
    onProfileUpdate?: (profile: UserProfile) => void;
}

const IntegrationsView: React.FC<IntegrationsViewProps> = ({ profile, onProfileUpdate }) => {
    const webhookUrl = `https://eqkmujupuuohrocgmvdr.supabase.co/functions/v1/webhook?user_id=${profile.id}`;
    const [copyStates, setCopyStates] = useState<Record<string, string>>({
        webhook: 'Copiar',
        utm: 'Copiar',
        script: 'Copiar'
    });

    // Facebook Integration State
    const [fbAccessToken, setFbAccessToken] = useState<string>(profile.fb_access_token || '');
    const [salesSource, setSalesSource] = useState<'facebook' | 'platform'>(profile.sales_source || 'platform');
    const [isSaving, setIsSaving] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Ad Accounts State
    const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
    const [newAccountName, setNewAccountName] = useState('');
    const [newAccountId, setNewAccountId] = useState('');

    const handleDeleteCSV = async () => {
        // 1. Buscar o Último Lote
        const { data: lastBatch, error: fetchError } = await supabase
            .from('sales')
            .select('utm_medium')
            .like('utm_medium', 'csv_%')
            .order('created_at', { ascending: false })
            .limit(1);

        if (fetchError) {
            console.error('Erro ao buscar última importação:', fetchError);
            alert('Erro ao buscar histórico de importações.');
            return;
        }

        if (!lastBatch || lastBatch.length === 0) {
            alert('Nenhuma importação recente encontrada para desfazer.');
            return;
        }

        const batchToDelete = lastBatch[0].utm_medium;
        
        // 2. Validar e Excluir
        const confirmacao = window.confirm('Tem certeza? Isso apagará APENAS a sua última importação de planilha. As importações anteriores e vendas de Webhook ficarão intactas.');

        if (confirmacao) {
            const { error } = await supabase
                .from('sales')
                .delete()
                .eq('utm_medium', batchToDelete);

            if (!error) {
                alert('Última importação desfeita com sucesso!');
                window.location.reload();
            } else {
                console.error(error);
                alert('Erro ao desfazer: ' + error.message);
            }
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const toastId = toast.loading('Processando arquivo...');
        
        // Batch ID para identificar esta importação específica
        const batchId = 'csv_' + Date.now();

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false,
            complete: async (results) => {
                try {
                    const salesToInsert: any[] = [];
                    const rows = results.data as any[];

                    console.log('CSV Headers:', results.meta.fields);

                    for (const row of rows) {
                        // Mapeamento Universal com Busca Fuzzy
                        const rawDate = findCol(row, ['data', 'date', 'cria', 'atualiza']); 
                        const rawEmail = findCol(row, ['e-mail', 'email', 'comprador']);
                        const rawName = findCol(row, ['nome', 'cliente']);
                        const rawProduct = findCol(row, ['oferta', 'produto', 'nome do produto']);
                        const rawStatus = findCol(row, ['status', 'pagamento', 'situação']);
                        const trackingSrc = findCol(row, ['src', 'origem', 'tracking']);
                        
                        const amountRaw = findCol(row, ['comissão', 'valor', 'líquido', 'amount', 'price', 'receita', 'commission']);

                        // Captura de UTMs
                        const utmSourceRaw = findCol(row, ['utm_source', 'origem']);
                        const utmMediumRaw = findCol(row, ['utm_medium', 'meio']);
                        const utmCampaignRaw = findCol(row, ['utm_campaign', 'campanha']);
                        const utmContentRaw = findCol(row, ['utm_content', 'conteudo']);
                        const utmTermRaw = findCol(row, ['utm_term', 'termo']);

                        if (!amountRaw && !rawProduct) continue; // Skip empty rows

                        const amount = parseMoneyBR(amountRaw);
                        if (amount === 0 && !amountRaw) continue; // Skip if no amount found

                        const status = parseStatusBR(rawStatus);
                        const created_at = parseDateBR(rawDate);

                        salesToInsert.push({
                            user_id: profile.id,
                            amount: amount,
                            status: status,
                            product_name: rawProduct || 'Produto Importado',
                            created_at: created_at,
                            customer_email: rawEmail,
                            customer_name: rawName || 'Cliente',
                            platform: 'CSV Import',
                            
                            // UTM Mapping
                            utm_source: utmSourceRaw || trackingSrc || 'importacao_csv',
                            utm_medium: batchId, // Batch ID como âncora
                            utm_campaign: utmCampaignRaw,
                            utm_content: utmContentRaw,
                            utm_term: utmTermRaw,
                        });
                    }

                    if (salesToInsert.length === 0) {
                        toast.error('Nenhuma venda válida encontrada no CSV.', { id: toastId });
                        setIsImporting(false);
                        return;
                    }

                    // Bulk Insert
                    const { error } = await supabase.from('sales').insert(salesToInsert);

                    if (error) throw error;

                    toast.success(`${salesToInsert.length} vendas importadas com sucesso!`, { id: toastId });
                    
                    // Reset input
                    event.target.value = '';

                } catch (error: any) {
                    console.error('Erro na importação:', error);
                    toast.error(`Erro ao importar: ${error.message}`, { id: toastId });
                } finally {
                    setIsImporting(false);
                }
            },
            error: (err) => {
                console.error('Erro no parse:', err);
                toast.error('Erro ao ler o arquivo CSV.', { id: toastId });
                setIsImporting(false);
            }
        });
    };

    useEffect(() => {
        if (profile.ad_account_ids) {
            let parsed: AdAccount[] = [];
            const raw = profile.ad_account_ids;

            if (Array.isArray(raw)) {
                if (raw.length === 0) {
                    parsed = [];
                } else {
                    const firstItem = raw[0];
                    if (typeof firstItem === 'object' && firstItem !== null) {
                        parsed = raw as AdAccount[];
                    } else if (typeof firstItem === 'string') {
                        // Check if it's a stringified JSON object
                        if (firstItem.trim().startsWith('{')) {
                            try {
                                parsed = raw.map((item: any) => {
                                    const p = typeof item === 'string' ? JSON.parse(item) : item;
                                    return { id: p.id, name: p.name };
                                });
                            } catch {
                                // Fallback
                            }
                        }
                        
                        if (parsed.length === 0) {
                            // Legacy array of strings
                            parsed = (raw as string[]).map(id => ({ id, name: `Conta ${id}` }));
                        }
                    }
                }
            } else if (typeof raw === 'string') {
                try {
                    const json = JSON.parse(raw);
                    if (Array.isArray(json)) {
                         if (json.length > 0 && typeof json[0] === 'object') {
                            parsed = json as AdAccount[];
                        } else {
                            parsed = (json as string[]).map(id => ({ id, name: `Conta ${id}` }));
                        }
                    }
                } catch {
                    // Fallback for comma-separated string
                    if (raw.includes(',')) {
                        parsed = raw.split(',').map(s => s.trim()).filter(Boolean).map(id => ({ id, name: `Conta ${id}` }));
                    } else if (raw.trim()) {
                        parsed = [{ id: raw.trim(), name: `Conta ${raw.trim()}` }];
                    }
                }
            }
            if (JSON.stringify(parsed) !== JSON.stringify(adAccounts)) {
                setTimeout(() => setAdAccounts(parsed), 0);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile.ad_account_ids]);

    const handleCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopyStates(prev => ({ ...prev, [key]: 'Copiado!' }));
            toast.success('Copiado para a área de transferência!');
            setTimeout(() => setCopyStates(prev => ({ ...prev, [key]: 'Copiar' })), 2500);
        }, (err) => {
            console.error('Falha ao copiar: ', err);
            toast.error('Erro ao copiar');
        });
    };

    const handleAddAccount = () => {
        if (!newAccountName || !newAccountId) {
            toast.error('Preencha o nome e o ID da conta');
            return;
        }

        let formattedId = newAccountId.trim();
        // Ensure 'act_' prefix
        if (!formattedId.startsWith('act_')) {
            // Remove any non-numeric characters just in case, then add prefix
            const numbers = formattedId.replace(/\D/g, '');
            formattedId = `act_${numbers}`;
        }

        if (adAccounts.some(acc => acc.id === formattedId)) {
            toast.error('Esta conta já foi adicionada.');
            return;
        }

        const newAccount: AdAccount = {
            name: newAccountName,
            id: formattedId
        };

        setAdAccounts([...adAccounts, newAccount]);
        setNewAccountName('');
        setNewAccountId('');
        toast.success('Conta adicionada à lista (não esqueça de Salvar)');
    };

    const handleRemoveAccount = (index: number) => {
        const newAccounts = [...adAccounts];
        newAccounts.splice(index, 1);
        setAdAccounts(newAccounts);
    };

    const handleSaveFb = async () => {
        setIsSaving(true);

        // Try sending the array of objects directly.
        // If the column is jsonb, this works.
        // If the column is text[], this might fail if Supabase doesn't cast.
        // If it fails, we will see the error message.
        
        const { data: updatedProfile, error } = await supabase
            .from('profiles')
            .update({
                fb_access_token: fbAccessToken,
                ad_account_ids: adAccounts as any, 
                sales_source: salesSource
            })
            .eq('id', profile.id)
            .select()
            .single();
        
        setIsSaving(false);

        if (error) {
            console.error('Error saving settings:', error);
            toast.error(`Erro ao salvar: ${error.message || error.details || 'Verifique o console'}`);
        } else {
            if (onProfileUpdate) onProfileUpdate(updatedProfile);
            toast.success('Integração salva com sucesso!');
        }
    };

    const handleActivateNotifications = () => {
        const OneSignalDeferred = (window as any).OneSignalDeferred;
        
        if (OneSignalDeferred) {
            OneSignalDeferred.push(async function(OneSignal: any) {
                try {
                    await OneSignal.Slidedown.promptPush();
                } catch (e) {
                    console.error("OneSignal Prompt Error:", e);
                    toast.error("Erro ao solicitar permissão de notificação.");
                }
            });
        } else {
            // Fallback for older implementations or if script failed
            const OneSignal = (window as any).OneSignal;
            if (OneSignal && OneSignal.showSlidedownPrompt) {
                 OneSignal.push(function() {
                    OneSignal.showSlidedownPrompt();
                });
            } else {
                toast.error('Sistema de notificações não carregado. Tente recarregar a página.');
            }
        }
    };

    const utmParams = `?utm_source=fb&utm_campaign={{campaign.name}}&utm_medium={{adset.name}}&utm_content={{ad.name}}`;
    
    const trackingScript = `<script>
console.log('%cScaleMetrics Rastreio Híbrido V5 - Ativo', 'color: #00ff00; font-size: 14px;');
(function () {
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    const urlParams = new URLSearchParams(window.location.search);
    let utmData = {};
    let isNewClick = false;

    // 1. Funções Base (Cookies e URL)
    const setCookie = (name, value, days) => {
        let expires = "";
        if (days) {
            let date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/";
    };

    const getCookie = (name) => {
        let nameEQ = name + "=";
        let ca = document.cookie.split(';');
        for(let i=0;i < ca.length;i++) {
            let c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1,c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
        }
        return null;
    };

    // 2. Captura UTMs da URL (Prioridade Máxima)
    utmKeys.forEach(param => {
        if (urlParams.has(param)) {
            utmData[param] = urlParams.get(param);
            isNewClick = true;
            localStorage.setItem('sm_' + param, utmData[param]);
            setCookie('sm_' + param, utmData[param], 30);
        } else {
            // Tenta Cookie primeiro, depois LocalStorage
            let stored = getCookie('sm_' + param) || localStorage.getItem('sm_' + param);
            if (stored) utmData[param] = stored;
        }
    });

    // 3. Rastreio Orgânico Inteligente (Se não tem UTM ativa)
    if (!isNewClick && !utmData['utm_source']) {
        let referrer = document.referrer.toLowerCase();
        if (referrer.includes('instagram.com')) {
            utmData['utm_source'] = 'instagram'; utmData['utm_medium'] = 'organic'; utmData['utm_campaign'] = 'link_na_bio';
        } else if (referrer.includes('youtube.com')) {
            utmData['utm_source'] = 'youtube'; utmData['utm_medium'] = 'organic'; utmData['utm_campaign'] = 'canal';
        } else if (referrer.includes('tiktok.com')) {
             utmData['utm_source'] = 'tiktok'; utmData['utm_medium'] = 'organic'; utmData['utm_campaign'] = 'perfil';
        } else {
            utmData['utm_source'] = referrer ? new URL(document.referrer).hostname : 'direto';
            utmData['utm_medium'] = 'organic'; utmData['utm_campaign'] = 'none';
        }
        localStorage.setItem('sm_utm_source', utmData['utm_source']);
        setCookie('sm_utm_source', utmData['utm_source'], 30);
    }

    // 4. Injeção Agressiva em Checkout
    const injectUtms = (urlStr) => {
        try {
            let checkoutUrl = new URL(urlStr);
            // Verifica se tem SCK (Para Hotmart/Kiwify nativo)
            let scks = Object.values(utmData).filter(v => v !== "");
            if(scks.length > 0 && !checkoutUrl.searchParams.has('sck')) {
                checkoutUrl.searchParams.set('sck', scks.join('|'));
            }
            // Injeta UTMs cruas
            Object.keys(utmData).forEach(key => {
                if (utmData[key] && !checkoutUrl.searchParams.has(key)) {
                    checkoutUrl.searchParams.set(key, utmData[key]);
                }
            });
            return checkoutUrl.toString();
        } catch(e) { return urlStr; }
    };

    // Aplica nos links existentes (DOM Pronto)
    document.addEventListener("DOMContentLoaded", function() {
        const links = document.querySelectorAll('a[href*="pay."], a[href*="kiwify"], a[href*="wiapy"], a[href*="hotmart"], a[href*="eduzz"], a[href*="monetizze"]');
        links.forEach(link => { link.href = injectUtms(link.href); });
    });

    // Intercepta Iframes de Checkout Transparente
    document.querySelectorAll('iframe').forEach(iframe => {
        if(iframe.src.includes('pay.') || iframe.src.includes('checkout')) {
           iframe.src = injectUtms(iframe.src);
        }
    });
})();
</script>`;

    return (
        <div className="animate-fade-in max-w-4xl mx-auto space-y-8 pb-12">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-brand-text">Integrações & Rastreamento</h2>
                <p className="text-brand-text-secondary mt-1">Configure o recebimento de dados e o rastreamento de First-Party Data.</p>
            </div>

            {/* CSV Import Section */}
            <div className="bg-brand-secondary rounded-lg shadow-lg overflow-hidden border border-green-900/30">
                <div className="p-6 border-b border-gray-700">
                    <div className="flex items-center space-x-4">
                        <div className="p-2 bg-green-600/20 rounded-lg">
                            <UploadCloud className="w-6 h-6 text-green-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-brand-text">Importador de Histórico (CSV)</h3>
                            <p className="text-sm text-brand-text-secondary">Importe seu histórico de vendas de plataformas como Hotmart, Kiwify, Eduzz, etc.</p>
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-gray-900/30 space-y-4">
                    <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-md mb-4">
                        <p className="text-sm text-blue-200">
                            <strong>Dica:</strong> Para uma importação perfeita, limpe sua planilha antes de subir. Deixe apenas <strong>UMA</strong> coluna de Data (a data real da venda), além das colunas de Produto, Valor, Status, Email/Nome e Trackings (UTM/SRC).
                        </p>
                    </div>
                    <p className="text-sm text-brand-text-secondary">
                        Selecione um arquivo CSV contendo colunas como <strong>Data</strong>, <strong>Produto</strong>, <strong>Status</strong> e <strong>Valor</strong>.
                    </p>
                    <div className="flex items-center gap-4">
                        <label className={`flex items-center justify-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm rounded-md transition-colors cursor-pointer shadow-lg shadow-green-500/20 ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <UploadCloud className="w-4 h-4 mr-2" />
                            <span>{isImporting ? 'Processando...' : 'Fazer Upload de Planilha'}</span>
                            <input 
                                type="file" 
                                accept=".csv" 
                                onChange={handleFileUpload} 
                                disabled={isImporting}
                                className="hidden" 
                            />
                        </label>
                        
                        <button 
                            type="button" 
                            onClick={handleDeleteCSV} 
                            className="relative z-50 pointer-events-auto cursor-pointer flex items-center gap-2 px-4 py-2 border border-red-500 text-red-500 rounded-md hover:bg-red-500 hover:text-white transition-colors"
                        >
                            Desfazer Última Importação
                        </button>
                    </div>
                </div>
            </div>

            {/* Facebook API Integration */}
            <div className="bg-brand-secondary rounded-lg shadow-lg overflow-hidden border border-blue-900/30">
                <div className="p-6 border-b border-gray-700">
                    <div className="flex items-center space-x-4">
                        <div className="p-2 bg-blue-600/20 rounded-lg">
                            <Share2 className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-brand-text">Conexão Facebook API</h3>
                            <p className="text-sm text-brand-text-secondary">Conecte sua conta de anúncios para importar dados de custos e impressões.</p>
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-gray-900/30 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-brand-text-secondary mb-1">
                            Origem das Vendas (Fonte da Verdade)
                        </label>
                        <div className="flex items-center gap-4 mt-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="salesSource" 
                                    value="facebook"
                                    checked={salesSource === 'facebook'}
                                    onChange={() => setSalesSource('facebook')}
                                    className="text-brand-accent focus:ring-brand-accent"
                                />
                                <span className={salesSource === 'facebook' ? 'text-brand-text' : 'text-brand-text-secondary'}>
                                    Facebook API (Pixel)
                                </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="salesSource" 
                                    value="platform"
                                    checked={salesSource === 'platform'}
                                    onChange={() => setSalesSource('platform')}
                                    className="text-brand-accent focus:ring-brand-accent"
                                />
                                <span className={salesSource === 'platform' ? 'text-brand-text' : 'text-brand-text-secondary'}>
                                    Plataforma / Webhook
                                </span>
                            </label>
                        </div>
                        <p className="text-xs text-brand-text-secondary/70 mt-2">
                            <strong>Facebook:</strong> Usa 'Purchases' e 'Purchase Value' do Pixel.<br/>
                            <strong>Plataforma:</strong> Usa vendas aprovadas do Webhook (Supabase) + Custos do Facebook.
                        </p>
                    </div>

                    <div>
                        <label htmlFor="fb-token" className="block text-sm font-medium text-brand-text-secondary">
                            Token de Acesso (Facebook Graph API)
                        </label>
                        <input
                            id="fb-token"
                            type="password"
                            value={fbAccessToken}
                            onChange={(e) => setFbAccessToken(e.target.value)}
                            className="w-full mt-1 p-2 bg-gray-800 border border-gray-700 text-brand-text rounded-md shadow-sm focus:ring-brand-accent focus:border-brand-accent focus:outline-none"
                            placeholder="EAAG..."
                        />
                    </div>

                    {/* Ad Accounts Manager */}
                    <div>
                        <label className="block text-sm font-medium text-brand-text-secondary mb-2">
                            Gerenciador de Contas de Anúncios
                        </label>
                        
                        <div className="bg-gray-800 p-4 rounded-md border border-gray-700 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-brand-text-secondary mb-1">Nome da Conta</label>
                                    <input
                                        type="text"
                                        value={newAccountName}
                                        onChange={(e) => setNewAccountName(e.target.value)}
                                        className="w-full p-2 bg-gray-900 border border-gray-600 text-brand-text rounded-md focus:ring-brand-accent focus:border-brand-accent focus:outline-none text-sm"
                                        placeholder="Ex: Conta 01"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-brand-text-secondary mb-1">ID da Conta (apenas números)</label>
                                    <input
                                        type="text"
                                        value={newAccountId}
                                        onChange={(e) => setNewAccountId(e.target.value)}
                                        className="w-full p-2 bg-gray-900 border border-gray-600 text-brand-text rounded-md focus:ring-brand-accent focus:border-brand-accent focus:outline-none text-sm"
                                        placeholder="Ex: 123456789"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleAddAccount}
                                className="flex items-center space-x-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded-md transition-colors"
                            >
                                <Plus className="w-3 h-3" />
                                <span>Adicionar Conta</span>
                            </button>
                        </div>

                        {/* List of Accounts */}
                        {adAccounts.length > 0 && (
                            <div className="mt-4 space-y-2">
                                {adAccounts.map((account, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-800/50 border border-gray-700 rounded-md">
                                        <div>
                                            <p className="text-sm font-medium text-brand-text">{account.name}</p>
                                            <p className="text-xs text-brand-text-secondary font-mono">{account.id}</p>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveAccount(index)}
                                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-md transition-colors"
                                            title="Remover conta"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleSaveFb}
                            disabled={isSaving}
                            className="flex items-center space-x-2 px-6 py-2 bg-brand-accent hover:bg-blue-700 text-white font-semibold text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save className="w-4 h-4" />
                            <span>{isSaving ? 'Salvando...' : 'Salvar Conexão'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Sales Notifications (Push) */}
            <div className="bg-brand-secondary rounded-lg shadow-lg overflow-hidden border border-purple-900/30">
                <div className="p-6 border-b border-gray-700">
                    <div className="flex items-center space-x-4">
                        <div className="p-2 bg-purple-600/20 rounded-lg">
                            <Bell className="w-6 h-6 text-purple-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-brand-text">Notificações de Venda (Push)</h3>
                            <p className="text-sm text-brand-text-secondary">Receba alertas em tempo real a cada nova venda.</p>
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-gray-900/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-brand-text-secondary">
                        Ative as notificações para receber o som de "Ca-ching!" e um alerta visual sempre que uma venda for processada.
                    </p>
                    <button
                        onClick={handleActivateNotifications}
                        className="flex-shrink-0 flex items-center space-x-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm rounded-md transition-colors shadow-lg shadow-purple-500/20"
                    >
                        <Bell className="w-4 h-4" />
                        <span>Ativar Notificações</span>
                    </button>
                </div>
            </div>

            {/* Webhook Universal */}
            <div className="bg-brand-secondary rounded-lg shadow-lg overflow-hidden">
                <div className="p-6 border-b border-gray-700">
                    <div className="flex items-center space-x-4">
                        <div className="p-2 bg-brand-accent/10 rounded-lg">
                            <Globe className="w-6 h-6 text-brand-accent" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-brand-text">Webhook Universal</h3>
                            <p className="text-sm text-brand-text-secondary">Conecte qualquer plataforma de vendas (Kiwify, Hotmart, Eduzz, Braip, etc.).</p>
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-gray-900/30">
                    <p className="text-sm text-brand-text-secondary mb-4">
                        Nosso sistema padroniza os dados automaticamente através desta URL. Configure-a na sua plataforma de vendas para enviar eventos de compra.
                    </p>
                    <div className="flex items-stretch">
                        <input
                            type="text"
                            value={webhookUrl}
                            readOnly
                            className="w-full p-2 bg-gray-800 border border-gray-700 text-brand-text-secondary rounded-l-md focus:outline-none text-sm"
                        />
                        <button
                            onClick={() => handleCopy(webhookUrl, 'webhook')}
                            className="flex items-center space-x-2 px-4 py-2 bg-brand-accent hover:bg-blue-700 text-white font-semibold text-sm rounded-r-md transition-colors"
                        >
                            <CopyIcon className="w-4 h-4" />
                            <span>{copyStates.webhook}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Facebook Ads Parameters */}
            <div className="bg-brand-secondary rounded-lg shadow-lg overflow-hidden">
                <div className="p-6 border-b border-gray-700">
                    <div className="flex items-center space-x-4">
                        <div className="p-2 bg-blue-600/10 rounded-lg">
                            <Code className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-brand-text">Parâmetros de URL (Facebook Ads)</h3>
                            <p className="text-sm text-brand-text-secondary">Atribuição exata de Campanhas e Criativos.</p>
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-gray-900/30">
                    <p className="text-sm text-brand-text-secondary mb-4">
                        Cole o código abaixo no campo <strong>"Parâmetros de URL"</strong> no nível de Anúncio dentro do Gerenciador de Anúncios do Facebook.
                    </p>
                    <div className="flex items-stretch">
                        <code className="w-full p-2 bg-gray-800 border border-gray-700 text-brand-accent rounded-l-md text-xs flex items-center overflow-x-auto whitespace-nowrap">
                            {utmParams}
                        </code>
                        <button
                            onClick={() => handleCopy(utmParams, 'utm')}
                            className="flex items-center space-x-2 px-4 py-2 bg-brand-accent hover:bg-blue-700 text-white font-semibold text-sm rounded-r-md transition-colors"
                        >
                            <CopyIcon className="w-4 h-4" />
                            <span>{copyStates.utm}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Tracking Script */}
            <div className="bg-brand-secondary rounded-lg shadow-lg overflow-hidden">
                <div className="p-6 border-b border-gray-700">
                    <div className="flex items-center space-x-4">
                        <div className="p-2 bg-emerald-600/10 rounded-lg">
                            <Code className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-brand-text">Script de Rastreamento de Página</h3>
                            <p className="text-sm text-brand-text-secondary">Capture UTMs e salve a origem do cliente.</p>
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-gray-900/30">
                    <p className="text-sm text-brand-text-secondary mb-4">
                        Cole este código dentro da tag <code>&lt;head&gt;</code> da sua página de vendas. Ele salvará a origem do cliente nos Cookies e enviará as UTMs para o checkout.
                    </p>
                    <div className="relative group">
                        <pre className="p-4 bg-gray-800 border border-gray-700 rounded-md text-xs text-brand-text-secondary overflow-x-auto max-h-60">
                            <code>{trackingScript}</code>
                        </pre>
                        <button
                            onClick={() => handleCopy(trackingScript, 'script')}
                            className="absolute top-2 right-2 flex items-center space-x-2 px-3 py-1.5 bg-brand-accent hover:bg-blue-700 text-white font-semibold text-xs rounded-md transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <CopyIcon className="w-3 h-3" />
                            <span>{copyStates.script}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IntegrationsView;
