import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { User, MapPin, Phone, Calendar, Trash2, ShoppingBag, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  delivering: 'Entregando',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-orange-100 text-orange-800',
  delivering: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function AdminCustomers() {
  const queryClient = useQueryClient();
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);

  const { data: customers, isLoading } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: customerOrders, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['admin-customer-orders', expandedCustomerId],
    queryFn: async () => {
      if (!expandedCustomerId) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, products(name))')
        .eq('customer_id', expandedCustomerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!expandedCustomerId,
  });

  const { uniqueCustomers, duplicateIds } = useMemo(() => {
    if (!customers) return { uniqueCustomers: [], duplicateIds: [] };

    const seen = new Map();
    const unique: typeof customers = [];
    const duplicates: string[] = [];

    for (const customer of customers) {
      const key = customer.user_id
        ? `uid:${customer.user_id}`
        : `name:${(customer.name || '').toLowerCase().trim()}|phone:${(customer.phone || '').trim()}`;

      if (!seen.has(key)) {
        seen.set(key, customer);
        unique.push(customer);
      } else {
        duplicates.push(customer.id);
      }
    }

    return { uniqueCustomers: unique, duplicateIds: duplicates };
  }, [customers]);

  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Cliente deletado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
    },
    onError: (error) => {
      toast.error('Erro ao deletar cliente: ' + error.message);
    },
  });

  const cleanDuplicates = useMutation({
    mutationFn: async () => {
      if (duplicateIds.length === 0) return 0;
      const { error, count } = await supabase
        .from('customers')
        .delete({ count: 'exact' })
        .in('id', duplicateIds);
      if (error) throw error;
      return count || 0;
    },
    onSuccess: (deletedCount) => {
      if (deletedCount > 0) {
        toast.success(`${deletedCount} duplicatas removidas com sucesso!`);
      } else {
        toast.warning('Nenhuma duplicata foi removida. Verifique as permissões de acesso (RLS).');
      }
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
    },
    onError: (error) => {
      toast.error('Erro ao limpar banco: ' + error.message);
    },
  });

  const toggleCustomerOrders = (customerId: string) => {
    setExpandedCustomerId(prev => prev === customerId ? null : customerId);
  };

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">Carregando clientes...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-xl font-bold">Clientes Cadastrados</h2>
        {duplicateIds.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => cleanDuplicates.mutate()}
            disabled={cleanDuplicates.isPending}
            className="text-amber-600 border-amber-200 hover:bg-amber-50"
          >
            {cleanDuplicates.isPending ? 'Limpando...' : `Limpar ${duplicateIds.length} Duplicatas`}
          </Button>
        )}
      </div>
      <div className="grid gap-3">
        {uniqueCustomers.length === 0 && (
          <p className="text-muted-foreground">Nenhum cliente cadastrado.</p>
        )}
        {uniqueCustomers.map((customer) => {
          const isExpanded = expandedCustomerId === customer.id;
          return (
            <Card key={customer.id} className="overflow-hidden">
              <CardContent
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleCustomerOrders(customer.id)}
              >
                <div className="flex w-full items-start sm:items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{customer.name}</h3>
                      <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        <span>{customer.phone || 'Sem telefone'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{customer.address || 'Sem endereço'}</span>
                      </div>
                      {customer.birthday && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(customer.birthday + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 ml-auto self-start sm:self-center" onClick={(e) => e.stopPropagation()}>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" title="Deletar cliente">
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                          <AlertDialogDescription>
                            A exclusão de <strong>{customer.name}</strong> é permanente e removerá esse cadastro do sistema.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteCustomer.mutate(customer.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deleteCustomer.isPending ? 'Deletando...' : 'Deletar'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>

              {isExpanded && (
                <div className="border-t bg-muted/30 p-4 space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Histórico de Compras
                  </h4>
                  {isLoadingOrders ? (
                    <p className="text-sm text-muted-foreground">Carregando pedidos...</p>
                  ) : !customerOrders || customerOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum pedido encontrado para este cliente.</p>
                  ) : (
                    <div className="space-y-2">
                      {customerOrders.map((order) => (
                        <div key={order.id} className="bg-background rounded-lg border p-3 space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {new Date(order.created_at).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              <Badge className={statusColors[order.status] || 'bg-muted text-muted-foreground'} variant="secondary">
                                {statusLabels[order.status] || order.status}
                              </Badge>
                            </div>
                            <span className="font-semibold text-sm">
                              R$ {Number(order.total).toFixed(2)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            {(order.order_items as any[])?.map((item: any) => (
                              <div key={item.id} className="flex justify-between">
                                <span>{item.quantity}x {item.products?.name || 'Produto'}</span>
                                <span>R$ {Number(item.total_price).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="text-xs text-muted-foreground pt-1 border-t flex gap-3">
                            <span>Pagamento: {order.payment_method}</span>
                            <span>•</span>
                            <span>{order.payment_timing === 'before' ? 'Antecipado' : 'Na entrega'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
