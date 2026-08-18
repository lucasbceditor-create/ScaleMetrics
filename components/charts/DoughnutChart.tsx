
import React, { useEffect, useRef } from 'react';
import type { SalesDistribution } from '../../types';

interface DoughnutChartProps {
    data: SalesDistribution;
}

const DoughnutChart: React.FC<DoughnutChartProps> = ({ data }) => {
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

        chartRef.current = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Produto Principal', 'Order Bump'],
                datasets: [{
                    data: [data.mainProduct, data.orderBump],
                    backgroundColor: ['#3B82F6', '#10B981'],
                    borderColor: '#1A1B20',
                    borderWidth: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#9CA3AF', boxWidth: 12 }
                    },
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

export default DoughnutChart;
