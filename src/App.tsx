import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

import { ThemeProvider } from "@/components/ThemeProvider";

import Index from "./pages/Index";
import Admin from "./pages/Admin";
import MeusPedidos from "./pages/MeusPedidos";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";

const queryClient = new QueryClient();


// 🔄 Spinner de carregamento
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);


// 🔒 Proteção de rotas autenticadas
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  // Enquanto carrega auth
  if (loading) {
    return <LoadingSpinner />;
  }

  // Se não estiver logado
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};


// 🧠 Proteção para impedir acesso ao login quando já logado
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  // Se já logado → manda para home
  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};


// 🚀 APP PRINCIPAL
const App = () => {
  return (
    <ThemeProvider defaultTheme="dark" attribute="class">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <CartProvider>
              <BrowserRouter>

                <Toaster />
                <Sonner />

                <Routes>

                  {/* 🔓 Login */}
                  <Route
                    path="/login"
                    element={
                      <PublicRoute>
                        <Login />
                      </PublicRoute>
                    }
                  />

                  {/* 🏠 Home */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Index />
                      </ProtectedRoute>
                    }
                  />

                  {/* 📦 Meus Pedidos */}
                  <Route
                    path="/meus-pedidos"
                    element={
                      <ProtectedRoute>
                        <MeusPedidos />
                      </ProtectedRoute>
                    }
                  />

                  {/* ⚙️ Admin */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute>
                        <Admin />
                      </ProtectedRoute>
                    }
                  />

                  {/* ❌ Página não encontrada */}
                  <Route
                    path="*"
                    element={<NotFound />}
                  />

                </Routes>

              </BrowserRouter>
            </CartProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
