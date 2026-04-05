import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  DollarSign, TrendingUp, TrendingDown, Wallet, AlertTriangle, Target, Plus,
  ArrowUpCircle, ArrowDownCircle, Activity, HeartPulse, CreditCard, Trash2,
  Download, FileText, CheckCircle2, XCircle, Calendar,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, subMonths, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

// ─────────────────────────── TYPES ───────────────────────────
type FinanceOrder = {
  id: string; status: string; total: number; created_at: string;
  order_items: { quantity: number; total_price: number; product_id: string; products: { name: string; cost_price: number; category: string } | null }[];
};
type FinanceProduct = { id: string; name: string; sale_price: number; cost_price: number; stock: number; category: string };
type Revenue = { id: string; data: string; descricao: string; valor: number; categoria: string; produto?: string; quantidade?: number; created_at: string };
type Expense = { id: string; data: string; descricao: string; valor: number; categoria: string; created_at: string };
type Debt = { id: string; credor: string; descricao?: string; valor_total: number; valor_pago: number; valor_restante: number; data_vencimento?: string; quitada: boolean };
type Goal = { id: string; nome_meta: string; tipo: string; valor_meta: number; periodo: string; ativa: boolean };

const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

// ─────────────────────────── SCORE CALC ──────────────────────
function calcScore(lucro: number, receita: number, despesas: number, dividas: number, capitalGiro: number): number {
  let score = 50;
  const margem = receita > 0 ? (lucro / receita) * 100 : 0;
  if (margem > 20) score += 20; else if (margem > 10) score += 10; else if (margem < 0) score -= 20; else score -= 5;
  if (capitalGiro > 0) score += 15; else score -= 20;
  const endividamento = receita > 0 ? dividas / receita : 10;
  if (endividamento < 0.5) score += 15; else if (endividamento < 1) score += 5; else if (endividamento > 2) score -= 15;
  const ratioDespesa = receita > 0 ? despesas / receita : 1;
  if (ratioDespesa < 0.6) score += 10; else if (ratioDespesa > 0.9) score -= 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ─────────────────────────── COMPONENT ───────────────────────
export default function AdminFinance() {
  const qc = useQueryClient();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [flowFilter, setFlowFilter] = useState('all');
  const [openExpense, setOpenExpense] = useState(false);
  const [openRevenue, setOpenRevenue] = useState(false);
  const [openDebt, setOpenDebt] = useState(false);
  const [openGoal, setOpenGoal] = useState(false);
  const [expCategory, setExpCategory] = useState('combustivel');
  const [revCategory, setRevCategory] = useState('venda_gas');

  // ── Queries ──
  const { data: orders = [] } = useQuery<FinanceOrder[]>({
    queryKey: ['finance-orders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('orders')
        .select('*, order_items(*, products(name, cost_price, category))');
      if (error) throw error;
      return data as FinanceOrder[];
    },
  });

  const { data: products = [] } = useQuery<FinanceProduct[]>({
    queryKey: ['finance-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').eq('active', true);
      if (error) throw error;
      return data as FinanceProduct[];
    },
  });

  const { data: revenues = [] } = useQuery<Revenue[]>({
    queryKey: ['financial-revenues'],
    queryFn: async () => {
      const { data, error } = await supabase.from('financial_revenues').select('*').order('data', { ascending: false });
      if (error) throw error;
      return data as Revenue[];
    },
  });

  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ['financial-expenses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('financial_expenses').select('*').order('data', { ascending: false });
      if (error) throw error;
      return data as Expense[];
    },
  });

  const { data: debts = [] } = useQuery<Debt[]>({
    queryKey: ['financial-debts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('financial_debts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Debt[];
    },
  });

  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ['financial-goals'],
    queryFn: async () => {
      const { data, error } = await supabase.from('financial_goals').select('*').eq('ativa', true);
      if (error) throw error;
      return data as Goal[];
    },
  });

  // ── Delete mutations ──
  const deleteExpense = useMutation({
    mutationFn: async (id: string) => { await supabase.from('financial_expenses').delete().eq('id', id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['financial-expenses'] }); toast.success('Despesa removida'); },
  });
  const deleteRevenue = useMutation({
    mutationFn: async (id: string) => { await supabase.from('financial_revenues').delete().eq('id', id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['financial-revenues'] }); toast.success('Receita removida'); },
  });
  const deleteDebt = useMutation({
    mutationFn: async (id: string) => { await supabase.from('financial_debts').delete().eq('id', id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['financial-debts'] }); toast.success('Dívida removida'); },
  });
  const deleteGoal = useMutation({
    mutationFn: async (id: string) => { await supabase.from('financial_goals').delete().eq('id', id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['financial-goals'] }); toast.success('Meta removida'); },
  });
  const payDebt = useMutation({
    mutationFn: async ({ id, valor_pago, valor_total }: { id: string; valor_pago: number; valor_total: number }) => {
      const quitada = valor_pago >= valor_total;
      await supabase.from('financial_debts').update({ valor_pago, quitada }).eq('id', id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['financial-debts'] }); toast.success('Dívida atualizada'); },
  });

  // ── Calculations ──
  const now = new Date();
  const mesAtualStart = startOfMonth(now);
  const mesAtualEnd = endOfMonth(now);
  const mesAnteriorStart = startOfMonth(subMonths(now, 1));
  const mesAnteriorEnd = endOfMonth(subMonths(now, 1));

  const inPeriod = (dateStr: string) => {
    try {
      return isWithinInterval(parseISO(dateStr), {
        start: startOfDay(parseISO(dateFrom)),
        end: endOfDay(parseISO(dateTo)),
      });
    } catch { return false; }
  };

  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const thisMthOrders = deliveredOrders.filter(o => isWithinInterval(parseISO(o.created_at), { start: mesAtualStart, end: mesAtualEnd }));
  const prevMthOrders = deliveredOrders.filter(o => isWithinInterval(parseISO(o.created_at), { start: mesAnteriorStart, end: mesAnteriorEnd }));

  const receitaOrdensMes = thisMthOrders.reduce((s, o) => s + Number(o.total), 0);
  const receitaOrdensPrev = prevMthOrders.reduce((s, o) => s + Number(o.total), 0);
  const receitaManualMes = revenues.filter(r => isWithinInterval(parseISO(r.data), { start: mesAtualStart, end: mesAtualEnd })).reduce((s, r) => s + Number(r.valor), 0);
  const receitaTotalMes = receitaOrdensMes + receitaManualMes;

  const custoOrdensMes = thisMthOrders.reduce((s, o) =>
    s + (o.order_items || []).reduce((ss, item) => ss + Number(item.products?.cost_price || 0) * item.quantity, 0), 0);
  const despesasMes = expenses.filter(e => isWithinInterval(parseISO(e.data), { start: mesAtualStart, end: mesAtualEnd })).reduce((s, e) => s + Number(e.valor), 0);
  const despesasTotaisMes = custoOrdensMes + despesasMes;

  const lucroMes = receitaTotalMes - despesasTotaisMes;
  const lucroPrev = receitaOrdensPrev - prevMthOrders.reduce((s, o) =>
    s + (o.order_items || []).reduce((ss, item) => ss + Number(item.products?.cost_price || 0) * item.quantity, 0), 0);

  const dividasAbertas = debts.filter(d => !d.quitada);
  const totalDividas = dividasAbertas.reduce((s, d) => s + Number(d.valor_restante), 0);
  const valorEstoque = products.reduce((s, p) => s + Number(p.cost_price) * Number(p.stock), 0);

  const saldoCaixa = receitaTotalMes - despesasMes - custoOrdensMes;
  const capitalGiro = saldoCaixa - totalDividas;
  const margemLucro = receitaTotalMes > 0 ? (lucroMes / receitaTotalMes) * 100 : 0;
  const mesesEndividamento = receitaTotalMes > 0 ? totalDividas / receitaTotalMes : 0;
  const score = calcScore(lucroMes, receitaTotalMes, despesasTotaisMes, totalDividas, capitalGiro);

  // ── Today's orders (for daily goals) ──
  const todayStr = format(now, 'yyyy-MM-dd');
  const pedidosHoje = deliveredOrders.filter(o => o.created_at.startsWith(todayStr));
  const botHoje = pedidosHoje.reduce((s, o) =>
    s + (o.order_items || []).filter(i => i.products?.category?.toLowerCase().includes('gas') || i.products?.name?.toLowerCase().includes('gás') || i.products?.name?.toLowerCase().includes('gas')).reduce((ss, i) => ss + i.quantity, 0), 0);

  // ── Fluxo de caixa (period filtered) ──
  const flowEntries = useMemo(() => {
    const ordersIn = deliveredOrders.filter(o => inPeriod(o.created_at)).map(o => ({
      id: o.id, date: o.created_at.split('T')[0], tipo: 'entrada' as const,
      descricao: `Pedido #${o.id.slice(0, 8)}`, valor: Number(o.total), categoria: 'venda_gas',
    }));
    const revenuesIn = revenues.filter(r => inPeriod(r.data + 'T00:00:00')).map(r => ({
      id: r.id, date: r.data, tipo: 'entrada' as const,
      descricao: r.descricao, valor: Number(r.valor), categoria: r.categoria,
    }));
    const expensesOut = expenses.filter(e => inPeriod(e.data + 'T00:00:00')).map(e => ({
      id: e.id, date: e.data, tipo: 'saida' as const,
      descricao: e.descricao, valor: Number(e.valor), categoria: e.categoria,
    }));
    const all = [...ordersIn, ...revenuesIn, ...expensesOut].sort((a, b) => a.date.localeCompare(b.date));
    let saldoAcum = 0;
    return all.filter(f => flowFilter === 'all' || f.tipo === flowFilter || f.categoria === flowFilter).map(f => {
      saldoAcum += f.tipo === 'entrada' ? f.valor : -f.valor;
      return { ...f, saldoAcumulado: saldoAcum };
    });
  }, [deliveredOrders, revenues, expenses, dateFrom, dateTo, flowFilter]);

  // ── Chart data (daily) ──
  const chartData = useMemo(() => {
    const map: Record<string, { date: string; entradas: number; saidas: number }> = {};
    flowEntries.forEach(f => {
      if (!map[f.date]) map[f.date] = { date: f.date, entradas: 0, saidas: 0 };
      if (f.tipo === 'entrada') map[f.date].entradas += f.valor;
      else map[f.date].saidas += f.valor;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date)).map(d => ({
      ...d,
      label: format(parseISO(d.date), 'dd/MM'),
      saldo: d.entradas - d.saidas,
    }));
  }, [flowEntries]);

  // ── Alerts ──
  const alerts: { msg: string; level: 'error' | 'warning' | 'info' }[] = [];
  if (saldoCaixa < 300) alerts.push({ msg: `Caixa abaixo do mínimo! Saldo atual: ${fmt(saldoCaixa)}`, level: 'error' });
  if (lucroMes < lucroPrev && lucroPrev > 0) alerts.push({ msg: `Lucro caiu em relação ao mês anterior (${fmt(lucroPrev)} → ${fmt(lucroMes)})`, level: 'warning' });
  if (receitaTotalMes > 0 && despesasTotaisMes / receitaTotalMes > 0.85) alerts.push({ msg: `Despesas representam mais de 85% da receita!`, level: 'warning' });
  if (receitaTotalMes > 0 && totalDividas > receitaTotalMes * 2) alerts.push({ msg: `Dívidas ${fmt(totalDividas)} ultrapassam 2x a receita mensal`, level: 'error' });
  if (capitalGiro < 0) alerts.push({ msg: `Capital de giro negativo: ${fmt(capitalGiro)}`, level: 'warning' });

  // ── Score helpers ──
  const scoreColor = score >= 71 ? '#22c55e' : score >= 41 ? '#f59e0b' : '#ef4444';
  const scoreLabel = score >= 71 ? 'Saudável' : score >= 41 ? 'Atenção' : 'Crítico';
  const margemColor = margemLucro >= 20 ? 'text-green-500' : margemLucro >= 10 ? 'text-yellow-500' : 'text-red-500';

  // ── Export CSV ──
  const exportCSV = () => {
    const rows = [['Data', 'Tipo', 'Descrição', 'Valor', 'Saldo Acumulado'],
      ...flowEntries.map(f => [f.date, f.tipo, f.descricao, f.valor.toFixed(2), f.saldoAcumulado.toFixed(2)])];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `fluxo-caixa-${todayStr}.csv`; a.click();
  };

  // ── Form handlers ──
  const handleAddExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from('financial_expenses').insert({
      data: fd.get('data') as string, descricao: fd.get('descricao') as string,
      valor: Number(fd.get('valor')), categoria: expCategory,
    });
    if (error) { toast.error('Erro ao salvar despesa'); return; }
    toast.success('Despesa adicionada!');
    qc.invalidateQueries({ queryKey: ['financial-expenses'] });
    setOpenExpense(false);
  };

  const handleAddRevenue = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from('financial_revenues').insert({
      data: fd.get('data') as string, descricao: fd.get('descricao') as string,
      valor: Number(fd.get('valor')), categoria: revCategory,
      produto: fd.get('produto') as string || null,
      quantidade: Number(fd.get('quantidade')) || null,
    });
    if (error) { toast.error('Erro ao salvar receita'); return; }
    toast.success('Receita adicionada!');
    qc.invalidateQueries({ queryKey: ['financial-revenues'] });
    setOpenRevenue(false);
  };

  const handleAddDebt = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from('financial_debts').insert({
      credor: fd.get('credor') as string, descricao: fd.get('descricao') as string,
      valor_total: Number(fd.get('valor_total')),
      valor_pago: Number(fd.get('valor_pago') || 0),
      data_vencimento: fd.get('data_vencimento') as string || null,
    });
    if (error) { toast.error('Erro ao salvar dívida'); return; }
    toast.success('Dívida registrada!');
    qc.invalidateQueries({ queryKey: ['financial-debts'] });
    setOpenDebt(false);
  };

  const handleAddGoal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from('financial_goals').insert({
      nome_meta: fd.get('nome_meta') as string,
      tipo: fd.get('tipo') as string,
      valor_meta: Number(fd.get('valor_meta')),
      periodo: fd.get('periodo') as string,
    });
    if (error) { toast.error('Erro ao salvar meta'); return; }
    toast.success('Meta criada!');
    qc.invalidateQueries({ queryKey: ['financial-goals'] });
    setOpenGoal(false);
  };

  // ── Goal progress ──
  const getGoalProgress = (g: Goal) => {
    if (g.tipo === 'faturamento') return g.periodo === 'mensal' ? receitaTotalMes : receitaOrdensMes / 30;
    if (g.tipo === 'lucro') return g.periodo === 'mensal' ? lucroMes : lucroMes / 30;
    if (g.tipo === 'quantidade') return g.periodo === 'diario' ? botHoje : botHoje;
    return 0;
  };

  return (
    <div className="space-y-6 pb-8">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <HeartPulse className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Saúde Financeira</h2>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
          <Download className="w-4 h-4" /> Exportar CSV
        </Button>
      </div>

      {/* ── ALERTAS ── */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className={`flex items-start gap-2 p-3 rounded-lg border text-sm font-medium
              ${a.level === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                a.level === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                  'bg-blue-500/10 border-blue-500/30 text-blue-400'}`}>
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{a.msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── SCORE ── */}
      <Card className="overflow-hidden border-0 shadow-md"
        style={{ background: `linear-gradient(135deg, ${scoreColor}18, ${scoreColor}05)`, borderLeft: `4px solid ${scoreColor}` }}>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Score de Saúde Financeira</p>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-black" style={{ color: scoreColor }}>{score}</span>
              <span className="text-muted-foreground text-lg mb-1">/ 100</span>
            </div>
            <Badge className="mt-1 font-semibold" style={{ background: scoreColor, color: '#fff' }}>{scoreLabel}</Badge>
          </div>
          <Activity className="w-16 h-16 opacity-20" style={{ color: scoreColor }} />
        </CardContent>
        <div className="h-2 bg-muted">
          <div className="h-2 transition-all duration-700" style={{ width: `${score}%`, background: scoreColor }} />
        </div>
      </Card>

      {/* ── RESUMO FINANCEIRO GERAL ── */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">1. Resumo Financeiro</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Saldo em Caixa', value: fmt(saldoCaixa), icon: Wallet, color: saldoCaixa >= 0 ? 'text-green-500' : 'text-red-500', bg: saldoCaixa >= 0 ? 'bg-green-500/10' : 'bg-red-500/10' },
            { label: 'Receita do Mês', value: fmt(receitaTotalMes), icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Despesas do Mês', value: fmt(despesasTotaisMes), icon: TrendingDown, color: 'text-orange-400', bg: 'bg-orange-500/10' },
            { label: 'Lucro Líquido', value: fmt(lucroMes), icon: DollarSign, color: lucroMes >= 0 ? 'text-green-500' : 'text-red-500', bg: lucroMes >= 0 ? 'bg-green-500/10' : 'bg-red-500/10' },
            { label: 'Dívidas Abertas', value: fmt(totalDividas), icon: CreditCard, color: totalDividas > 0 ? 'text-red-400' : 'text-green-500', bg: totalDividas > 0 ? 'bg-red-500/10' : 'bg-green-500/10' },
            { label: 'Valor em Estoque', value: fmt(valorEstoque), icon: DollarSign, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          ].map(s => (
            <Card key={s.label} className="border-0 shadow-sm">
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${s.bg} ${s.color}`}><s.icon className="w-5 h-5" /></div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground truncate">{s.label}</p>
                  <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── INDICADORES ── */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">3. Indicadores Financeiros</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Margem de Lucro</p>
              <p className={`text-3xl font-black ${margemColor}`}>{fmtPct(margemLucro)}</p>
              <Badge variant="outline" className={`mt-2 text-xs ${margemColor}`}>
                {margemLucro >= 20 ? '✅ Excelente' : margemLucro >= 10 ? '⚠️ Regular' : '🔴 Baixa'}
              </Badge>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Capital de Giro</p>
              <p className={`text-3xl font-black ${capitalGiro >= 0 ? 'text-green-500' : 'text-red-500'}`}>{fmt(capitalGiro)}</p>
              <Badge variant="outline" className={`mt-2 text-xs ${capitalGiro >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {capitalGiro >= 0 ? '✅ Saudável' : '🔴 Negativo'}
              </Badge>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Endividamento</p>
              <p className="text-3xl font-black text-foreground">{mesesEndividamento.toFixed(1)} <span className="text-base font-normal text-muted-foreground">meses</span></p>
              <Badge variant="outline" className={`mt-2 text-xs ${mesesEndividamento <= 1 ? 'text-green-500' : mesesEndividamento <= 2 ? 'text-yellow-500' : 'text-red-500'}`}>
                {mesesEndividamento <= 1 ? '✅ Controlado' : mesesEndividamento <= 2 ? '⚠️ Atenção' : '🔴 Alto'}
              </Badge>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── FLUXO DE CAIXA ── */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">2. Fluxo de Caixa</h3>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
              <CardTitle className="text-sm">Movimentações</CardTitle>
              <div className="flex gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-7 text-xs w-36" />
                  <span className="text-muted-foreground text-xs">→</span>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-7 text-xs w-36" />
                </div>
                <Select value={flowFilter} onValueChange={setFlowFilter}>
                  <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="entrada">Entradas</SelectItem>
                    <SelectItem value="saida">Saídas</SelectItem>
                    <SelectItem value="venda_gas">Venda Gás</SelectItem>
                    <SelectItem value="combustivel">Combustível</SelectItem>
                    <SelectItem value="fornecedor">Fornecedor</SelectItem>
                    <SelectItem value="salario">Salários</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-3">
            {chartData.length > 0 && (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `R$${v}`} />
                    <Tooltip formatter={(v: number) => fmt(v)} labelStyle={{ color: 'hsl(var(--foreground))' }} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="entradas" name="Entradas" fill="#22c55e" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <Dialog open={openRevenue} onOpenChange={setOpenRevenue}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5 text-green-500 border-green-500/30 hover:bg-green-500/10">
                    <ArrowUpCircle className="w-3.5 h-3.5" /> + Entrada
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nova Entrada Manual</DialogTitle></DialogHeader>
                  <form onSubmit={handleAddRevenue} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Data</Label><Input name="data" type="date" defaultValue={todayStr} required className="mt-1" /></div>
                      <div><Label className="text-xs">Valor (R$)</Label><Input name="valor" type="number" step="0.01" min="0.01" required className="mt-1" /></div>
                    </div>
                    <div><Label className="text-xs">Descrição</Label><Input name="descricao" required className="mt-1" placeholder="Ex: Venda de carvão" /></div>
                    <div><Label className="text-xs">Categoria</Label>
                      <Select value={revCategory} onValueChange={setRevCategory}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="venda_gas">Venda de Gás</SelectItem>
                          <SelectItem value="venda_agua">Venda de Água</SelectItem>
                          <SelectItem value="venda_carvao">Venda de Carvão</SelectItem>
                          <SelectItem value="outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Produto (opcional)</Label><Input name="produto" className="mt-1" placeholder="Ex: P13" /></div>
                      <div><Label className="text-xs">Quantidade</Label><Input name="quantidade" type="number" step="0.5" className="mt-1" placeholder="0" /></div>
                    </div>
                    <Button type="submit" className="w-full">Salvar Entrada</Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={openExpense} onOpenChange={setOpenExpense}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5 text-red-400 border-red-400/30 hover:bg-red-500/10">
                    <ArrowDownCircle className="w-3.5 h-3.5" /> + Despesa
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nova Despesa</DialogTitle></DialogHeader>
                  <form onSubmit={handleAddExpense} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Data</Label><Input name="data" type="date" defaultValue={todayStr} required className="mt-1" /></div>
                      <div><Label className="text-xs">Valor (R$)</Label><Input name="valor" type="number" step="0.01" min="0.01" required className="mt-1" /></div>
                    </div>
                    <div><Label className="text-xs">Descrição</Label><Input name="descricao" required className="mt-1" placeholder="Ex: Diesel do caminhão" /></div>
                    <div><Label className="text-xs">Categoria</Label>
                      <Select value={expCategory} onValueChange={setExpCategory}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="combustivel">Combustível</SelectItem>
                          <SelectItem value="fornecedor">Pagamento Fornecedor</SelectItem>
                          <SelectItem value="compra_botijoes">Compra de Botijões</SelectItem>
                          <SelectItem value="salario">Salários</SelectItem>
                          <SelectItem value="operacional">Despesas Operacionais</SelectItem>
                          <SelectItem value="outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full">Salvar Despesa</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-1 max-h-64 overflow-y-auto">
              {flowEntries.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma movimentação no período.</p>
              ) : [...flowEntries].reverse().map((f, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    {f.tipo === 'entrada'
                      ? <ArrowUpCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      : <ArrowDownCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{f.descricao}</p>
                      <p className="text-[10px] text-muted-foreground">{f.date} · {f.categoria}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className={`text-xs font-bold ${f.tipo === 'entrada' ? 'text-green-500' : 'text-red-400'}`}>
                      {f.tipo === 'entrada' ? '+' : '-'}{fmt(f.valor)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Saldo: {fmt(f.saldoAcumulado)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── METAS ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">4. Metas de Vendas</h3>
          <Dialog open={openGoal} onOpenChange={setOpenGoal}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Nova Meta</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Criar Meta</DialogTitle></DialogHeader>
              <form onSubmit={handleAddGoal} className="space-y-3">
                <div><Label className="text-xs">Nome da Meta</Label><Input name="nome_meta" required className="mt-1" placeholder="Ex: Meta diária de botijões" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Tipo</Label>
                    <Select name="tipo" defaultValue="faturamento">
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="faturamento">Faturamento (R$)</SelectItem>
                        <SelectItem value="lucro">Lucro (R$)</SelectItem>
                        <SelectItem value="quantidade">Quantidade (botijões)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Período</Label>
                    <Select name="periodo" defaultValue="mensal">
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diario">Diário</SelectItem>
                        <SelectItem value="mensal">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label className="text-xs">Valor da Meta</Label><Input name="valor_meta" type="number" step="0.01" min="1" required className="mt-1" /></div>
                <Button type="submit" className="w-full">Criar Meta</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-y-3">
          {goals.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma meta cadastrada.</p>
          ) : goals.map(g => {
            const atual = getGoalProgress(g);
            const pct = Math.min(100, g.valor_meta > 0 ? (atual / g.valor_meta) * 100 : 0);
            const isMoney = g.tipo !== 'quantidade';
            return (
              <Card key={g.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold flex items-center gap-1.5"><Target className="w-4 h-4 text-primary" />{g.nome_meta}</p>
                      <p className="text-xs text-muted-foreground capitalize">{g.periodo} · {g.tipo}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={pct >= 100 ? 'default' : 'outline'} className={pct >= 100 ? 'bg-green-500' : ''}>
                        {pct.toFixed(0)}%
                      </Badge>
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-red-400" onClick={() => deleteGoal.mutate(g.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <Progress value={pct} className="h-2 mb-1" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{isMoney ? fmt(atual) : `${atual} un.`}</span>
                    <span>Meta: {isMoney ? fmt(g.valor_meta) : `${g.valor_meta} un.`}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── DÍVIDAS ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">5. Dívidas</h3>
          <Dialog open={openDebt} onOpenChange={setOpenDebt}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Nova Dívida</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar Dívida</DialogTitle></DialogHeader>
              <form onSubmit={handleAddDebt} className="space-y-3">
                <div><Label className="text-xs">Credor</Label><Input name="credor" required className="mt-1" placeholder="Ex: Ultragaz" /></div>
                <div><Label className="text-xs">Descrição</Label><Input name="descricao" className="mt-1" placeholder="Ex: Compra de botijões" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Valor Total (R$)</Label><Input name="valor_total" type="number" step="0.01" min="0.01" required className="mt-1" /></div>
                  <div><Label className="text-xs">Valor Pago (R$)</Label><Input name="valor_pago" type="number" step="0.01" min="0" defaultValue="0" className="mt-1" /></div>
                </div>
                <div><Label className="text-xs">Vencimento</Label><Input name="data_vencimento" type="date" className="mt-1" /></div>
                <Button type="submit" className="w-full">Registrar Dívida</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-y-2">
          {debts.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma dívida registrada.</p>
          ) : debts.map(d => (
            <Card key={d.id} className={`border-0 shadow-sm ${d.quitada ? 'opacity-50' : ''}`}>
              <CardContent className="p-3 flex items-center gap-3">
                {d.quitada ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" /> : <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.credor}</p>
                  {d.descricao && <p className="text-[10px] text-muted-foreground truncate">{d.descricao}</p>}
                  {d.data_vencimento && <p className="text-[10px] text-muted-foreground">Venc: {d.data_vencimento}</p>}
                  {!d.quitada && (
                    <Progress value={(d.valor_pago / d.valor_total) * 100} className="h-1 mt-1" />
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${d.quitada ? 'text-green-500' : 'text-red-400'}`}>{fmt(Number(d.valor_restante))}</p>
                  <p className="text-[10px] text-muted-foreground">de {fmt(d.valor_total)}</p>
                </div>
                <div className="flex flex-col gap-1">
                  {!d.quitada && (
                    <Button variant="ghost" size="icon" className="w-7 h-7 text-green-500 hover:bg-green-500/10"
                      onClick={() => payDebt.mutate({ id: d.id, valor_pago: d.valor_total, valor_total: d.valor_total })}
                      title="Marcar como pago">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-red-400" onClick={() => deleteDebt.mutate(d.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── PRODUTOS MAIS VENDIDOS (mantendo do original) ── */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Produto + Vendido no Mês</h3>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3">
            {(() => {
              const ps: Record<string, { name: string; qty: number; revenue: number }> = {};
              thisMthOrders.forEach(o => (o.order_items || []).forEach(item => {
                const pid = item.product_id;
                if (!ps[pid]) ps[pid] = { name: item.products?.name || 'Produto', qty: 0, revenue: 0 };
                ps[pid].qty += item.quantity; ps[pid].revenue += Number(item.total_price);
              }));
              const top = Object.values(ps).sort((a, b) => b.qty - a.qty);
              if (top.length === 0) return <p className="text-xs text-muted-foreground">Sem vendas no mês.</p>;
              return (
                <div className="space-y-2">
                  {top.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-4">#{i + 1}</span>
                        <span className="font-medium">{p.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground text-xs">{p.qty} un. · </span>
                        <span className="font-bold text-green-500">{fmt(p.revenue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
