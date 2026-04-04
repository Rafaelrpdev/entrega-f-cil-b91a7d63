import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, Upload, ImageIcon, Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;

const emptyProduct = { name: '', category: 'gas', description: '', cost_price: 0, sale_price: 0, image_url: '', active: true, stock: 0 };

export default function AdminProducts() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyProduct);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('products').upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName);
      setForm(f => ({ ...f, image_url: publicUrl }));
      toast.success('Imagem enviada!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Selecione um arquivo de imagem'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem deve ter no máximo 5MB'); return; }
    uploadImage(file);
    e.target.value = '';
  };

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        category: form.category,
        description: form.description || null,
        cost_price: Number(form.cost_price),
        sale_price: Number(form.sale_price),
        stock: Number(form.stock),
        image_url: form.image_url || null,
        active: form.active,
      };
      if (editing) {
        const { error } = await supabase.from('products').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success(editing ? 'Produto atualizado!' : 'Produto criado!');
      setDialogOpen(false);
    },
    onError: () => toast.error('Erro ao salvar produto'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto removido!');
    },
  });

  const openNew = () => { setEditing(null); setForm(emptyProduct); setDialogOpen(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ 
      name: p.name, 
      category: p.category, 
      description: p.description || '', 
      cost_price: Number(p.cost_price), 
      sale_price: Number(p.sale_price), 
      stock: (p as any).stock || 0,
      image_url: p.image_url || '', 
      active: p.active 
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-semibold text-foreground">Produtos ({products.length})</h2>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Novo</Button>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
        <div className="space-y-2">
          {products.map(p => (
            <Card key={p.id}>
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground truncate">{p.name}</span>
                    {!p.active && <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Inativo</span>}
                    <div className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">
                      <Package className="w-3 h-3" />
                      <span>{ (p as any).stock || 0 } un.</span>
                    </div>
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground mt-1 uppercase font-semibold">
                    <span>Custo: R$ {Number(p.cost_price).toFixed(2)}</span>
                    <span>Venda: R$ {Number(p.sale_price).toFixed(2)}</span>
                    <span className="text-success">Margem: R$ {(Number(p.sale_price) - Number(p.cost_price)).toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Editar Produto' : 'Novo Produto'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gas">Gás</SelectItem>
                  <SelectItem value="agua">Água</SelectItem>
                  <SelectItem value="carvao">Carvão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Descrição</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Custo</Label><Input type="number" step="0.01" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: parseFloat(e.target.value) || 0 }))} /></div>
              <div><Label>Venda</Label><Input type="number" step="0.01" value={form.sale_price} onChange={e => setForm(f => ({ ...f, sale_price: parseFloat(e.target.value) || 0 }))} /></div>
              <div><Label>Estoque</Label><Input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: parseInt(e.target.value) || 0 }))} /></div>
            </div>
            {/* Image upload area */}
            <div>
              <Label>Imagem</Label>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              {form.image_url ? (
                <div className="relative mt-1">
                  <img src={form.image_url} alt="Preview" className="w-full h-36 object-cover rounded-lg border border-border" />
                  <div className="absolute bottom-2 right-2 flex gap-1">
                    <Button type="button" size="sm" variant="secondary" className="h-8 text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      {uploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
                      Trocar
                    </Button>
                    <Button type="button" size="sm" variant="destructive" className="h-8 text-xs" onClick={() => setForm(f => ({ ...f, image_url: '' }))}>
                      Remover
                    </Button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="mt-1 w-full h-36 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
                  {uploading ? (
                    <><Loader2 className="w-8 h-8 animate-spin" /><span className="text-sm">Enviando...</span></>
                  ) : (
                    <><ImageIcon className="w-8 h-8" /><span className="text-sm font-medium">Clique para enviar uma imagem</span><span className="text-xs">JPG, PNG ou WebP — máx 5MB</span></>
                  )}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
              <Label>Ativo</Label>
            </div>
            <Button className="w-full" onClick={() => upsert.mutate()} disabled={!form.name || !form.sale_price || upsert.isPending}>
              {upsert.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
