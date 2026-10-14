'use client';

import { useState, useEffect } from 'react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, Phone, MessageCircle, Plus, Calendar, ShoppingBag, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/use-auth';
import { KANBAN_STATUS_LABELS, KANBAN_STATUS_COLORS, type KanbanStatus, type Client, type Order, type Payment } from '@/types';

export default function ClientePerfilPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();

  const [tab, setTab] = useState<'pedidos' | 'historico'>('pedidos');
  const [client, setClient] = useState<Client | null>(null);
  const [orders, setOrders] = useState<(Order & { paid: number })[]>([]);
  const [history, setHistory] = useState<{ text: string; time: string; color: string; date: Date }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!user || !id) return;
      try {
        setLoading(true);
        setError(null);

        // Fetch client
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', id)
          .single();

        if (clientError) throw clientError;
        setClient(clientData);

        // Fetch orders
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .eq('client_id', id)
          .order('created_at', { ascending: false });

        if (ordersError) throw ordersError;

        // Fetch payments
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select('*, order_id')
          .eq('user_id', user.id);
        
        if (paymentsError) throw paymentsError;

        const orderIds = (ordersData || []).map((o) => o.id);
        const clientPayments = (paymentsData || []).filter((p) => orderIds.includes(p.order_id));

        const ordersWithPaid = (ordersData || []).map(order => {
          const paid = clientPayments
            .filter(p => p.order_id === order.id)
            .reduce((sum, p) => sum + Number(p.amount), 0);
          return { ...order, paid };
        });

        setOrders(ordersWithPaid);

        // Build history from orders (created/updated) and payments
        const hist: { text: string; time: string; color: string; date: Date }[] = [];
        
        (ordersData || []).forEach(o => {
          hist.push({
            text: `Nova encomenda criada - ${o.piece_name}`,
            time: formatDate(o.created_at),
            color: 'bg-amber-500',
            date: new Date(o.created_at)
          });
          
          if (o.updated_at && o.updated_at !== o.created_at) {
            hist.push({
              text: `${o.piece_name} atualizado para ${KANBAN_STATUS_LABELS[o.kanban_status as KanbanStatus]}`,
              time: formatDate(o.updated_at),
              color: 'bg-blue-500',
              date: new Date(o.updated_at)
            });
          }
        });

        clientPayments.forEach(p => {
          hist.push({
            text: `Pagamento recebido - ${formatCurrency(Number(p.amount))}`,
            time: formatDate(p.created_at),
            color: 'bg-emerald-500',
            date: new Date(p.created_at)
          });
        });

        hist.sort((a, b) => b.date.getTime() - a.date.getTime());
        setHistory(hist);

      } catch (err: any) {
        console.error('Erro ao carregar cliente:', err);
        setError('Não foi possível carregar os dados do cliente.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user, id]);

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2);

  const statusColor = (s: string) => {
    return KANBAN_STATUS_COLORS[s as keyof typeof KANBAN_STATUS_COLORS] || 'bg-slate-100 text-slate-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="text-center py-12">
        <p className="text-rose-500 font-medium mb-4">{error || 'Cliente não encontrado'}</p>
        <Link href="/clientes" className="text-rose-600 hover:underline">
          Voltar para lista de clientes
        </Link>
      </div>
    );
  }

  const totalOrders = orders.length;
  const totalPaid = orders.reduce((s, o) => s + o.paid, 0);
  const totalPending = orders.reduce((s, o) => s + (Number(o.final_price) - o.paid), 0);

  return (
    <div className="space-y-6">
      <Link href="/clientes" className="flex items-center gap-2 text-sm text-slate-500 hover:text-rose-600 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar para clientes
      </Link>

      {/* Header do Cliente */}
      <div className="bg-white rounded-2xl border border-rose-100 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-700 font-bold text-2xl uppercase">
            {getInitials(client.name)}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
            {client.phone && (
              <p className="text-slate-500 flex items-center gap-1.5 mt-1"><Phone className="w-4 h-4" /> {client.phone}</p>
            )}
            <p className="text-sm text-slate-400 mt-1">Cliente desde {formatDate(client.created_at)}</p>
            {client.notes && <p className="text-sm text-slate-500 mt-2 bg-slate-50 rounded-lg px-3 py-2">{client.notes}</p>}
          </div>
          <div className="flex gap-2 sm:flex-col">
            {client.phone && (
              <a href={`https://wa.me/55${client.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
            )}
            <Link href="/pedidos/novo" className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors justify-center">
              <Plus className="w-4 h-4" /> Novo Pedido
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-slate-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">{totalOrders}</p>
            <p className="text-xs text-slate-500">Pedidos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
            <p className="text-xs text-slate-500">Total Pago</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalPending)}</p>
            <p className="text-xs text-slate-500">Pendente</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button onClick={() => setTab('pedidos')} className={cn("px-5 py-2 rounded-lg text-sm font-medium transition-all", tab === 'pedidos' ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
          <ShoppingBag className="w-4 h-4 inline mr-1.5" /> Pedidos
        </button>
        <button onClick={() => setTab('historico')} className={cn("px-5 py-2 rounded-lg text-sm font-medium transition-all", tab === 'historico' ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
          <Calendar className="w-4 h-4 inline mr-1.5" /> Histórico
        </button>
      </div>

      {/* Tab Content */}
      {tab === 'pedidos' && (
        <div className="space-y-3">
          {orders.length === 0 ? (
            <p className="text-center text-slate-500 py-6">Nenhum pedido encontrado.</p>
          ) : (
            orders.map(order => (
              <div key={order.id} className="bg-white rounded-2xl border border-rose-100 p-5 hover:border-rose-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{order.piece_name}</h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={cn("text-xs font-medium px-2.5 py-0.5 rounded-full", statusColor(order.kanban_status))}>
                      {KANBAN_STATUS_LABELS[order.kanban_status]}
                    </span>
                    {order.deadline && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {formatDate(order.deadline)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">{formatCurrency(Number(order.final_price))}</p>
                  <p className="text-xs mt-0.5">
                    {order.paid >= Number(order.final_price) ? (
                      <span className="text-emerald-600 font-medium">✓ Pago</span>
                    ) : order.paid > 0 ? (
                      <span className="text-amber-600 font-medium">Pago: {formatCurrency(order.paid)} • Resta: {formatCurrency(Number(order.final_price) - order.paid)}</span>
                    ) : (
                      <span className="text-rose-500 font-medium">Aguardando Pagamento</span>
                    )}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'historico' && (
        <div className="bg-white rounded-2xl border border-rose-100 p-6">
          {history.length === 0 ? (
            <p className="text-center text-slate-500">Nenhum histórico encontrado.</p>
          ) : (
            <div className="relative pl-4 space-y-6 before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-slate-100">
              {history.map((item, i) => (
                <div key={i} className="relative pl-6">
                  <span className={cn("absolute left-[-15px] top-1.5 w-3 h-3 rounded-full ring-4 ring-white z-10", item.color)} />
                  <p className="text-sm font-medium text-slate-700">{item.text}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.time}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
