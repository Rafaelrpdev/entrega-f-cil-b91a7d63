import { useState, useEffect, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

// Leaflet icon fix for Vite
import 'leaflet/dist/leaflet.css';
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, 16);
  return null;
}

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
  const [isGpsFixed, setIsGpsFixed] = useState(false);
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
          if (data.latitude && data.longitude) {
            setLat(data.latitude);
            setLng(data.longitude);
            setIsGpsFixed(true);
          }
          setIsEditMode(true);
        } else {
          setIsEditMode(false);
          setIsGpsFixed(false);
        }
      };
      loadProfile();
    }
  }, [open, user]);

  // Photon Search (Alternative to Nominatim/Google)
  const geocodeAddress = useCallback(async () => {
    if (isGpsFixed || !address || !city) return;

    const query = encodeURIComponent(`${address}, ${neighborhood}, ${city}, ${state}`);
    try {
      const res = await fetch(`https://photon.komoot.io/api/?q=${query}&limit=1&lang=pt`);
      const data = await res.json();
      
      if (data.features && data.features.length > 0) {
        const [lon, latCoord] = data.features[0].geometry.coordinates;
        setLat(latCoord);
        setLng(lon);
      }
    } catch (err) {
      console.error("Geocoding error:", err);
    }
  }, [isGpsFixed, address, neighborhood, city, state]);

  // Debounce search
  useEffect(() => {
    if (!address || !city || isGpsFixed) return;
    const timer = setTimeout(geocodeAddress, 1500);
    return () => clearTimeout(timer);
  }, [address, neighborhood, city, state, geocodeAddress, isGpsFixed]);

  const getLocation = () => {
    if (!navigator.geolocation) {
      toast.error('GPS não suportado');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        setIsGpsFixed(true);
        
        try {
          // Reverse geocoding (Photon doesn't support reverse well, using Nominatim for reverse is fine as it's free)
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (data && data.address) {
            if (data.address.city || data.address.town || data.address.village) 
              setCity(data.address.city || data.address.town || data.address.village);
            if (data.address.state) setState(data.address.state);
          }
        } catch (e) {}

        setGpsLoading(false);
        toast.success('Localização capturada via GPS');
      },
      () => {
        setGpsLoading(false);
        toast.error('Não foi possível obter a localização');
      }
    );
  };

  const handleInputChange = (setter: (val: string) => void, val: string) => {
    setter(val);
    setIsGpsFixed(false);
  };

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
        toast.success('Perfil atualizado!');
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
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl border-t-0 p-0 overflow-hidden">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-muted rounded-full z-[1001]" />
        
        <SheetHeader className="p-6 pt-8 bg-background">
          <SheetTitle className="text-2xl font-bold flex items-center gap-2">
            {isEditMode ? 'Meu Perfil' : 'Complete seu Cadastro'}
          </SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto px-6 pb-6 space-y-6" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome Completo</Label>
                  <Input placeholder="Seu nome" value={name} onChange={e => handleInputChange(setName, e.target.value)} className="h-11 bg-muted/50 border-transparent focus:border-primary/20 focus:ring-primary/10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Telefone</Label>
                  <Input placeholder="(00) 00000-0000" value={phone} onChange={e => handleInputChange(setPhone, e.target.value)} className="h-11 bg-muted/50 border-transparent focus:border-primary/20 focus:ring-primary/10" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Endereço Completo</Label>
                <div className="relative">
                  <Input placeholder="Ex: Rua Campo Largo, 100" value={address} onChange={e => handleInputChange(setAddress, e.target.value)} className="h-11 pl-10 bg-muted/50 border-transparent focus:border-primary/20 focus:ring-primary/10" />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bairro</Label>
                  <Input placeholder="Bairro" value={neighborhood} onChange={e => handleInputChange(setNeighborhood, e.target.value)} className="h-11 bg-muted/50 border-transparent focus:border-primary/20 focus:ring-primary/10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cidade</Label>
                  <Input placeholder="Cidade" value={city} onChange={e => handleInputChange(setCity, e.target.value)} className="h-11 bg-muted/50 border-transparent focus:border-primary/20 focus:ring-primary/10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</Label>
                  <Input placeholder="Estado" value={state} onChange={e => handleInputChange(setState, e.target.value)} className="h-11 bg-muted/50 border-transparent focus:border-primary/20 focus:ring-primary/10" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <Label className="text-xs font-bold uppercase text-primary">Preview de Localização</Label>
                {isGpsFixed && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">🎯 FIXADO</span>}
              </div>
              
              <div className="aspect-video lg:aspect-auto lg:h-[220px] rounded-3xl overflow-hidden border border-border bg-muted/30 relative group z-0">
                {lat && lng ? (
                  <MapContainer 
                    center={[lat, lng]} 
                    zoom={16} 
                    style={{ width: '100%', height: '100%' }}
                    zoomControl={false}
                    dragging={false}
                    touchZoom={false}
                    scrollWheelZoom={false}
                    doubleClickZoom={false}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[lat, lng]} />
                    <ChangeView center={[lat, lng]} />
                  </MapContainer>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-2">
                    <MapPin className="w-8 h-8 text-muted-foreground/20" />
                    <p className="text-[10px] uppercase font-bold text-muted-foreground/50 tracking-widest">Aguardando coordenadas...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data de Aniversário</Label>
              <Input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className="h-11 bg-muted/50 border-transparent focus:border-primary/10" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Calibrar Localização</Label>
              <Button variant="outline" className="w-full h-11 gap-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all text-sm font-medium" onClick={getLocation} disabled={gpsLoading}>
                <MapPin className={`w-4 h-4 ${gpsLoading ? 'animate-bounce' : ''}`} />
                {gpsLoading ? 'Rastreando sinal...' : 'Confirmar ponto atual via GPS'}
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gradient-to-t from-background via-background to-transparent pt-10 mt-auto border-t border-border/50">
          <Button size="lg" className="w-full h-14 rounded-2xl shadow-xl shadow-primary/20 text-base font-bold transition-transform active:scale-95" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processando...
              </div>
            ) : isEditMode ? 'Salvar Alterações no Perfil' : 'Finalizar e Começar Agora'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
