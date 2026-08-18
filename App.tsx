import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import Navigation from './components/Navigation';
import { FunnelIcon } from './components/icons';
import MacroView from './views/MacroView';
import TrafficView from './views/TrafficView';
import FunnelView from './views/FunnelView';
import SimulatorView from './views/SimulatorView';
import SettingsView from './views/SettingsView';
import IntegrationsView from './views/IntegrationsView';
import SetupGuideView from './views/SetupGuideView';
import ManualSaleModal from './components/ManualSaleModal';
import { processApiData } from './data/dataProcessor';
import type { DashboardData, FilterState, UserProfile, AdAccount } from './types';
import { supabase } from './supabaseClient';
import type { Session } from '@supabase/supabase-js';
import Login from './components/Login';
import SignUp from './components/SignUp';
import { Toaster, toast } from 'react-hot-toast';
import { DashboardSkeleton } from './components/Skeleton';
import { fetchFacebookInsights } from './services/facebookApi';

const Dashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const [filter, setFilter] = useState<FilterState>({ period: 'today' });
    const [activeTab, setActiveTab] = useState('macro');
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [processing, setProcessing] = useState<boolean>(false);
    const [profileLoading, setProfileLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
    const [isManualSaleModalOpen, setIsManualSaleModalOpen] = useState(false);
    const [salesData, setSalesData] = useState<any[]>([]);
    const [rawApiResponse, setRawApiResponse] = useState<any>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const parsedAdAccounts = React.useMemo<AdAccount[]>(() => {
        if (!profile?.ad_account_ids) return [];
        
        const ensureActPrefix = (id: string) => id.startsWith('act_') ? id : `act_${id}`;

        try {
            if (typeof profile.ad_account_ids === 'string') {
                const trimmed = profile.ad_account_ids.trim();
                 if (trimmed.startsWith('[')) {
                    const accounts = JSON.parse(trimmed) as AdAccount[];
                    return accounts.map(a => ({ ...a, id: ensureActPrefix(a.id) }));
                } else {
                    return trimmed.split(',').map(id => {
                        const cleanId = id.trim();
                        return {
                            id: ensureActPrefix(cleanId),
                            name: `Conta ${cleanId}`
                        };
                    });
                }
            } else if (Array.isArray(profile.ad_account_ids)) {
                 if (profile.ad_account_ids.length === 0) return [];
                 
                 const firstItem = profile.ad_account_ids[0];

                 if (typeof firstItem === 'object' && firstItem !== null) {
                    const accounts = profile.ad_account_ids as AdAccount[];
                    return accounts.map(a => ({ ...a, id: ensureActPrefix(a.id) }));
                 } else if (typeof firstItem === 'string') {
                    // Check if it's a stringified JSON object (Postgres text[] behavior)
                    if (firstItem.trim().startsWith('{')) {
                        try {
                            return profile.ad_account_ids.map((item: any) => {
                                const parsed = typeof item === 'string' ? JSON.parse(item) : item;
                                return {
                                    id: ensureActPrefix(parsed.id),
                                    name: parsed.name
                                };
                            });
                        } catch {
                            // Fallback to treating as ID string
                        }
                    }

                    return (profile.ad_account_ids as string[]).map(id => ({
                        id: ensureActPrefix(id),
                        name: `Conta ${id}`
                    }));
                 }
            }
            return [];
        } catch (e) {
            console.error("Error parsing ad accounts", e);
            return [];
        }
    }, [profile?.ad_account_ids]);

    useEffect(() => {
        const fetchUserProfile = async () => {
            setProfileLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // OneSignal Login
                const OneSignalDeferred = (window as any).OneSignalDeferred;
                if (OneSignalDeferred) {
                    OneSignalDeferred.push(function(OneSignal: any) {
                        OneSignal.login(user.id);
                    });
                }

                const { data, error: fetchError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (fetchError && fetchError.code === 'PGRST116') {
                    console.log('No profile found, creating a default one.');
                    const defaultProfile = {
                        id: user.id,
                        meta_tax: 12, // Default tax
                        spreadsheet_url: null
                    };
                    const { data: newProfile, error: insertError } = await supabase
                        .from('profiles')
                        .insert(defaultProfile)
                        .select()
                        .single();
                    
                    if (insertError) {
                        setError('Falha ao criar perfil de usuário.');
                        console.error('Error creating profile:', insertError);
                    } else {
                        setProfile(newProfile);
                    }
                } else if (fetchError) {
                    setError('Falha ao buscar perfil de usuário.');
                    console.error('Error fetching profile:', fetchError);
                } else {
                    setProfile(data);
                }
            }
            setProfileLoading(false);
        };

        fetchUserProfile();

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const handleDeleteSale = async (saleId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("Erro: Usuário não autenticado.");
                return;
            }

            const { error } = await supabase
                .from('sales')
                .delete()
                .eq('id', saleId)
                .eq('user_id', user.id);

            if (error) throw error;

            toast.success('Venda excluída com sucesso!');
            
            // Update local state to reflect deletion immediately
            setSalesData(prev => prev.filter(sale => sale.id !== saleId));
            
            // Re-fetch data to update charts and KPIs
            fetchData();
        } catch (error: any) {
            console.error('Erro ao excluir venda:', error);
            toast.error(`Erro ao excluir: ${error.message || 'Consulte o console'}`);
        }
    };

    const fetchData = useCallback(async () => {
        if (!profile) {
            setData(null);
            setLoading(false);
            return;
        }

        // Check if we have FB config
        const hasFbConfig = profile.fb_access_token && parsedAdAccounts.length > 0;

        if (!hasFbConfig) {
             setData(null);
             setLoading(false);
             return;
        }

        // Abort previous request if it exists
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setLoading(true);
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error("Usuário não autenticado.");
            }

            // Fetch sales data from Supabase (always needed for platform source or hybrid)
            const { data: supabaseSales, error: salesError } = await supabase
                .from('sales')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (salesError) {
                throw new Error('Falha ao buscar vendas do Supabase: ' + salesError.message);
            }
            setSalesData(supabaseSales || []);

            let rawData;
            
            try {
                // Deduplicate IDs to prevent fetching the same account multiple times
                const uniqueAccountIds = Array.from(new Set(parsedAdAccounts.map(a => a.id)));

                rawData = await fetchFacebookInsights(
                    profile.fb_access_token!, 
                    uniqueAccountIds, 
                    filter
                );
                setRawApiResponse(rawData);
            } catch (fbError: any) {
                console.error("Failed to fetch Facebook Data", fbError);
                setError(`Erro na API do Facebook: ${fbError.message || 'Verifique seu token e IDs.'}`);
                setRawApiResponse([]);
            }

        } catch (e: any) {
            if (e.name === 'AbortError') return;
            console.error("Falha ao processar dados:", e);
            setError("Não foi possível carregar os dados. Verifique o console para mais detalhes.");
        } finally {
            setLoading(false);
        }
    }, [profile, filter, parsedAdAccounts]); // Added filter dependency to refetch when filter changes

    const [uniqueProducts, setUniqueProducts] = useState<string[]>([]);
    const [uniqueCampaigns, setUniqueCampaigns] = useState<string[]>([]);

    useEffect(() => {
        if (salesData.length > 0) {
            const products = Array.from(new Set(salesData.map(s => s.product_name).filter(Boolean)));
            setUniqueProducts(products);
        }
    }, [salesData]);

    useEffect(() => {
        if (rawApiResponse && Array.isArray(rawApiResponse)) {
            const campaigns = Array.from(new Set(rawApiResponse.map((item: any) => item.campaign_name).filter(Boolean)));
            setUniqueCampaigns(campaigns);
        }
    }, [rawApiResponse]);

    // Local processing effect - triggers when filter, raw data or sales change
    useEffect(() => {
        if (rawApiResponse && profile) {
            setProcessing(true);
            try {
                const processedData = processApiData(
                    rawApiResponse, 
                    salesData, 
                    filter, 
                    profile.meta_tax || 0,
                    profile.sales_source || 'platform'
                );
                setData(processedData);
            } catch (err) {
                console.error("Erro ao processar dados:", err);
            } finally {
                setProcessing(false);
            }
        }
    }, [filter, rawApiResponse, salesData, profile]);

    useEffect(() => {
        // Reset raw data if profile config changes significantly
        setRawApiResponse(null);
    }, [profile?.fb_access_token]);

    useEffect(() => {
        if (activeTab !== 'simulator' && activeTab !== 'settings' && activeTab !== 'integrations' && !profileLoading) {
            // Only fetch if we don't have data OR if filter changed (handled by dependency)
            // But here we rely on fetchData dependency on filter.
            fetchData();
        }
    }, [fetchData, activeTab, profileLoading]);

    useEffect(() => {
        if (!profile) return;

        const channel = supabase.channel('realtime sales')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sales' }, (payload) => {
                const newSale = payload.new;
                
                // Trava de segurança para ignorar importações em lote via CSV
                const isImport = newSale.utm_medium?.includes('csv') || newSale.origem?.includes('csv') || newSale.platform?.toLowerCase().includes('csv');

                if (isImport) {
                  return; // Sai da função silenciosamente sem notificar
                }
                
                if (newSale.status === 'paid') {
                    // Play sound using native Audio API
                    try {
                        const audio = new Audio('/money.mp3');
                        audio.play().catch(() => {
                            // Silently catch autoplay block
                        });
                    } catch {
                        // Silently handle any other errors
                    }

                    // Show toast
                    toast.custom((t) => (
                        <div
                            className={`${
                                t.visible ? 'animate-enter' : 'animate-leave'
                            } max-w-md w-full bg-brand-secondary shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
                        >
                            <div className="flex-1 w-0 p-4">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 pt-0.5">
                                        <div className="w-10 h-10 rounded-full bg-brand-accent flex items-center justify-center">
                                            <FunnelIcon className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                    <div className="ml-3 flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-bold text-brand-text">
                                                Venda Aprovada
                                            </p>
                                            <p className="text-sm font-bold text-green-400">
                                                R$ {newSale.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                        <p className="mt-1 text-xs text-brand-text-secondary">
                                            {newSale.product_name || 'Produto'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex border-l border-gray-700">
                                <button
                                    onClick={() => toast.dismiss(t.id)}
                                    className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-brand-text-secondary hover:text-brand-text focus:outline-none"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    ), { duration: 5000 });

                    // Update local sales data to trigger re-processing
                    setSalesData(prev => [...prev, newSale]);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile]);

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        setIsMobileMenuOpen(false);
    };

    const showFilters = activeTab !== 'simulator' && activeTab !== 'settings' && activeTab !== 'integrations' && activeTab !== 'setup' && !!(profile?.fb_access_token && parsedAdAccounts.length > 0);

    const advancedFilters = showFilters ? (
        <div className="animate-fade-in w-full relative z-30">
            <button 
                onClick={() => setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 border ${
                    isAdvancedFiltersOpen 
                        ? 'bg-slate-800 border-slate-700 text-brand-text' 
                        : 'bg-slate-800/50 border-transparent text-brand-text-secondary hover:bg-slate-800 hover:text-brand-text'
                }`}
            >
                <div className="flex items-center space-x-3">
                    <div className={`p-1.5 rounded-md transition-colors ${isAdvancedFiltersOpen ? 'bg-brand-accent text-white' : 'bg-slate-700 text-brand-text-secondary'}`}>
                        <FunnelIcon className="w-4 h-4" />
                    </div>
                    <span>Filtros Avançados</span>
                    {(filter.selectedAccount || filter.selectedProduct || filter.selectedCampaign) && (
                        <span className="ml-2 px-2 py-0.5 text-[10px] font-bold bg-brand-accent/20 text-brand-accent rounded-full uppercase tracking-wider">
                            Ativos
                        </span>
                    )}
                </div>
                <div className="flex items-center space-x-2 text-xs opacity-70">
                    <span>{isAdvancedFiltersOpen ? 'Ocultar' : 'Expandir'}</span>
                    <svg 
                        className={`w-4 h-4 transition-transform duration-200 ${isAdvancedFiltersOpen ? 'rotate-180' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>
            
            {isAdvancedFiltersOpen && (
                <div className="absolute md:relative left-0 right-0 mt-2 md:mt-4 z-40">
                    <div className="flex flex-col md:flex-row flex-wrap gap-4 bg-slate-800 p-4 md:p-6 rounded-lg border border-slate-700 shadow-xl animate-fade-in-down">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-medium text-brand-text-secondary mb-1.5 uppercase tracking-wider">Conta de Anúncio</label>
                            <select
                                value={filter.selectedAccount || ''}
                                onChange={(e) => setFilter({ ...filter, selectedAccount: e.target.value || undefined })}
                                className="w-full bg-slate-900 text-brand-text text-sm rounded-md border-slate-700 focus:ring-brand-accent focus:border-brand-accent transition-colors p-2.5 md:p-3"
                            >
                                <option value="">Todas as Contas</option>
                                {parsedAdAccounts.map(account => (
                                    <option key={account.id} value={account.id}>{account.name}</option>
                                ))}
                            </select>
                        </div>

                        {profile?.sales_source !== 'facebook' && (
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs font-medium text-brand-text-secondary mb-1.5 uppercase tracking-wider">Produto</label>
                                <select
                                    value={filter.selectedProduct || ''}
                                    onChange={(e) => setFilter({ ...filter, selectedProduct: e.target.value || undefined })}
                                    className="w-full bg-slate-900 text-brand-text text-sm rounded-md border-slate-700 focus:ring-brand-accent focus:border-brand-accent transition-colors p-2.5 md:p-3"
                                >
                                    <option value="">Todos os Produtos</option>
                                    {uniqueProducts.map(product => (
                                        <option key={product} value={product}>{product}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-medium text-brand-text-secondary mb-1.5 uppercase tracking-wider">Campanha</label>
                            <select
                                value={filter.selectedCampaign || ''}
                                onChange={(e) => setFilter({ ...filter, selectedCampaign: e.target.value || undefined })}
                                className="w-full bg-slate-900 text-brand-text text-sm rounded-md border-slate-700 focus:ring-brand-accent focus:border-brand-accent transition-colors p-2.5 md:p-3"
                            >
                                <option value="">Todas as Campanhas</option>
                                {uniqueCampaigns.map(campaign => (
                                    <option key={campaign} value={campaign}>{campaign}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}
        </div>
    ) : null;

    const renderContent = () => {
        if (profileLoading) {
            return (
                 <div className="flex justify-center items-center h-96">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-brand-accent"></div>
                </div>
            );
        }

        if (activeTab === 'setup') {
            return <SetupGuideView profile={profile} />;
        }
        if (activeTab === 'integrations') {
            return <IntegrationsView profile={profile!} onProfileUpdate={setProfile} />;
        }
        if (activeTab === 'settings') {
            return <SettingsView profile={profile!} onProfileUpdate={setProfile} />;
        }

        const hasFbConfig = profile?.fb_access_token && parsedAdAccounts.length > 0;

        if (!hasFbConfig) {
            return (
                <div className="text-center text-brand-text-secondary p-8">
                    <h3 className="text-xl font-semibold text-brand-text">Bem-vindo(a) ao ScaleMetrics!</h3>
                    <p className="mt-2">Para começar, conecte o seu Token do Facebook e o ID da Conta de Anúncios na aba Integrações.</p>
                    <button 
                        onClick={() => setActiveTab('integrations')} 
                        className="mt-4 px-4 py-2 text-sm font-medium rounded-md bg-brand-accent text-white hover:bg-blue-700 transition-colors">
                        Ir para Integrações
                    </button>
                </div>
            );
        }

        if (loading) {
            return <DashboardSkeleton />;
        }
        if (error) {
            return <div className="text-center text-brand-danger p-8">{error}</div>;
        }
        if (!data && activeTab !== 'simulator') {
             return <div className="text-center text-brand-text-secondary p-8">Nenhum dado disponível para o período selecionado.</div>;
        }
        
        return (
            <div className={processing ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
                {(() => {
                    switch (activeTab) {
                        case 'macro':
                            // CRITICAL: recentSales MUST be exclusively Supabase data (salesData). 
                            // Do NOT inject Facebook API data here as it is aggregated and not suitable for this table.
                            return (
                                <MacroView 
                                    data={data!.macro} 
                                    recentSales={salesData} 
                                    onDeleteSale={handleDeleteSale} 
                                    filterElement={advancedFilters}
                                    salesSource={profile?.sales_source}
                                />
                            );
                        case 'traffic':
                            return (
                                <TrafficView 
                                    campaigns={data!.campaigns} 
                                    adsets={data!.adsets} 
                                    ads={data!.ads} 
                                    macroData={data!.macro} 
                                />
                            );
                        case 'funnel':
                            return <FunnelView data={data!.funnel} />;
                        case 'simulator':
                            return <SimulatorView />;
                        default:
                            return <div className="text-center text-brand-danger">Aba não encontrada</div>;
                    }
                })()}
            </div>
        );
    };
    
    return (
        <div className="max-w-7xl mx-auto">
            <Header 
                filterState={filter} 
                onFilterChange={setFilter} 
                isVisible={showFilters}
                onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                onLogout={onLogout}
                onLaunchSale={() => setIsManualSaleModalOpen(true)}
            />
            <Navigation 
                activeTab={activeTab} 
                onTabChange={handleTabChange} 
                isMobileMenuOpen={isMobileMenuOpen}
                onLogout={onLogout}
            />
            
            {showFilters && activeTab !== 'macro' && (
                <div className="mt-4">
                    {advancedFilters}
                </div>
            )}

            <main className="mt-6">
                {renderContent()}
            </main>
            
            {profile && (
                <ManualSaleModal 
                    isOpen={isManualSaleModalOpen}
                    onClose={() => setIsManualSaleModalOpen(false)}
                    userId={profile.id}
                    onSuccess={fetchData}
                />
            )}
        </div>
    );
};

const App: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [authView, setAuthView] = useState<'login' | 'signup'>('login');
    const [loading, setLoading] = useState(true);
    const [isRecovery, setIsRecovery] = useState(false);
    
    useEffect(() => {
        // Check URL hash for recovery parameters on initial load
        const hash = window.location.hash;
        if (hash && (hash.includes('type=recovery') || hash.includes('access_token'))) {
            setIsRecovery(true);
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                setIsRecovery(true);
            }
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setAuthView('login'); // Default to login screen on logout
        setIsRecovery(false);
    };
    
    const renderAuth = () => {
        if (authView === 'signup') {
            return <SignUp onSwitchView={() => setAuthView('login')} />;
        }
        return <Login 
            onSwitchView={() => setAuthView('signup')} 
            initialView={isRecovery ? 'update_password' : 'login'} 
            onRecoveryComplete={() => setIsRecovery(false)}
        />;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-brand-primary">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-brand-accent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-primary p-4 sm:p-6 lg:p-8">
            <Toaster position="top-right" toastOptions={{ style: { background: '#333', color: '#fff' } }} />
            {!session || isRecovery ? renderAuth() : <Dashboard onLogout={handleLogout} />}
        </div>
    );
};

export default App;