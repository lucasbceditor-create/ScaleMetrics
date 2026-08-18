import React from 'react';
import type { FunnelViewData } from '../types';
import CssFunnelChart from '../components/charts/CssFunnelChart';

interface FunnelViewProps {
    data: FunnelViewData;
}

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatPercent = (value: number) => `${value.toFixed(2)}%`;

const getRateColorClass = (value: number, thresholds: [number, number]): string => {
    const [low, high] = thresholds; // [red_until, yellow_until] -> e.g. [70, 85] means <70 is red, 70-84 is yellow, >=85 is green
    if (value >= high) return 'text-brand-success';
    if (value >= low) return 'text-brand-warning';
    return 'text-brand-danger';
};

const RateCard: React.FC<{ title: string; value: string; valueClassName?: string }> = ({ title, value, valueClassName = 'text-brand-text' }) => {
    // Aggressive font scaling for large numbers
    const getFontSize = (text: string) => {
        const length = text.length;
        if (length > 22) return 'text-lg md:text-xl leading-tight';
        if (length > 18) return 'text-xl md:text-2xl leading-tight';
        if (length > 15) return 'text-2xl md:text-3xl leading-tight';
        if (length > 12) return 'text-3xl md:text-4xl leading-tight';
        return 'text-4xl md:text-5xl leading-tight';
    };

    const fontSizeClass = getFontSize(value);

    return (
        <div className="bg-brand-secondary p-4 md:p-6 rounded-lg shadow-lg text-center flex flex-col justify-center h-full">
            <p className="text-xs md:text-sm text-brand-text-secondary font-medium uppercase tracking-wider truncate">{title}</p>
            <p className={`${fontSizeClass} font-bold mt-1 md:mt-2 whitespace-nowrap ${valueClassName}`}>
                {value}
            </p>
        </div>
    );
};

const FunnelView: React.FC<FunnelViewProps> = ({ data }) => {
    const connectRateColor = getRateColorClass(data.connectRate, [70, 85]);
    const pageConversionColor = getRateColorClass(data.pageConversionRate, [10, 15]);
    const checkoutConversionColor = getRateColorClass(data.checkoutConversionRate, [25, 35]);
    const globalConversionColor = getRateColorClass(data.globalConversionRate, [0.8, 1.5]);

    return (
        <div className="space-y-8 animate-fade-in">
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <RateCard title="Connect Rate" value={formatPercent(data.connectRate)} valueClassName={connectRateColor} />
                <RateCard title="Conv. da Página" value={formatPercent(data.pageConversionRate)} valueClassName={pageConversionColor} />
                <RateCard title="Conv. do Checkout" value={formatPercent(data.checkoutConversionRate)} valueClassName={checkoutConversionColor} />
                <RateCard title="Taxa de Conv. Global" value={formatPercent(data.globalConversionRate)} valueClassName={globalConversionColor} />
            </section>
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-brand-secondary p-6 rounded-lg shadow-lg">
                     <h3 className="text-lg font-semibold text-brand-text mb-6 text-center">Visualização do Funil</h3>
                     <CssFunnelChart data={data.funnelSteps} />
                </div>
                 <div className="space-y-6 flex flex-col justify-center">
                    <RateCard title="Custo por Visita" value={formatCurrency(data.costPerVisit)} />
                    <RateCard title="Custo por Checkout" value={formatCurrency(data.costPerCheckout)} />
                </div>
            </section>
        </div>
    );
};

export default FunnelView;