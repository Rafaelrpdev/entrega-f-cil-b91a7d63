import { useState, useEffect } from 'react';
import { ShoppingCart, User, LogOut, Shield, Package, HelpCircle, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/ProductCard';
import ProductDetail from '@/components/ProductDetail';
import CartSheet from '@/components/CartSheet';
import PromoBanner from '@/components/PromoBanner';
import AuthSheet from '@/components/AuthSheet';
import CustomerRegistration from '@/components/CustomerRegistration';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Product } from '@/types/product';

import gasImg from '@/assets/gas.jpg';
import aguaImg from '@/assets/agua.jpg';
import carvaoImg from '@/assets/carvao.jpg';

const categoryImages: Record<string, string> = { gas: gasImg, agua: aguaImg, carvao: carvaoImg };

const Index = () => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const { totalItems } = useCart();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const { data: isAdmin } = useQuery({
    queryKey: ['is-admin', user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc('has_role', { _user_id: user!.id, _role: 'admin' });
      return !!data;
    },
    enabled: !!user,
  });

  const { data: dbProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;
      return data;
    },
  });

  const { data: customer } = useQuery({
    queryKey: ['customer', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('*').eq('user_id', user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const queryClient = useQueryClient();

  // Prompt registration if logged in but no customer profile
  useEffect(() => {
    // Only open if we ARE sure customer is null (finished loading and not found)
    if (user && customer === null && !registrationOpen) {
      setRegistrationOpen(true);
    }
  }, [user, customer]);

  const handleRegistrationComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['customer', user?.id] });
    setRegistrationOpen(false);
  };

  const products: Product[] = (dbProducts || []).map(p => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    price: Number(p.sale_price),
    image: p.image_url || categoryImages[p.category] || gasImg,
    category: p.category as 'gas' | 'agua' | 'carvao',
  }));

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-foreground">Gás Santo Antonio</h1>
            <p className="text-xs text-muted-foreground">Delivery rápido e seguro</p>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {isAdmin && (
                  <button onClick={() => navigate('/admin')} className="p-2.5 rounded-xl bg-primary/10 text-primary" title="Admin">
                    <Shield className="w-5 h-5" />
                  </button>
                )}
                <button onClick={() => signOut()} className="p-2.5 rounded-xl bg-muted text-muted-foreground" title="Sair">
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button onClick={() => setAuthOpen(true)} className="p-2.5 rounded-xl bg-muted text-muted-foreground" title="Entrar">
                <User className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
              className="relative p-2.5 rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 transition-colors" 
              title="Alternar Tema"
            >
              <Sun className="w-5 h-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute left-2.5 top-2.5 w-5 h-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </button>
            <button onClick={() => setCartOpen(true)} className="relative p-2.5 rounded-xl bg-primary/10 text-primary">
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-6 pb-8">
        <PromoBanner />

        {user && customer && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-3">
            <User className="w-5 h-5 text-primary" />
            <span className="text-sm text-foreground">Olá, <strong>{customer.name}</strong>!</span>
          </div>
        )}

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => setCartOpen(true)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            <ShoppingCart className="w-6 h-6 text-primary" />
            <span className="text-xs font-medium text-foreground">Comprar</span>
          </button>
          <button
            onClick={() => {
              if (!user) { setAuthOpen(true); return; }
              navigate('/meus-pedidos');
            }}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-accent/50 hover:bg-accent transition-colors"
          >
            <Package className="w-6 h-6 text-accent-foreground" />
            <span className="text-xs font-medium text-foreground">Meus Pedidos</span>
          </button>
          <button
            onClick={() => {
              if (!user) { setAuthOpen(true); return; }
              setRegistrationOpen(true);
            }}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
          >
            <User className="w-6 h-6 text-secondary-foreground" />
            <span className="text-xs font-medium text-foreground">Meu Perfil</span>
          </button>
          <button
            onClick={() => navigate('/suporte')}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
          >
            <HelpCircle className="w-6 h-6 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Suporte</span>
          </button>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-3">Nossos Produtos</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {products.map(product => (
              <ProductCard key={product.id} product={product} onSelect={setSelectedProduct} />
            ))}
          </div>
        </section>
      </main>

      <AnimatePresence>
        {selectedProduct && <ProductDetail product={selectedProduct} onBack={() => setSelectedProduct(null)} />}
      </AnimatePresence>

      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />
      <AuthSheet open={authOpen} onOpenChange={setAuthOpen} />
      <CustomerRegistration 
        open={registrationOpen} 
        onOpenChange={setRegistrationOpen} 
        onComplete={handleRegistrationComplete} 
      />
    </div>
  );
};

export default Index;
