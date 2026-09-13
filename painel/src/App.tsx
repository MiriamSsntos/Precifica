/**
 * Precifica+ — Rotas do painel (SPA sob /painel/).
 * Telas privadas passam por <RequireAuth>; o resto é placeholder
 * até a migração do mockup (ver Placeholder).
 */
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./auth/AuthContext";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { Placeholder } from "./pages/Placeholder";

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
          <Route
            path="produtos"
            element={
              <Placeholder title="Produtos" hint="Catálogo, estoque e precificação por SKU." />
            }
          />
          <Route
            path="validades"
            element={<Placeholder title="Validades" hint="Linha do tempo de lotes críticos." />}
          />
          <Route
            path="promocoes"
            element={<Placeholder title="Promoções IA" hint="Ofertas geradas pela inteligência." />}
          />
          <Route
            path="relatorios"
            element={<Placeholder title="Relatórios" hint="Rentabilidade e movimentações." />}
          />
          <Route
            path="config"
            element={<Placeholder title="Configurações" hint="Conta, loja e integrações." />}
          />
          <Route path="ajuda" element={<Placeholder title="Ajuda" hint="Suporte e dúvidas." />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
