
import React from 'react';
// FIX: FunnelData is now correctly exported from types.ts
import type { FunnelData } from '../types';
import { ArrowRight } from './icons';

interface FunnelProps {
    data: FunnelData;
}

const FunnelStep: React.FC<{ label: string; value: number; }> = ({ label, value }) => (
    <div className="flex flex-col items-center justify-center text-center p-4 bg-gray-800 rounded-lg min-w-[120px]">
        <span className="text-2xl font-bold text-brand-text">{value.toLocaleString('pt-BR')}</span>
        <span className="text-xs text-brand-text-secondary uppercase mt-1">{label}</span>
    </div>
);

const ConversionRate: React.FC<{ value: number; label: string }> = ({ value, label }) => (
    <div className="flex flex-col items-center justify-center px-2 text-center">
        <ArrowRight />
        <span className="text-sm font-semibold text-brand-accent mt-1">{value.toFixed(2)}%</span>
        <span className="text-xs text-brand-text-secondary mt-1">{label}</span>
    </div>
);

const ConversionFunnel: React.FC<FunnelProps> = ({ data }) => {
    // FIX: Use 'clicks' and 'visits' to match the FunnelData type
    const { clicks, visits, checkouts, sales } = data;

    const connectRate = clicks > 0 ? (visits / clicks) * 100 : 0;
    const pageConversionRate = visits > 0 ? (checkouts / visits) * 100 : 0;
    const checkoutConversionRate = checkouts > 0 ? (sales / checkouts) * 100 : 0;

    return (
        <div className="flex items-center justify-center overflow-x-auto p-2">
            <div className="flex items-center space-x-2 md:space-x-4">
                <FunnelStep label="Cliques no Link" value={clicks} />
                <ConversionRate value={connectRate} label="Connect Rate" />
                <FunnelStep label="Visitas na Página" value={visits} />
                <ConversionRate value={pageConversionRate} label="Conv. da Página" />
                <FunnelStep label="Leads no Checkout" value={checkouts} />
                <ConversionRate value={checkoutConversionRate} label="Conv. do Checkout" />
                <FunnelStep label="Vendas" value={sales} />
            </div>
        </div>
    );
};

export default ConversionFunnel;
