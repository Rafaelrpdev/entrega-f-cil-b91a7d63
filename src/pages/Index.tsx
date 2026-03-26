import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { products } from '@/data/products';
import ProductCard from '@/components/ProductCard';
import ProductDetail from '@/components/ProductDetail';
import CartSheet from '@/components/CartSheet';
import PromoBanner from '@/components/PromoBanner';
import { useCart } from '@/contexts/CartContext';
import type { Product } from '@/types/product';

const Index = () => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const { totalItems } = useCart();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-foreground">Gás & Água Express</h1>
            <p className="text-xs text-muted-foreground">Delivery rápido e seguro</p>
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="relative p-2.5 rounded-xl bg-primary/10 text-primary"
          >
            <ShoppingCart className="w-5 h-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-4 space-y-6 pb-8">
        <PromoBanner />

        <section>
          <h2 className="text-base font-semibold text-foreground mb-3">Nossos Produtos</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {products.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={setSelectedProduct}
              />
            ))}
          </div>
        </section>
      </main>

      {/* Product Detail Overlay */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductDetail
            product={selectedProduct}
            onBack={() => setSelectedProduct(null)}
          />
        )}
      </AnimatePresence>

      {/* Cart */}
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
};

export default Index;
