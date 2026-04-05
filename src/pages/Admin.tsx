import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Package, ShoppingBag, BarChart3, Image, Settings, Tag, Users, Warehouse, HeartPulse } from 'lucide-react';
import AdminCustomers from '@/components/admin/AdminCustomers';
import AdminProducts from '@/components/admin/AdminProducts';
import AdminStock from '@/components/admin/AdminStock';
import AdminOrders from '@/components/admin/AdminOrders';
import AdminFinance from '@/components/admin/AdminFinance';
import AdminBanners from '@/components/admin/AdminBanners';
import AdminStoreSettings from '@/components/admin/AdminStoreSettings';
import AdminCoupons from '@/components/admin/AdminCoupons';

export default function Admin() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
      return;
    }
    if (user) {
      supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }).then(({ data }) => {
        if (!data) navigate('/');
        else setIsAdmin(true);
      });
    }
  }, [user, loading, navigate]);

  if (loading || isAdmin === null) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Painel Admin</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-4">
        <Tabs defaultValue="orders">
          <TabsList className="w-full grid grid-cols-4 sm:grid-cols-8 mb-4">
            <TabsTrigger value="customers" className="gap-1.5"><Users className="w-4 h-4" /> Clientes</TabsTrigger>
            <TabsTrigger value="orders" className="gap-1.5"><ShoppingBag className="w-4 h-4" /> Pedidos</TabsTrigger>
            <TabsTrigger value="products" className="gap-1.5"><Package className="w-4 h-4" /> Produtos</TabsTrigger>
            <TabsTrigger value="stock" className="gap-1.5"><Warehouse className="w-4 h-4" /> Estoque</TabsTrigger>
            <TabsTrigger value="banners" className="gap-1.5"><Image className="w-4 h-4" /> Banners</TabsTrigger>
            <TabsTrigger value="coupons" className="gap-1.5"><Tag className="w-4 h-4" /> Cupons</TabsTrigger>
            <TabsTrigger value="finance" className="gap-1.5"><HeartPulse className="w-4 h-4" /> Saúde Fin.</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5"><Settings className="w-4 h-4" /> Empresa</TabsTrigger>
          </TabsList>
          <TabsContent value="customers"><AdminCustomers /></TabsContent>
          <TabsContent value="orders"><AdminOrders /></TabsContent>
          <TabsContent value="products"><AdminProducts /></TabsContent>
          <TabsContent value="stock"><AdminStock /></TabsContent>
          <TabsContent value="banners"><AdminBanners /></TabsContent>
          <TabsContent value="coupons"><AdminCoupons /></TabsContent>
          <TabsContent value="finance"><AdminFinance /></TabsContent>
          <TabsContent value="settings"><AdminStoreSettings /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
