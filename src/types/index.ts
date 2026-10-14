// ============================================
// AteliêPro - Tipos TypeScript
// ============================================

// ---- Perfil do Usuário ----
export interface Profile {
  id: string;
  email: string;
  name: string;
  atelier_name: string;
  atelier_logo_url: string;
  desired_salary: number;
  work_days_per_week: number;
  hours_per_day: number;
  hourly_rate: number;
  fixed_cost_monthly: number;
  subscription_plan: 'free' | 'solo' | 'atelier';
  created_at: string;
  updated_at: string;
}

// ---- Cliente ----
export interface Client {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  photo_url: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

// ---- Status do Kanban ----
export type KanbanStatus =
  | 'queue'      // Na Fila
  | 'cutting'    // Cortando / Modelando
  | 'sewing'     // Na Máquina (Costura)
  | 'fitting'    // Ajustes e Provas
  | 'ready'      // Pronto para Entrega
  | 'delivered'; // Entregue e Pago

export const KANBAN_STATUS_LABELS: Record<KanbanStatus, string> = {
  queue: 'Na Fila',
  cutting: 'Cortando',
  sewing: 'Costurando',
  fitting: 'Prova',
  ready: 'Pronto',
  delivered: 'Entregue',
};

export const KANBAN_STATUS_COLORS: Record<KanbanStatus, string> = {
  queue: 'bg-slate-100 text-slate-700',
  cutting: 'bg-amber-100 text-amber-700',
  sewing: 'bg-rose-100 text-rose-700',
  fitting: 'bg-purple-100 text-purple-700',
  ready: 'bg-emerald-100 text-emerald-700',
  delivered: 'bg-green-100 text-green-700',
};

export const KANBAN_COLUMNS: KanbanStatus[] = [
  'queue',
  'cutting',
  'sewing',
  'fitting',
  'ready',
  'delivered',
];

// ---- Pedido / Ordem de Serviço ----
export interface Order {
  id: string;
  user_id: string;
  client_id: string;
  piece_name: string;
  description: string;
  material_cost: number;
  estimated_hours: number;
  fixed_cost: number;
  final_price: number;
  kanban_status: KanbanStatus;
  deadline: string | null;
  reference_photo_url: string;
  created_at: string;
  updated_at: string;
  // Relações (populadas via join)
  client?: Client;
  materials?: OrderMaterial[];
  photos?: OrderPhoto[];
  payments?: Payment[];
}

// ---- Material do Pedido ----
export interface OrderMaterial {
  id: string;
  order_id: string;
  material_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  created_at: string;
}

// ---- Foto do Pedido ----
export interface OrderPhoto {
  id: string;
  order_id: string;
  photo_url: string;
  description: string;
  created_at: string;
}

// ---- Tipo de Pagamento ----
export type PaymentType = 'down_payment' | 'final_payment' | 'full_payment';

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  down_payment: 'Sinal',
  final_payment: 'Pagamento Final',
  full_payment: 'Pagamento Integral',
};

// ---- Pagamento ----
export interface Payment {
  id: string;
  order_id: string;
  user_id: string;
  amount: number;
  payment_type: PaymentType;
  payment_date: string;
  notes: string;
  created_at: string;
}

// ---- Helpers de Precificação ----
export interface PricingInput {
  materialCost: number;
  estimatedHours: number;
  hourlyRate: number;
  fixedCost: number;
}

export interface PricingResult {
  materialCost: number;
  laborCost: number;
  fixedCost: number;
  finalPrice: number;
}

/**
 * Calcula o preço final sugerido.
 * Fórmula: Preço Final = Materiais + (Horas × Valor/Hora) + Custo Fixo
 */
export function calculatePrice(input: PricingInput): PricingResult {
  const laborCost = input.estimatedHours * input.hourlyRate;
  const finalPrice = input.materialCost + laborCost + input.fixedCost;

  return {
    materialCost: input.materialCost,
    laborCost,
    fixedCost: input.fixedCost,
    finalPrice,
  };
}

/**
 * Calcula o valor da hora com base no salário desejado.
 * Fórmula: Valor/Hora = Salário Desejado / (Dias/Semana × 4 semanas × Horas/Dia)
 */
export function calculateHourlyRate(
  desiredSalary: number,
  workDaysPerWeek: number,
  hoursPerDay: number
): number {
  const totalHoursPerMonth = workDaysPerWeek * 4 * hoursPerDay;
  if (totalHoursPerMonth <= 0) return 0;
  return desiredSalary / totalHoursPerMonth;
}

// ---- Dashboard ----
export interface DashboardMetrics {
  monthlyRevenue: number;
  todayDeliveries: number;
  pendingAmount: number;
  activeOrders: number;
}

// ---- Plano de Assinatura ----
export interface SubscriptionPlan {
  id: 'free' | 'solo' | 'atelier';
  name: string;
  price: number;
  maxClients: number | null;
  maxOrdersPerMonth: number | null;
  features: string[];
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Gratuito',
    price: 0,
    maxClients: 5,
    maxOrdersPerMonth: 3,
    features: [
      'Até 5 clientes',
      'Até 3 pedidos/mês',
      'Calculadora de preço',
      'Quadro Kanban',
    ],
  },
  {
    id: 'solo',
    name: 'Costureira Solo',
    price: 29.90,
    maxClients: null,
    maxOrdersPerMonth: null,
    features: [
      'Clientes ilimitados',
      'Pedidos ilimitados',
      'Geração de PDF',
      'Orçamento WhatsApp',
      'Suporte prioritário',
    ],
  },
  {
    id: 'atelier',
    name: 'Ateliê',
    price: 59.90,
    maxClients: null,
    maxOrdersPerMonth: null,
    features: [
      'Tudo do Solo',
      'Multi-usuário (equipe)',
      'Relatórios gerenciais',
      'Suporte VIP',
    ],
  },
];
