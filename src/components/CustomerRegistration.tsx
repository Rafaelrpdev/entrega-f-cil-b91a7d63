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
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
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
          
          // Try to parse: "Rua, Num - Bairro - Cidade - Estado"
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

  // Automatic geocoding (Debounced)
  useEffect(() => {
    if (!address || !city) return;
    
    const handler = setTimeout(async () => {
      const fullAddress = `${address}, ${neighborhood}, ${city}${state ? `, ${state}` : ''}`;
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}`);
        const results = await response.json();
        if (results && results.length > 0) {
          const { lat: newLat, lon: newLng } = results[0];
          setLat(parseFloat(newLat));
          setLng(parseFloat(newLng));
        }
      } catch (err) {
        console.error("Geocoding error:", err);
      }
    }, 1500); // 1.5s delay after typing

    return () => clearTimeout(handler);
  }, [address, neighborhood, city, state]);

  const getLocation = () => {
    if (!navigator.geolocation) {
      toast.error('GPS não suportado neste navegador');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        setGpsLoading(false);
        toast.success('Ponto marcado no mapa via GPS!');
      },
      () => {
        setGpsLoading(false);
        toast.error('Não foi possível obter a localização');
      }
    );
  };

  const handleSubmit = async () => {
    if (!name || !phone || !address || !city || !state) {
      toast.error('Preencha nome, telefone, endereço, cidade e estado');
      return;
    }
    if (!user) return;

    setLoading(true);

    const fullAddress = `${address} - ${neighborhood || 'S/B'} - ${city} - ${state}`;

    if (isEditMode) {
      const { error } = await supabase
        .from('customers')
        .update({
          name,
          phone,
          address: fullAddress,
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

    // New registration name check
    const { data: existingName } = await supabase
      .from('customers')
      .select('id')
      .ilike('name', name)
      .maybeSingle();

    if (existingName) {
      toast.error('Já existe um cadastro com este nome no sistema!');
      setLoading(false);
      return;
    }

    // New registration phone check
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
      address: fullAddress,
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-4">
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <Input placeholder="(00) 00000-0000" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
            </div>
            
            <div className="space-y-2 group">
              <Label className="flex justify-between">
                Localização no Mapa
                {lat && <span className="text-[10px] text-primary animate-pulse">📍 Sincronizado</span>}
              </Label>
              <div className="aspect-square md:aspect-auto md:h-full min-h-[120px] rounded-2xl bg-muted border border-border overflow-hidden relative shadow-inner">
                {lat && lng ? (
                  <iframe 
                    width="100%" 
                    height="100%" 
                    frameBorder="0" 
                    scrolling="no" 
                    marginHeight={0} 
                    marginWidth={0} 
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.005},${lat-0.005},${lng+0.005},${lat+0.005}&layer=mapnik&marker=${lat},${lng}`}
                    className="opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                    <MapPin className="w-8 h-8 text-muted-foreground/30 mb-2" />
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Aguardando endereço...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Endereço completo (Rua e Número) *</Label>
            <Input placeholder="Ex: Rua das Flores, 123" value={address} onChange={e => setAddress(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1 space-y-2">
              <Label>Bairro *</Label>
              <Input placeholder="Bairro" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} />
            </div>
            <div className="sm:col-span-1 space-y-2">
              <Label>Cidade *</Label>
              <Input placeholder="Cidade" value={city} onChange={e => setCity(e.target.value)} />
            </div>
            <div className="sm:col-span-1 space-y-2">
              <Label>Estado *</Label>
              <Input placeholder="Estado" value={state} onChange={e => setState(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data de Aniversário</Label>
              <Input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Obter GPS Automático</Label>
              <Button variant="outline" className="w-full gap-2 hover:bg-primary/5 transition-colors" onClick={getLocation} disabled={gpsLoading}>
                <MapPin className="w-4 h-4" />
                {gpsLoading ? 'Obtendo...' : 'Capturar via GPS'}
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-border p-4 safe-bottom">
          <Button size="lg" className="w-full shadow-lg shadow-primary/20" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Salvando...' : isEditMode ? 'Atualizar Perfil' : 'Salvar Cadastro'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
