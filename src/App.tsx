import { BrowserRouter, Routes, Route } from "react-router-dom";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Admin from "./pages/Admin";

import Support from "./pages/Support";
import MeusPedidos from "./pages/MeusPedidos";

function App() {

  return (

    <BrowserRouter>

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
          element={<MeusPedidos />}
        />

        {/* 💬 Suporte */}
        <Route
          path="/suporte"
          element={<Support />}
        />

        {/* 🚨 Página não encontrada */}
        <Route
          path="*"
          element={
            <div className="p-6 text-center">
              <h1 className="text-xl font-bold">
                Página não encontrada
              </h1>
              <p className="text-muted-foreground">
                A página que você tentou acessar não existe.
              </p>
            </div>
          }
        />

      </Routes>

    </BrowserRouter>

  );

}

export default App;
