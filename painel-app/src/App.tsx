/**
 * Precifica+ — Rotas do painel (SPA sob /painel/).
 * Telas privadas passam por <RequireAuth>.
 */
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./auth/AuthContext";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { Ajuda } from "./pages/Ajuda";
import { Config } from "./pages/Config";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { Produtos } from "./pages/Produtos";
import { Promocoes } from "./pages/Promocoes";
import { Relatorios } from "./pages/Relatorios";
import { Validades } from "./pages/Validades";

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <RequireAuth>
              <DashboardLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="produtos" element={<Produtos />} />
          <Route path="validades" element={<Validades />} />
          <Route path="promocoes" element={<Promocoes />} />
          <Route path="relatorios" element={<Relatorios />} />
          <Route path="config" element={<Config />} />
          <Route path="ajuda" element={<Ajuda />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
