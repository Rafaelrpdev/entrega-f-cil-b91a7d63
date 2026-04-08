import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, Target,
  ArrowUpCircle, ArrowDownCircle, Plus, Wallet, PiggyBank,
  Receipt, CreditCard, BarChart3, Activity, Download
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

const EXPENSE_CATEGORIES = [
  'Compra de botijões', 'Pagamento de fornecedor', 'Combustível',
  'Salários', 'Despesas operacionais', 'Aluguel', 'Manutenção', 'Outros'
];

const GOAL_TYPES: Record<string, string> = {
  daily_sales: 'Meta diária de vendas',
  monthly_revenue: 'Meta mensal de faturamento',
  monthly_profit: 'Meta mensal de lucro',
};

const CHART_COLORS = ['hsl(210,70%,55%)', 'hsl(145,60%,42%)', 'hsl(0,72%,55%)', 'hsl(38,92%,55%)'];

export default function AdminFinancialHealth() {
  const qc = useQueryClient();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const prevMonthStart = startOfMonth(subMonths(now, 1));
  const prevMonthEnd = endOfMonth(subMonths(now, 1));

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [debtOpen, setDebtOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [expForm, setExpForm] = useState({ date: format(now, 'yyyy-MM-dd'), description: '', amount: '', category: 'Outros' });
  const [debtForm, setDebtForm] = useState({ creditor: '', total_amount: '', paid_amount: '0', due_date: '' });
  const [goalForm, setGoalForm] = useState({ name: '', goal_type: 'monthly_revenue', target_value: '', start_date: format(monthStart, 'yyyy-MM-dd'), end_date: format(monthEnd, 'yyyy-MM-dd') });

  // ---- DATA FETCHING ----
  const { data: ordersThisMonth = [] } = useQuery({
    queryKey: ['fin-orders-month'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(quantity, unit_price, total_price, product_id, products(name, cost_price))')
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString())
        .eq('status', 'delivered');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: ordersPrevMonth = [] } = useQuery({
    queryKey: ['fin-orders-prev'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(quantity, unit_price, total_price, product_id, products(name, cost_price))')
        .gte('created_at', prevMonthStart.toISOString())
        .lte('created_at', prevMonthEnd.toISOString())
        .eq('status', 'delivered');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: ordersToday = [] } = useQuery({
    queryKey: ['fin-orders-today'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(quantity, unit_price, total_price, product_id, products(name))')
        .gte('created_at', startOfDay(now).toISOString())
        .lte('created_at', endOfDay(now).toISOString())
        .eq('status', 'delivered');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['fin-expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'))
        .order('date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: expensesPrev = [] } = useQuery({
    queryKey: ['fin-expenses-prev'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .gte('date', format(prevMonthStart, 'yyyy-MM-dd'))
        .lte('date', format(prevMonthEnd, 'yyyy-MM-dd'));
      if (error) throw error;
      return data || [];
    },
  });

  const { data: debts = [] } = useQuery({
    queryKey: ['fin-debts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('debts').select('*').order('due_date');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['fin-goals'],
    queryFn: async () => {
      const { data, error } = await supabase.from('financial_goals').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ['fin-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').eq('active', true);
      if (error) throw error;
      return data || [];
    },
  });

  // ---- MUTATIONS ----
  const addExpense = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('expenses').insert({
        date: expForm.date,
        description: expForm.description,
        amount: parseFloat(expForm.amount),
        category: expForm.category,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-expenses'] });
      toast.success('Despesa registrada!');
      setExpenseOpen(false);
      setExpForm({ date: format(now, 'yyyy-MM-dd'), description: '', amount: '', category: 'Outros' });
    },
    onError: () => toast.error('Erro ao registrar despesa'),
  });

  const addDebt = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('debts').insert({
        creditor: debtForm.creditor,
        total_amount: parseFloat(debtForm.total_amount),
        paid_amount: parseFloat(debtForm.paid_amount || '0'),
        due_date: debtForm.due_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-debts'] });
      toast.success('Dívida registrada!');
      setDebtOpen(false);
      setDebtForm({ creditor: '', total_amount: '', paid_amount: '0', due_date: '' });
    },
    onError: () => toast.error('Erro ao registrar dívida'),
  });

  const addGoal = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('financial_goals').insert({
        name: goalForm.name,
        goal_type: goalForm.goal_type,
        target_value: parseFloat(goalForm.target_value),
        start_date: goalForm.start_date,
        end_date: goalForm.end_date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-goals'] });
      toast.success('Meta cadastrada!');
      setGoalOpen(false);
      setGoalForm({ name: '', goal_type: 'monthly_revenue', target_value: '', start_date: format(monthStart, 'yyyy-MM-dd'), end_date: format(monthEnd, 'yyyy-MM-dd') });
    },
    onError: () => toast.error('Erro ao cadastrar meta'),
  });

  // ---- CALCULATIONS ----
  const revenue = useMemo(() => ordersThisMonth.reduce((s, o: any) => s + Number(o.total || 0), 0), [ordersThisMonth]);
  const revenuePrev = useMemo(() => ordersPrevMonth.reduce((s, o: any) => s + Number(o.total || 0), 0), [ordersPrevMonth]);
  const totalExpenses = useMemo(() => expenses.reduce((s, e: any) => s + Number(e.amount || 0), 0), [expenses]);
  const totalExpensesPrev = useMemo(() => expensesPrev.reduce((s, e: any) => s + Number(e.amount || 0), 0), [expensesPrev]);

  const costOfGoods = useMemo(() => {
    return ordersThisMonth.reduce((sum, order: any) => {
      return sum + (order.order_items || []).reduce((itemSum: number, item: any) => {
        const cost = Number(item.products?.cost_price || 0);
        return itemSum + cost * Number(item.quantity || 0);
      }, 0);
    }, 0);
  }, [ordersThisMonth]);

  const profit = revenue - totalExpenses - costOfGoods;
  const profitPrev = revenuePrev - totalExpensesPrev;

  const totalDebt = useMemo(() => debts.reduce((s, d: any) => s + Number(d.total_amount || 0) - Number(d.paid_amount || 0), 0), [debts]);
  const stockValue = useMemo(() => products.reduce((s, p: any) => s + (Number(p.stock || 0) * Number(p.cost_price || 0)), 0), [products]);

  const cashBalance = revenue - totalExpenses;
  const marginPercent = revenue > 0 ? (profit / revenue) * 100 : 0;
  const workingCapital = cashBalance - totalDebt;
  const debtRatio = revenue > 0 ? totalDebt / revenue : 0;

  const todaySalesQty = useMemo(() => {
    return ordersToday.reduce((s, o: any) => s + (o.order_items || []).reduce((q: number, i: any) => q + Number(i.quantity || 0), 0), 0);
  }, [ordersToday]);

  const todayRevenue = useMemo(() => ordersToday.reduce((s, o: any) => s + Number(o.total || 0), 0), [ordersToday]);

  // ---- SCORE ----
  const healthScore = useMemo(() => {
    let score = 50;
    if (marginPercent > 20) score += 20; else if (marginPercent > 10) score += 10; else if (marginPercent < 0) score -= 15;
    if (profit > 0) score += 15; else score -= 10;
    if (workingCapital > 0) score += 10; else score -= 15;
    if (debtRatio < 0.3) score += 5; else if (debtRatio > 1) score -= 10;
    return Math.max(0, Math.min(100, score));
  }, [marginPercent, profit, workingCapital, debtRatio]);

  const scoreColor = healthScore >= 71 ? 'text-green-500' : healthScore >= 41 ? 'text-amber-500' : 'text-red-500';
  const scoreLabel = healthScore >= 71 ? 'Saudável' : healthScore >= 41 ? 'Atenção' : 'Crítico';

  // ---- ALERTS ----
  const alerts = useMemo(() => {
    const a: { type: 'danger' | 'warning' | 'info'; msg: string }[] = [];
    if (cashBalance < 500) a.push({ type: 'danger', msg: 'Caixa abaixo do valor mínimo (R$ 500).' });
    if (profitPrev > 0 && profit < profitPrev * 0.7) a.push({ type: 'warning', msg: 'Lucro caiu mais de 30% em relação ao mês anterior.' });
    if (totalExpensesPrev > 0 && totalExpenses > totalExpensesPrev * 1.3) a.push({ type: 'warning', msg: 'Despesas aumentaram mais de 30% em relação ao mês anterior.' });
    if (totalDebt > revenue * 0.5) a.push({ type: 'danger', msg: 'Dívidas estão acima de 50% da receita mensal.' });
    if (marginPercent < 10 && revenue > 0) a.push({ type: 'warning', msg: 'Margem de lucro abaixo de 10%.' });
    return a;
  }, [cashBalance, profit, profitPrev, totalExpenses, totalExpensesPrev, totalDebt, revenue, marginPercent]);

  // ---- CHART DATA ----
  const cashFlowData = useMemo(() => {
    const days: Record<string, { date: string; entradas: number; saidas: number }> = {};
    ordersThisMonth.forEach((o: any) => {
      const d = format(new Date(o.created_at), 'dd/MM');
      if (!days[d]) days[d] = { date: d, entradas: 0, saidas: 0 };
      days[d].entradas += Number(o.total || 0);
    });
    expenses.forEach((e: any) => {
      const d = format(new Date(e.date), 'dd/MM');
      if (!days[d]) days[d] = { date: d, entradas: 0, saidas: 0 };
      days[d].saidas += Number(e.amount || 0);
    });
    return Object.values(days).sort((a, b) => a.date.localeCompare(b.date));
  }, [ordersThisMonth, expenses]);

  const expenseByCat = useMemo(() => {
    const cats: Record<string, number> = {};
    expenses.forEach((e: any) => {
      cats[e.category] = (cats[e.category] || 0) + Number(e.amount || 0);
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const fmtMoney = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6">
      {/* ALERTS */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <Card key={i} className={a.type === 'danger' ? 'border-red-500/40 bg-red-500/5' : 'border-amber-500/40 bg-amber-500/5'}>
              <CardContent className="p-3 flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 shrink-0 ${a.type === 'danger' ? 'text-red-500' : 'text-amber-500'}`} />
                <span className={`text-sm font-medium ${a.type === 'danger' ? 'text-red-500' : 'text-amber-500'}`}>{a.msg}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* SCORE */}
      <Card className="border-border">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="relative w-20 h-20">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke={healthScore >= 71 ? 'hsl(145,60%,42%)' : healthScore >= 41 ? 'hsl(38,92%,55%)' : 'hsl(0,72%,55%)'} strokeWidth="8" strokeDasharray={`${healthScore * 2.64} 264`} strokeLinecap="round" />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${scoreColor}`}>{healthScore}</span>
          </div>
          <div>
            <h3 className="font-bold text-foreground text-lg">Score de Saúde Financeira</h3>
            <Badge className={`mt-1 ${healthScore >= 71 ? 'bg-green-500/20 text-green-500' : healthScore >= 41 ? 'bg-amber-500/20 text-amber-500' : 'bg-red-500/20 text-red-500'}`}>
              {scoreLabel}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SummaryCard icon={<Wallet className="w-5 h-5" />} label="Saldo em Caixa" value={fmtMoney(cashBalance)} color={cashBalance >= 0 ? 'green' : 'red'} />
        <SummaryCard icon={<ArrowUpCircle className="w-5 h-5" />} label="Receita do Mês" value={fmtMoney(revenue)} color="green" />
        <SummaryCard icon={<ArrowDownCircle className="w-5 h-5" />} label="Despesas do Mês" value={fmtMoney(totalExpenses + costOfGoods)} color="red" />
        <SummaryCard icon={<TrendingUp className="w-5 h-5" />} label="Lucro Líquido" value={fmtMoney(profit)} color={profit >= 0 ? 'green' : 'red'} />
        <SummaryCard icon={<CreditCard className="w-5 h-5" />} label="Dívidas Pendentes" value={fmtMoney(totalDebt)} color={totalDebt > 0 ? 'red' : 'green'} />
        <SummaryCard icon={<PiggyBank className="w-5 h-5" />} label="Valor em Estoque" value={fmtMoney(stockValue)} color="blue" />
      </div>

      {/* SUB-TABS */}
      <Tabs defaultValue="cashflow" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="cashflow" className="text-xs sm:text-sm gap-1"><Receipt className="w-3 h-3 hidden sm:inline" /> Fluxo</TabsTrigger>
          <TabsTrigger value="indicators" className="text-xs sm:text-sm gap-1"><BarChart3 className="w-3 h-3 hidden sm:inline" /> Indicadores</TabsTrigger>
          <TabsTrigger value="goals" className="text-xs sm:text-sm gap-1"><Target className="w-3 h-3 hidden sm:inline" /> Metas</TabsTrigger>
          <TabsTrigger value="debts" className="text-xs sm:text-sm gap-1"><CreditCard className="w-3 h-3 hidden sm:inline" /> Dívidas</TabsTrigger>
        </TabsList>

        {/* CASH FLOW TAB */}
        <TabsContent value="cashflow" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-foreground">Fluxo de Caixa - {format(now, 'MMMM yyyy', { locale: ptBR })}</h3>
            <Button size="sm" onClick={() => setExpenseOpen(true)}><Plus className="w-4 h-4 mr-1" /> Despesa</Button>
          </div>

          {cashFlowData.length > 0 && (
            <Card>
              <CardContent className="p-3">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={cashFlowData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip formatter={(v: number) => fmtMoney(v)} />
                    <Legend />
                    <Bar dataKey="entradas" name="Entradas" fill="hsl(145,60%,42%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="saidas" name="Saídas" fill="hsl(0,72%,55%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {expenseByCat.length > 0 && (
            <Card>
              <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">Despesas por Categoria</CardTitle></CardHeader>
              <CardContent className="p-3">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={expenseByCat} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {expenseByCat.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmtMoney(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Expense List */}
          <h4 className="text-sm font-semibold text-foreground">Últimas Despesas</h4>
          {expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma despesa registrada este mês.</p>
          ) : (
            <div className="space-y-2">
              {expenses.slice(0, 15).map((e: any) => (
                <Card key={e.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <ArrowDownCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{e.description || e.category}</p>
                      <p className="text-[11px] text-muted-foreground">{e.category} · {format(new Date(e.date), 'dd/MM/yyyy')}</p>
                    </div>
                    <span className="text-sm font-semibold text-red-500 whitespace-nowrap">-{fmtMoney(Number(e.amount))}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* INDICATORS TAB */}
        <TabsContent value="indicators" className="space-y-4">
          <IndicatorCard
            title="Margem de Lucro"
            value={`${marginPercent.toFixed(1)}%`}
            description={marginPercent < 10 ? 'Margem crítica' : marginPercent < 20 ? 'Margem moderada' : 'Margem saudável'}
            color={marginPercent < 10 ? 'red' : marginPercent < 20 ? 'amber' : 'green'}
          />
          <IndicatorCard
            title="Capital de Giro"
            value={fmtMoney(workingCapital)}
            description={workingCapital < 0 ? 'Capital negativo - Alerta!' : 'Capital positivo - Saudável'}
            color={workingCapital < 0 ? 'red' : 'green'}
          />
          <IndicatorCard
            title="Endividamento"
            value={revenue > 0 ? `${debtRatio.toFixed(1)} meses` : 'N/A'}
            description={`Meses necessários para quitar dívidas`}
            color={debtRatio > 1 ? 'red' : debtRatio > 0.5 ? 'amber' : 'green'}
          />
          <Card>
            <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">Comparativo Mensal</CardTitle></CardHeader>
            <CardContent className="p-3">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[
                  { name: format(subMonths(now, 1), 'MMM', { locale: ptBR }), Receita: revenuePrev, Despesas: totalExpensesPrev, Lucro: profitPrev },
                  { name: format(now, 'MMM', { locale: ptBR }), Receita: revenue, Despesas: totalExpenses + costOfGoods, Lucro: profit },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip formatter={(v: number) => fmtMoney(v)} />
                  <Legend />
                  <Bar dataKey="Receita" fill="hsl(145,60%,42%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Despesas" fill="hsl(0,72%,55%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Lucro" fill="hsl(210,70%,55%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GOALS TAB */}
        <TabsContent value="goals" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-foreground">Metas de Vendas</h3>
            <Button size="sm" onClick={() => setGoalOpen(true)}><Plus className="w-4 h-4 mr-1" /> Nova Meta</Button>
          </div>

          {/* Quick daily stats */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Vendas de Hoje</span>
                <Badge variant="outline">{todaySalesQty} un. · {fmtMoney(todayRevenue)}</Badge>
              </div>
            </CardContent>
          </Card>

          {goals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma meta cadastrada.</p>
          ) : (
            <div className="space-y-3">
              {goals.map((g: any) => {
                let current = Number(g.current_value || 0);
                if (g.goal_type === 'monthly_revenue') current = revenue;
                else if (g.goal_type === 'monthly_profit') current = Math.max(0, profit);
                else if (g.goal_type === 'daily_sales') current = todaySalesQty;

                const target = Number(g.target_value || 1);
                const pct = Math.min(100, (current / target) * 100);

                return (
                  <Card key={g.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-sm text-foreground">{g.name}</p>
                          <p className="text-[11px] text-muted-foreground">{GOAL_TYPES[g.goal_type] || g.goal_type}</p>
                        </div>
                        <span className="text-sm font-bold text-foreground">{pct.toFixed(0)}%</span>
                      </div>
                      <Progress value={pct} className="h-2.5" />
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Atual: {g.goal_type === 'daily_sales' ? `${current} un.` : fmtMoney(current)}</span>
                        <span>Meta: {g.goal_type === 'daily_sales' ? `${target} un.` : fmtMoney(target)}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* DEBTS TAB */}
        <TabsContent value="debts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-foreground">Dívidas & Contas a Pagar</h3>
            <Button size="sm" onClick={() => setDebtOpen(true)}><Plus className="w-4 h-4 mr-1" /> Nova Dívida</Button>
          </div>

          {debts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma dívida registrada. 🎉</p>
          ) : (
            <div className="space-y-2">
              {debts.map((d: any) => {
                const remaining = Number(d.total_amount) - Number(d.paid_amount);
                const paidPct = Number(d.total_amount) > 0 ? (Number(d.paid_amount) / Number(d.total_amount)) * 100 : 0;
                return (
                  <Card key={d.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-sm text-foreground">{d.creditor}</p>
                          {d.due_date && <p className="text-[11px] text-muted-foreground">Vencimento: {format(new Date(d.due_date), 'dd/MM/yyyy')}</p>}
                        </div>
                        <span className="text-sm font-bold text-red-500">{fmtMoney(remaining)}</span>
                      </div>
                      <Progress value={paidPct} className="h-2" />
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Pago: {fmtMoney(Number(d.paid_amount))}</span>
                        <span>Total: {fmtMoney(Number(d.total_amount))}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* EXPENSE DIALOG */}
      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar Despesa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Data</Label><Input type="date" value={expForm.date} onChange={e => setExpForm(p => ({ ...p, date: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Input value={expForm.description} onChange={e => setExpForm(p => ({ ...p, description: e.target.value }))} placeholder="Ex: Pagamento fornecedor" /></div>
            <div><Label>Valor (R$)</Label><Input type="number" min="0" step="0.01" value={expForm.amount} onChange={e => setExpForm(p => ({ ...p, amount: e.target.value }))} /></div>
            <div>
              <Label>Categoria</Label>
              <Select value={expForm.category} onValueChange={v => setExpForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => addExpense.mutate()} disabled={!expForm.amount || addExpense.isPending}>
              {addExpense.isPending ? 'Salvando...' : 'Registrar Despesa'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DEBT DIALOG */}
      <Dialog open={debtOpen} onOpenChange={setDebtOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar Dívida</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Credor</Label><Input value={debtForm.creditor} onChange={e => setDebtForm(p => ({ ...p, creditor: e.target.value }))} placeholder="Ex: Distribuidora XYZ" /></div>
            <div><Label>Valor Total (R$)</Label><Input type="number" min="0" step="0.01" value={debtForm.total_amount} onChange={e => setDebtForm(p => ({ ...p, total_amount: e.target.value }))} /></div>
            <div><Label>Valor Pago (R$)</Label><Input type="number" min="0" step="0.01" value={debtForm.paid_amount} onChange={e => setDebtForm(p => ({ ...p, paid_amount: e.target.value }))} /></div>
            <div><Label>Data de Vencimento</Label><Input type="date" value={debtForm.due_date} onChange={e => setDebtForm(p => ({ ...p, due_date: e.target.value }))} /></div>
            <Button className="w-full" onClick={() => addDebt.mutate()} disabled={!debtForm.creditor || !debtForm.total_amount || addDebt.isPending}>
              {addDebt.isPending ? 'Salvando...' : 'Registrar Dívida'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* GOAL DIALOG */}
      <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cadastrar Meta</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={goalForm.name} onChange={e => setGoalForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Vender 6 botijões/dia" /></div>
            <div>
              <Label>Tipo</Label>
              <Select value={goalForm.goal_type} onValueChange={v => setGoalForm(p => ({ ...p, goal_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(GOAL_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Valor da Meta</Label><Input type="number" min="0" step="0.01" value={goalForm.target_value} onChange={e => setGoalForm(p => ({ ...p, target_value: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Início</Label><Input type="date" value={goalForm.start_date} onChange={e => setGoalForm(p => ({ ...p, start_date: e.target.value }))} /></div>
              <div><Label>Fim</Label><Input type="date" value={goalForm.end_date} onChange={e => setGoalForm(p => ({ ...p, end_date: e.target.value }))} /></div>
            </div>
            <Button className="w-full" onClick={() => addGoal.mutate()} disabled={!goalForm.name || !goalForm.target_value || addGoal.isPending}>
              {addGoal.isPending ? 'Salvando...' : 'Cadastrar Meta'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- SUB COMPONENTS ----
function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    green: 'text-green-500',
    red: 'text-red-500',
    amber: 'text-amber-500',
    blue: 'text-primary',
  };
  return (
    <Card>
      <CardContent className="p-3 text-center space-y-1">
        <div className={`mx-auto ${colorMap[color]}`}>{icon}</div>
        <p className={`text-lg font-bold ${colorMap[color]}`}>{value}</p>
        <p className="text-[10px] text-muted-foreground uppercase font-semibold leading-tight">{label}</p>
      </CardContent>
    </Card>
  );
}

function IndicatorCard({ title, value, description, color }: { title: string; value: string; description: string; color: string }) {
  const colorMap: Record<string, string> = { green: 'border-green-500/30 bg-green-500/5', red: 'border-red-500/30 bg-red-500/5', amber: 'border-amber-500/30 bg-amber-500/5' };
  const textMap: Record<string, string> = { green: 'text-green-500', red: 'text-red-500', amber: 'text-amber-500' };
  return (
    <Card className={colorMap[color]}>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className={`text-[11px] ${textMap[color]}`}>{description}</p>
        </div>
        <span className={`text-xl font-bold ${textMap[color]}`}>{value}</span>
      </CardContent>
    </Card>
  );
}