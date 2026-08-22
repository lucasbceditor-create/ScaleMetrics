import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';

interface ManualSaleModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    onSuccess: () => void;
}

const ManualSaleModal: React.FC<ManualSaleModalProps> = ({ isOpen, onClose, userId, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [showUtms, setShowUtms] = useState(false);
    const [formData, setFormData] = useState({
        amount: '',
        product_name: '',
        customer_name: '',
        customer_email: '',
        created_at: '',
        utm_source: '',
        utm_campaign: '',
        utm_medium: '',
        utm_content: ''
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const amountNum = parseFloat(formData.amount.replace(',', '.'));
            if (isNaN(amountNum)) throw new Error('Valor inválido');

            const { error } = await supabase.from('sales').insert({
                user_id: userId,
                amount: amountNum,
                product_name: formData.product_name,
                customer_name: formData.customer_name || null,
                customer_email: formData.customer_email || null,
                utm_source: formData.utm_source || null,
                utm_campaign: formData.utm_campaign || null,
                utm_medium: formData.utm_medium || null,
                utm_content: formData.utm_content || null,
                status: 'paid',
                platform: 'Manual',
                created_at: formData.created_at ? new Date(formData.created_at).toISOString() : new Date().toISOString()
            });

            if (error) throw error;

            toast.success('Venda lançada com sucesso!');
            onSuccess();
            onClose();
            setFormData({
                amount: '',
                product_name: '',
                customer_name: '',
                customer_email: '',
                created_at: '',
                utm_source: '',
                utm_campaign: '',
                utm_medium: '',
                utm_content: ''
            });
        } catch (err: any) {
            toast.error('Erro ao lançar venda: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-brand-secondary w-full max-w-lg rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <div className="flex items-center space-x-2">
                        <div className="p-2 bg-brand-accent/20 rounded-lg">
                            <DollarSign className="w-5 h-5 text-brand-accent" />
                        </div>
                        <h2 className="text-xl font-bold text-brand-text">Lançar Venda Manual</h2>
                    </div>
                    <button onClick={onClose} className="text-brand-text-secondary hover:text-brand-text transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wider">Valor (R$)*</label>
                            <input
                                required
                                type="text"
                                placeholder="0,00"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full bg-gray-800 border-gray-700 rounded-lg text-brand-text focus:ring-brand-accent focus:border-brand-accent"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wider">Produto*</label>
                            <input
                                required
                                type="text"
                                placeholder="Nome do Produto"
                                value={formData.product_name}
                                onChange={e => setFormData({ ...formData, product_name: e.target.value })}
                                className="w-full bg-gray-800 border-gray-700 rounded-lg text-brand-text focus:ring-brand-accent focus:border-brand-accent"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wider">Nome do Cliente</label>
                        <input
                            type="text"
                            placeholder="Ex: João Silva"
                            value={formData.customer_name}
                            onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                            className="w-full bg-gray-800 border-gray-700 rounded-lg text-brand-text focus:ring-brand-accent focus:border-brand-accent"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wider">E-mail do Cliente</label>
                        <input
                            type="email"
                            placeholder="cliente@email.com"
                            value={formData.customer_email}
                            onChange={e => setFormData({ ...formData, customer_email: e.target.value })}
                            className="w-full bg-gray-800 border-gray-700 rounded-lg text-brand-text focus:ring-brand-accent focus:border-brand-accent"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-brand-text-secondary uppercase tracking-wider">Data da Venda</label>
                        <input
                            type="datetime-local"
                            value={formData.created_at}
                            onChange={e => setFormData({ ...formData, created_at: e.target.value })}
                            className="w-full bg-gray-800 border-gray-700 rounded-lg text-brand-text focus:ring-brand-accent focus:border-brand-accent"
                        />
                        <p className="text-[10px] text-gray-500 mt-1">Deixe vazio para usar a data/hora atual</p>
                    </div>

                    {/* UTM Section */}
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={() => setShowUtms(!showUtms)}
                            className="flex items-center justify-between w-full p-3 bg-gray-800/50 rounded-lg text-sm text-brand-text-secondary hover:text-brand-text transition-colors"
                        >
                            <span className="font-medium">Origem da Venda (UTMs)</span>
                            {showUtms ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        {showUtms && (
                            <div className="grid grid-cols-2 gap-3 mt-3 p-3 bg-gray-800/30 rounded-lg animate-fade-in">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-brand-text-secondary uppercase">Source</label>
                                    <input
                                        type="text"
                                        placeholder="utm_source"
                                        value={formData.utm_source}
                                        onChange={e => setFormData({ ...formData, utm_source: e.target.value })}
                                        className="w-full bg-gray-800 border-gray-700 rounded-md text-xs text-brand-text"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-brand-text-secondary uppercase">Campaign</label>
                                    <input
                                        type="text"
                                        placeholder="utm_campaign"
                                        value={formData.utm_campaign}
                                        onChange={e => setFormData({ ...formData, utm_campaign: e.target.value })}
                                        className="w-full bg-gray-800 border-gray-700 rounded-md text-xs text-brand-text"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-brand-text-secondary uppercase">Medium</label>
                                    <input
                                        type="text"
                                        placeholder="utm_medium"
                                        value={formData.utm_medium}
                                        onChange={e => setFormData({ ...formData, utm_medium: e.target.value })}
                                        className="w-full bg-gray-800 border-gray-700 rounded-md text-xs text-brand-text"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-brand-text-secondary uppercase">Content</label>
                                    <input
                                        type="text"
                                        placeholder="utm_content"
                                        value={formData.utm_content}
                                        onChange={e => setFormData({ ...formData, utm_content: e.target.value })}
                                        className="w-full bg-gray-800 border-gray-700 rounded-md text-xs text-brand-text"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-4">
                        <button
                            disabled={loading}
                            type="submit"
                            className="w-full py-3 bg-brand-accent hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-brand-accent/20 transition-all transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                        >
                            {loading ? 'Lançando...' : 'Confirmar Venda'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ManualSaleModal;
