/**
 * Precifica+ — Tela de carregamento da marca.
 * Usada no boot (sessão) e em transições de rota que precisam esperar.
 */
import { LogoMark } from "../Logo";
import styles from "./PageLoader.module.css";

export function PageLoader({ message = "Carregando seu painel…" }: { message?: string }) {
  return (
    <div className={styles.screen} role="status" aria-label={message}>
      <div className={styles.logoBox} aria-hidden="true">
        <LogoMark stroke="#ffffff" />
      </div>
      <div className={styles.wordmark} aria-hidden="true">
        Precifica<span>+</span>
      </div>
      <div className={styles.spinner} aria-hidden="true" />
      <p className={styles.message}>{message}</p>
    </div>
  );
}
