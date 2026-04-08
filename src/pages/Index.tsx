import { useState, useEffect, useMemo } from "react";

import {
  ShoppingCart,
  User,
  LogOut,
  Shield,
  Package,
  HelpCircle,
  Moon,
  Sun,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { AnimatePresence } from "framer-motion";

import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

import ProductCard from "@/components/ProductCard";
import ProductDetail from "@/components/ProductDetail";
import CartSheet from "@/components/CartSheet";
import PromoBanner from "@/components/PromoBanner";
import AuthSheet from "@/components/AuthSheet";
import CustomerRegistration from "@/components/CustomerRegistration";

import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";

import { toast } from "sonner";

import type { Product } from "@/types/product";

import gasImg from "@/assets/gas.jpg";
import aguaImg from "@/assets/agua.jpg";
import carvaoImg from "@/assets/carvao.jpg";

const categoryImages: Record<string, string> = {
  gas: gasImg,
  agua: aguaImg,
  carvao: carvaoImg,
};

const Index = () => {

  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  const [cartOpen, setCartOpen] =
    useState(false);

  const [authOpen, setAuthOpen] =
    useState(false);

  const [registrationOpen, setRegistrationOpen] =
    useState(false);

  const { totalItems } = useCart();

  const { user, signOut } =
    useAuth();

  const { theme, setTheme } =
    useTheme();

  const navigate =
    useNavigate();

  const queryClient =
    useQueryClient();

  // 🔐 ADMIN

  const { data: isAdmin } =
    useQuery({

      queryKey: ["is-admin", user?.id],

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

          if (error) return false;

          return !!data;

        }
        catch {

          return false;

        }

      },

      enabled: !!user,

    });

  // 📦 PRODUTOS

  const {
    data: dbProducts,
    isLoading: productsLoading,
  } = useQuery({

    queryKey: ["products"],

    staleTime: 1000 * 60 * 5,

    queryFn: async () => {

      const { data, error } =
        await supabase
          .from("products")
          .select("*");

      if (error) {

        toast.error(
          "Erro ao carregar produtos"
        );

        throw error;

      }

      return data;

    },

  });

  // 👤 CLIENTE

  const { data: customer } =
    useQuery({

      queryKey: ["customer", user?.id],

      queryFn: async () => {

        if (!user) return null;

        const { data, error } =
          await supabase
            .from("customers")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

        if (error) {

          toast.error(
            "Erro ao carregar cliente"
          );

          throw error;

        }

        return data;

      },

      enabled: !!user,

    });

  // 🔔 Cadastro automático

  useEffect(() => {

    if (
      user &&
      customer === null &&
      !registrationOpen
    ) {

      setRegistrationOpen(true);

    }

  }, [
    user,
    customer,
    registrationOpen,
  ]);

  const handleRegistrationComplete =
    () => {

      queryClient.invalidateQueries({
        queryKey: [
          "customer",
          user?.id,
        ],
      });

      setRegistrationOpen(false);

    };

  // 🛍️ Memo produtos

  const products: Product[] =
    useMemo(() => {

      return (
        dbProducts || []
      ).map(p => ({

        id: p.id,

        name: p.name,

        description:
          p.description || "",

        price:
          Number(p.sale_price),

        image:
          p.image_url ||
          categoryImages[
            p.category
          ] ||
          gasImg,

        category:
          p.category as
            | "gas"
            | "agua"
            | "carvao",

      }));

    }, [dbProducts]);

  return (

    <div className="min-h-screen bg-background">

      {/* HEADER */}

      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">

        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">

          <div>

            <h1 className="text-lg font-bold text-foreground">

              Gás Santo Antonio

            </h1>

            <p className="text-xs text-muted-foreground">

              Delivery rápido e seguro

            </p>

          </div>

          <div className="flex items-center gap-2">

            {user ? (

              <>

                {isAdmin && (

                  <button
                    onClick={() =>
                      navigate("/admin")
                    }
                    className="p-2.5 rounded-xl bg-primary/10 text-primary"
                  >

                    <Shield className="w-5 h-5" />

                  </button>

                )}

                <button
                  onClick={signOut}
                  className="p-2.5 rounded-xl bg-muted text-muted-foreground"
                >

                  <LogOut className="w-5 h-5" />

                </button>

              </>

            ) : (

              <button
                onClick={() =>
                  setAuthOpen(true)
                }
                className="p-2.5 rounded-xl bg-muted text-muted-foreground"
              >

                <User className="w-5 h-5" />

              </button>

            )}

            {/* 🌙 Tema */}

            <button

              onClick={() =>
                setTheme(
                  theme === "dark"
                    ? "light"
                    : "dark"
                )
              }

              className="relative p-2.5 rounded-xl bg-muted text-muted-foreground"

            >

              <Sun className="w-5 h-5 dark:scale-0" />

              <Moon className="absolute w-5 h-5 scale-0 dark:scale-100" />

            </button>

            {/* 🛒 Carrinho */}

            <button
              onClick={() =>
                setCartOpen(true)
              }
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

        </div>

      </header>

      {/* MAIN */}

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-6 pb-8">

        <PromoBanner />

        {/* BOTÕES */}

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">

          <button
            onClick={() =>
              setCartOpen(true)
            }
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-primary/10"
          >

            <ShoppingCart className="w-6 h-6 text-primary" />

            Comprar

          </button>

          <button
            onClick={() => {

              if (!user) {

                setAuthOpen(true);

                return;

              }

              navigate("/meus-pedidos");

            }}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-accent/50"
          >

            <Package className="w-6 h-6" />

            Pedidos

          </button>

          <button
            onClick={() => {

              if (!user) {

                setAuthOpen(true);

                return;

              }

              setRegistrationOpen(true);

            }}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/50"
          >

            <User className="w-6 h-6" />

            Perfil

          </button>

          {/* 📞 SUPORTE REAL */}

          <button
            onClick={() =>
              window.open(
                "https://wa.me/5599999999999",
                "_blank"
              )
            }
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted"
          >

            <HelpCircle className="w-6 h-6" />

            Suporte

          </button>

        </section>

        {/* 🛍️ PRODUTOS */}

        <section>

          <h2 className="text-base font-semibold text-foreground mb-3">

            Nossos Produtos

          </h2>

          {productsLoading ? (

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">

              {[1,2,3,4].map(i => (

                <div
                  key={i}
                  className="h-40 rounded-xl bg-muted animate-pulse"
                />

              ))}

            </div>

          ) : (

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">

              {products.map(product => (

                <ProductCard
                  key={product.id}
                  product={product}
                  onSelect={setSelectedProduct}
                />

              ))}

            </div>

          )}

        </section>

      </main>

      {/* MODAIS */}

      <AnimatePresence>

        {selectedProduct && (

          <ProductDetail
            product={selectedProduct}
            onBack={() =>
              setSelectedProduct(null)
            }
          />

        )}

      </AnimatePresence>

      <CartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
      />

      <AuthSheet
        open={authOpen}
        onOpenChange={setAuthOpen}
      />

      <CustomerRegistration
        open={registrationOpen}
        onOpenChange={setRegistrationOpen}
        onComplete={handleRegistrationComplete}
      />

    </div>

  );

};

export default Index;
