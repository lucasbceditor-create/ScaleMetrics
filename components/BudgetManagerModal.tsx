import React, { useState, useEffect } from 'react';
import { X, DollarSign, Edit2, Loader2, Check, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { fetchCampaignsAndAdsets, updateFacebookBudget, FacebookCampaign, FacebookAdSet } from '../services/facebookApi';

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface BudgetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string;
  adAccountIds: any;
}

interface BudgetCardProps {
  id: string;
  name: string;
  status: string;
  budgetStr: string;
  isLifetime: boolean;
  editingId: string | null;
  editValue: string;
  saving: boolean;
  onStartEdit: (id: string, budgetStr: string) => void;
  onSave: (id: string, isLifetime: boolean) => void;
  onCancel: () => void;
  onEditValueChange: (val: string) => void;
  indent?: boolean;
}

const BudgetCard: React.FC<BudgetCardProps> = ({
  id, name, status, budgetStr, isLifetime,
  editingId, editValue, saving,
  onStartEdit, onSave, onCancel, onEditValueChange,
  indent = false
}) => {
  const budgetVal = parseInt(budgetStr, 10) / 100;
  const isEditing = editingId === id;
  const isActive = status === 'ACTIVE';

  return (
    <div className={`bg-[#181926] border border-[#2A2B3A] rounded-2xl p-4 transition-all ${indent ? 'ml-4' : ''}`}>
      {/* Top row: name */}
      <p className="text-[15px] font-medium text-white mb-2 leading-tight">{name}</p>
      
      {/* Second row: status + type */}
      <div className="flex items-center gap-2 mb-4">
        {isActive ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#0F291E] text-[#2ECC71] text-[10px] font-bold uppercase tracking-wide border border-[#1A3F2D]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2ECC71]" />
            Ativo
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#252636] text-[#8E8E9F] text-[10px] font-bold uppercase tracking-wide border border-[#323348]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8E8E9F]" />
            Pausado
          </span>
        )}
        <span className="text-[12px] text-[#8E8E9F]">{isLifetime ? 'Vitalício' : 'Diário'}</span>
      </div>

      {/* Third row: Budget and Edit Button */}
      {isEditing ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[#8E8E9F] text-lg font-medium">R$</span>
            <input
              type="number"
              value={editValue}
              onChange={(e) => onEditValueChange(e.target.value)}
              className="flex-1 bg-[#0F101A] border border-[#2A2B3A] rounded-xl px-4 py-3 text-white text-xl font-bold focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/50 outline-none transition-all"
              autoFocus
              inputMode="decimal"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onSave(id, isLifetime)}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 rounded-xl text-white text-sm font-bold transition-colors shadow-lg shadow-blue-500/20"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              onClick={onCancel}
              disabled={saving}
              className="px-6 py-3 bg-[#2A2B3A] hover:bg-[#323348] disabled:opacity-50 rounded-xl text-white text-sm font-bold transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mt-1">
          <span className="text-2xl font-bold text-white tracking-tight">{formatCurrency(budgetVal)}</span>
          <button
            onClick={() => onStartEdit(id, budgetStr)}
            className="flex items-center justify-center w-11 h-11 bg-[#1A233A] hover:bg-[#1E2B4D] border border-[#24355C] rounded-[14px] text-[#4E88FF] transition-all active:scale-95"
          >
            <Edit2 className="w-[18px] h-[18px]" strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
};

export const BudgetManagerModal: React.FC<BudgetManagerModalProps> = ({ isOpen, onClose, accessToken, adAccountIds }) => {
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<FacebookCampaign[]>([]);
  const [adsets, setAdsets] = useState<FacebookAdSet[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());

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
      // Auto-expand all ABO campaigns
      const abos = data.campaigns.filter(c => !c.daily_budget && !c.lifetime_budget).map(c => c.id);
      setExpandedCampaigns(new Set(abos));
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
      toast.success('Orçamento atualizado com sucesso!');
      setEditingId(null);
      await loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar');
    } finally {
      setSaving(false);
    }
  };

  const toggleCampaign = (id: string) => {
    setExpandedCampaigns(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!isOpen) return null;

  const cboCampaigns = campaigns.filter(c => c.daily_budget || c.lifetime_budget);
  const aboCampaigns = campaigns.filter(c => !c.daily_budget && !c.lifetime_budget);
  const totalBudget = campaigns.reduce((sum, c) => {
    const b = parseInt(c.daily_budget || c.lifetime_budget || '0', 10);
    return sum + b;
  }, 0) / 100;

  const cardProps = {
    editingId, editValue, saving,
    onStartEdit: startEdit,
    onSave: handleSave,
    onCancel: () => setEditingId(null),
    onEditValueChange: setEditValue,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#151623] border border-[#2A2B3A] rounded-t-[28px] sm:rounded-2xl w-full sm:max-w-md shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] sm:mx-4">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2A2B3A] flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#381E48] rounded-2xl flex items-center justify-center w-12 h-12">
              <DollarSign className="w-6 h-6 text-[#A78BFA]" />
            </div>
            <div>
              <h2 className="text-xl font-medium text-white mb-0.5">Orçamentos</h2>
              {!loading && campaigns.length > 0 && (
                <p className="text-[13px] text-[#8E8E9F]">
                  {campaigns.length} campanhas · Total: {formatCurrency(totalBudget)}/dia
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={loadData} disabled={loading} className="p-2 hover:bg-[#2A2B3A] rounded-xl transition-colors">
              <RefreshCw className={`w-5 h-5 text-[#8E8E9F] ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-[#2A2B3A] rounded-xl transition-colors">
              <X className="w-6 h-6 text-[#8E8E9F]" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 overscroll-contain">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-[#A78BFA] animate-spin" />
              <p className="text-sm text-[#8E8E9F]">Carregando do Facebook...</p>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* CBO Campaigns */}
              {cboCampaigns.length > 0 && (
                <>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider px-1">
                    Campanhas com orçamento (CBO)
                  </p>
                  {cboCampaigns.map(camp => (
                    <BudgetCard
                      key={camp.id}
                      id={camp.id}
                      name={camp.name}
                      status={camp.status}
                      budgetStr={camp.daily_budget || camp.lifetime_budget || '0'}
                      isLifetime={!!camp.lifetime_budget}
                      {...cardProps}
                    />
                  ))}
                </>
              )}

              {/* ABO Campaigns */}
              {aboCampaigns.map(camp => {
                const campAdsets = adsets.filter(a => a.campaign_id === camp.id && (a.daily_budget || a.lifetime_budget));
                if (campAdsets.length === 0) return null;
                const isExpanded = expandedCampaigns.has(camp.id);

                return (
                  <div key={camp.id}>
                    {/* Campaign header (collapsible) */}
                    <button
                      onClick={() => toggleCampaign(camp.id)}
                      className="w-full flex items-center gap-2 px-1 py-2 text-left group"
                    >
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        : <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      }
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider truncate group-hover:text-gray-300 transition-colors">
                        {camp.name}
                      </span>
                      <span className="text-[10px] text-gray-600 flex-shrink-0">
                        ({campAdsets.length} conjunto{campAdsets.length !== 1 ? 's' : ''})
                      </span>
                    </button>

                    {/* AdSet cards */}
                    {isExpanded && (
                      <div className="space-y-2 pb-2">
                        {campAdsets.map(adset => (
                          <BudgetCard
                            key={adset.id}
                            id={adset.id}
                            name={adset.name}
                            status={adset.status}
                            budgetStr={adset.daily_budget || adset.lifetime_budget || '0'}
                            isLifetime={!!adset.lifetime_budget}
                            indent
                            {...cardProps}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {cboCampaigns.length === 0 && adsets.length === 0 && (
                <div className="text-center py-16">
                  <DollarSign className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Nenhuma campanha ativa com orçamento encontrada.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
