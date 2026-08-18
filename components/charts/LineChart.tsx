import React, { useEffect, useRef } from 'react';
import type { TimeDataPoint } from '../../types';

interface LineChartProps {
    data: TimeDataPoint[];
}

const LineChart: React.FC<LineChartProps> = ({ data }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<any>(null);

    useEffect(() => {
        if (!(window as any).Chart) return;
        const Chart = (window as any).Chart;

        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        if (chartRef.current) {
            chartRef.current.destroy();
        }

        const revenueGradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
        revenueGradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
        revenueGradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

        const investmentGradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
        investmentGradient.addColorStop(0, 'rgba(156, 163, 175, 0.4)');
        investmentGradient.addColorStop(1, 'rgba(156, 163, 175, 0)');

        const formatDateLabel = (value: string) => {
            try {
                const date = new Date(value);
                if (isNaN(date.getTime())) return value;

                // Check if we are showing a single day or multiple days
                // We can infer this from the data or just use a heuristic
                // But the user wants specific formats for 'Today'/'Yesterday' vs others.
                // Since we don't have the filter state here, we can check if the data points
                // are within the same day.
                
                const isSingleDay = data.length > 0 && 
                    data.every(d => new Date(d.date).toDateString() === new Date(data[0].date).toDateString());

                if (isSingleDay) {
                    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                } else {
                    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                }
            } catch {
                return value;
            }
        };

        chartRef.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.date),
                datasets: [
                    {
                        label: 'Faturamento',
                        data: data.map(d => d.revenue),
                        borderColor: '#3B82F6',
                        backgroundColor: revenueGradient,
                        fill: true,
                        tension: 0.4,
                    },
                    {
                        label: 'Investimento',
                        data: data.map(d => d.investment),
                        borderColor: '#9CA3AF',
                        backgroundColor: investmentGradient,
                        fill: true,
                        tension: 0.4,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#9CA3AF' } },
                    tooltip: {
                        backgroundColor: '#1A1B20',
                        titleColor: '#E5E7EB',
                        bodyColor: '#E5E7EB',
                        borderColor: '#374151',
                        borderWidth: 1,
                        callbacks: {
                            title: (items: any) => formatDateLabel(items[0].label)
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { 
                            color: '#9CA3AF',
                            callback: function(val: any) {
                                const label = this.getLabelForValue(val);
                                return formatDateLabel(label);
                            }
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    y: {
                        ticks: { color: '#9CA3AF' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                }
            }
        });

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
        };
    }, [data]);

    return <canvas ref={canvasRef}></canvas>;
};

export default LineChart;