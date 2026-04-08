import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useState } from 'react';
import CheckoutSheet from './CheckoutSheet';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CartSheet({ open, onOpenChange }: Props) {

  const {
    items,
    updateQuantity,
    removeItem,
    totalPrice
  } = useCart();

  const [showCheckout, setShowCheckout] =
    useState(false);



  return (

    <>

      {/* 🛒 Carrinho */}
      <Sheet
        open={open && !showCheckout}
        onOpenChange={(v) => {

          if (!v) {

            setShowCheckout(false);
            onOpenChange(false);

          }

        }}
      >

        <SheetContent
          side="bottom"
          className="h-[85vh] rounded-t-2xl p-0"
        >

          <SheetHeader className="p-4 border-b border-border">

            <SheetTitle className="flex items-center gap-2">

              <ShoppingBag className="w-5 h-5 text-primary" />

              Carrinho

            </SheetTitle>

          </SheetHeader>



          {/* LISTA */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-3"
            style={{
              maxHeight:
                'calc(85vh - 160px)'
            }}
          >

            {items.length === 0 ? (

              <div className="text-center py-12 text-muted-foreground">

                <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />

                <p>Seu carrinho está vazio</p>

              </div>

            ) : (

              items.map(item => (

                <div
                  key={item.product.id}
                  className="flex items-center gap-3 bg-muted/50 rounded-xl p-3"
                >

                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-16 h-16 object-contain rounded-lg bg-card"
                  />

                  <div className="flex-1 min-w-0">

                    <p className="text-sm font-medium text-foreground truncate">

                      {item.product.name}

                    </p>

                    <p className="text-sm font-bold text-primary">

                      R$ {(item.product.price * item.quantity)
                        .toFixed(2)
                        .replace('.', ',')}

                    </p>

                  </div>



                  <div className="flex items-center gap-1">

                    <button
                      onClick={() =>
                        updateQuantity(
                          item.product.id,
                          item.quantity - 1
                        )
                      }
                      className="p-1.5 rounded-lg bg-card border border-border"
                    >

                      <Minus className="w-3.5 h-3.5" />

                    </button>



                    <span className="w-7 text-center text-sm font-semibold">

                      {item.quantity}

                    </span>



                    <button
                      onClick={() =>
                        updateQuantity(
                          item.product.id,
                          item.quantity + 1
                        )
                      }
                      className="p-1.5 rounded-lg bg-card border border-border"
                    >

                      <Plus className="w-3.5 h-3.5" />

                    </button>



                    <button
                      onClick={() =>
                        removeItem(item.product.id)
                      }
                      className="p-1.5 rounded-lg text-destructive ml-1"
                    >

                      <Trash2 className="w-3.5 h-3.5" />

                    </button>

                  </div>

                </div>

              ))

            )}

          </div>



          {/* TOTAL */}
          {items.length > 0 && (

            <div className="border-t border-border p-4 space-y-3 safe-bottom">

              <div className="flex justify-between items-center">

                <span className="font-medium text-foreground">

                  Total

                </span>

                <span className="text-xl font-bold text-primary">

                  R$ {totalPrice
                    .toFixed(2)
                    .replace('.', ',')}

                </span>

              </div>



              <Button
                size="lg"
                className="w-full text-base"
                onClick={() =>
                  setShowCheckout(true)
                }
              >

                Finalizar Pedido

              </Button>

            </div>

          )}

        </SheetContent>

      </Sheet>



      {/* 💳 Checkout separado */}
      <CheckoutSheet
        open={showCheckout}
        onOpenChange={(v) => {

          setShowCheckout(v);

          if (!v) {

            onOpenChange(false);

          }

        }}
      />

    </>

  );

}
