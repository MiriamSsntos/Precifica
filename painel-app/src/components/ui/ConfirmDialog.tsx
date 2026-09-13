/**
 * Precifica+ — Diálogo de confirmação (substitui `window.confirm`).
 * Uso: `const ok = await confirm({ title, message, danger: true })`.
 */

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "./ConfirmDialog.module.css";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm deve ser usado dentro de <ConfirmProvider>.");
  return confirm;
}

interface Pending extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      const item = { ...options, resolve };
      pendingRef.current = item;
      setPending(item);
    });
  }, []);

  const answer = useCallback((value: boolean) => {
    pendingRef.current?.resolve(value);
    pendingRef.current = null;
    setPending(null);
  }, []);

  useEffect(() => {
    if (pending) confirmBtnRef.current?.focus();
  }, [pending]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") answer(false);
    }
    if (!pending) return;
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, answer]);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {pending ? (
        <div className={styles.overlay} onClick={() => answer(false)}>
          <div
            className={styles.card}
            role="alertdialog"
            aria-modal="true"
            aria-label={pending.title}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>{pending.title}</h2>
            <p>{pending.message}</p>
            <div className={styles.actions}>
              <button type="button" className={styles.cancel} onClick={() => answer(false)}>
                Cancelar
              </button>
              <button
                type="button"
                ref={confirmBtnRef}
                className={pending.danger ? `${styles.ok} ${styles.danger}` : styles.ok}
                onClick={() => answer(true)}
              >
                {pending.confirmLabel ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}
