import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { ClipboardCopyIcon, CheckIcon } from '../components/icons';
import type { UserProfile } from '../types';

interface SetupGuideViewProps {
    profile: UserProfile | null;
}

const CodeBlock: React.FC<{ code: string }> = ({ code }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            toast.success('Código copiado!');
            setTimeout(() => setCopied(false), 2000);
        }, () => {
            toast.error('Falha ao copiar o código.');
        });
    };

    return (
        <div className="relative">
            <pre className="overflow-x-auto max-w-full text-sm p-4 bg-gray-800 rounded-lg text-white/80 custom-scrollbar">
                <code>{code}</code>
            </pre>
            <button 
                onClick={handleCopy}
                className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white transition-colors"
            >
                {copied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <ClipboardCopyIcon className="w-4 h-4" />}
            </button>
        </div>
    );
};

const SetupGuideView: React.FC<SetupGuideViewProps> = ({ profile }) => {
    const webhookUrl = `https://eqkmujupuuohrocgmvdr.supabase.co/functions/v1/webhook?user_id=${profile?.id}`;

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in space-y-10">
            <div>
                <h1 className="text-3xl font-bold text-brand-text mb-2">Guia de Setup Rápido</h1>
                <p className="text-brand-text-secondary">Siga estes passos para configurar completamente seu dashboard.</p>
            </div>
            
            {/* Seção 1: Boas-Vindas e Visão Geral */}
            <div className="bg-brand-secondary border border-gray-700 rounded-xl shadow-lg overflow-hidden">
                <div className="p-6">
                    <h2 className="text-xl font-bold text-brand-text mb-3">Módulo 1: Boas-Vindas e Visão Geral</h2>
                    <p className="text-brand-text-secondary mb-6">
                        Bem-vindo ao seu novo painel de controle! Assista a este vídeo para entender como o ScaleMetrics funciona e como analisar suas métricas com precisão.
                    </p>
                    <iframe 
                        src="https://www.youtube.com/embed/mVeOujOWZjU" 
                        title="YouTube video player" 
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen 
                        className="w-full aspect-video rounded-lg shadow-md"
                    ></iframe>
                </div>
            </div>

            {/* Seção 2: Integração Facebook Ads (API) */}
            <div className="bg-brand-secondary border border-gray-700 rounded-xl shadow-lg overflow-hidden">
                <div className="p-6">
                    <h2 className="text-xl font-bold text-brand-text mb-4">Como conectar o Facebook Ads em Tempo Real</h2>
                    <div className="space-y-4 text-brand-text-secondary">
                        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                            <h3 className="font-semibold text-brand-text mb-1">Passo 1: Criar o App no Facebook</h3>
                            <p className="text-sm">Acesse developers.facebook.com, clique em 'Meus Aplicativos' &gt; 'Criar Aplicativo' &gt; 'Outro' &gt; 'Empresa'. Dê um nome, vincule à sua BM (Business Manager) e crie.</p>
                        </div>
                        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                            <h3 className="font-semibold text-brand-text mb-1">Passo 2: Criar Usuário de Sistema</h3>
                            <p className="text-sm">Acesse a BM (business.facebook.com/settings). Vá em Usuários &gt; Usuários do Sistema. Adicione um usuário com função de 'Administrador do sistema'.</p>
                        </div>
                        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                            <h3 className="font-semibold text-brand-text mb-1">Passo 3: Atribuir a Conta de Anúncios</h3>
                            <p className="text-sm">Com o usuário selecionado, clique em 'Atribuir ativos' &gt; 'Contas de Anúncios', selecione a sua conta e dê 'Controle Total' (ou Ver Desempenho).</p>
                        </div>
                        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                            <h3 className="font-semibold text-brand-text mb-1">Passo 4: Gerar o Token Eterno</h3>
                            <p className="text-sm">Clique em 'Gerar novo token'. Selecione o aplicativo criado no Passo 1. Marque as permissões <code>ads_read</code> e <code>read_insights</code>. Gere o token e copie o código gigante.</p>
                        </div>
                        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                            <h3 className="font-semibold text-brand-text mb-1">Passo 5: Conectar no Dashboard</h3>
                            <p className="text-sm">Vá no menu da sua BM em 'Contas de Anúncios', copie o ID da sua conta. Volte no ScaleMetrics, vá na aba 'Integrações' e cole o seu Token e o ID da Conta.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Seção 3: Aula de Integrações (Webhook e Rastreio) */}
            <div className="bg-brand-secondary border border-gray-700 rounded-xl shadow-lg overflow-hidden">
                <div className="p-6">
                    <h2 className="text-xl font-bold text-brand-text mb-3">Módulo 2: Integração da Plataforma e Rastreio Ninja</h2>
                    <p className="text-brand-text-secondary mb-6">
                        Aprenda a conectar as suas vendas e a instalar o nosso código de rastreamento para marcar 100% das conversões.
                    </p>
                    <iframe 
                        src="https://www.youtube.com/embed/4oaPODhnIyI" 
                        title="YouTube video player" 
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen 
                        className="w-full aspect-video rounded-lg shadow-md"
                    ></iframe>
                </div>
            </div>

            {/* Seção 4: Códigos e Links (Apoio da Aula 2) */}
            <div className="space-y-6">
                <div className="bg-brand-secondary border border-gray-700 rounded-xl shadow-lg overflow-hidden">
                    <div className="p-6">
                        <h2 className="text-xl font-bold text-brand-text mb-3">Bloco 1: Seu Webhook Exclusivo</h2>
                        <p className="text-brand-text-secondary mb-4">Cadastre o seu Webhook Exclusivo na sua plataforma de vendas (Kiwify, Hotmart, Wiapy, etc).</p>
                        <CodeBlock code={webhookUrl} />
                    </div>
                </div>

                <div className="bg-brand-secondary border border-gray-700 rounded-xl shadow-lg overflow-hidden">
                    <div className="p-6">
                        <h2 className="text-xl font-bold text-brand-text mb-3">Bloco 2: Código da Página de Vendas (Rastreio de UTM)</h2>
                        <p className="text-brand-text-secondary mb-4">Para que as UTMs não se percam quando o cliente clica no botão de comprar, cole este script na sua página de vendas (antes do fechamento da tag <code>&lt;/body&gt;</code>). Ele repassa as UTMs para o checkout e rastreia tráfego orgânico.</p>
                        <CodeBlock code={`<script>
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
</script>`} />
                    </div>
                </div>

                <div className="bg-brand-secondary border border-gray-700 rounded-xl shadow-lg overflow-hidden">
                    <div className="p-6">
                        <h2 className="text-xl font-bold text-brand-text mb-3">Bloco 3: Parametrização (UTMs do Facebook Ads)</h2>
                        <p className="text-brand-text-secondary mb-4">Cole o código abaixo no campo de Parâmetros de URL de todos os seus anúncios ativos no Facebook.</p>
                        <CodeBlock code={`utm_source={{site_source_name}}&utm_medium={{placement}}&utm_campaign={{campaign.name}}|{{campaign.id}}&utm_content={{ad.name}}|{{ad.id}}&utm_term={{adset.name}}`} />
                    </div>
                </div>
            </div>

            {/* Seção 5: Suporte */}
            <div className="bg-brand-secondary border border-gray-700 rounded-xl shadow-lg overflow-hidden">
                <div className="p-8 text-center">
                    <h2 className="text-xl font-bold text-brand-text mb-3">Travou em alguma etapa ou precisa de ajuda com a configuração?</h2>
                    <p className="text-brand-text-secondary mb-6">Nossa equipe está pronta para te ajudar a deixar tudo funcionando perfeitamente.</p>
                    <a 
                        href="https://wa.me/5587981738625?text=Olá,%20preciso%20de%20ajuda%20para%20configurar%20o%20ScaleMetrics" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-6 py-3 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold rounded-lg shadow-lg shadow-[#25D366]/20 transition-all transform active:scale-95"
                    >
                        Chamar Suporte no WhatsApp
                    </a>
                </div>
            </div>

        </div>
    );
};

export default SetupGuideView;
