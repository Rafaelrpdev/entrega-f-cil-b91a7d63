import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/contexts/CartContext';
import { useState } from 'react';
import { CreditCard, Banknote, QrCode, CheckCircle2 } from 'lucide-react';
import type { PaymentMethod, PaymentTiming } from '@/types/product';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const paymentIcons: Record<PaymentMethod, typeof CreditCard> = {
  pix: QrCode,
  credito: CreditCard,
  debito: CreditCard,
  dinheiro: Banknote,
};

const paymentLabels: Record<PaymentMethod, string> = {
  pix: 'PIX',
  credito: 'Crédito',
  debito: 'Débito',
  dinheiro: 'Dinheiro',
};

export default function CheckoutSheet({ open, onOpenChange }: Props) {
  const { totalPrice, clearCart } = useCart();
  const [timing, setTiming] = useState<PaymentTiming | null>(null);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const availableMethods: PaymentMethod[] = timing === 'agora' ? ['pix'] : ['pix', 'credito', 'debito', 'dinheiro'];

  const handleSubmit = () => {
    if (!name || !phone || !address || !timing || !method) {
      toast.error('Preencha todos os campos');
      return;
    }
    setSubmitted(true);
    clearCart();
  };

  if (submitted) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[60vh] rounded-t-2xl">
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-success" />
            <h2 className="text-2xl font-bold text-foreground">Pedido Confirmado!</h2>
            <p className="text-muted-foreground">Seu pedido foi recebido e está sendo preparado.</p>
            {timing === 'agora' && method === 'pix' && (
              <div className="bg-muted rounded-xl p-4 w-full max-w-xs">
                <p className="text-xs text-muted-foreground mb-2">Chave PIX</p>
                <p className="font-mono text-sm text-foreground break-all">exemplo@email.com</p>
                <p className="text-lg font-bold text-primary mt-2">R$ {totalPrice.toFixed(2).replace('.', ',')}</p>
              </div>
            )}
            <Button onClick={() => onOpenChange(false)} className="mt-4">Voltar às Compras</Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl p-0">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle>Finalizar Pedido</SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto p-4 space-y-5" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground text-sm">Seus Dados</h3>
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" placeholder="Seu nome completo" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" placeholder="(00) 00000-0000" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Endereço de Entrega</Label>
              <Input id="address" placeholder="Rua, número, bairro" value={address} onChange={e => setAddress(e.target.value)} />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-foreground text-sm">Quando pagar?</h3>
            <div className="grid grid-cols-2 gap-2">
              {(['agora', 'entrega'] as PaymentTiming[]).map(t => (
                <button
                  key={t}
                  onClick={() => { setTiming(t); setMethod(null); }}
                  className={`p-3 rounded-xl border text-sm font-medium transition-colors ${
                    timing === t ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground'
                  }`}
                >
                  {t === 'agora' ? 'Pagar Agora (PIX)' : 'Pagar na Entrega'}
                </button>
              ))}
            </div>
          </div>

          {timing && (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground text-sm">Forma de Pagamento</h3>
              <div className="grid grid-cols-2 gap-2">
                {availableMethods.map(m => {
                  const Icon = paymentIcons[m];
                  return (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      className={`p-3 rounded-xl border text-sm font-medium transition-colors flex items-center gap-2 ${
                        method === m ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {paymentLabels[m]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border p-4 safe-bottom">
          <div className="flex justify-between items-center mb-3">
            <span className="font-medium text-foreground">Total</span>
            <span className="text-xl font-bold text-primary">R$ {totalPrice.toFixed(2).replace('.', ',')}</span>
          </div>
          <Button size="lg" className="w-full text-base" onClick={handleSubmit} disabled={!name || !phone || !address || !timing || !method}>
            Confirmar Pedido
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
