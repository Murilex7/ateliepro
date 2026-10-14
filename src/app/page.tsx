'use client';

import { useEffect, useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Package, 
  Clock, 
  ClipboardList 
} from 'lucide-react';
import { formatCurrency, cn, formatDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/use-auth';
import Link from 'next/link';

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'agora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days} dia${days > 1 ? 's' : ''}`;
}

const statusConfig = {
  quote: { label: 'Orçamento', color: 'bg-neutral-100 text-neutral-700' },
  todo: { label: 'A Fazer', color: 'bg-rose-100 text-rose-700' },
  cutting: { label: 'Corte', color: 'bg-orange-100 text-orange-700' },
  sewing: { label: 'Costura', color: 'bg-blue-100 text-blue-700' },
  fitting: { label: 'Prova', color: 'bg-purple-100 text-purple-700' },
  ready: { label: 'Pronto', color: 'bg-emerald-100 text-emerald-700' },
  delivered: { label: 'Entregue', color: 'bg-neutral-100 text-neutral-500' },
};

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const { user, profile, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);

      const [ordersRes, paymentsRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*, client:clients(name)')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false }),
        supabase
          .from('payments')
          .select('*')
          .eq('user_id', user.id)
      ]);

      if (ordersRes.data) setOrders(ordersRes.data);
      if (paymentsRes.data) setPayments(paymentsRes.data);
      
      setLoading(false);
    }

    if (!authLoading) {
      fetchData();
    }
  }, [user, authLoading]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const dashboardData = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    
    // Faturamento do Mês
    const thisMonthPayments = payments.filter(p => p.payment_date >= startOfMonth && p.payment_date <= endOfMonth);
    const revenue = thisMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    const todayStr = new Date().toISOString().split('T')[0];

    // Entregas Hoje
    const deliveriesToday = orders.filter(o => 
      o.deadline && 
      o.deadline.startsWith(todayStr) && 
      ['ready', 'fitting'].includes(o.kanban_status)
    ).length;

    // Pedidos Ativos
    const activeOrders = orders.filter(o => o.kanban_status !== 'delivered');
    const activeOrdersCount = activeOrders.length;

    // Pendente
    let pendingAmount = 0;
    activeOrders.forEach(order => {
      const orderPayments = payments.filter(p => p.order_id === order.id);
      const paid = orderPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      pendingAmount += (Number(order.final_price || 0) - paid);
    });

    // Próximas Entregas
    const upcoming = orders
      .filter(o => o.deadline && o.deadline >= todayStr && o.kanban_status !== 'delivered')
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
      .slice(0, 4);

    // Atividade Recente
    const recent = [...orders].slice(0, 5).map((o, idx) => {
      const colors = ['bg-blue-500', 'bg-rose-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500'];
      return {
        id: o.id,
        text: `${o.client?.name || 'Cliente'} - ${o.piece_name || 'Peça'} atualizado`,
        time: timeAgo(o.updated_at),
        color: colors[idx % colors.length]
      };
    });

    return {
      revenue,
      deliveriesToday,
      pendingAmount,
      activeOrdersCount,
      upcoming,
      recent
    };
  }, [orders, payments]);

  if (authLoading || (loading && orders.length === 0)) {
    return (
      <div className="space-y-8 animate-pulse p-4 md:p-8">
        <div className="h-20 bg-neutral-200 rounded-lg w-1/2"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
           {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-neutral-200 rounded-2xl"></div>)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
           <div className="h-64 bg-neutral-200 rounded-3xl"></div>
           <div className="h-64 bg-neutral-200 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  const metrics = [
    {
      title: 'Faturamento do Mês',
      value: formatCurrency(dashboardData.revenue),
      icon: TrendingUp,
      gradient: 'from-rose-500 to-rose-600',
      shadow: 'shadow-rose-500/20',
      delay: 'delay-100',
    },
    {
      title: 'Entregas Hoje',
      value: dashboardData.deliveriesToday.toString(),
      icon: Package,
      gradient: 'from-emerald-400 to-emerald-600',
      shadow: 'shadow-emerald-500/20',
      delay: 'delay-150',
    },
    {
      title: 'Pendente',
      value: formatCurrency(dashboardData.pendingAmount > 0 ? dashboardData.pendingAmount : 0),
      icon: Clock,
      gradient: 'from-amber-400 to-amber-600',
      shadow: 'shadow-amber-500/20',
      delay: 'delay-200',
    },
    {
      title: 'Pedidos Ativos',
      value: dashboardData.activeOrdersCount.toString(),
      icon: ClipboardList,
      gradient: 'from-blue-400 to-blue-600',
      shadow: 'shadow-blue-500/20',
      delay: 'delay-250',
    },
  ];

  const isEmpty = orders.length === 0;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <header 
        className={cn(
          "transition-all duration-700 ease-out transform",
          mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        )}
      >
        <h1 className="text-3xl md:text-4xl font-extrabold text-neutral-900 tracking-tight">
          {getGreeting()}, {profile?.name || 'Costureira'}! <span className="text-rose-600">✨</span>
        </h1>
        <p className="text-neutral-500 mt-2 font-medium">
          Aqui está o resumo do seu ateliê hoje.
        </p>
      </header>

      {/* Metrics Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {metrics.map((metric, idx) => (
          <div 
            key={idx}
            className={cn(
              "relative overflow-hidden rounded-2xl p-6 text-white shadow-lg transition-all duration-700 ease-out hover:scale-[1.02] hover:-translate-y-1 group",
              `bg-gradient-to-br ${metric.gradient} ${metric.shadow}`,
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
            style={{ transitionDelay: `${idx * 100}ms` }}
          >
            <div className="absolute top-0 right-0 p-4 opacity-20 transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
              <metric.icon size={64} strokeWidth={1.5} />
            </div>
            <div className="relative z-10 flex flex-col h-full justify-between space-y-4">
              <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-md">
                <metric.icon size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">{metric.value}</h3>
                <p className="text-white/80 text-sm font-medium">{metric.title}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      {isEmpty ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-neutral-100">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
             <ClipboardList className="w-8 h-8 text-rose-600" />
          </div>
          <h2 className="text-xl font-bold text-neutral-800 mb-2">Bem-vinda ao seu novo Ateliê!</h2>
          <p className="text-neutral-500 max-w-md mx-auto mb-6">Você ainda não tem nenhum pedido cadastrado. Comece adicionando seus clientes e criando seu primeiro pedido.</p>
          <Link href="/pedidos/novo" className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors">
            Novo Pedido
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          
          {/* Upcoming Deliveries */}
          <section 
            className={cn(
              "bg-white rounded-3xl p-6 shadow-sm border border-neutral-100 transition-all duration-1000 ease-out delay-500 flex flex-col",
              mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
            )}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-neutral-800">Próximas Entregas</h2>
              <Link href="/pedidos" className="text-sm font-medium text-rose-600 hover:text-rose-700 transition-colors">Ver todas</Link>
            </div>
            
            <div className="space-y-4 flex-1">
              {dashboardData.upcoming.length > 0 ? (
                dashboardData.upcoming.map((delivery) => {
                  const statusInfo = statusConfig[delivery.kanban_status as keyof typeof statusConfig] || statusConfig.todo;
                  return (
                    <div 
                      key={delivery.id} 
                      className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50/80 border-l-4 border-l-rose-400 hover:bg-neutral-100 transition-colors"
                    >
                      <div>
                        <h4 className="font-semibold text-neutral-900">{delivery.client?.name || 'Cliente'}</h4>
                        <p className="text-sm text-neutral-500 mt-1">{delivery.piece_name} • <span className="font-medium text-neutral-700">{formatDate(delivery.deadline!)}</span></p>
                      </div>
                      <span className={cn("px-3 py-1 text-xs font-semibold rounded-full", statusInfo.color)}>
                        {statusInfo.label}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-neutral-500 min-h-[150px]">
                  <Package className="w-8 h-8 mb-2 opacity-20" />
                  <p>Nenhuma entrega próxima</p>
                </div>
              )}
            </div>
          </section>

          {/* Recent Activity */}
          <section 
            className={cn(
              "bg-white rounded-3xl p-6 shadow-sm border border-neutral-100 transition-all duration-1000 ease-out delay-700 flex flex-col",
              mounted ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
            )}
          >
            <h2 className="text-xl font-bold text-neutral-800 mb-6">Atividade Recente</h2>
            
            {dashboardData.recent.length > 0 ? (
              <div className="relative pl-4 space-y-6 before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-neutral-100 flex-1">
                {dashboardData.recent.map((activity, idx) => (
                  <div key={activity.id} className="relative pl-6">
                    <span className={cn("absolute left-[-15px] top-1.5 w-3 h-3 rounded-full ring-4 ring-white z-10", activity.color)} />
                    <p className="text-sm font-medium text-neutral-700 leading-relaxed">
                      {activity.text}
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">{activity.time}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-neutral-500 flex-1 min-h-[150px]">
                <Clock className="w-8 h-8 mb-2 opacity-20" />
                <p>Nenhuma atividade recente</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
