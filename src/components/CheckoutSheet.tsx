import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/contexts/CartContext';
import { useState } from 'react';
import { CreditCard, Banknote, QrCode, CheckCircle2, Tag, X, Loader2 } from 'lucide-react';
import type { PaymentMethod, PaymentTiming } from '@/types/product';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AppliedCoupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  discountAmount: number;
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

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const discount = appliedCoupon?.discountAmount ?? 0;
  const finalTotal = Math.max(0, totalPrice - discount);

  const availableMethods: PaymentMethod[] = timing === 'agora' ? ['pix'] : ['pix', 'credito', 'debito', 'dinheiro'];

  const applyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;

    setCouponLoading(true);
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code)
      .eq('active', true)
      .gt('valid_until', new Date().toISOString())
      .maybeSingle();

    setCouponLoading(false);

    if (error || !data) {
      toast.error('Cupom inválido ou expirado');
      return;
    }

    if (data.max_uses != null && data.used_count >= data.max_uses) {
      toast.error('Este cupom já atingiu o limite de usos');
      return;
    }

    if (data.min_order_value && totalPrice < Number(data.min_order_value)) {
      toast.error(`Pedido mínimo de R$ ${Number(data.min_order_value).toFixed(2).replace('.', ',')} para este cupom`);
      return;
    }

    const discountAmount =
      data.discount_type === 'percentage'
        ? totalPrice * (Number(data.discount_value) / 100)
        : Number(data.discount_value);

    setAppliedCoupon({
      id: data.id,
      code: data.code,
      discount_type: data.discount_type,
      discount_value: Number(data.discount_value),
      discountAmount: Math.min(discountAmount, totalPrice),
    });

    toast.success(`Cupom "${data.code}" aplicado!`);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

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
                <p className="text-lg font-bold text-primary mt-2">R$ {finalTotal.toFixed(2).replace('.', ',')}</p>
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

          {/* Coupon Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
              <Tag className="w-4 h-4" /> Cupom de Desconto
            </h3>
            {appliedCoupon ? (
              <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl p-3">
                <div>
                  <span className="font-mono font-bold text-primary text-sm">{appliedCoupon.code}</span>
                  <p className="text-xs text-muted-foreground">
                    {appliedCoupon.discount_type === 'percentage'
                      ? `${appliedCoupon.discount_value}% de desconto`
                      : `R$ ${appliedCoupon.discount_value.toFixed(2).replace('.', ',')} de desconto`}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={removeCoupon} className="text-destructive h-8 w-8">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Digite o código"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value)}
                  className="font-mono uppercase"
                  onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                />
                <Button variant="outline" onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()}>
                  {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
                </Button>
              </div>
            )}
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
          <div className="space-y-1 mb-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">R$ {totalPrice.toFixed(2).replace('.', ',')}</span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-success">Desconto ({appliedCoupon.code})</span>
                <span className="text-success font-medium">-R$ {discount.toFixed(2).replace('.', ',')}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="font-medium text-foreground">Total</span>
              <span className="text-xl font-bold text-primary">R$ {finalTotal.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
          <Button size="lg" className="w-full text-base" onClick={handleSubmit} disabled={!name || !phone || !address || !timing || !method}>
            Confirmar Pedido
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
