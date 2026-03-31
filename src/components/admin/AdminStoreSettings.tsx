import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Save, Store, Clock } from 'lucide-react';

const DAYS = [
  { key: 'monday', label: 'Segunda-feira' },
  { key: 'tuesday', label: 'Terça-feira' },
  { key: 'wednesday', label: 'Quarta-feira' },
  { key: 'thursday', label: 'Quinta-feira' },
  { key: 'friday', label: 'Sexta-feira' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
] as const;

type DaySchedule = { open: string; close: string; enabled: boolean };
type BusinessHours = Record<string, DaySchedule>;

export default function AdminStoreSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [businessHours, setBusinessHours] = useState<BusinessHours>({});

  useEffect(() => {
    supabase
      .from('store_settings')
      .select('*')
      .limit(1)
      .single()
      .then(({ data, error }) => {
        if (data) {
          setSettingsId(data.id);
          setName(data.name);
          setPhone(data.phone);
          setWhatsapp(data.whatsapp);
          setPixKey(data.pix_key);
          setBusinessHours(data.business_hours as unknown as BusinessHours);
        }
        setLoading(false);
      });
  }, []);

  const updateDay = (day: string, field: keyof DaySchedule, value: string | boolean) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      whatsapp: whatsapp.trim(),
      pix_key: pixKey.trim(),
      business_hours: businessHours as unknown as Record<string, unknown>,
    };

    const { error } = settingsId
      ? await supabase.from('store_settings').update(payload).eq('id', settingsId)
      : await supabase.from('store_settings').insert(payload);

    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar configurações');
    } else {
      toast.success('Configurações salvas com sucesso!');
    }
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Store className="w-4 h-4" /> Informações da Empresa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="store-name">Nome da Empresa</Label>
            <Input id="store-name" value={name} onChange={e => setName(e.target.value)} placeholder="Nome da empresa" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="store-phone">Telefone</Label>
              <Input id="store-phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 0000-0000" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="store-whatsapp">WhatsApp</Label>
              <Input id="store-whatsapp" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="store-pix">Chave PIX</Label>
            <Input id="store-pix" value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" /> Horários de Funcionamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {DAYS.map(({ key, label }) => {
            const day = businessHours[key] || { open: '', close: '', enabled: false };
            return (
              <div key={key} className="flex items-center gap-3">
                <Switch checked={day.enabled} onCheckedChange={v => updateDay(key, 'enabled', v)} />
                <span className="w-28 text-sm font-medium truncate">{label}</span>
                <Input
                  type="time"
                  value={day.open}
                  onChange={e => updateDay(key, 'open', e.target.value)}
                  disabled={!day.enabled}
                  className="w-28 text-sm"
                />
                <span className="text-muted-foreground text-sm">às</span>
                <Input
                  type="time"
                  value={day.close}
                  onChange={e => updateDay(key, 'close', e.target.value)}
                  disabled={!day.enabled}
                  className="w-28 text-sm"
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
        <Save className="w-4 h-4" />
        {saving ? 'Salvando...' : 'Salvar Configurações'}
      </Button>
    </div>
  );
}
