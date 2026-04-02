import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';
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
  const [birthday, setBirthday] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const queryClient = useQueryClient();

  // Load existing data when opening
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
          setAddress(data.address || '');
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

  const getLocation = () => {
    if (!navigator.geolocation) {
      toast.error('GPS não suportado neste navegador');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setGpsLoading(false);
        toast.success('Localização capturada!');
      },
      () => {
        setGpsLoading(false);
        toast.error('Não foi possível obter a localização');
      }
    );
  };

  const handleSubmit = async () => {
    if (!name || !phone || !address) {
      toast.error('Preencha nome, telefone e endereço');
      return;
    }
    if (!user) return;

    setLoading(true);

    const { data: existingName } = await supabase
      .from('customers')
      .select('id')
      .ilike('name', name)
      .maybeSingle();

    if (existingName) {
      toast.error('Já existe um cadastro com este nome no sistema!');
      setLoading(false);
      // Even if it exists, if the auth user is seeing the sheet, maybe this record belongs to them?
      // Or they tried to use a name that is already taken. 
      // We don't call onComplete here because we want them to fix the name.
      return;
    }

    if (isEditMode) {
      const { error } = await supabase
        .from('customers')
        .update({
          name,
          phone,
          address,
          birthday: birthday || null,
          latitude: lat,
          longitude: lng,
        })
        .eq('user_id', user.id);

      setLoading(false);
      if (error) {
        toast.error('Erro ao atualizar: ' + error.message);
      } else {
        toast.success('Perfil atualizado com sucesso!');
        await queryClient.invalidateQueries({ queryKey: ['customer', user.id] });
        onComplete();
        onOpenChange(false);
      }
      return;
    }

    // New registration check
    const { data: existingPhone } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (existingPhone) {
      toast.error('Este número de telefone já está cadastrado!');
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('customers').insert({
      user_id: user.id,
      name,
      phone,
      address,
      birthday: birthday || null,
      latitude: lat,
      longitude: lng,
    });
    setLoading(false);

    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
    } else {
      toast.success('Cadastro realizado com sucesso!');
      await queryClient.invalidateQueries({ queryKey: ['customer', user.id] });
      onComplete();
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl p-0">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle>{isEditMode ? 'Meu Perfil' : 'Complete seu Cadastro'}</SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto p-4 space-y-4" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          <div className="space-y-2">
            <Label>Nome Completo *</Label>
            <Input placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Telefone *</Label>
            <Input placeholder="(00) 00000-0000" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Endereço *</Label>
            <Input placeholder="Rua, número, bairro" value={address} onChange={e => setAddress(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Data de Aniversário</Label>
            <Input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Localização</Label>
            <Button variant="outline" className="w-full gap-2" onClick={getLocation} disabled={gpsLoading}>
              <MapPin className="w-4 h-4" />
              {gpsLoading ? 'Obtendo...' : lat ? `📍 ${lat.toFixed(4)}, ${lng?.toFixed(4)}` : 'Enviar minha localização'}
            </Button>
          </div>
        </div>

        <div className="border-t border-border p-4 safe-bottom">
          <Button size="lg" className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Salvando...' : isEditMode ? 'Atualizar Perfil' : 'Salvar Cadastro'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
