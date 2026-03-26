import { motion } from 'framer-motion';
import { ArrowLeft, ShoppingCart, Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Product } from '@/types/product';
import { useCart } from '@/contexts/CartContext';

interface Props {
  product: Product;
  onBack: () => void;
}

export default function ProductDetail({ product, onBack }: Props) {
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);

  const handleAdd = () => {
    for (let i = 0; i < qty; i++) addItem(product);
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 bg-background overflow-y-auto"
    >
      <div className="max-w-lg mx-auto">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm p-4">
          <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Voltar</span>
          </button>
        </div>

        <div className="px-4 pb-32">
          <div className="aspect-square bg-muted rounded-xl p-8 flex items-center justify-center mb-6">
            <img src={product.image} alt={product.name} className="w-full h-full object-contain" width={512} height={512} />
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">{product.name}</h1>
          <p className="text-3xl font-bold text-primary mb-4">
            R$ {product.price.toFixed(2).replace('.', ',')}
          </p>
          <p className="text-muted-foreground leading-relaxed mb-6">{product.description}</p>

          <div className="flex items-center gap-4 mb-6">
            <span className="text-sm text-muted-foreground">Quantidade:</span>
            <div className="flex items-center gap-3 bg-muted rounded-lg px-2">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-2 text-foreground">
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-semibold">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="p-2 text-foreground">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 safe-bottom">
          <div className="max-w-lg mx-auto">
            <Button size="lg" className="w-full gap-2 text-base" onClick={handleAdd}>
              <ShoppingCart className="w-5 h-5" />
              Adicionar R$ {(product.price * qty).toFixed(2).replace('.', ',')}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
