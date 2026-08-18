import React from 'react';
import type { CreativeData } from '../types';

type SortKey = keyof CreativeData;
interface SortConfig {
    key: SortKey | null;
    direction: 'ascending' | 'descending';
}

interface CreativesTableProps {
    data: CreativeData[];
    onSort: (key: SortKey) => void;
    sortConfig: SortConfig;
}

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatPercent = (value: number) => `${value.toFixed(2)}%`;
const formatDecimal = (value: number) => value.toFixed(2);
const formatInt = (value: number) => value.toLocaleString('pt-BR');

const Td: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <td className={`px-4 py-3 whitespace-nowrap text-sm ${className}`}>{children}</td>
);

const Th: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
     <th scope="col" className={`px-4 py-3 text-left text-xs font-semibold text-brand-text-secondary uppercase tracking-wider ${className}`}>
        {children}
    </th>
);

const SortableTh: React.FC<{ 
    children: React.ReactNode; 
    className?: string;
    sortKey: SortKey;
    onSort: (key: SortKey) => void;
    sortConfig: SortConfig;
}> = ({ children, className = '', sortKey, onSort, sortConfig }) => {
    const isSorted = sortConfig.key === sortKey;
    const directionIcon = sortConfig.direction === 'ascending' ? '▲' : '▼';
    
    return (
        <Th className={className}>
            <button onClick={() => onSort(sortKey)} className="flex items-center space-x-1 hover:text-brand-text transition-colors">
                <span>{children}</span>
                <span className="text-gray-500 w-4">{isSorted ? directionIcon : '↕️'}</span>
            </button>
        </Th>
    );
};

const StatusBadge: React.FC<{ status: 'Ativo' | 'Pausado' }> = ({ status }) => (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
        status === 'Ativo' ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-300'
    }`}>
        {status}
    </span>
);

const CreativesTable: React.FC<CreativesTableProps> = ({ data, onSort, sortConfig }) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
                <thead className="bg-gray-800">
                    <tr>
                        <Th>Nome do Anúncio</Th>
                        <Th>Status</Th>
                        <SortableTh sortKey="spent" onSort={onSort} sortConfig={sortConfig} className="text-right">Valor Gasto</SortableTh>
                        <SortableTh sortKey="cpm" onSort={onSort} sortConfig={sortConfig} className="text-right">CPM</SortableTh>
                        <SortableTh sortKey="cpc" onSort={onSort} sortConfig={sortConfig} className="text-right">CPC</SortableTh>
                        <SortableTh sortKey="ctr" onSort={onSort} sortConfig={sortConfig} className="text-right">CTR (%)</SortableTh>
                        <SortableTh sortKey="clicks" onSort={onSort} sortConfig={sortConfig} className="text-right">Cliques</SortableTh>
                        <SortableTh sortKey="sales" onSort={onSort} sortConfig={sortConfig} className="text-right">Compras</SortableTh>
                        <SortableTh sortKey="cpa" onSort={onSort} sortConfig={sortConfig} className="text-right">CPA</SortableTh>
                        <SortableTh sortKey="roas" onSort={onSort} sortConfig={sortConfig} className="text-right">ROAS</SortableTh>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                    {data.map((ad) => (
                        <tr key={ad.name} className="hover:bg-gray-800 transition-colors duration-200">
                            <Td><div className="font-medium text-brand-text max-w-xs truncate" title={ad.name}>{ad.name}</div></Td>
                            <Td><StatusBadge status={ad.status} /></Td>
                            <Td className="text-right text-brand-text">{formatCurrency(ad.spent)}</Td>
                            <Td className="text-right text-brand-text">{formatCurrency(ad.cpm)}</Td>
                            <Td className="text-right text-brand-text">{formatCurrency(ad.cpc)}</Td>
                            <Td className="text-right text-brand-text">{formatPercent(ad.ctr)}</Td>
                            <Td className="text-right text-brand-text">{formatInt(ad.clicks)}</Td>
                            <Td className="text-right text-brand-text font-bold">{formatInt(ad.sales)}</Td>
                            <Td className="text-right text-brand-text">{formatCurrency(ad.cpa)}</Td>
                            <Td className="text-right text-brand-text font-semibold">{formatDecimal(ad.roas)}</Td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default CreativesTable;
