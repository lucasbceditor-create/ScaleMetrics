import React, { useState } from 'react';
import type { FilterPeriod, FilterState } from '../types';
import { FunnelIcon, MenuIcon, LogoutIcon } from './icons';

interface HeaderProps {
    filterState: FilterState;
    onFilterChange: (filter: FilterState) => void;
    isVisible: boolean;
    onToggleMobileMenu: () => void;
    onLogout: () => void;
    onLaunchSale: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
    filterState, 
    onFilterChange, 
    isVisible, 
    onToggleMobileMenu, 
    onLogout, 
    onLaunchSale
}) => {
    const [customStartDate, setCustomStartDate] = useState(filterState.startDate || '');
    const [customEndDate, setCustomEndDate] = useState(filterState.endDate || '');

    const handleFilterChange = (updates: Partial<FilterState>) => {
        onFilterChange({ ...filterState, ...updates });
    };

    const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const period = e.target.value as FilterPeriod;
        if (period !== 'custom') {
            handleFilterChange({ period });
        } else {
             setCustomStartDate(filterState.startDate || '');
             setCustomEndDate(filterState.endDate || '');
             handleFilterChange({ period: 'custom', startDate: filterState.startDate || '', endDate: filterState.endDate || '' });
        }
    };
    
    const handleCustomFilterSubmit = () => {
        if (customStartDate && customEndDate) {
            handleFilterChange({ period: 'custom', startDate: customStartDate, endDate: customEndDate });
        }
    };

    return (
        <header className="flex flex-col gap-4">
            <div className="flex flex-wrap md:flex-nowrap justify-between items-center gap-4 min-h-[4rem]">
                <div className="flex items-center space-x-3">
                    <FunnelIcon className="w-8 h-8 text-brand-accent" />
                    <h1 className="text-2xl sm:text-3xl font-bold text-brand-text">ScaleMetrics</h1>
                </div>

                <div className="flex items-center gap-2">
                     {isVisible && (
                        <div className="hidden md:flex flex-wrap items-center justify-center gap-4 animate-fade-in">
                             <button
                                onClick={onLaunchSale}
                                className="flex items-center space-x-2 px-4 py-2 bg-brand-accent hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-lg shadow-brand-accent/20 transition-all transform active:scale-95"
                             >
                                <span>💸 Lançar Venda</span>
                             </button>
    
                             <select 
                                value={filterState.period}
                                onChange={handlePeriodChange}
                                className="w-full sm:w-auto bg-brand-secondary text-brand-text-secondary text-sm font-medium rounded-md border-gray-700 focus:ring-brand-accent focus:border-brand-accent shadow-sm"
                            >
                                 <option value="today">Hoje</option>
                                 <option value="yesterday">Ontem</option>
                                 <option value="last7days">Últimos 7 dias</option>
                                 <option value="thisMonth">Este Mês</option>
                                 <option value="quarterly">Trimestral</option>
                                 <option value="semiannually">Semestral</option>
                                 <option value="annually">Anual</option>
                                 <option value="custom">Personalizado</option>
                             </select>
                             
                             {filterState.period === 'custom' && (
                                <div className="flex w-full sm:w-auto items-center space-x-2 animate-fade-in">
                                     <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="bg-gray-700 text-sm p-2 rounded-md border-gray-600 focus:ring-brand-accent focus:border-brand-accent w-full" />
                                     <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="bg-gray-700 text-sm p-2 rounded-md border-gray-600 focus:ring-brand-accent focus:border-brand-accent w-full" />
                                     <button onClick={handleCustomFilterSubmit} className="px-4 py-2 text-sm font-medium rounded-md bg-brand-accent text-white hover:bg-blue-700 transition-colors">Filtrar</button>
                                 </div>
                             )}
                         </div>
                    )}
    
                    <button onClick={onLogout} title="Sair" className="hidden md:block p-2 rounded-full text-brand-text-secondary hover:text-brand-text hover:bg-brand-secondary transition-colors">
                        <LogoutIcon className="w-6 h-6" />
                    </button>
    
                    <button onClick={onToggleMobileMenu} className="p-2 rounded-md hover:bg-brand-secondary md:hidden">
                        <MenuIcon className="w-6 h-6" />
                    </button>
                </div>
                
                 {isVisible && (
                    <div className="w-full md:hidden flex flex-col items-center justify-center gap-3 animate-fade-in">
                         <button
                            onClick={onLaunchSale}
                            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-brand-accent hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-lg shadow-brand-accent/20 transition-all transform active:scale-95"
                         >
                            <span>💸 Lançar Venda</span>
                         </button>
    
                         <select 
                            value={filterState.period}
                            onChange={handlePeriodChange}
                            className="w-full bg-brand-secondary text-brand-text-secondary text-sm font-medium rounded-md border-gray-700 focus:ring-brand-accent focus:border-brand-accent shadow-sm"
                        >
                             <option value="today">Hoje</option>
                             <option value="yesterday">Ontem</option>
                             <option value="last7days">Últimos 7 dias</option>
                             <option value="thisMonth">Este Mês</option>
                             <option value="quarterly">Trimestral</option>
                             <option value="semiannually">Semestral</option>
                             <option value="annually">Anual</option>
                             <option value="custom">Personalizado</option>
                         </select>
                         
                         {filterState.period === 'custom' && (
                            <div className="flex w-full items-center space-x-2 animate-fade-in">
                                 <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="bg-gray-700 text-sm p-2 rounded-md border-gray-600 focus:ring-brand-accent focus:border-brand-accent w-full" />
                                 <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="bg-gray-700 text-sm p-2 rounded-md border-gray-600 focus:ring-brand-accent focus:border-brand-accent w-full" />
                                 <button onClick={handleCustomFilterSubmit} className="px-4 py-2 text-sm font-medium rounded-md bg-brand-accent text-white hover:bg-blue-700 transition-colors">Filtrar</button>
                             </div>
                         )}
                     </div>
                )}
            </div>

        </header>
    );
};

export default Header;