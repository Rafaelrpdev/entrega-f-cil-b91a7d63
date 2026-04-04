import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DollarSign, TrendingUp, Package, ShoppingBag, Calendar as CalendarIcon } from 'lucide-react';
import { subDays, startOfDay, endOfDay, startOfMonth, isWithinInterval, parseISO } from 'date-fns';

type FinanceOrderItem = { quantity: number; total_price: number; product_id: string; products: { name: string; cost_price: number } | null };
type FinanceOrder = { id: string; status: string; total: number; created_at: string; order_items: FinanceOrderItem[] };
type FinanceProduct = { id: string; name: string; sale_price: number; cost_price: number };

export default function AdminFinance() {
  const [period, setPeriod] = useState<string>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const { data: allOrders = [] } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('orders').select('*, order_items(*, products(name, cost_price))');
      if (error) throw error;
      return data as FinanceOrder[];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;
      return data as FinanceProduct[];
    },
  });

  const filteredOrders = useMemo(() => {
    if (period === 'all') return allOrders;

    const now = new Date();
    let start: Date;
    let end: Date = endOfDay(now);

    if (period === 'today') {
      start = startOfDay(now);
    } else if (period === '7days') {
      start = startOfDay(subDays(now, 7));
    } else if (period === 'month') {
      start = startOfMonth(now);
    } else if (period === 'custom' && customStart && customEnd) {
      start = startOfDay(parseISO(customStart));
      end = endOfDay(parseISO(customEnd));
    } else {
      return allOrders;
    }

    return allOrders.filter(o => {
      const orderDate = parseISO(o.created_at);
      return isWithinInterval(orderDate, { start, end });
    });
  }, [allOrders, period, customStart, customEnd]);

  const delivered = filteredOrders.filter((o: FinanceOrder) => o.status === 'delivered');
  const pending = filteredOrders.filter((o: FinanceOrder) => o.status === 'pending');

  const totalRevenue = delivered.reduce((sum: number, o: FinanceOrder) => sum + Number(o.total), 0);
  const totalCost = delivered.reduce((sum: number, o: FinanceOrder) => {
    return sum + (o.order_items || []).reduce((s: number, item: FinanceOrderItem) => s + Number(item.products?.cost_price || 0) * item.quantity, 0);
  }, 0);
  const profit = totalRevenue - totalCost;

  const stats = [
    { label: 'Receita Total', value: `R$ ${totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-primary' },
    { label: 'Lucro Líquido', value: `R$ ${profit.toFixed(2)}`, icon: TrendingUp, color: 'text-success' },
    { label: 'Pedidos Entregues', value: delivered.length, icon: ShoppingBag, color: 'text-accent' },
    { label: 'Pedidos Pendentes', value: pending.length, icon: Package, color: 'text-warning' },
  ];

  const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
  delivered.forEach((o: FinanceOrder) => {
    (o.order_items || []).forEach((item: FinanceOrderItem) => {
      const pid = item.product_id;
      if (!productSales[pid]) productSales[pid] = { name: item.products?.name || 'Produto', qty: 0, revenue: 0 };
      productSales[pid].qty += item.quantity;
      productSales[pid].revenue += Number(item.total_price);
    });
  });
  const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">Controle Financeiro</h2>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Selecionar período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tudo</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="7days">Últimos 7 dias</SelectItem>
                <SelectItem value="month">Este Mês</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {period === 'custom' && (
            <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Início</label>
                <Input 
                  type="date" 
                  value={customStart} 
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Fim</label>
                <Input 
                  type="date" 
                  value={customEnd} 
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold text-foreground">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Produtos Mais Vendidos no Período</CardTitle></CardHeader>
        <CardContent className="p-3 pt-0">
          {topProducts.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma venda registrada no período selecionado.</p>
          ) : (
            <div className="space-y-2">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{p.name}</span>
                  <div className="text-right">
                    <span className="text-muted-foreground text-xs">{p.qty} un. • </span>
                    <span className="font-medium text-foreground">R$ {p.revenue.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Resumo de Margem (Catálogo)</CardTitle></CardHeader>
        <CardContent className="p-3 pt-0">
          {products.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum produto cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {products.map((p: FinanceProduct) => {
                const margin = Number(p.sale_price) - Number(p.cost_price);
                const pct = Number(p.sale_price) > 0 ? (margin / Number(p.sale_price) * 100).toFixed(0) : '0';
                return (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{p.name}</span>
                    <div className="text-right">
                      <span className="text-success font-medium">R$ {margin.toFixed(2)}</span>
                      <span className="text-muted-foreground text-xs ml-1">({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
