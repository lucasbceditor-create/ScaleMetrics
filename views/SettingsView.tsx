import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import type { UserProfile } from '../types';

interface SettingsViewProps {
    profile: UserProfile;
    onProfileUpdate: (profile: UserProfile) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ profile, onProfileUpdate }) => {
    const [tax, setTax] = useState<number>(profile.meta_tax || 0);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    const handleSave = async () => {
        setIsSaving(true);
        setSaveMessage('');

        const { data: updatedProfile, error } = await supabase
            .from('profiles')
            .upsert({
                id: profile.id,
                meta_tax: tax
            })
            .select()
            .single();
        
        setIsSaving(false);

        if (error) {
            setSaveMessage('Erro ao salvar. Tente novamente.');
            console.error('Error saving settings:', error);
        } else {
            setSaveMessage('Configurações salvas com sucesso!');
            onProfileUpdate(updatedProfile);
            setTimeout(() => setSaveMessage(''), 3000);
        }
    };

    return (
        <div className="animate-fade-in max-w-2xl mx-auto">
            <div className="bg-brand-secondary p-6 md:p-8 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold text-brand-text mb-2">Configurações</h2>
                <p className="text-brand-text-secondary mb-6">Ajuste as configurações globais do seu dashboard.</p>
                
                <div className="space-y-6 border-t border-gray-700 pt-6">
                    <div>
                        <label htmlFor="platform-tax-input" className="block text-sm font-medium text-brand-text-secondary">
                            Imposto da Plataforma (%)
                        </label>
                        <p className="text-xs text-brand-text-secondary/70 mt-1 mb-2">
                            Este valor será somado ao seu custo de tráfego para calcular métricas como Lucro Líquido, ROAS e CPA com maior precisão.
                        </p>
                        <input
                            id="platform-tax-input"
                            type="number"
                            value={tax === 0 ? '' : tax}
                            onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                            className="w-full max-w-xs p-2 bg-gray-700 border-gray-600 text-brand-text rounded-md shadow-sm focus:ring-brand-accent focus:border-brand-accent"
                            placeholder="Ex: 4.5"
                            min="0"
                            step="0.1"
                        />
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-700 flex items-center justify-end gap-4">
                    {saveMessage && (
                        <p className={`text-sm ${saveMessage.includes('Erro') ? 'text-brand-danger' : 'text-brand-success'}`}>
                            {saveMessage}
                        </p>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-accent hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;