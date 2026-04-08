import { useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";

import { supabase } from "@/integrations/supabase/client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { Button } from "@/components/ui/button";

import {
  ArrowLeft,
  Package,
  ShoppingBag,
  BarChart3,
  Image,
  Settings,
  Tag,
  Users,
  Warehouse,
  HeartPulse,
} from "lucide-react";

import {
  useQuery,
} from "@tanstack/react-query";

import { toast } from "sonner";

import AdminCustomers from "@/components/admin/AdminCustomers";
import AdminProducts from "@/components/admin/AdminProducts";
import AdminStock from "@/components/admin/AdminStock";
import AdminOrders from "@/components/admin/AdminOrders";
import AdminFinance from "@/components/admin/AdminFinance";
import AdminBanners from "@/components/admin/AdminBanners";
import AdminStoreSettings from "@/components/admin/AdminStoreSettings";
import AdminCoupons from "@/components/admin/AdminCoupons";
import AdminFinancialHealth from "@/components/admin/AdminFinancialHealth";

export default function Admin() {

  const { user, loading } =
    useAuth();

  const navigate =
    useNavigate();

  // 🔐 Verificação segura com React Query

  const {
    data: isAdmin,
    isLoading: adminLoading,
  } = useQuery({

    queryKey: [
      "is-admin",
      user?.id,
    ],

    queryFn: async () => {

      if (!user) return false;

      try {

        const { data, error } =
          await supabase.rpc(
            "has_role",
            {
              _user_id: user.id,
              _role: "admin",
            }
          );

        if (error) {

          console.error(
            "Erro admin:",
            error
          );

          return false;

        }

        return !!data;

      }
      catch (err) {

        console.error(
          "Erro inesperado:",
          err
        );

        return false;

      }

    },

    enabled: !!user,

    staleTime:
      1000 * 60 * 5,

  });

  // 🔐 Redirecionamento seguro

  if (!loading &&
      !adminLoading) {

    if (!user ||
        !isAdmin) {

      toast.error(
        "Acesso negado"
      );

      navigate("/");

      return null;

    }

  }

  // 🔄 Loading

  if (loading ||
      adminLoading) {

    return (

      <div className="flex items-center justify-center min-h-screen text-muted-foreground">

        Carregando...

      </div>

    );

  }

  return (

    <div className="min-h-screen bg-background">

      {/* HEADER */}

      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">

        <div className="max-w-5xl mx-auto flex items-center gap-3 px-4 py-3">

          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              navigate("/")
            }
          >

            <ArrowLeft className="w-5 h-5" />

          </Button>

          <h1 className="text-lg font-bold text-foreground">

            Painel Admin

          </h1>

        </div>

      </header>

      {/* CONTEÚDO */}

      <main className="max-w-5xl mx-auto px-4 py-4">

        <Tabs defaultValue="orders">
          <TabsList className="w-full grid grid-cols-3 sm:grid-cols-9 mb-4">

            <TabsTrigger value="customers">

              <Users className="w-4 h-4" />

              Clientes

            </TabsTrigger>

            <TabsTrigger value="orders">

              <ShoppingBag className="w-4 h-4" />

              Pedidos

            </TabsTrigger>

            <TabsTrigger value="products">

              <Package className="w-4 h-4" />

              Produtos

            </TabsTrigger>

            <TabsTrigger value="stock">

              <Warehouse className="w-4 h-4" />

              Estoque

            </TabsTrigger>

            <TabsTrigger value="banners">

              <Image className="w-4 h-4" />

              Banners

            </TabsTrigger>

            <TabsTrigger value="coupons">

              <Tag className="w-4 h-4" />

              Cupons

            </TabsTrigger>

            <TabsTrigger value="finance">

              <BarChart3 className="w-4 h-4" />

              Financeiro

            </TabsTrigger>

            <TabsTrigger value="health">

              <HeartPulse className="w-4 h-4" />

              Saúde

            </TabsTrigger>

            <TabsTrigger value="settings">

              <Settings className="w-4 h-4" />

              Empresa

            </TabsTrigger>
          </TabsList>

          <TabsContent value="customers">

            <AdminCustomers />

          </TabsContent>

          <TabsContent value="orders">

            <AdminOrders />

          </TabsContent>

          <TabsContent value="products">

            <AdminProducts />

          </TabsContent>

          <TabsContent value="stock">

            <AdminStock />

          </TabsContent>

          <TabsContent value="banners">

            <AdminBanners />

          </TabsContent>

          <TabsContent value="coupons">

            <AdminCoupons />

          </TabsContent>

          <TabsContent value="finance">

            <AdminFinance />

          </TabsContent>

          <TabsContent value="health">

            <AdminFinancialHealth />

          </TabsContent>

          <TabsContent value="settings">

            <AdminStoreSettings />

          </TabsContent>

        </Tabs>

      </main>

    </div>

  );

}
