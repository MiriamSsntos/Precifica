/** Skeleton de carregamento (shimmer) — evita telões em branco e saltos de layout. */
import styles from "./Skeleton.module.css";

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  label?: string;
}

export function Skeleton({ width = "100%", height = 16, radius = 8, label }: SkeletonProps) {
  return (
    <span
      className={styles.shimmer}
      role="status"
      aria-label={label ?? "Carregando conteúdo"}
      style={{ width, height, borderRadius: radius }}
    />
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div role="status" aria-label="Carregando tabela" className={styles.table}>
      {Array.from({ length: rows }, (_, r) => (
        <div
          key={r}
          className={styles.row}
          style={{ gridTemplateColumns: `2fr repeat(${Math.max(cols - 1, 1)}, 1fr)` }}
        >
          {Array.from({ length: cols }, (_, c) => (
            <span key={c} className={styles.shimmer} style={{ height: 14, borderRadius: 6 }} />
          ))}
        </div>
      ))}
    </div>
  );
}
