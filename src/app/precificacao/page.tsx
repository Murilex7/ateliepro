'use client';

import { useState, useEffect } from 'react';
import { cn, formatCurrency } from '@/lib/utils';
import { calculatePrice } from '@/types';
import { Plus, Trash2, Calculator, FileText, MessageCircle, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';

interface Material {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export default function PrecificacaoPage() {
  const { profile, loading } = useAuth();
  const [pieceName, setPieceName] = useState('');
  const [materials, setMaterials] = useState<Material[]>([
    { id: 1, name: 'Tecido principal', quantity: 2, unit: 'metros', unitPrice: 25 },
    { id: 2, name: 'Linha', quantity: 1, unit: 'unidades', unitPrice: 5 },
    { id: 3, name: 'Zíper', quantity: 1, unit: 'unidades', unitPrice: 5 },
  ]);
  const [hours, setHours] = useState(5);
  const [fixedCost, setFixedCost] = useState(0);
  const [calculated, setCalculated] = useState(false);

  useEffect(() => {
    if (profile?.fixed_cost_monthly) {
      setFixedCost(profile.fixed_cost_monthly);
    }
  }, [profile?.fixed_cost_monthly]);

  const hourlyRate = profile?.hourly_rate || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const materialTotal = materials.reduce((sum, m) => sum + m.quantity * m.unitPrice, 0);

  const result = calculatePrice({
    materialCost: materialTotal,
    estimatedHours: hours,
    hourlyRate,
    fixedCost,
  });

  const addMaterial = () => {
    setMaterials([...materials, { id: Date.now(), name: '', quantity: 1, unit: 'metros', unitPrice: 0 }]);
  };

  const removeMaterial = (id: number) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  const updateMaterial = (id: number, field: keyof Material, value: string | number) => {
    setMaterials(materials.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleWhatsApp = () => {
    const msg = `*Orçamento - ${pieceName || 'Peça sob medida'}*%0a%0a` +
      materials.map(m => `• ${m.name}: ${formatCurrency(m.quantity * m.unitPrice)}`).join('%0a') +
      `%0a%0a*Materiais:* ${formatCurrency(materialTotal)}%0a` +
      `*Mão de obra:* ${formatCurrency(result.laborCost)}%0a` +
      `*Custos fixos:* ${formatCurrency(result.fixedCost)}%0a` +
      `%0a*💰 Total: ${formatCurrency(result.finalPrice)}*%0a%0a` +
      `_Orçamento gerado pelo AteliêPro_`;
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Calculadora de Precificação</h1>
        <p className="text-slate-500 mt-1">Calcule o preço justo para suas peças</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Formulário - Lado Esquerdo */}
        <div className="lg:col-span-3 space-y-5">
          {/* Nome da peça */}
          <div className="bg-white rounded-2xl border border-rose-100 p-6">
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Peça</label>
            <input type="text" value={pieceName} onChange={e => setPieceName(e.target.value)}
              placeholder="Ex: Vestido de festa, Blazer sob medida..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all" />
          </div>

          {/* Materiais */}
          <div className="bg-white rounded-2xl border border-rose-100 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Materiais</h2>
              <button onClick={addMaterial} className="flex items-center gap-1.5 text-sm font-medium text-rose-600 hover:text-rose-700 transition-colors">
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            </div>
            <div className="space-y-3">
              {materials.map(m => (
                <div key={m.id} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                  <input type="text" value={m.name} onChange={e => updateMaterial(m.id, 'name', e.target.value)}
                    placeholder="Material" className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 outline-none" />
                  <input type="number" value={m.quantity} onChange={e => updateMaterial(m.id, 'quantity', Number(e.target.value))}
                    className="w-16 px-2 py-2 rounded-lg border border-slate-200 text-sm text-center focus:border-rose-500 outline-none" min={0} />
                  <select value={m.unit} onChange={e => updateMaterial(m.id, 'unit', e.target.value)}
                    className="w-24 px-2 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:border-rose-500 outline-none hidden sm:block">
                    <option value="metros">metros</option>
                    <option value="unidades">unid.</option>
                    <option value="kg">kg</option>
                  </select>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400">R$</span>
                    <input type="number" value={m.unitPrice} onChange={e => updateMaterial(m.id, 'unitPrice', Number(e.target.value))}
                      className="w-20 px-2 py-2 rounded-lg border border-slate-200 text-sm focus:border-rose-500 outline-none" min={0} step={0.5} />
                  </div>
                  <span className="text-sm font-medium text-slate-700 w-20 text-right hidden sm:block">{formatCurrency(m.quantity * m.unitPrice)}</span>
                  <button onClick={() => removeMaterial(m.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-3 border-t border-slate-100">
              <span className="text-sm font-medium text-slate-600">Total de Materiais</span>
              <span className="font-bold text-slate-900">{formatCurrency(materialTotal)}</span>
            </div>
          </div>

          {/* Mão de obra e custos */}
          <div className="bg-white rounded-2xl border border-rose-100 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Mão de Obra e Custos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Horas estimadas</label>
                <input type="number" value={hours} onChange={e => setHours(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none" min={0} step={0.5} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor/hora</label>
                <div className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-rose-50 text-rose-700 font-medium">
                  {formatCurrency(hourlyRate)}
                </div>
                {hourlyRate === 0 ? (
                  <p className="text-xs text-amber-600 mt-1 font-medium">Configure seu valor/hora em Configurações</p>
                ) : (
                  <p className="text-xs text-slate-400 mt-1">Definido nas configurações</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Custo fixo rateado (R$)</label>
                <input type="number" value={fixedCost} onChange={e => setFixedCost(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none" min={0} step={0.5} />
              </div>
            </div>
          </div>

          <button onClick={() => setCalculated(true)}
            className="w-full py-3.5 bg-rose-600 text-white font-semibold rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 text-lg">
            <Calculator className="w-5 h-5" /> Calcular Preço
          </button>
        </div>

        {/* Resultado - Lado Direito */}
        <div className="lg:col-span-2">
          <div className={cn(
            "bg-white rounded-2xl border-2 p-6 space-y-5 sticky top-24 transition-all duration-500",
            calculated ? "border-rose-500 shadow-xl shadow-rose-500/10" : "border-rose-100"
          )}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-rose-500" />
              <h2 className="text-lg font-semibold text-slate-900">Preço Sugerido</h2>
            </div>

            <div className={cn("text-center py-6 transition-all duration-500", calculated ? "scale-100 opacity-100" : "scale-95 opacity-70")}>
              <p className="text-sm text-slate-500 mb-2">Preço Final</p>
              <p className="text-4xl md:text-5xl font-extrabold text-rose-600">{formatCurrency(result.finalPrice)}</p>
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Materiais</span>
                <span className="font-medium text-slate-700">{formatCurrency(result.materialCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Mão de obra ({hours}h × {formatCurrency(hourlyRate)})</span>
                <span className="font-medium text-slate-700">{formatCurrency(result.laborCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Custos fixos</span>
                <span className="font-medium text-slate-700">{formatCurrency(result.fixedCost)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-slate-200">
                <span className="font-bold text-slate-900">TOTAL</span>
                <span className="font-bold text-rose-600 text-lg">{formatCurrency(result.finalPrice)}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button className="w-full flex items-center justify-center gap-2 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors opacity-50 cursor-not-allowed" disabled>
                <FileText className="w-4 h-4" /> Gerar Orçamento PDF
                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">Em breve</span>
              </button>
              <button onClick={handleWhatsApp}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors">
                <MessageCircle className="w-4 h-4" /> Enviar por WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
