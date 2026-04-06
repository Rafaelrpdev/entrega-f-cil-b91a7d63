import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const statusConfig: Record<
  string,
  {
    label: string;
    icon: React.ReactNode;
    color: string;
  }
> = {
  pending: {
    label: "Pendente",
    icon: <Clock className="w-4 h-4" />,
    color: "text-yellow-600 bg-yellow-100",
  },
  confirmed: {
    label: "Confirmado",
    icon: <CheckCircle className="w-4 h-4" />,
    color: "text-blue-600 bg-blue-100",
  },
  delivering: {
    label: "Em entrega",
    icon: <Truck className="w-4 h-4" />,
    color: "text-primary bg-primary/10",
  },
  delivered: {
    label: "Entregue",
    icon: <CheckCircle className="w-4 h-4" />,
    color: "text-green-600 bg-green-100",
  },
  cancelled: {
    label: "Cancelado",
    icon: <XCircle className="w-4 h-4" />,
    color: "text-destructive bg-destructive/10",
  },
};

export default function MeusPedidos() {

  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 🔐 Proteção de rota
  useEffect(() => {

    if (!loading && !user) {
      navigate("/");
    }

  }, [user, loading, navigate]);

  // 🧾 Buscar cliente
  const { data: customer } = useQuery({
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
        toast.error("Erro ao carregar cliente");
        throw error;
      }

      return data;

    },

    enabled: !!user,
  });

  // 📦 Buscar pedidos
  const {
    data: orders,
    isLoading,
  } = useQuery({
    queryKey: ["my-orders", customer?.id],

    queryFn: async () => {

      if (!customer) return [];

      const { data, error } =
        await supabase
          .from("orders")
          .select(
            "*, order_items(*, products(name))"
          )
          .eq(
            "customer_id",
            customer.id
          )
          .order(
            "created_at",
            { ascending: false }
          );

      if (error) {
        toast.error(
          "Erro ao carregar pedidos"
        );
        throw error;
      }

      return data || [];

    },

    enabled: !!customer,
  });

  // 🚚 Confirmar entrega
  const confirmDelivery =
    useMutation({

      mutationFn: async (
        orderId: string
      ) => {

        const { error } =
          await supabase
            .from("orders")
            .update({
              status: "delivered",
            })
            .eq("id", orderId)
            .neq("status", "cancelled");

        if (error) {
          throw error;
        }

      },

      onSuccess: () => {

        queryClient.invalidateQueries({
          queryKey: ["my-orders"],
        });

        toast.success(
          "Pedido marcado como entregue!"
        );

      },

      onError: () => {

        toast.error(
          "Erro ao confirmar entrega."
        );

      },

    });

  const formatDate = (
    dateStr: string
  ) => {

    const d = new Date(dateStr);

    return d.toLocaleDateString(
      "pt-BR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );

  };

  if (loading) {

    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground">
        Carregando...
      </div>
    );

  }

  return (
    <div className="min-h-screen bg-background">

      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">

        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 py-3">

          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <h1 className="text-lg font-bold text-foreground">
            Meus Pedidos
          </h1>

        </div>

      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-3 pb-8">

        {isLoading ? (

          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-28 rounded-xl bg-muted animate-pulse"
              />
            ))}
          </div>

        ) : !orders || orders.length === 0 ? (

          <div className="flex flex-col items-center justify-center py-16 text-center">

            <AlertCircle className="w-12 h-12 text-muted-foreground mb-3" />

            <p className="text-muted-foreground font-medium">
              Nenhum pedido encontrado
            </p>

            <Button
              className="mt-4"
              onClick={() => navigate("/")}
            >
              Ir às compras
            </Button>

          </div>

        ) : (

          orders.map(order => {

            const status =
              statusConfig[
                order.status
              ] ||
              statusConfig.pending;

            const canConfirm =
              order.status !==
                "delivered" &&
              order.status !==
                "cancelled";

            return (

              <div
                key={order.id}
                className="bg-card border border-border rounded-xl p-4 space-y-3"
              >

                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-2">

                    <Package className="w-4 h-4 text-muted-foreground" />

                    <span className="text-xs text-muted-foreground">
                      {formatDate(order.created_at)}
                    </span>

                  </div>

                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${status.color}`}
                  >

                    {status.icon}
                    {status.label}

                  </span>

                </div>

              </div>

            );

          })

        )}

      </main>

    </div>
  );
}
