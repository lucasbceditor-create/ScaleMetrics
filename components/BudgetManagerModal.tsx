import React, { useState, useEffect } from 'react';
import { X, DollarSign, Edit2, Save, Loader2, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { fetchCampaignsAndAdsets, updateFacebookBudget, FacebookCampaign, FacebookAdSet } from '../services/facebookApi';
const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface BudgetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string;
  adAccountIds: any;
}

export const BudgetManagerModal: React.FC<BudgetManagerModalProps> = ({ isOpen, onClose, accessToken, adAccountIds }) => {
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<FacebookCampaign[]>([]);
  const [adsets, setAdsets] = useState<FacebookAdSet[]>([]);
  
  // State for editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && accessToken && adAccountIds) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchCampaignsAndAdsets(accessToken, adAccountIds);
      setCampaigns(data.campaigns);
      setAdsets(data.adsets);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar orçamentos');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (id: string, currentBudgetInCents: string) => {
    setEditingId(id);
    setEditValue((parseInt(currentBudgetInCents, 10) / 100).toString());
  };

  const handleSave = async (id: string, isLifetime: boolean) => {
    if (!editValue || isNaN(Number(editValue))) {
      toast.error('Valor inválido');
      return;
    }
    
    setSaving(true);
    const newBudgetInCents = Math.round(Number(editValue) * 100);
    
    try {
      await updateFacebookBudget(accessToken, id, newBudgetInCents, isLifetime);
      toast.success('Orçamento atualizado!');
      setEditingId(null);
      await loadData(); // Reload to get fresh data
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  // Filter campaigns that have budget (CBO) or have active adsets with budget (ABO)
  const cboCampaigns = campaigns.filter(c => c.daily_budget || c.lifetime_budget);
  const aboCampaigns = campaigns.filter(c => !c.daily_budget && !c.lifetime_budget);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-brand-secondary border border-gray-800 rounded-xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-brand-text">Gerenciador de Orçamentos</h2>
              <p className="text-sm text-brand-text-secondary">Edite os orçamentos (CBO e ABO) diretamente via API</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400 hover:text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-4">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-brand-text-secondary">Carregando do Facebook...</p>
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* CBO Campaigns */}
              {cboCampaigns.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-brand-text mb-4 flex items-center gap-2">
                    Campanhas (CBO - Advantage+)
                  </h3>
                  <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-800/50 text-gray-400 uppercase">
                        <tr>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Campanha</th>
                          <th className="px-4 py-3 text-right">Orçamento Atual</th>
                          <th className="px-4 py-3 text-center">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {cboCampaigns.map(camp => {
                          const isLifetime = !!camp.lifetime_budget;
                          const budgetStr = camp.daily_budget || camp.lifetime_budget || '0';
                          const budgetVal = parseInt(budgetStr, 10) / 100;
                          const isEditing = editingId === camp.id;
                          
                          return (
                            <tr key={camp.id} className="hover:bg-gray-800/30">
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs ${camp.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-300'}`}>
                                  {camp.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-medium text-brand-text">{camp.name}</td>
                              <td className="px-4 py-3 text-right">
                                {isEditing ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <span className="text-gray-400">R$</span>
                                    <input 
                                      type="number" 
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      className="w-24 bg-gray-950 border border-gray-700 rounded px-2 py-1 text-white text-right focus:border-blue-500 outline-none"
                                      autoFocus
                                    />
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-end">
                                    <span className="text-white font-bold">{formatCurrency(budgetVal)}</span>
                                    <span className="text-xs text-gray-500">{isLifetime ? 'Vitalício' : 'Diário'}</span>
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {isEditing ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <button 
                                      onClick={() => handleSave(camp.id, isLifetime)}
                                      disabled={saving}
                                      className="p-1.5 bg-green-600 hover:bg-green-500 rounded text-white transition-colors"
                                    >
                                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    </button>
                                    <button 
                                      onClick={() => setEditingId(null)}
                                      disabled={saving}
                                      className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white transition-colors"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => startEdit(camp.id, budgetStr)}
                                    className="p-1.5 hover:bg-gray-800 rounded text-gray-400 hover:text-blue-400 transition-colors inline-flex"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ABO Campaigns & AdSets */}
              {aboCampaigns.map(camp => {
                const campAdsets = adsets.filter(a => a.campaign_id === camp.id && (a.daily_budget || a.lifetime_budget));
                if (campAdsets.length === 0) return null;

                return (
                  <div key={camp.id} className="mt-6">
                    <h3 className="text-md font-medium text-gray-300 mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      {camp.name} <span className="text-xs text-gray-500">(ABO)</span>
                    </h3>
                    <div className="bg-gray-900/30 border border-gray-800 rounded-lg overflow-hidden ml-4">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-800/30 text-gray-400 uppercase text-xs">
                          <tr>
                            <th className="px-4 py-2">Status</th>
                            <th className="px-4 py-2">Conjunto de Anúncios</th>
                            <th className="px-4 py-2 text-right">Orçamento Atual</th>
                            <th className="px-4 py-2 text-center w-24">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {campAdsets.map(adset => {
                            const isLifetime = !!adset.lifetime_budget;
                            const budgetStr = adset.daily_budget || adset.lifetime_budget || '0';
                            const budgetVal = parseInt(budgetStr, 10) / 100;
                            const isEditing = editingId === adset.id;

                            return (
                              <tr key={adset.id} className="hover:bg-gray-800/30">
                                <td className="px-4 py-2">
                                  <span className={`px-2 py-1 rounded text-xs ${adset.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-300'}`}>
                                    {adset.status}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-gray-300">{adset.name}</td>
                                <td className="px-4 py-2 text-right">
                                  {isEditing ? (
                                    <div className="flex items-center justify-end gap-2">
                                      <span className="text-gray-400">R$</span>
                                      <input 
                                        type="number" 
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className="w-24 bg-gray-950 border border-gray-700 rounded px-2 py-1 text-white text-right focus:border-blue-500 outline-none"
                                        autoFocus
                                      />
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-end">
                                      <span className="text-white font-medium">{formatCurrency(budgetVal)}</span>
                                      <span className="text-[10px] text-gray-500">{isLifetime ? 'Vitalício' : 'Diário'}</span>
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-center">
                                  {isEditing ? (
                                    <div className="flex items-center justify-center gap-2">
                                      <button 
                                        onClick={() => handleSave(adset.id, isLifetime)}
                                        disabled={saving}
                                        className="p-1.5 bg-green-600 hover:bg-green-500 rounded text-white transition-colors"
                                      >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                      </button>
                                      <button 
                                        onClick={() => setEditingId(null)}
                                        disabled={saving}
                                        className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white transition-colors"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={() => startEdit(adset.id, budgetStr)}
                                      className="p-1.5 hover:bg-gray-800 rounded text-gray-400 hover:text-blue-400 transition-colors inline-flex"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              {cboCampaigns.length === 0 && adsets.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  Nenhuma campanha ativa com orçamento encontrada.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
