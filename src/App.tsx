import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// 📄 Páginas
import Index from "./pages/Index";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import Support from "./pages/Support";
import Orders from "./pages/Orders";

// 🔐 Contextos (se você usa AuthProvider)
import { AuthProvider } from "./contexts/AuthContext";

// 🔔 Toast (se você usa sonner)
import { Toaster } from "sonner";

function App() {

  return (

    <BrowserRouter>

      {/* 🔐 Provider de autenticação */}
      <AuthProvider>

        {/* 🔔 Toasts globais */}
        <Toaster richColors position="top-center" />

        <Routes>

          {/* 🏠 Página principal */}
          <Route
            path="/"
            element={<Index />}
          />

          {/* 🔐 Login */}
          <Route
            path="/login"
            element={<Login />}
          />

          {/* 🛠️ Admin */}
          <Route
            path="/admin"
            element={<Admin />}
          />

          {/* 📦 Meus pedidos */}
          <Route
            path="/meus-pedidos"
            element={<Orders />}
          />

          {/* 💬 Suporte */}
          <Route
            path="/suporte"
            element={<Support />}
          />

          {/* 🚨 Redireciona rotas antigas */}
          <Route
            path="/home"
            element={<Navigate to="/" replace />}
          />

          <Route
            path="/auth"
            element={<Navigate to="/login" replace />}
          />

          {/* 🚨 Fallback universal */}
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />

        </Routes>

      </AuthProvider>

    </BrowserRouter>

  );

}

export default App;
