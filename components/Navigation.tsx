import React from 'react';
import { LogoutIcon, GearIcon } from './icons';

interface NavigationProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
    isMobileMenuOpen: boolean;
    onLogout: () => void;
}

const NavButton: React.FC<{
    label: string;
    isActive: boolean;
    onClick: () => void;
    isMobile?: boolean;
}> = ({ label, isActive, onClick, isMobile = false }) => {
    const mobileClasses = "w-full text-left p-4 hover:bg-gray-700 rounded-t-lg";
    const desktopClasses = "px-4 py-2 rounded-t-lg";
    
    return (
        <button
            onClick={onClick}
            className={`text-sm font-semibold transition-colors duration-200 focus:outline-none ${
                isActive
                    ? 'bg-brand-secondary text-brand-accent' + (isMobile ? '' : ' border-b-2 border-brand-accent')
                    : 'text-brand-text-secondary hover:text-brand-text'
            } ${isMobile ? mobileClasses : desktopClasses}`}
        >
            {label}
        </button>
    );
};

const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange, isMobileMenuOpen, onLogout }) => {
    const navItems = [
        { label: "Visão Macro", tabName: "macro" },
        { label: "Análise de Tráfego", tabName: "traffic" },
        { label: "Engenharia de Funil", tabName: "funnel" },
        { label: "Simulador de Escala", tabName: "simulator" },
        { label: "Integrações", tabName: "integrations" },
        { label: "Guia de Setup", tabName: "setup" },
    ];
    
    const settingsItem = { label: "Configurações", tabName: "settings" };

    return (
        <nav className="mt-8 relative z-40">
            {/* Desktop Navigation */}
            <div className="hidden md:flex justify-between items-center border-b border-gray-700">
                <div className="flex space-x-4">
                    {navItems.map(item => (
                        <NavButton 
                            key={item.tabName}
                            label={item.label} 
                            isActive={activeTab === item.tabName} 
                            onClick={() => onTabChange(item.tabName)} 
                        />
                    ))}
                </div>
                <button
                    onClick={() => onTabChange(settingsItem.tabName)}
                    title={settingsItem.label}
                    className={`p-2 rounded-md transition-colors duration-200 focus:outline-none ${
                        activeTab === settingsItem.tabName
                            ? 'text-brand-accent bg-brand-secondary'
                            : 'text-brand-text-secondary hover:text-brand-text hover:bg-brand-secondary'
                    }`}
                >
                    <GearIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Mobile Navigation */}
            {isMobileMenuOpen && (
                <div className="absolute top-0 left-0 w-full bg-brand-secondary rounded-lg shadow-xl z-[100] md:hidden animate-fade-in-down">
                    <div className="flex flex-col">
                        {navItems.map(item => (
                             <NavButton 
                                key={item.tabName}
                                label={item.label} 
                                isActive={activeTab === item.tabName} 
                                onClick={() => onTabChange(item.tabName)}
                                isMobile={true}
                            />
                        ))}
                        <button
                            onClick={() => onTabChange(settingsItem.tabName)}
                            className={`w-full text-left p-4 hover:bg-gray-700 text-sm font-semibold transition-colors duration-200 focus:outline-none flex items-center space-x-3 ${
                                activeTab === settingsItem.tabName ? 'bg-brand-secondary text-brand-accent' : 'text-brand-text-secondary'
                            }`}
                        >
                            <GearIcon className="w-5 h-5" />
                            <span>{settingsItem.label}</span>
                        </button>
                        <div className="border-t border-gray-700 my-1"></div>
                        <button
                            onClick={onLogout}
                            className="w-full text-left p-4 hover:bg-red-900/50 text-sm font-semibold transition-colors duration-200 focus:outline-none text-brand-danger flex items-center space-x-3 rounded-b-lg"
                        >
                            <LogoutIcon className="w-5 h-5" />
                            <span>Sair</span>
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navigation;