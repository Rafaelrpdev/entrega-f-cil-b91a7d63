import { BrowserRouter, Routes, Route } from "react-router-dom";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Admin from "./pages/Admin";

import Support from "./pages/Support";
import Orders from "./pages/Orders";

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
          element={<Orders />}
        />

        {/* 💬 Suporte */}
        <Route
          path="/suporte"
          element={<Support />}
        />

        {/* 🚨 Fallback */}
        <Route
          path="*"
          element={<Index />}
        />

      </Routes>

    </BrowserRouter>

  );

}

export default App;
