'use client';

import { useState, useEffect } from 'react';
import { cn, formatCurrency } from '@/lib/utils';
import { KANBAN_STATUS_LABELS, KANBAN_COLUMNS, type KanbanStatus, type Order, type Client } from '@/types';
import { Plus, Calendar, GripVertical, X, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/use-auth';

const COLUMN_COLORS: Record<KanbanStatus, { header: string; border: string }> = {
  queue: { header: 'bg-slate-100 text-slate-700', border: 'border-t-slate-300' },
  cutting: { header: 'bg-amber-100 text-amber-700', border: 'border-t-amber-400' },
  sewing: { header: 'bg-rose-100 text-rose-700', border: 'border-t-rose-400' },
  fitting: { header: 'bg-purple-100 text-purple-700', border: 'border-t-purple-400' },
  ready: { header: 'bg-emerald-100 text-emerald-700', border: 'border-t-emerald-400' },
  delivered: { header: 'bg-green-100 text-green-700', border: 'border-t-green-400' },
};

type ExtendedOrder = Order & { 
  client?: { name: string } | null; 
  payments?: { amount: number }[] | null;
};

export default function PedidosPage() {
  const { user } = useAuth();
  
  const [orders, setOrders] = useState<ExtendedOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newOrder, setNewOrder] = useState({ client_id: '', pieceName: '', description: '', deadline: '', price: 0, downPayment: 0 });
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchOrders();
      fetchClients();
    }
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*, client:clients(name), payments(amount)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Transform data if needed, or cast it
      setOrders((data as unknown) as ExtendedOrder[]);
    } catch (err) {
      console.error('Erro ao buscar pedidos:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name');
        
      if (error) throw error;
      setClients(data as Client[]);
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
    }
  };

  const moveOrder = async (orderId: string, newStatus: KanbanStatus) => {
    if (!user) return;
    
    // Optimistic update
    const previousOrders = [...orders];
    setOrders(orders.map(o => o.id === orderId ? { ...o, kanban_status: newStatus } : o));
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({ kanban_status: newStatus })
        .eq('id', orderId);
        
      if (error) throw error;
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      // Revert on error
      setOrders(previousOrders);
      alert('Erro ao atualizar status do pedido.');
    }
  };

  const getPaidAmount = (order: ExtendedOrder) => {
    if (!order.payments) return 0;
    return order.payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  };

  const getPaymentBadge = (order: ExtendedOrder) => {
    const paid = getPaidAmount(order);
    const price = order.final_price || 0;
    
    if (paid >= price && price > 0) return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Pago</span>;
    if (paid > 0) return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Sinal {formatCurrency(paid)}</span>;
    return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">Pendente</span>;
  };

  const getDeadlineColor = (deadline: string | null) => {
    if (!deadline) return 'text-slate-500';
    const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
    if (diff < 0) return 'text-red-600 font-semibold';
    if (diff <= 2) return 'text-amber-600';
    return 'text-slate-500';
  };

  const formatDisplayDate = (dateStr: string | null) => {
    if (!dateStr) return 'Sem prazo';
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const handleCreateOrder = async () => {
    if (!newOrder.client_id || !newOrder.pieceName || !user) return;
    
    setIsSubmitting(true);
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          client_id: newOrder.client_id,
          piece_name: newOrder.pieceName,
          description: newOrder.description || '',
          deadline: newOrder.deadline || null,
          final_price: newOrder.price || 0,
          kanban_status: 'queue',
          material_cost: 0,
          estimated_hours: 0,
          fixed_cost: 0,
          reference_photo_url: '',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      if (newOrder.downPayment > 0) {
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            order_id: orderData.id,
            user_id: user.id,
            amount: newOrder.downPayment,
            payment_type: 'down_payment',
            payment_date: new Date().toISOString(),
            notes: 'Sinal inicial'
          });
        if (paymentError) throw paymentError;
      }

      await fetchOrders();
      setNewOrder({ client_id: '', pieceName: '', description: '', deadline: '', price: 0, downPayment: 0 });
      setShowModal(false);
    } catch (err) {
      console.error('Erro ao criar pedido:', err);
      alert('Erro ao criar pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    setDraggedId(orderId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => { 
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move'; 
  };

  const handleDrop = (e: React.DragEvent, targetStatus: KanbanStatus) => {
    e.preventDefault();
    if (draggedId) { 
      moveOrder(draggedId, targetStatus); 
      setDraggedId(null); 
    }
  };

  const nextStatus = (current: KanbanStatus): KanbanStatus | null => {
    const idx = KANBAN_COLUMNS.indexOf(current);
    return idx < KANBAN_COLUMNS.length - 1 ? KANBAN_COLUMNS[idx + 1] : null;
  };
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-rose-600 animate-spin" />
        <p className="mt-4 text-slate-500">Carregando pedidos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Quadro de Pedidos</h1>
          <p className="text-slate-500 mt-1">{orders.filter(o => o.kanban_status !== 'delivered').length} pedidos ativos</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white font-medium rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20">
          <Plus className="w-5 h-5" /> Novo Pedido
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        {KANBAN_COLUMNS.map(status => {
          const columnOrders = orders.filter(o => o.kanban_status === status);
          return (
            <div key={status}
              className={cn("min-w-[280px] md:min-w-0 md:flex-1 flex flex-col bg-slate-50/50 rounded-2xl border border-slate-200/60 border-t-4", COLUMN_COLORS[status].border)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between p-3">
                <span className={cn("text-sm font-semibold px-3 py-1 rounded-lg", COLUMN_COLORS[status].header)}>
                  {KANBAN_STATUS_LABELS[status]}
                </span>
                <span className="text-xs font-medium text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                  {columnOrders.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 p-2 space-y-2 min-h-[200px]">
                {columnOrders.map(order => (
                  <div key={order.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, order.id)}
                    className={cn(
                      "bg-white rounded-xl p-4 shadow-sm border border-slate-100 cursor-grab active:cursor-grabbing hover:border-rose-200 hover:shadow-md transition-all group",
                      draggedId === order.id && "opacity-50 scale-95"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-mono text-slate-400">
                        {order.id.slice(0, 8)}
                      </span>
                      <GripVertical className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block" />
                    </div>
                    <h4 className="font-semibold text-slate-900 mt-1 text-sm">{order.piece_name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{order.client?.name || 'Cliente removido'}</p>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-50">
                      <span className={cn("text-xs flex items-center gap-1", getDeadlineColor(order.deadline))}>
                        <Calendar className="w-3 h-3" />
                        {formatDisplayDate(order.deadline)}
                      </span>
                      {getPaymentBadge(order)}
                    </div>
                    <p className="text-xs font-medium text-slate-700 mt-2">{formatCurrency(order.final_price || 0)}</p>

                    {/* Mobile: Move button */}
                    {nextStatus(order.kanban_status) && (
                      <button onClick={() => moveOrder(order.id, nextStatus(order.kanban_status)!)}
                        className="w-full mt-2 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors flex items-center justify-center gap-1 md:hidden">
                        Mover para {KANBAN_STATUS_LABELS[nextStatus(order.kanban_status)!]} <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Novo Pedido */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 animate-slideUp">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Novo Pedido</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cliente *</label>
                <select value={newOrder.client_id} onChange={e => setNewOrder({ ...newOrder, client_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-rose-500 outline-none">
                  <option value="">Selecione...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Peça *</label>
                <input type="text" value={newOrder.pieceName} onChange={e => setNewOrder({ ...newOrder, pieceName: e.target.value })}
                  placeholder="Ex: Vestido de festa"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                <textarea value={newOrder.description} onChange={e => setNewOrder({ ...newOrder, description: e.target.value })}
                  rows={2} placeholder="Detalhes do pedido..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 outline-none resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prazo de Entrega</label>
                  <input type="date" value={newOrder.deadline} onChange={e => setNewOrder({ ...newOrder, deadline: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Preço Final (R$)</label>
                  <input type="number" value={newOrder.price || ''} onChange={e => setNewOrder({ ...newOrder, price: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 outline-none" min={0} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sinal Recebido (R$) - opcional</label>
                <input type="number" value={newOrder.downPayment || ''} onChange={e => setNewOrder({ ...newOrder, downPayment: Number(e.target.value) })}
                  placeholder="0" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 outline-none" min={0} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button disabled={isSubmitting} onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancelar</button>
              <button disabled={isSubmitting} onClick={handleCreateOrder} className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-all flex items-center justify-center gap-2">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Pedido'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
