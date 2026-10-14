'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/use-auth';
import { cn, formatCurrency } from '@/lib/utils';
import { calculateHourlyRate, SUBSCRIPTION_PLANS } from '@/types';
import { Save, Upload, Crown, Check, Loader2, AlertCircle } from 'lucide-react';

export default function ConfiguracoesPage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  
  const [atelierName, setAtelierName] = useState('Meu Ateliê');
  const [userName, setUserName] = useState('');
  const [desiredSalary, setDesiredSalary] = useState(2640);
  const [workDays, setWorkDays] = useState(5);
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [fixedCost, setFixedCost] = useState(200);
  const [currentPlan, setCurrentPlan] = useState<'free' | 'solo' | 'atelier'>('free');
  
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setAtelierName(profile.atelier_name || 'Meu Ateliê');
      setUserName(profile.name || '');
      setDesiredSalary(profile.desired_salary ?? 2640);
      setWorkDays(profile.work_days_per_week ?? 5);
      setHoursPerDay(profile.hours_per_day ?? 8);
      setFixedCost(profile.fixed_cost_monthly ?? 200);
      setCurrentPlan((profile.subscription_plan as 'free' | 'solo' | 'atelier') || 'free');
    }
  }, [profile]);

  const hourlyRate = calculateHourlyRate(desiredSalary, workDays, hoursPerDay);

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    setError(null);
    setSaved(false);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          name: userName,
          atelier_name: atelierName,
          desired_salary: desiredSalary,
          work_days_per_week: workDays,
          hours_per_day: hoursPerDay,
          hourly_rate: hourlyRate,
          fixed_cost_monthly: fixedCost,
          subscription_plan: currentPlan,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-500 mt-1">Gerencie o perfil do seu ateliê e preferências</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-6 py-4 rounded-xl border border-red-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {saved && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-slideUp">
          <Check className="w-5 h-5" /> Configurações salvas!
        </div>
      )}

      {/* Perfil do Ateliê */}
      <div className="bg-white rounded-2xl border border-rose-100 p-6 space-y-5">
        <h2 className="text-lg font-semibold text-slate-900">Perfil do Ateliê</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Ateliê</label>
            <input type="text" value={atelierName} onChange={e => setAtelierName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Seu Nome</label>
            <input type="text" value={userName} onChange={e => setUserName(e.target.value)} placeholder="Seu nome completo"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <input type="email" value={user?.email || ''} disabled
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Logo do Ateliê</label>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                <Upload className="w-5 h-5" />
              </div>
              <button className="px-4 py-2 text-sm font-medium text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-50 transition-colors">
                Enviar Logo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Valor da Hora */}
      <div className="bg-white rounded-2xl border border-rose-100 p-6 space-y-5">
        <h2 className="text-lg font-semibold text-slate-900">Valor da Hora de Trabalho</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Salário mensal desejado (R$)</label>
            <input type="number" value={desiredSalary} onChange={e => setDesiredSalary(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Dias por semana</label>
            <input type="number" min={1} max={7} value={workDays} onChange={e => setWorkDays(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Horas por dia</label>
            <input type="number" min={1} max={24} value={hoursPerDay} onChange={e => setHoursPerDay(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all" />
          </div>
        </div>
        <div className="bg-rose-50 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-rose-700 font-medium">Seu valor/hora calculado:</p>
            <p className="text-xs text-rose-500 mt-0.5">Este valor será usado automaticamente na calculadora de precificação</p>
          </div>
          <p className="text-2xl font-bold text-rose-700">{formatCurrency(hourlyRate)}</p>
        </div>
      </div>

      {/* Custos Fixos */}
      <div className="bg-white rounded-2xl border border-rose-100 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Custos Fixos Mensais</h2>
        <div className="max-w-sm">
          <label className="block text-sm font-medium text-slate-700 mb-1">Custo fixo mensal (energia, aluguel, etc.)</label>
          <input type="number" value={fixedCost} onChange={e => setFixedCost(Number(e.target.value))}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all" />
        </div>
        <p className="text-sm text-slate-500">Este valor será rateado nos seus pedidos para garantir que seus custos operacionais sejam cobertos.</p>
      </div>

      {/* Planos */}
      <div className="bg-white rounded-2xl border border-rose-100 p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-rose-600" />
          <h2 className="text-lg font-semibold text-slate-900">Plano Atual</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SUBSCRIPTION_PLANS.map(plan => (
            <div key={plan.id} className={cn(
              "rounded-2xl border-2 p-6 transition-all",
              currentPlan === plan.id ? "border-rose-500 bg-rose-50/50 shadow-lg shadow-rose-500/10" : "border-slate-200 hover:border-rose-200"
            )}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-900">{plan.name}</h3>
                {currentPlan === plan.id && (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-rose-500 text-white">Atual</span>
                )}
              </div>
              <p className="text-3xl font-bold text-slate-900 mb-4">
                {plan.price === 0 ? 'Grátis' : <>{formatCurrency(plan.price)}<span className="text-sm font-normal text-slate-500">/mês</span></>}
              </p>
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                    <Check className="w-4 h-4 text-rose-500 shrink-0" /> {feature}
                  </li>
                ))}
              </ul>
              <button onClick={() => setCurrentPlan(plan.id as 'free' | 'solo' | 'atelier')} className={cn(
                "w-full py-2.5 rounded-xl font-medium text-sm transition-all",
                currentPlan === plan.id ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-rose-100 hover:text-rose-700"
              )}>
                {currentPlan === plan.id ? 'Plano Selecionado' : 'Selecionar'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-3 bg-rose-600 text-white font-medium rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20 hover:shadow-rose-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  );
}
