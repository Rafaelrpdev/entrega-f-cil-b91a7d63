import { useState, useEffect, useCallback, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

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

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: ['places'],
    language: 'pt-BR',
    region: 'BR'
  });

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

  // Google Maps Search (Geocoding)
  const geocodeAddress = useCallback(() => {
    if (!isLoaded || isGpsFixed || !address) return;

    const geocoder = new google.maps.Geocoder();
    const fullSearch = `${address}, ${neighborhood}, ${city}, ${state}, Brasil`;

    geocoder.geocode({ address: fullSearch }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const location = results[0].geometry.location;
        setLat(location.lat());
        setLng(location.lng());
      }
    });
  }, [isLoaded, isGpsFixed, address, neighborhood, city, state]);

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
        
        if (isLoaded) {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              const addr = results[0].address_components;
              const cityName = addr.find(c => c.types.includes('locality'))?.long_name;
              const stateName = addr.find(c => c.types.includes('administrative_area_level_1'))?.short_name;
              if (cityName) setCity(cityName);
              if (stateName) setState(stateName);
            }
          });
        }
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
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-muted rounded-full z-10" />
        
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
              
              <div className="aspect-video lg:aspect-auto lg:h-[220px] rounded-3xl overflow-hidden border border-border bg-muted/30 relative group">
                {!apiKey ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-2">
                    <MapPin className="w-8 h-8 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground font-medium">Chave da Google API não encontrada.<br/>O mapa operará em modo demonstração.</p>
                  </div>
                ) : !isLoaded ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : lat && lng ? (
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={{ lat, lng }}
                    zoom={17}
                    options={{ disableDefaultUI: true, gestureHandling: 'greedy' }}
                  >
                    <MarkerF position={{ lat, lng }} animation={google.maps.Animation.DROP} />
                  </GoogleMap>
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
