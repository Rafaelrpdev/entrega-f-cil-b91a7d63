import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  pending: 'bg-warning/15 text-warning border-warning/30',
  confirmed: 'bg-primary/15 text-primary border-primary/30',
  delivering: 'bg-accent/15 text-accent border-accent/30',
  delivered: 'bg-success/15 text-success border-success/30',
  cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
};
const statusLabels: Record<string, string> = {
  pending: 'Pendente', confirmed: 'Confirmado', delivering: 'Em entrega', delivered: 'Entregue', cancelled: 'Cancelado',
};

type AdminOrder = {
  id: string;
  status: string;
  total: number;
  created_at: string;
  payment_method: string;
  payment_timing: string;
  customers: { name: string; phone: string; address: string };
  order_items: { id: string; quantity: number; total_price: number; products: { name: string } }[];
};


export default function AdminOrders() {
  const qc = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, customers(name, phone, address), order_items(*, products(name))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Status atualizado!');
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">Pedidos ({orders.length})</h2>
      {orders.length === 0 && <p className="text-sm text-muted-foreground">Nenhum pedido ainda.</p>}
      {orders.map((order: AdminOrder) => (
        <Card key={order.id}>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">{order.customers?.name || 'Cliente'}</p>
                <p className="text-xs text-muted-foreground">{order.customers?.phone} • {order.customers?.address}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}</p>
              </div>
              <Badge className={statusColors[order.status] || ''}>{statusLabels[order.status] || order.status}</Badge>
            </div>

            <div className="bg-muted/50 rounded-lg p-2 space-y-1">
              {order.order_items?.map((item) => (
                <div key={item.id} className="flex justify-between text-xs">
                  <span>{item.quantity}x {item.products?.name || 'Produto'}</span>
                  <span className="text-muted-foreground">R$ {Number(item.total_price).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-muted-foreground">Total: </span>
                <span className="font-bold text-foreground">R$ {Number(order.total).toFixed(2)}</span>
                <span className="text-xs text-muted-foreground ml-2">({order.payment_method} • {order.payment_timing === 'agora' ? 'Pago' : 'Na entrega'})</span>
              </div>
              <Select value={order.status} onValueChange={status => updateStatus.mutate({ id: order.id, status })}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
