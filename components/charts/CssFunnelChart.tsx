import React from 'react';

interface CssFunnelChartProps {
    data: {
        clicks: number;
        visits: number;
        checkouts: number;
        sales: number;
    };
}

const CssFunnelChart: React.FC<CssFunnelChartProps> = ({ data }) => {
    const { clicks, visits, checkouts, sales } = data;

    if (clicks === 0) {
        return <div className="h-full flex items-center justify-center text-brand-text-secondary">Sem dados de cliques para exibir o funil.</div>;
    }

    const steps = [
        { label: 'Cliques', value: clicks, conversion: 100 },
        { label: 'Visitas', value: visits, conversion: clicks > 0 ? (visits / clicks) * 100 : 0 },
        { label: 'Checkouts', value: checkouts, conversion: visits > 0 ? (checkouts / visits) * 100 : 0 },
        { label: 'Vendas', value: sales, conversion: checkouts > 0 ? (sales / checkouts) * 100 : 0 },
    ];
    
    return (
        <div 
            className="w-full max-w-lg mx-auto h-96 relative shadow-2xl overflow-hidden"
            style={{ 
                clipPath: 'polygon(0 0, 100% 0, 80% 100%, 20% 100%)',
            }}
        >
            <div 
                className="w-full h-full absolute inset-0" 
                style={{
                    background: 'linear-gradient(to bottom, #2196F3, #00C853, #FF9800, #E91E63)'
                }}
            />
            <div className="w-full h-full flex flex-col relative z-10">
                {steps.map((step, index) => (
                    <div 
                        key={step.label} 
                        className="w-full flex-grow flex flex-col justify-center items-center text-white font-bold text-center border-t border-white/20 first:border-t-0"
                    >
                        <span className="text-lg drop-shadow-md">{step.label}</span>
                        <span className="text-base font-normal drop-shadow-md">{step.value.toLocaleString('pt-BR')}</span>
                        {index > 0 && (
                             <span className="text-xs font-semibold mt-1 opacity-80 drop-shadow-md">
                                {step.conversion.toFixed(2)}%
                             </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CssFunnelChart;