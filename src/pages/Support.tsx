import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";

const supportPhone = "5599999999999";
const whatsappUrl = `https://wa.me/${supportPhone}`;

export default function Support() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/") }>
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div>
            <h1 className="text-lg font-semibold text-foreground">Suporte</h1>
            <p className="text-sm text-muted-foreground">
              Atendimento rápido para pedidos, entregas e cadastro.
            </p>
          </div>
        </div>
      </header>

      <section className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">
            Fale com a equipe agora
          </h2>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Use o WhatsApp para tirar dúvidas, acompanhar pedidos ou solicitar ajuda.
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button
              className="gap-2"
              onClick={() => window.open(whatsappUrl, "_blank", "noopener,noreferrer")}
            >
              <MessageCircle className="h-4 w-4" />
              Abrir WhatsApp
            </Button>

            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                window.location.href = `tel:+${supportPhone}`;
              }}
            >
              <Phone className="h-4 w-4" />
              Ligar agora
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-secondary/50 p-5">
          <h2 className="text-base font-semibold text-foreground">
            Horário de atendimento
          </h2>

          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Segunda a sábado: 07:00 às 19:00</li>
            <li>Domingo: plantão conforme disponibilidade</li>
            <li>Emergências: resposta prioritária pelo WhatsApp</li>
          </ul>
        </div>
      </section>
    </main>
  );
}