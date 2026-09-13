/**
 * Precifica+ — Página genérica "em construção" para as telas
 * ainda não migradas do mockup (produtos, validades, promocoes,
 * relatorios, config, ajuda). Mantém o layout e a navegação.
 */
import { Link } from "react-router-dom";
import styles from "./Placeholder.module.css";

export function Placeholder({ title, hint }: { title: string; hint: string }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.heading}>
        <h1>{title}</h1>
        <p>{hint}</p>
      </div>
      <div className={styles.card}>
        <p className={styles.badge}>Em construção no React</p>
        <p className={styles.text}>
          Esta tela ainda vive no mockup estático (<code>painel-legacy/</code>). Migre os
          componentes seguindo o padrão das páginas Login e Dashboard.
        </p>
        <Link to="/" className={styles.back}>
          ← Voltar ao Dashboard
        </Link>
      </div>
    </div>
  );
}
