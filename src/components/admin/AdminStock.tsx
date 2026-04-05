import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, ArrowUpCircle, ArrowDownCircle, Package, History } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminStock() {
  const qc = useQueryClient();
  const [entryOpen, setEntryOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Entrada manual');
  const [filterProduct, setFilterProduct] = useState('all');

  const { data: products = [] } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['stock-movements', filterProduct],
    queryFn: async () => {
      let query = supabase
        .from('stock_movements')
        .select('*, products(name)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (filterProduct !== 'all') {
        query = query.eq('product_id', filterProduct);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const addEntry = useMutation({
    mutationFn: async () => {
      const qty = parseInt(quantity);
      if (!selectedProduct || !qty || qty <= 0) throw new Error('Dados inválidos');
      const { error } = await supabase.rpc('add_stock_entry', {
        _product_id: selectedProduct,
        _quantity: qty,
        _reason: reason || 'Entrada manual',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-movements'] });
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Entrada registrada com sucesso!');
      setEntryOpen(false);
      setSelectedProduct('');
      setQuantity('');
      setReason('Entrada manual');
    },
    onError: () => toast.error('Erro ao registrar entrada'),
  });

  const totalStock = products.reduce((sum, p) => sum + ((p as any).stock || 0), 0);
  const lowStock = products.filter(p => ((p as any).stock || 0) <= 5);
  const entriesCount = movements.filter(m => (m as any).type === 'entry').length;
  const exitsCount = movements.filter(m => (m as any).type === 'exit').length;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <Package className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-xl font-bold text-foreground">{totalStock}</p>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total em Estoque</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <ArrowUpCircle className="w-5 h-5 mx-auto text-green-500 mb-1" />
            <p className="text-xl font-bold text-foreground">{entriesCount}</p>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Entradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <ArrowDownCircle className="w-5 h-5 mx-auto text-red-500 mb-1" />
            <p className="text-xl font-bold text-foreground">{exitsCount}</p>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Saídas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Package className="w-5 h-5 mx-auto text-amber-500 mb-1" />
            <p className="text-xl font-bold text-foreground">{lowStock.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">Estoque Baixo</p>
          </CardContent>
        </Card>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-sm text-amber-500">⚠️ Produtos com estoque baixo (≤ 5 un.)</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="flex flex-wrap gap-2">
              {lowStock.map(p => (
                <Badge key={p.id} variant="outline" className="border-amber-500/50 text-amber-500">
                  {p.name}: {(p as any).stock || 0} un.
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">Movimentações</h2>
        </div>
        <Button size="sm" onClick={() => setEntryOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nova Entrada
        </Button>
      </div>

      {/* Filter */}
      <Select value={filterProduct} onValueChange={setFilterProduct}>
        <SelectTrigger className="w-full sm:w-64">
          <SelectValue placeholder="Filtrar por produto" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os produtos</SelectItem>
          {products.map(p => (
            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Movement history */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : movements.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma movimentação registrada.</p>
      ) : (
        <div className="space-y-2">
          {movements.map((m: any) => (
            <Card key={m.id}>
              <CardContent className="p-3 flex items-center gap-3">
                {m.type === 'entry' ? (
                  <ArrowUpCircle className="w-5 h-5 text-green-500 shrink-0" />
                ) : (
                  <ArrowDownCircle className="w-5 h-5 text-red-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground truncate">
                      {m.products?.name || 'Produto'}
                    </span>
                    <Badge variant={m.type === 'entry' ? 'default' : 'destructive'} className="text-[10px]">
                      {m.type === 'entry' ? `+${m.quantity}` : `-${m.quantity}`}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{m.reason}</p>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {format(new Date(m.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Entry dialog */}
      <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Entrada de Mercadoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Produto</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} (estoque: {(p as any).stock || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantidade</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="Ex: 10"
              />
            </div>
            <div>
              <Label>Motivo</Label>
              <Input
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Ex: Compra de fornecedor"
              />
            </div>
            <Button
              className="w-full"
              onClick={() => addEntry.mutate()}
              disabled={!selectedProduct || !quantity || parseInt(quantity) <= 0 || addEntry.isPending}
            >
              {addEntry.isPending ? 'Registrando...' : 'Registrar Entrada'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
