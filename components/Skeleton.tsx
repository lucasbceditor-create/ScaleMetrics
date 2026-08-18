import React from 'react';

interface SkeletonProps {
    className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
    return (
        <div className={`animate-pulse bg-gray-700 rounded ${className}`}></div>
    );
};

export const DashboardSkeleton: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-brand-secondary p-6 rounded-xl border border-white/5 h-32">
                        <Skeleton className="h-4 w-24 mb-4" />
                        <Skeleton className="h-8 w-32" />
                    </div>
                ))}
            </div>
            <div className="bg-brand-secondary p-6 rounded-xl border border-white/5 h-96">
                <Skeleton className="h-6 w-48 mb-6" />
                <Skeleton className="h-full w-full" />
            </div>
        </div>
    );
};
