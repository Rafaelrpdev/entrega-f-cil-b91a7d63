import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, GripVertical, Upload, ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Banner {
  id: string;
  title: string;
  image_url: string;
  alt: string;
  active: boolean;
  sort_order: number;
  created_at: string;
}

const emptyBanner = { title: '', image_url: '', alt: '', active: true, sort_order: 0 };

export default function AdminBanners() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState(emptyBanner);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: async () => {
      const { data, error } = await supabase.from('banners').select('*').order('sort_order', { ascending: true });
      if (error) throw error;
      return data as Banner[];
    },
  });

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('banners')
        .getPublicUrl(fileName);

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
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 5MB');
      return;
    }
    uploadImage(file);
    e.target.value = '';
  };

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        image_url: form.image_url,
        alt: form.alt || form.title,
        active: form.active,
        sort_order: Number(form.sort_order),
      };
      if (editing) {
        const { error } = await supabase.from('banners').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('banners').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
      qc.invalidateQueries({ queryKey: ['banners'] });
      toast.success(editing ? 'Banner atualizado!' : 'Banner criado!');
      setDialogOpen(false);
    },
    onError: () => toast.error('Erro ao salvar banner'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('banners').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
      qc.invalidateQueries({ queryKey: ['banners'] });
      toast.success('Banner removido!');
    },
  });

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyBanner, sort_order: banners.length });
    setDialogOpen(true);
  };

  const openEdit = (b: Banner) => {
    setEditing(b);
    setForm({ title: b.title, image_url: b.image_url, alt: b.alt, active: b.active, sort_order: b.sort_order });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-base font-semibold text-foreground">Banners ({banners.length})</h2>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Novo</Button>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
        <div className="space-y-2">
          {banners.map(b => (
            <Card key={b.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                {b.image_url && (
                  <img src={b.image_url} alt={b.alt} className="w-20 h-10 object-cover rounded-md shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground truncate">{b.title || b.alt}</span>
                    {!b.active && <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Inativo</span>}
                  </div>
                  <span className="text-xs text-muted-foreground">Ordem: {b.sort_order}</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(b)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(b.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {banners.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum banner cadastrado</p>}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Editar Banner' : 'Novo Banner'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Promoção de Gás" /></div>

            {/* Image upload area */}
            <div>
              <Label>Imagem</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {form.image_url ? (
                <div className="relative mt-1">
                  <img src={form.image_url} alt="Preview" className="w-full h-36 object-cover rounded-lg border border-border" />
                  <div className="absolute bottom-2 right-2 flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-8 text-xs"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
                      Trocar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="h-8 text-xs"
                      onClick={() => setForm(f => ({ ...f, image_url: '' }))}
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="mt-1 w-full h-36 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <span className="text-sm">Enviando...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8" />
                      <span className="text-sm font-medium">Clique para enviar uma imagem</span>
                      <span className="text-xs">JPG, PNG ou WebP — máx 5MB</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div><Label>Texto Alternativo</Label><Input value={form.alt} onChange={e => setForm(f => ({ ...f, alt: e.target.value }))} placeholder="Descrição da imagem" /></div>
            <div><Label>Ordem</Label><Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
              <Label>Ativo</Label>
            </div>
            <Button className="w-full" onClick={() => upsert.mutate()} disabled={!form.image_url || upsert.isPending || uploading}>
              {upsert.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
