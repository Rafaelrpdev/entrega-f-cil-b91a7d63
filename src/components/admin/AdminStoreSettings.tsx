import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Save, Store, Clock, Zap } from 'lucide-react';

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
  
  // Automation settings
  const [automationActive, setAutomationActive] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [apiToken, setApiToken] = useState('');

  useEffect(() => {
    supabase
      .from('store_settings')
      .select('*')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSettingsId(data.id);
          setName(data.name || '');
          setPhone(data.phone || '');
          setWhatsapp(data.whatsapp || '');
          setPixKey(data.pix_key || '');
          setBusinessHours(data.business_hours as unknown as BusinessHours || {});
          
          // Load automation fields (using dynamic keys to avoid TS errors for potentially missing columns)
          // @ts-ignore
          setAutomationActive(!!data.whatsapp_automation_active);
          // @ts-ignore
          setWebhookUrl(data.whatsapp_webhook_url || '');
          // @ts-ignore
          setApiToken(data.whatsapp_api_token || '');
        }
        setLoading(false);
      });
  }, []);

  const updateDay = (day: string, field: keyof DaySchedule, value: string | boolean) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: { ...(prev[day] || { open: '08:00', close: '22:00', enabled: false }), [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      whatsapp: whatsapp.trim(),
      pix_key: pixKey.trim(),
      business_hours: businessHours as unknown as Json,
      whatsapp_automation_active: automationActive,
      whatsapp_webhook_url: webhookUrl.trim(),
      whatsapp_api_token: apiToken.trim(),
    };

    const { error } = settingsId
      ? await supabase.from('store_settings').update(payload).eq('id', settingsId)
      : await supabase.from('store_settings').insert(payload);

    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar configurações: ' + error.message);
    } else {
      toast.success('Configurações salvas com sucesso!');
    }
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-10">
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
              <Label htmlFor="store-whatsapp">WhatsApp (Exibição)</Label>
              <Input id="store-whatsapp" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="store-pix">Chave PIX</Label>
            <Input id="store-pix" value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-primary">
            <Zap className="w-4 h-4" /> Automação de WhatsApp (API)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between bg-background p-3 rounded-lg border border-primary/10">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold">Enviar Mensagem Automática</Label>
              <p className="text-[11px] text-muted-foreground">O pedido será enviado direto para a sua API sem confirmação do cliente.</p>
            </div>
            <Switch checked={automationActive} onCheckedChange={setAutomationActive} />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="webhook-url">URL do Webhook / API</Label>
              <Input id="webhook-url" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://api.z-api.io/instances/..." disabled={!automationActive} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="api-token">Token de API / Auth</Label>
              <Input id="api-token" type="password" value={apiToken} onChange={e => setApiToken(e.target.value)} placeholder="Token secreto" disabled={!automationActive} />
            </div>
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
            const day = businessHours[key] || { open: '08:00', close: '22:00', enabled: false };
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

      <Button onClick={handleSave} disabled={saving} className="w-full h-12 gap-2 text-base shadow-lg shadow-primary/20">
        <Save className="w-4 h-4" />
        {saving ? 'Salvando...' : 'Salvar Todas as Configurações'}
      </Button>
    </div>
  );
}
