'use client';
import React from 'react';
import type { MacroData, Sale } from '../types';
import KPICard from '../components/KPICard';
import { DollarSign, Target, BarChart, ShoppingCart, TrendingUp, TrashIcon } from '../components/icons';
import LineChart from '../components/charts/LineChart';
import { supabase } from '../supabaseClient';

interface MacroViewProps {
    data: MacroData;
    recentSales: Sale[];
    onDeleteSale: (id: string) => void;
    filterElement?: React.ReactNode;
    salesSource?: 'facebook' | 'platform';
}

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDecimal = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatInt = (value: number) => value.toLocaleString('pt-BR');
const formatBRTDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    
    // Adiciona 3 horas para compensar a subtração automática do navegador
    date.setHours(date.getHours() + 3);
    
    return date.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
};

const MacroView: React.FC<MacroViewProps> = ({ data, recentSales, onDeleteSale, filterElement, salesSource }) => {
    const [searchTerm, setSearchTerm] = React.useState('');
    type SortKey = 'created_at' | 'product_name' | 'amount' | 'status';
    const [sortConfig, setSortConfig] = React.useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'created_at', direction: 'desc' });
    const [dateFilter, setDateFilter] = React.useState<string>('all');
    const [sales, setSales] = React.useState<Sale[]>(recentSales);
    const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
    const [currentPage, setCurrentPage] = React.useState(1);
    const [itemsPerPage, setItemsPerPage] = React.useState(10);

    React.useEffect(() => {
        setSales(recentSales);
    }, [recentSales]);

    // Reset pagination when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, dateFilter, sortConfig]);

    const getProfitColor = (val: number) => val > 0 ? 'text-brand-success' : val < 0 ? 'text-brand-danger' : 'text-brand-text';
    const getRoasColor = (val: number) => val > 1 ? 'text-brand-success' : val < 1 ? 'text-brand-danger' : 'text-brand-text';
    const getRevenueColor = (val: number) => val > 0 ? 'text-brand-success' : 'text-brand-text';

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (confirmDeleteId !== id) {
            setConfirmDeleteId(id);
            setTimeout(() => setConfirmDeleteId(null), 3000);
            return;
        }

        try {
            const { error } = await supabase.from('sales').delete().eq('id', id);
            if (error) throw error;

            setSales(prev => prev.filter(s => s.id !== id));
            onDeleteSale(id); // Notify parent if needed, but local state handles UI instantly
            setConfirmDeleteId(null);
        } catch (err: any) {
            console.error('Erro ao excluir:', err);
        }
    };

    const filteredSales = React.useMemo(() => {
        let result = [...sales];

        // 1. Date Filter
        if (dateFilter !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const last7Days = new Date(today);
            last7Days.setDate(last7Days.getDate() - 7);
            const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const last6Months = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
            const last12Months = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

            result = result.filter(sale => {
                const saleDate = new Date(sale.created_at);
                switch (dateFilter) {
                    case 'today':
                        return saleDate >= today;
                    case 'yesterday':
                        return saleDate >= yesterday && saleDate < today;
                    case 'last7days':
                        return saleDate >= last7Days;
                    case 'thisMonth':
                        return saleDate >= thisMonthStart;
                    case 'lastMonth':
                        return saleDate >= lastMonthStart && saleDate < thisMonthStart;
                    case 'last6months':
                        return saleDate >= last6Months;
                    case 'last12months':
                        return saleDate >= last12Months;
                    default:
                        return true;
                }
            });
        }

        // 2. Search Filter
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(sale => 
                (sale.product_name && sale.product_name.toLowerCase().includes(lowerTerm)) ||
                (sale.utm_source && sale.utm_source.toLowerCase().includes(lowerTerm)) ||
                (sale.status && sale.status.toLowerCase().includes(lowerTerm))
            );
        }

        // 3. Sorting
        result.sort((a, b) => {
            let aValue: any = a[sortConfig.key];
            let bValue: any = b[sortConfig.key];

            if (sortConfig.key === 'created_at') {
                aValue = new Date(a.created_at).getTime();
                bValue = new Date(b.created_at).getTime();
            } else if (sortConfig.key === 'amount') {
                aValue = Number(a.amount);
                bValue = Number(b.amount);
            } else {
                aValue = String(aValue || '').toLowerCase();
                bValue = String(bValue || '').toLowerCase();
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });

        return result;
    }, [sales, searchTerm, sortConfig, dateFilter]);

    const handleSort = (key: SortKey) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const renderSortIcon = (key: SortKey) => {
        if (sortConfig.key !== key) return <span className="ml-1 opacity-30 text-[10px]">↕</span>;
        return sortConfig.direction === 'asc' ? <span className="ml-1 text-brand-accent text-[10px]">↑</span> : <span className="ml-1 text-brand-accent text-[10px]">↓</span>;
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredSales.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredSales.length / itemsPerPage);

    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
    };

    const getPageNumbers = () => {
        const pageNumbers = [];
        const maxPagesToShow = 5;
        
        if (totalPages <= maxPagesToShow) {
            for (let i = 1; i <= totalPages; i++) {
                pageNumbers.push(i);
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pageNumbers.push(i);
                pageNumbers.push('...');
                pageNumbers.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pageNumbers.push(1);
                pageNumbers.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) pageNumbers.push(i);
            } else {
                pageNumbers.push(1);
                pageNumbers.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) pageNumbers.push(i);
                pageNumbers.push('...');
                pageNumbers.push(totalPages);
            }
        }
        return pageNumbers;
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Filter Element Slot - Separated from Metrics */}
            {filterElement && (
                <div className="w-full mb-4">
                    {filterElement}
                </div>
            )}

            {/* Row 1: Financial & Traffic KPIs */}
            <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <KPICard title="Investimento" value={formatCurrency(data.investment)} icon={<DollarSign />} />
                <KPICard 
                    title="Faturamento" 
                    value={formatCurrency(data.revenue)} 
                    icon={<TrendingUp />}
                    valueClassName={getRevenueColor(data.revenue)}
                    subtitle={`Ads: ${formatCurrency(data.adsRevenue)} | Orgânico: ${formatCurrency(data.organicRevenue)}`}
                />
                <KPICard 
                    title="Lucro Líquido" 
                    value={formatCurrency(data.netProfit)} 
                    icon={<TrendingUp />} 
                    valueClassName={getProfitColor(data.netProfit)}
                />
                <KPICard title="Total de Vendas" value={formatInt(data.totalSales)} icon={<ShoppingCart />} />
                <KPICard 
                    title="Reembolsos" 
                    value={formatCurrency(data.refunds)} 
                    icon={<DollarSign />} 
                    valueClassName="text-brand-danger"
                />

                <KPICard title="CPA Médio" value={formatCurrency(data.avgCpa)} icon={<Target />} />
                <KPICard title="CPC Médio" value={formatCurrency(data.cpc)} icon={<Target />} />
                <KPICard title="CPM Médio" value={formatCurrency(data.cpm)} icon={<Target />} />
                <KPICard 
                    title="ROAS Global" 
                    value={formatDecimal(data.roas)} 
                    icon={<BarChart />} 
                    valueClassName={getRoasColor(data.roas)}
                />
                <KPICard title="Ticket Médio" value={formatCurrency(data.avgTicket)} icon={<ShoppingCart />} />
            </section>

            {/* Row 2: Charts & Top Creatives */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-brand-secondary p-6 rounded-lg shadow-lg">
                    <h3 className="text-lg font-semibold text-brand-text mb-4">Faturamento vs Investimento</h3>
                    <div className="h-80">
                         <LineChart data={data.performanceHistory} />
                    </div>
                </div>
                <div className="bg-brand-secondary p-6 rounded-lg shadow-lg">
                    <h3 className="text-lg font-semibold text-brand-text mb-4">Top 3 Anúncios</h3>
                    <ul className="space-y-4">
                        {data.topCreatives.map((ad, index) => (
                            <li key={ad.name} className="flex items-center space-x-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-brand-accent font-bold">
                                    {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-brand-text truncate" title={ad.name}>{ad.name}</p>
                                    <div className="flex justify-between text-xs text-brand-text-secondary mt-1">
                                        <span>{formatInt(ad.sales)} vendas</span>
                                        <span className="font-semibold">CPA: {formatCurrency(ad.cpa)}</span>
                                    </div>
                                </div>
                            </li>
                        ))}
                         {data.topCreatives.length === 0 && (
                            <p className="text-sm text-brand-text-secondary text-center py-4">Nenhum anúncio com vendas no período.</p>
                        )}
                    </ul>
                </div>
            </section>

            {/* Row 3: Latest Sales Table */}
            {salesSource !== 'facebook' && (
                <section className="bg-brand-secondary rounded-lg shadow-lg overflow-hidden">
                    <div className="p-6 border-b border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h3 className="text-lg font-semibold text-brand-text">Últimas Vendas</h3>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                            <input 
                                type="text" 
                                placeholder="Buscar por produto, origem..." 
                                className="bg-gray-800 border border-gray-700 text-brand-text text-sm rounded-lg focus:ring-brand-accent focus:border-brand-accent block w-full sm:w-64 p-2.5"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <div className="flex gap-3 w-full sm:w-auto">
                                <select 
                                    className="flex-1 sm:flex-none bg-gray-800 border border-gray-700 text-brand-text text-sm rounded-lg focus:ring-brand-accent focus:border-brand-accent block p-2.5"
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value={10}>10 linhas</option>
                                    <option value={50}>50 linhas</option>
                                    <option value={100}>100 linhas</option>
                                </select>
                                <select 
                                    className="flex-1 sm:flex-none bg-gray-800 border border-gray-700 text-brand-text text-sm rounded-lg focus:ring-brand-accent focus:border-brand-accent block p-2.5"
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                >
                                    <option value="all">Todo o período</option>
                                    <option value="today">Hoje</option>
                                    <option value="yesterday">Ontem</option>
                                    <option value="last7days">Últimos 7 dias</option>
                                    <option value="thisMonth">Este Mês</option>
                                    <option value="lastMonth">Mês Passado</option>
                                    <option value="last6months">Últimos 6 meses</option>
                                    <option value="last12months">Últimos 12 meses</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-brand-text-secondary">
                            <thead className="bg-gray-800 text-brand-text uppercase font-medium">
                                <tr>
                                    <th className="px-6 py-3 cursor-pointer hover:bg-gray-700 transition-colors select-none" onClick={() => handleSort('created_at')}>
                                        Data {renderSortIcon('created_at')}
                                    </th>
                                    <th className="px-6 py-3 cursor-pointer hover:bg-gray-700 transition-colors select-none" onClick={() => handleSort('product_name')}>
                                        Produto {renderSortIcon('product_name')}
                                    </th>
                                    <th className="px-6 py-3 cursor-pointer hover:bg-gray-700 transition-colors select-none" onClick={() => handleSort('amount')}>
                                        Valor {renderSortIcon('amount')}
                                    </th>
                                    <th className="px-6 py-3 cursor-pointer hover:bg-gray-700 transition-colors select-none" onClick={() => handleSort('status')}>
                                        Status {renderSortIcon('status')}
                                    </th>
                                    <th className="px-6 py-3">Origem</th>
                                    <th className="px-6 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {currentItems.length > 0 ? (
                                    currentItems.map((sale) => (
                                        <tr key={sale.id} className="hover:bg-gray-700/50">
                                            <td className="px-6 py-4 whitespace-nowrap">{formatBRTDate(sale.created_at)}</td>
                                            <td className="px-6 py-4 font-medium text-brand-text">{sale.product_name || 'Produto'}</td>
                                            <td className="px-6 py-4 text-green-400 font-semibold">{formatCurrency(sale.amount)}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                    sale.status === 'paid' ? 'bg-green-900/50 text-green-400' : 
                                                    sale.status === 'refunded' ? 'bg-red-900/50 text-red-400' : 'bg-yellow-900/50 text-yellow-400'
                                                }`}>
                                                    {sale.status === 'paid' ? 'Aprovada' : sale.status === 'refunded' ? 'Reembolso' : sale.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">{sale.utm_source || '-'}</td>
                                            <td className="p-4 text-right">
                                                <button 
                                                    type="button"
                                                    onClick={(e) => handleDelete(e, sale.id)} 
                                                    className={`px-3 py-1.5 rounded text-sm font-bold transition-colors inline-flex items-center justify-center ${
                                                        confirmDeleteId === sale.id 
                                                            ? 'bg-red-600 hover:bg-red-700 text-white' 
                                                            : 'text-gray-400 hover:text-red-500 hover:bg-red-500/10'
                                                    }`}
                                                    title="Excluir Venda"
                                                >
                                                    {confirmDeleteId === sale.id ? 'Confirmar?' : <TrashIcon className="w-5 h-5 pointer-events-none" />}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-brand-text-secondary">
                                            Nenhuma venda encontrada.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination Footer */}
                    {filteredSales.length > 0 && (
                        <div className="p-4 border-t border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-800/50">
                            <div className="text-sm text-brand-text-secondary">
                                Mostrando <span className="font-semibold text-brand-text">{indexOfFirstItem + 1}</span> a <span className="font-semibold text-brand-text">{Math.min(indexOfLastItem, filteredSales.length)}</span> de <span className="font-semibold text-brand-text">{filteredSales.length}</span> vendas
                            </div>
                            <div className="flex items-center space-x-1">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 text-sm font-medium rounded-md text-brand-text-secondary bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:text-brand-text disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Anterior
                                </button>
                                
                                <div className="hidden sm:flex items-center space-x-1">
                                    {getPageNumbers().map((number, index) => (
                                        <button
                                            key={index}
                                            onClick={() => typeof number === 'number' ? handlePageChange(number) : null}
                                            disabled={number === '...'}
                                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                                currentPage === number
                                                    ? 'bg-brand-accent text-white border border-brand-accent'
                                                    : number === '...'
                                                    ? 'text-brand-text-secondary cursor-default'
                                                    : 'text-brand-text-secondary bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:text-brand-text'
                                            }`}
                                        >
                                            {number}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="px-3 py-1.5 text-sm font-medium rounded-md text-brand-text-secondary bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:text-brand-text disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Próxima
                                </button>
                            </div>
                        </div>
                    )}
                </section>
            )}
        </div>
    );
};

export default MacroView;