import React, { useState, useMemo } from 'react';
import { DollarSign, Target, BarChart, ShoppingCart, TrendingUp } from '../components/icons';

const formatCurrency = (value: number) => {
    if (!isFinite(value)) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDecimal = (value: number) => {
    if (!isFinite(value)) return '0,00';
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const InputField: React.FC<{ label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder: string }> = ({ label, name, value, onChange, placeholder }) => (
    <div className="space-y-2">
        <label className="block text-[10px] md:text-xs font-bold text-brand-text-secondary uppercase tracking-widest">{label}</label>
        <input
            type="number"
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full bg-slate-900/80 border-slate-700/50 text-brand-text rounded-2xl shadow-inner focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent transition-all p-4 md:p-5 text-base md:text-lg font-medium outline-none placeholder:text-gray-600"
        />
    </div>
);

const ResultCard: React.FC<{ title: string; value: string; icon: React.ReactNode; valueClassName?: string }> = ({ title, value, icon, valueClassName = 'text-brand-text' }) => {
    // Relaxed font scaling for larger cards
    const getFontSize = (text: string) => {
        const length = text.length;
        if (length > 20) return 'text-sm md:text-base leading-tight';
        if (length > 15) return 'text-base md:text-lg leading-tight';
        if (length > 12) return 'text-lg md:text-xl leading-tight';
        return 'text-xl md:text-2xl leading-tight';
    };

    const fontSizeClass = getFontSize(value);

    return (
        <div className="bg-slate-900/50 p-4 md:p-5 rounded-xl border border-white/5 hover:border-brand-accent/30 transition-all duration-300 group">
            <div className="flex items-center space-x-4">
                <div className="bg-gray-800/50 p-2.5 md:p-3 rounded-xl text-brand-accent flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5 md:w-6 md:h-6' })}
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="text-[10px] md:text-xs text-brand-text-secondary font-semibold uppercase tracking-wider mb-1">{title}</p>
                    <p className={`${fontSizeClass} font-black whitespace-nowrap ${valueClassName} tracking-tight`}>
                        {value}
                    </p>
                </div>
            </div>
        </div>
    );
};

const SimulatorView: React.FC = () => {
    const [inputs, setInputs] = useState({
        investment: '',
        cpc: '',
        conversionRate: '',
        avgTicket: '',
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setInputs(prev => ({ ...prev, [name]: value }));
    };

    const results = useMemo(() => {
        const investment = parseFloat(inputs.investment) || 0;
        const cpc = parseFloat(inputs.cpc) || 0;
        const conversionRate = parseFloat(inputs.conversionRate) || 0;
        const avgTicket = parseFloat(inputs.avgTicket) || 0;

        const clicks = cpc > 0 ? investment / cpc : 0;
        const sales = clicks * (conversionRate / 100);
        const revenue = sales * avgTicket;
        const cpa = sales > 0 ? investment / sales : 0;
        const netProfit = revenue - investment;
        const roas = investment > 0 ? revenue / investment : 0;
        
        return { clicks, sales, revenue, cpa, netProfit, roas };
    }, [inputs]);

    const getProfitColor = (value: number) => {
        if (value > 0) return 'text-brand-success';
        if (value < 0) return 'text-brand-danger';
        return 'text-brand-text';
    };

    const getRoasColor = (value: number) => {
        if (value >= 1) return 'text-brand-success';
        if (value > 0 && value < 1) return 'text-brand-danger';
        return 'text-brand-text';
    };

    return (
        <div className="animate-fade-in space-y-8">
            <div className="text-center">
                <h2 className="text-2xl md:text-4xl font-black text-brand-text tracking-tight">Simulador de Escala</h2>
                <p className="text-brand-text-secondary mt-2 text-sm md:text-base">Projete seus resultados com base em métricas esperadas.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-stretch">
                {/* Input Panel */}
                <div className="bg-brand-secondary p-6 md:p-8 rounded-2xl shadow-xl border border-white/5 flex flex-col">
                     <div className="flex items-center space-x-3 mb-6 border-b border-gray-700 pb-4">
                        <div className="w-2 h-8 bg-brand-accent rounded-full"></div>
                        <h3 className="text-xl md:text-2xl font-bold text-brand-text">Parâmetros de Projeção</h3>
                     </div>
                     <div className="space-y-5 md:space-y-6 flex-1">
                        <InputField label="Investimento Desejado (R$)" name="investment" value={inputs.investment} onChange={handleInputChange} placeholder="Ex: 5000" />
                        <InputField label="CPC Esperado (R$)" name="cpc" value={inputs.cpc} onChange={handleInputChange} placeholder="Ex: 0.75" />
                        <InputField label="Taxa de Conversão GLOBAL (%)" name="conversionRate" value={inputs.conversionRate} onChange={handleInputChange} placeholder="Ex: 1.5" />
                        <InputField label="Ticket Médio do Produto (R$)" name="avgTicket" value={inputs.avgTicket} onChange={handleInputChange} placeholder="Ex: 197" />
                     </div>
                </div>

                {/* Results Panel */}
                <div className="bg-brand-secondary p-6 md:p-8 rounded-2xl shadow-xl border border-white/5 flex flex-col">
                    <div className="flex items-center space-x-3 mb-6 border-b border-gray-700 pb-4">
                        <div className="w-2 h-8 bg-emerald-500 rounded-full"></div>
                        <h3 className="text-xl md:text-2xl font-bold text-brand-text">Resultados Projetados</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                        <ResultCard title="Total de Cliques" value={formatDecimal(results.clicks)} icon={<Target />} />
                        <ResultCard title="Vendas" value={formatDecimal(results.sales)} icon={<ShoppingCart />} />
                        <ResultCard 
                            title="ROAS Esperado" 
                            value={formatDecimal(results.roas)} 
                            icon={<BarChart />} 
                            valueClassName={getRoasColor(results.roas)}
                        />
                        <ResultCard title="CPA Esperado" value={formatCurrency(results.cpa)} icon={<Target />} />
                        <ResultCard title="Faturamento" value={formatCurrency(results.revenue)} icon={<DollarSign />} />
                        <ResultCard 
                            title="Lucro Líquido" 
                            value={formatCurrency(results.netProfit)} 
                            icon={<TrendingUp />} 
                            valueClassName={getProfitColor(results.netProfit)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SimulatorView;