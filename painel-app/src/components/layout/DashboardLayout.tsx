/**
 * Precifica+ — Shell do painel: sidebar + topbar + conteúdo (portado do mockup).
 */
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { LogoMark } from "../Logo";
import { useConfirm } from "../ui/ConfirmDialog";
import styles from "./DashboardLayout.module.css";

function NavIcon({ d, circle = false }: { d: string; circle?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {circle ? <circle cx="12" cy="12" r="9" /> : null}
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

interface SidebarLink {
  to: string;
  label: string;
  d: string;
  circle?: boolean;
}

const MAIN_LINKS: SidebarLink[] = [
  {
    to: "/",
    label: "Dashboard",
    d: "M3 12l9-9 9 9M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10",
  },
  {
    to: "/produtos",
    label: "Produtos",
    d: "M20 7 12 3 4 7m16 0-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  },
  {
    to: "/validades",
    label: "Validades",
    d: "M12 7v5l3 3",
    circle: true,
  },
  {
    to: "/promocoes",
    label: "Promoções IA",
    d: "M12 2 3 7v6c0 5 4 8 9 9 5-1 9-4 9-9V7l-9-5Z",
  },
];

const ACCOUNT_LINKS: SidebarLink[] = [
  { to: "/relatorios", label: "Relatórios", d: "M12 20V10m6 10V4M6 20v-6" },
  { to: "/config", label: "Configurações", d: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" },
  {
    to: "/ajuda",
    label: "Ajuda",
    d: "M9.5 9.5a2.5 2.5 0 0 1 4.9.8c0 1.7-2.4 1.7-2.4 3.3M12 17h.01",
    circle: true,
  },
];

export function DashboardLayout() {
  const { user, signOut } = useAuth();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  async function handleLogout() {
    const ok = await confirm({
      title: "Sair da conta",
      message: "Deseja sair da sua conta neste dispositivo?",
      confirmLabel: "Sair",
    });
    if (!ok) return;
    await signOut();
    navigate("/login");
  }

  return (
    <div className={styles.layout}>
      {menuOpen ? (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Fechar menu"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
      <aside className={menuOpen ? `${styles.sidebar} ${styles.open}` : styles.sidebar}>
        <Link to="/" className={styles.logo} onClick={() => setMenuOpen(false)}>
          <LogoMark />
          <span>
            Precifica<em>+</em>
          </span>
        </Link>

        <div className={styles.sectionLabel}>Geral</div>
        <nav className={styles.nav} aria-label="Navegação principal">
          {MAIN_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                isActive ? `${styles.link} ${styles.active}` : styles.link
              }
            >
              <NavIcon d={link.d} circle={link.circle} />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.sectionLabel}>Conta</div>
        <nav className={styles.nav} aria-label="Navegação da conta">
          {ACCOUNT_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                isActive ? `${styles.link} ${styles.active}` : styles.link
              }
            >
              <NavIcon d={link.d} circle={link.circle} />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.upgrade}>
          <h4>Plano Scale IA</h4>
          <p>Libere automação total de promoções e relatórios avançados.</p>
          <button type="button">Fazer upgrade</button>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.topbar}>
          <button
            type="button"
            className={styles.menuBtn}
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <line x1="4" y1="7" x2="20" y2="7" strokeLinecap="round" />
              <line x1="4" y1="12" x2="20" y2="12" strokeLinecap="round" />
              <line x1="4" y1="17" x2="20" y2="17" strokeLinecap="round" />
            </svg>
          </button>
          <div className={styles.searchBox}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="m20 20-3.5-3.5" />
            </svg>
            <input type="text" placeholder="Buscar produtos, promoções…" aria-label="Buscar" />
          </div>
          <div className={styles.topbarRight}>
            <button type="button" className={styles.iconBtn} aria-label="Notificações">
              <span className={styles.dot} />
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"
                />
                <path strokeLinecap="round" d="M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
            </button>
            <button
              type="button"
              className={styles.userChip}
              onClick={handleLogout}
              title="Clique para sair"
            >
              <div className={styles.userAvatar}>{user?.initials ?? "P+"}</div>
              <div>
                <div className={styles.name}>{user?.displayName ?? "Gestor"}</div>
                <div className={styles.role}>{user?.company ?? ""}</div>
              </div>
            </button>
          </div>
        </div>

        <Outlet />
      </main>
    </div>
  );
}
