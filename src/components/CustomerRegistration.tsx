import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export default function CustomerRegistration({ open, onOpenChange, onComplete }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [birthday, setBirthday] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const queryClient = useQueryClient();

  // Load existing data
  useEffect(() => {
    if (open && user) {
      const loadProfile = async () => {
        const { data } = await supabase
          .from('customers')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data) {
          setName(data.name || '');
          setPhone(data.phone || '');
          
          const parts = data.address?.split(' - ') || [];
          if (parts.length >= 4) {
            setAddress(parts[0]);
            setNeighborhood(parts[1]);
            setCity(parts[2]);
            setState(parts[3]);
          } else if (parts.length >= 3) {
            setAddress(parts[0]);
            setNeighborhood(parts[1]);
            setCity(parts[2]);
            setState('');
          } else {
            setAddress(data.address || '');
          }
          
          setBirthday(data.birthday || '');
          setLat(data.latitude || null);
          setLng(data.longitude || null);
          setIsEditMode(true);
        } else {
          setIsEditMode(false);
        }
      };
      loadProfile();
    }
  }, [open, user]);

  const handleSubmit = async () => {
    if (!name || !phone || !address || !city || !state) {
      toast.error('Favor preencher todos os campos obrigatórios');
      return;
    }
    if (!user) return;
    setLoading(true);

    const fullAddress = `${address} - ${neighborhood || 'S/B'} - ${city} - ${state}`;

    const dataPayload = {
      name,
      phone,
      address: fullAddress,
      birthday: birthday || null,
      latitude: lat,
      longitude: lng,
    };

    if (isEditMode) {
      const { error } = await supabase.from('customers').update(dataPayload).eq('user_id', user.id);
      setLoading(false);
      if (error) toast.error('Erro ao atualizar: ' + error.message);
      else {
        toast.success('Perfil atualizado com sucesso!');
        await queryClient.invalidateQueries({ queryKey: ['customer', user.id] });
        onComplete();
        onOpenChange(false);
      }
      return;
    }

    const { error } = await supabase.from('customers').insert({ ...dataPayload, user_id: user.id });
    setLoading(false);
    if (error) toast.error('Erro ao salvar: ' + error.message);
    else {
      toast.success('Cadastro realizado!');
      await queryClient.invalidateQueries({ queryKey: ['customer', user.id] });
      onComplete();
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[auto] rounded-t-3xl border-t-0 p-0 overflow-hidden bg-background">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-muted rounded-full z-10" />
        
        <SheetHeader className="p-6 pt-8">
          <SheetTitle className="text-2xl font-bold">
            {isEditMode ? 'Meu Perfil' : 'Complete seu Cadastro'}
          </SheetTitle>
        </SheetHeader>

        <div className="px-6 pb-8 space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome Completo</Label>
                <Input placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} className="h-11 bg-muted/50 border-transparent focus:border-primary/20 focus:ring-primary/10" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Telefone</Label>
                <Input placeholder="(00) 00000-0000" value={phone} onChange={e => setPhone(e.target.value)} className="h-11 bg-muted/50 border-transparent focus:border-primary/20 focus:ring-primary/10" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Endereço Completo</Label>
              <Input placeholder="Ex: Rua Campo Largo, 100" value={address} onChange={e => setAddress(e.target.value)} className="h-11 bg-muted/50 border-transparent focus:border-primary/20 focus:ring-primary/10" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bairro</Label>
                <Input placeholder="Bairro" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} className="h-11 bg-muted/50 border-transparent focus:border-primary/20 focus:ring-primary/10" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cidade</Label>
                <Input placeholder="Cidade" value={city} onChange={e => setCity(e.target.value)} className="h-11 bg-muted/50 border-transparent focus:border-primary/20 focus:ring-primary/10" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</Label>
                <Input placeholder="Estado" value={state} onChange={e => setState(e.target.value)} className="h-11 bg-muted/50 border-transparent focus:border-primary/20 focus:ring-primary/10" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data de Aniversário</Label>
              <Input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className="h-11 bg-muted/50 border-transparent focus:border-primary/10" />
            </div>
          </div>

          <div className="pt-2">
            <Button size="lg" className="w-full h-14 rounded-2xl shadow-xl shadow-primary/20 text-base font-bold transition-transform active:scale-95" onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </div>
              ) : isEditMode ? 'Salvar Alterações' : 'Finalizar Cadastro'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
