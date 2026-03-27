import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Package, ShoppingBag } from 'lucide-react';

export default function AdminFinance() {
  const { data: orders = [] } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('orders').select('*, order_items(*, products(cost_price))');
      if (error) throw error;
      return data;
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;
      return data;
    },
  });

  const delivered = orders.filter((o: any) => o.status === 'delivered');
  const pending = orders.filter((o: any) => o.status === 'pending');

  const totalRevenue = delivered.reduce((sum: number, o: any) => sum + Number(o.total), 0);
  const totalCost = delivered.reduce((sum: number, o: any) => {
    return sum + (o.order_items || []).reduce((s: number, item: any) => s + Number(item.products?.cost_price || 0) * item.quantity, 0);
  }, 0);
  const profit = totalRevenue - totalCost;

  const stats = [
    { label: 'Receita Total', value: `R$ ${totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-primary' },
    { label: 'Lucro Líquido', value: `R$ ${profit.toFixed(2)}`, icon: TrendingUp, color: 'text-success' },
    { label: 'Pedidos Entregues', value: delivered.length, icon: ShoppingBag, color: 'text-accent' },
    { label: 'Pedidos Pendentes', value: pending.length, icon: Package, color: 'text-warning' },
  ];

  // Top products by quantity sold
  const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
  delivered.forEach((o: any) => {
    (o.order_items || []).forEach((item: any) => {
      const pid = item.product_id;
      if (!productSales[pid]) productSales[pid] = { name: item.products?.name || 'Produto', qty: 0, revenue: 0 };
      productSales[pid].qty += item.quantity;
      productSales[pid].revenue += Number(item.total_price);
    });
  });
  const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-foreground">Controle Financeiro</h2>

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
        <CardHeader className="pb-2"><CardTitle className="text-sm">Produtos Mais Vendidos</CardTitle></CardHeader>
        <CardContent className="p-3 pt-0">
          {topProducts.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma venda registrada ainda.</p>
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
        <CardHeader className="pb-2"><CardTitle className="text-sm">Resumo de Margem</CardTitle></CardHeader>
        <CardContent className="p-3 pt-0">
          {products.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum produto cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {products.map((p: any) => {
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
