import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Tag, Percent, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

type Coupon = Tables<'coupons'>;

const empty = {
  code: '',
  discount_type: 'percentage' as string,
  discount_value: 0,
  min_order_value: 0,
  max_uses: 1,
  valid_until: '',
  active: true,
  category: '' as string | null,
};

export default function AdminCoupons() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState(empty);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        code: form.code.toUpperCase().trim(),
        discount_type: form.discount_type,
        discount_value: form.discount_value,
        min_order_value: form.min_order_value || null,
        max_uses: form.max_uses || null,
        valid_until: form.valid_until,
        active: form.active,
        category: form.category || null,
      };
      if (editing) {
        const { error } = await supabase.from('coupons').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('coupons').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success(editing ? 'Cupom atualizado!' : 'Cupom criado!');
      setDialogOpen(false);
    },
    onError: () => toast.error('Erro ao salvar cupom'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success('Cupom excluído!');
    },
    onError: () => toast.error('Erro ao excluir cupom'),
  });

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setDialogOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm({
      code: c.code,
      discount_type: c.discount_type,
      discount_value: Number(c.discount_value),
      min_order_value: Number(c.min_order_value) || 0,
      max_uses: c.max_uses || 1,
      valid_until: c.valid_until ? c.valid_until.slice(0, 16) : '',
      active: c.active,
      category: c.category,
    });
    setDialogOpen(true);
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; }
  };

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Cupons de Desconto</h2>
        <Button size="sm" onClick={openNew} className="gap-1.5"><Plus className="w-4 h-4" /> Novo</Button>
      </div>

      {coupons.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum cupom cadastrado.</p>
      ) : (
        <div className="space-y-2">
          {coupons.map(c => {
            const expired = new Date(c.valid_until) < new Date();
            const usedUp = c.max_uses != null && c.used_count >= c.max_uses;
            return (
              <Card key={c.id} className={`${(!c.active || expired || usedUp) ? 'opacity-60' : ''}`}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted text-primary">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground font-mono">{c.code}</span>
                      {expired && <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">Expirado</span>}
                      {usedUp && <span className="text-[10px] bg-warning/10 text-warning px-1.5 py-0.5 rounded">Esgotado</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {c.discount_type === 'percentage' ? `${c.discount_value}%` : `R$ ${Number(c.discount_value).toFixed(2)}`}
                      {c.min_order_value ? ` • Mín. R$ ${Number(c.min_order_value).toFixed(2)}` : ''}
                      {` • ${c.used_count}/${c.max_uses ?? '∞'} usos`}
                      {` • Até ${formatDate(c.valid_until)}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Cupom' : 'Novo Cupom'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Código</Label>
              <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="EX: PROMO10" className="font-mono uppercase" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo de Desconto</Label>
                <Select value={form.discount_type} onValueChange={v => setForm(f => ({ ...f, discount_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage"><div className="flex items-center gap-1.5"><Percent className="w-3 h-3" /> Porcentagem</div></SelectItem>
                    <SelectItem value="fixed"><div className="flex items-center gap-1.5"><DollarSign className="w-3 h-3" /> Valor Fixo</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor</Label>
                <Input type="number" value={form.discount_value || ''} onChange={e => setForm(f => ({ ...f, discount_value: Number(e.target.value) }))} placeholder={form.discount_type === 'percentage' ? '10' : '5.00'} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Pedido Mínimo (R$)</Label>
                <Input type="number" value={form.min_order_value || ''} onChange={e => setForm(f => ({ ...f, min_order_value: Number(e.target.value) }))} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Máx. de Usos</Label>
                <Input type="number" value={form.max_uses || ''} onChange={e => setForm(f => ({ ...f, max_uses: Number(e.target.value) }))} placeholder="1" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Válido até</Label>
              <Input type="datetime-local" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
              <Label>Ativo</Label>
            </div>
            <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={!form.code || !form.discount_value || !form.valid_until || saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
