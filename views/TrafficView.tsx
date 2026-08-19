import React, { useState, useMemo } from 'react';
import type { TrafficItemData, MacroData } from '../types';
import { ArrowUpDown, DollarSign } from 'lucide-react';

interface TrafficViewProps {
    campaigns: TrafficItemData[];
    adsets: TrafficItemData[];
    ads: TrafficItemData[];
    macroData: MacroData;
    onOpenBudgetManager?: () => void;
}

type SortKey = keyof Omit<TrafficItemData, 'name'>;
type SortDirection = 'ascending' | 'descending';

interface SortConfig {
    key: SortKey | null;
    direction: SortDirection;
}

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDecimal = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatInt = (value: number) => value.toLocaleString('pt-BR');

const SortableHeader: React.FC<{ sortKey: SortKey, label: string, onClick: (key: SortKey) => void }> = ({ sortKey, label, onClick }) => (
    <button onClick={() => onClick(sortKey)} className="flex items-center justify-end w-full">
        <span>{label}</span>
        <ArrowUpDown className="w-3 h-3 ml-1.5" />
    </button>
);

const TrafficView: React.FC<TrafficViewProps> = ({ campaigns, adsets, ads, macroData, onOpenBudgetManager }) => {
    const [activeTab, setActiveTab] = useState<'campaigns' | 'adsets' | 'ads'>('ads');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'sales', direction: 'descending' });
    const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
    const [selectedAdSets, setSelectedAdSets] = useState<string[]>([]);

    const filteredData = useMemo(() => {
        switch (activeTab) {
            case 'campaigns':
                return campaigns;
            case 'adsets':
                if (selectedCampaigns.length > 0) {
                    return adsets.filter(item => item.campaignName && selectedCampaigns.includes(item.campaignName));
                }
                return adsets;
            case 'ads':
                if (selectedAdSets.length > 0) {
                    return ads.filter(item => item.adsetName && selectedAdSets.includes(item.adsetName));
                }
                if (selectedCampaigns.length > 0) {
                    return ads.filter(item => item.campaignName && selectedCampaigns.includes(item.campaignName));
                }
                return ads;
            default:
                return [];
        }
    }, [activeTab, campaigns, adsets, ads, selectedCampaigns, selectedAdSets]);

    const sortedData = useMemo(() => {
        const sortableItems = [...filteredData];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                const valA = a[sortConfig.key!] || 0;
                const valB = b[sortConfig.key!] || 0;
                if (valA < valB) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (valA > valB) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredData, sortConfig]);

    const toggleCampaign = (name: string) => {
        setSelectedCampaigns(prev => 
            prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
        );
        // Reset adsets selection when campaigns change to maintain cascade
        setSelectedAdSets([]);
    };

    const toggleAdSet = (name: string) => {
        setSelectedAdSets(prev => 
            prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]
        );
    };

    const requestSort = (key: SortKey) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getFirstColumnLabel = () => {
        switch (activeTab) {
            case 'campaigns': return 'Campanha';
            case 'adsets': return 'Conjunto de Anúncios';
            case 'ads': return 'Criativo/Anúncio';
            default: return 'Item';
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-brand-secondary p-4 rounded-lg shadow-md flex items-center justify-between">
                 <div className="flex items-center space-x-3">
                    <span className="text-2xl">🪴</span>
                    <div>
                        <h3 className="font-semibold text-brand-text">Vendas Orgânicas</h3>
                        <p className="text-sm text-brand-text-secondary">Vendas sem atribuição direta de anúncios.</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xl font-bold text-green-400">{formatCurrency(macroData.organicRevenue)}</p>
                    <p className="text-sm text-brand-text-secondary">{formatInt(macroData.organicSales)} vendas</p>
                </div>
            </div>

            {/* Sub-Navegação (Tabs) */}
            <div className="flex items-center justify-between">
                <div className="flex space-x-1 bg-brand-secondary p-1 rounded-lg w-fit">
                    <button
                        onClick={() => { setActiveTab('campaigns'); setSortConfig({ key: 'sales', direction: 'descending' }); }}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'campaigns' ? 'bg-brand-accent text-white shadow-sm' : 'text-brand-text-secondary hover:text-brand-text hover:bg-gray-700'}`}
                    >
                        Campanhas
                    </button>
                    <button
                        onClick={() => { setActiveTab('adsets'); setSortConfig({ key: 'sales', direction: 'descending' }); }}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'adsets' ? 'bg-brand-accent text-white shadow-sm' : 'text-brand-text-secondary hover:text-brand-text hover:bg-gray-700'}`}
                    >
                        Conjuntos
                    </button>
                    <button
                        onClick={() => { setActiveTab('ads'); setSortConfig({ key: 'sales', direction: 'descending' }); }}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'ads' ? 'bg-brand-accent text-white shadow-sm' : 'text-brand-text-secondary hover:text-brand-text hover:bg-gray-700'}`}
                    >
                        Anúncios
                    </button>
                </div>
                
                <div className="flex items-center gap-4">
                    {onOpenBudgetManager && (
                        <button 
                            onClick={onOpenBudgetManager}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 hover:text-purple-300 rounded-md transition-colors font-medium text-sm border border-purple-500/30"
                        >
                            <DollarSign className="w-4 h-4" />
                            Orçamentos (CBO/ABO)
                        </button>
                    )}
                </div>

                {(selectedCampaigns.length > 0 || selectedAdSets.length > 0) && (
                    <button 
                        onClick={() => { setSelectedCampaigns([]); setSelectedAdSets([]); }}
                        className="text-xs text-brand-accent hover:underline font-medium"
                    >
                        Limpar Filtros ({selectedCampaigns.length + selectedAdSets.length})
                    </button>
                )}
            </div>

            <div className="bg-brand-secondary rounded-lg shadow-md text-sm overflow-x-auto w-full">
                <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-700 text-xs text-brand-text-secondary font-semibold min-w-[900px]">
                    <div className="col-span-4 flex items-center">
                        <div className="w-8"></div> {/* Space for checkbox */}
                        {getFirstColumnLabel()}
                    </div>
                    <div className="text-right"><SortableHeader sortKey="spent" label="Invest." onClick={requestSort} /></div>
                    <div className="text-right"><SortableHeader sortKey="revenue" label="Fatur." onClick={requestSort} /></div>
                    <div className="text-right"><SortableHeader sortKey="sales" label="Vendas" onClick={requestSort} /></div>
                    <div className="text-right"><SortableHeader sortKey="roas" label="ROAS" onClick={requestSort} /></div>
                    <div className="text-right"><SortableHeader sortKey="cpa" label="CPA" onClick={requestSort} /></div>
                    <div className="text-right"><SortableHeader sortKey="clicks" label="Cliques" onClick={requestSort} /></div>
                    <div className="text-right"><SortableHeader sortKey="cpc" label="CPC" onClick={requestSort} /></div>
                    <div className="text-right"><SortableHeader sortKey="cpm" label="CPM" onClick={requestSort} /></div>
                </div>
                <ul className="divide-y divide-gray-700">
                    {sortedData.map((item) => (
                        <li key={item.name}>
                            <div className="grid grid-cols-12 gap-4 items-center px-4 py-4 hover:bg-gray-700/30 transition-colors min-w-[900px]">
                                <div className="col-span-4 flex items-center">
                                    <div className="w-8 flex justify-center">
                                        {activeTab === 'campaigns' && (
                                            <input 
                                                type="checkbox" 
                                                checked={selectedCampaigns.includes(item.name)}
                                                onChange={() => toggleCampaign(item.name)}
                                                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-brand-accent focus:ring-brand-accent"
                                            />
                                        )}
                                        {activeTab === 'adsets' && (
                                            <input 
                                                type="checkbox" 
                                                checked={selectedAdSets.includes(item.name)}
                                                onChange={() => toggleAdSet(item.name)}
                                                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-brand-accent focus:ring-brand-accent"
                                            />
                                        )}
                                    </div>
                                    <div className="flex flex-col truncate">
                                        <span className="font-medium text-brand-text truncate" title={item.name}>{item.name}</span>
                                        {activeTab === 'ads' && (item.utmContent || item.utmTerm) && (
                                            <span className="text-[10px] text-brand-text-secondary truncate opacity-60">
                                                {item.utmContent && `Cont: ${item.utmContent}`}
                                                {item.utmContent && item.utmTerm && ' | '}
                                                {item.utmTerm && `Term: ${item.utmTerm}`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right text-brand-text-secondary">{formatCurrency(item.spent)}</div>
                                <div className="text-right text-brand-text-secondary">{formatCurrency(item.revenue)}</div>
                                <div className="text-right text-brand-text-secondary">{formatInt(item.sales)}</div>
                                <div className={`text-right font-semibold ${item.roas >= 1 ? 'text-green-400' : 'text-red-400'}`}>{formatDecimal(item.roas)}</div>
                                <div className="text-right text-brand-text-secondary">{formatCurrency(item.cpa)}</div>
                                <div className="text-right text-brand-text-secondary">{formatInt(item.clicks)}</div>
                                <div className="text-right text-brand-text-secondary">{formatCurrency(item.cpc)}</div>
                                <div className="text-right text-brand-text-secondary">{formatCurrency(item.cpm)}</div>
                            </div>
                        </li>
                    ))}
                    {sortedData.length === 0 && (
                        <li className="px-4 py-8 text-center text-brand-text-secondary">
                            Nenhum dado encontrado para esta categoria no período selecionado.
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default TrafficView;
