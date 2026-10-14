'use client';

import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Search, Plus, Phone, MessageCircle, X, User, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/use-auth';
import type { Client } from '@/types';

type ClientWithStats = Client & {
  orders: number;
  totalSpent: number;
};

export default function ClientesPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', phone: '', notes: '' });
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchClients();
    }
  }, [user]);

  const fetchClients = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      // Fetch orders to compute stats
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, final_price, client_id')
        .eq('user_id', user.id);

      if (ordersError) throw ordersError;

      const clientsWithStats: ClientWithStats[] = (clientsData || []).map(client => {
        const clientOrders = (ordersData || []).filter(o => o.client_id === client.id);
        const totalSpent = clientOrders.reduce((sum, order) => sum + (Number(order.final_price) || 0), 0);
        
        return {
          ...client,
          orders: clientOrders.length,
          totalSpent
        };
      });

      setClients(clientsWithStats);
    } catch (error) {
      console.error('Error fetching clients:', error);
      alert('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search))
  );

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const handleSave = async () => {
    if (!newClient.name || !user) return;
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('clients')
        .insert({
          user_id: user.id,
          name: newClient.name,
          phone: newClient.phone,
          notes: newClient.notes
        });

      if (error) throw error;

      await fetchClients();
      setNewClient({ name: '', phone: '', notes: '' });
      setShowModal(false);
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Erro ao salvar cliente');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Clientes</h1>
          <p className="text-slate-500 mt-1">{clients.length} clientes cadastrados</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white font-medium rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20">
          <Plus className="w-5 h-5" /> Novo Cliente
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou telefone..."
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all bg-white" />
      </div>

      {/* Grid de Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(client => (
          <div key={client.id} className="bg-white rounded-2xl border border-rose-100 p-5 hover:border-rose-300 hover:shadow-lg hover:shadow-rose-500/5 hover:-translate-y-1 transition-all duration-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 font-bold text-sm shrink-0">
                {getInitials(client.name)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 truncate">{client.name}</h3>
                <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                  <Phone className="w-3.5 h-3.5" /> {client.phone || 'Sem telefone'}
                </p>
                {client.notes && (
                  <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{client.notes}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-100">
              <span className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                <ShoppingBag className="w-3 h-3" /> {client.orders} pedidos
              </span>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                {formatCurrency(client.totalSpent)}
              </span>
            </div>
            <div className="flex gap-2 mt-3">
              {client.phone ? (
                <a href={`https://wa.me/55${client.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
              ) : (
                <div className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 text-slate-400 rounded-lg text-sm font-medium">
                  <MessageCircle className="w-4 h-4" /> s/ WhatsApp
                </div>
              )}
              <Link href={`/clientes/${client.id}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-rose-50 text-rose-600 rounded-lg text-sm font-medium hover:bg-rose-100 transition-colors">
                <User className="w-4 h-4" /> Ver Perfil
              </Link>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && !loading && (
        <div className="text-center py-16">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhum cliente encontrado</p>
          <p className="text-sm text-slate-400 mt-1">Tente buscar com outro termo</p>
        </div>
      )}

      {/* Modal Novo Cliente */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 animate-slideUp">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Novo Cliente</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600 transition-colors" disabled={saving}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo *</label>
                <input type="text" value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                  placeholder="Nome da cliente"
                  disabled={saving}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                <input type="tel" value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  disabled={saving}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
                <textarea value={newClient.notes} onChange={e => setNewClient({ ...newClient, notes: e.target.value })}
                  rows={3} placeholder="Preferências, restrições, etc."
                  disabled={saving}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none resize-none" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} disabled={saving} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving || !newClient.name} className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-all disabled:opacity-50 flex justify-center items-center">
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Salvar Cliente'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
