'use client';

import { useState, useEffect } from 'react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { TrendingUp, Clock, DollarSign, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/use-auth';
import type { Payment, PAYMENT_TYPE_LABELS } from '@/types';

interface TransactionView {
  id: string;
  date: string;
  client: string;
  piece: string;
  type: string;
  amount: number;
  status: 'received' | 'pending';
}

const PAYMENT_TYPE_LABELS_MAP: Record<string, string> = {
  down_payment: 'Sinal',
  final_payment: 'Final',
  full_payment: 'Integral'
};

export default function FinanceiroPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'received' | 'pending'>('all');
  const [transactions, setTransactions] = useState<TransactionView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user?.id) return;
      try {
        setLoading(true);

        // Fetch payments with order and client info
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('*, order:orders(piece_name, final_price, client:clients(name))')
          .eq('user_id', user.id)
          .order('payment_date', { ascending: false });

        if (paymentsError) throw paymentsError;

        // Fetch active orders to calculate pending amounts
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('id, final_price, kanban_status, piece_name, client:clients(name)')
          .eq('user_id', user.id)
          .neq('kanban_status', 'delivered');

        if (ordersError) throw ordersError;

        // Map received payments
        const receivedTxs: TransactionView[] = (payments || []).map((p: any) => ({
          id: p.id,
          date: p.payment_date,
          client: p.order?.client?.name || 'Cliente Desconhecido',
          piece: p.order?.piece_name || 'Peça Desconhecida',
          type: PAYMENT_TYPE_LABELS_MAP[p.payment_type] || p.payment_type,
          amount: Number(p.amount) || 0,
          status: 'received'
        }));

        // Calculate pending payments based on active orders
        const pendingTxs: TransactionView[] = [];
        const paymentsByOrder = (payments || []).reduce((acc: any, p: any) => {
          acc[p.order_id] = (acc[p.order_id] || 0) + Number(p.amount);
          return acc;
        }, {});

        (orders || []).forEach((order: any) => {
          const totalPaid = paymentsByOrder[order.id] || 0;
          const finalPrice = Number(order.final_price) || 0;
          const pendingAmount = finalPrice - totalPaid;

          if (pendingAmount > 0) {
            pendingTxs.push({
              id: `pending-${order.id}`,
              date: new Date().toISOString(), // Use current date for sorting purposes
              client: order.client?.name || 'Cliente Desconhecido',
              piece: order.piece_name || 'Peça Desconhecida',
              type: totalPaid > 0 ? 'Final' : 'Sinal/Integral',
              amount: pendingAmount,
              status: 'pending'
            });
          }
        });

        const allTransactions = [...receivedTxs, ...pendingTxs].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setTransactions(allTransactions);

      } catch (error) {
        console.error('Error loading finance data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user?.id]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Recebido este mês: sum of payments in current month
  const receivedThisMonth = transactions
    .filter(t => t.status === 'received' && new Date(t.date).getMonth() === currentMonth && new Date(t.date).getFullYear() === currentYear)
    .reduce((s, t) => s + t.amount, 0);

  // A Receber: sum of pending amounts
  const pendingAmount = transactions
    .filter(t => t.status === 'pending')
    .reduce((s, t) => s + t.amount, 0);

  // Total do Mês: recebido + a receber
  const total = receivedThisMonth + pendingAmount;
  const receivedPercent = total > 0 ? (receivedThisMonth / total) * 100 : 0;

  const filtered = filter === 'all' ? transactions : transactions.filter(t => t.status === filter);

  const kpis = [
    { label: 'Recebido este mês', value: receivedThisMonth, icon: TrendingUp, gradient: 'from-emerald-400 to-emerald-600', shadow: 'shadow-emerald-500/20' },
    { label: 'A Receber', value: pendingAmount, icon: Clock, gradient: 'from-amber-400 to-amber-600', shadow: 'shadow-amber-500/20' },
    { label: 'Total do Mês', value: total, icon: DollarSign, gradient: 'from-rose-500 to-rose-600', shadow: 'shadow-rose-500/20' },
  ];

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Financeiro</h1>
        <p className="text-slate-500 mt-1">Acompanhe o fluxo de caixa do seu ateliê</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className={cn("relative overflow-hidden rounded-2xl p-6 text-white shadow-lg", `bg-gradient-to-br ${kpi.gradient} ${kpi.shadow}`)}>
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <kpi.icon size={56} strokeWidth={1.5} />
            </div>
            <div className="relative z-10">
              <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-md mb-3">
                <kpi.icon size={20} className="text-white" />
              </div>
              <p className="text-2xl md:text-3xl font-bold">{formatCurrency(kpi.value)}</p>
              <p className="text-white/80 text-sm font-medium mt-1">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Barra de Progresso */}
      <div className="bg-white rounded-2xl border border-rose-100 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Resumo de Pagamentos</h2>
        <div className="flex items-center gap-4 mb-3">
          <span className="text-sm font-medium text-emerald-600">Recebido: {receivedPercent.toFixed(0)}%</span>
          <span className="text-sm font-medium text-amber-600">Pendente: {(100 - receivedPercent).toFixed(0)}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${receivedPercent}%` }} />
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-400">
          <span>{formatCurrency(receivedThisMonth)}</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Transações */}
      <div className="bg-white rounded-2xl border border-rose-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h2 className="text-lg font-semibold text-slate-900">Últimas Transações</h2>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {[
              { key: 'all' as const, label: 'Todas' },
              { key: 'received' as const, label: 'Recebidas' },
              { key: 'pending' as const, label: 'Pendentes' },
            ].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all", filter === f.key ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider pb-3">Data</th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider pb-3">Cliente</th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider pb-3">Peça</th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider pb-3">Tipo</th>
                <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider pb-3">Valor</th>
                <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(tx => (
                <tr key={tx.id} className="hover:bg-rose-50/30 transition-colors">
                  <td className="py-3.5 text-sm text-slate-600">{formatDate(tx.date)}</td>
                  <td className="py-3.5 text-sm font-medium text-slate-900">{tx.client}</td>
                  <td className="py-3.5 text-sm text-slate-600">{tx.piece}</td>
                  <td className="py-3.5">
                    <span className={cn("text-xs font-medium px-2.5 py-0.5 rounded-full",
                      tx.type === 'Sinal' ? 'bg-amber-100 text-amber-700' : tx.type === 'Integral' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                    )}>{tx.type}</span>
                  </td>
                  <td className="py-3.5 text-sm font-semibold text-right flex items-center justify-end gap-1">
                    {tx.status === 'received' ? <ArrowUpRight className="w-4 h-4 text-emerald-500" /> : <ArrowDownRight className="w-4 h-4 text-amber-500" />}
                    {formatCurrency(tx.amount)}
                  </td>
                  <td className="py-3.5 text-right">
                    <span className={cn("text-xs font-medium px-2.5 py-0.5 rounded-full",
                      tx.status === 'received' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    )}>
                      {tx.status === 'received' ? 'Recebido' : 'Pendente'}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-sm">
                    Nenhuma transação encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {filtered.map(tx => (
            <div key={tx.id} className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900 text-sm">{tx.client}</p>
                <p className="text-xs text-slate-500 mt-0.5">{tx.piece} • {tx.type}</p>
                <p className="text-xs text-slate-400 mt-0.5">{formatDate(tx.date)}</p>
              </div>
              <div className="text-right">
                <p className={cn("font-bold text-sm", tx.status === 'received' ? 'text-emerald-600' : 'text-amber-600')}>
                  {tx.status === 'received' ? '+' : ''}{formatCurrency(tx.amount)}
                </p>
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block",
                  tx.status === 'received' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                )}>
                  {tx.status === 'received' ? 'Recebido' : 'Pendente'}
                </span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-slate-500 text-sm">
              Nenhuma transação encontrada
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
