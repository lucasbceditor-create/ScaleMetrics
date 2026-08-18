import React from 'react';

interface KPICardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    subtitle?: string;
    valueClassName?: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, icon, subtitle, valueClassName = 'text-brand-text' }) => {
    // Relaxed font scaling since cards are now larger (5 per row)
    const getFontSize = (text: string) => {
        const length = text.length;
        if (length > 20) return 'text-xs md:text-sm leading-tight';
        if (length > 15) return 'text-sm md:text-base leading-tight';
        if (length > 12) return 'text-base md:text-lg leading-tight';
        return 'text-lg md:text-2xl leading-tight';
    };

    const fontSizeClass = getFontSize(value);

    return (
        <div className="bg-brand-secondary p-3 md:p-5 rounded-xl shadow-lg flex items-center space-x-3 md:space-x-4 border border-white/5 hover:border-brand-accent/30 transition-all duration-300 group">
            <div className="bg-gray-800/50 p-2 md:p-3 rounded-xl text-brand-accent flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5 md:w-6 md:h-6' })}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-[10px] md:text-xs text-brand-text-secondary font-semibold uppercase tracking-wider mb-0.5">{title}</p>
                <p className={`${fontSizeClass} font-bold md:font-black whitespace-nowrap ${valueClassName} tracking-tight`}>
                    {value}
                </p>
                {/* Subtitle on one line as requested */}
                {subtitle && <p className="text-[9px] md:text-[11px] text-brand-text-secondary mt-1 opacity-60 leading-none whitespace-nowrap overflow-hidden text-ellipsis">{subtitle}</p>}
            </div>
        </div>
    );
};

export default KPICard;