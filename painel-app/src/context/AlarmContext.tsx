/**
 * Precifica+ — Contexto Global de Notificações, Alarmes de Validade e Cadastro Rápido de Produtos.
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
import { useAuth } from "../auth/AuthContext";
import type { Product } from "../lib/supabase";
import { supabase } from "../lib/supabase";

export interface AlarmConfig {
  enabled: boolean;
  days: number;
  sound: boolean;
}

export interface AlarmedItem {
  product: Product;
  days: number;
  vencido: boolean;
}

interface AlarmContextValue {
  config: AlarmConfig;
  updateConfig: (newCfg: Partial<AlarmConfig>) => void;
  products: Product[];
  alarmedItems: AlarmedItem[];
  vencidosCount: number;
  expiringCount: number;
  loading: boolean;
  refreshProducts: () => Promise<void>;
  // Modal global de cadastro/edição de produtos
  isProductModalOpen: boolean;
  productToEdit: Product | null;
  openProductModal: (product?: Product | null, onSaved?: () => void) => void;
  closeProductModal: () => void;
  notifyProductSaved: () => void;
}

const DEFAULT_CONFIG: AlarmConfig = {
  enabled: true,
  days: 7,
  sound: true,
};

const CONFIG_STORAGE_KEY = "precifica-alarm-config";

function todayMid(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function diffDays(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  return Math.round((target.getTime() - todayMid().getTime()) / 86400000);
}

function playBeep() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Silencia caso autoplay bloqueie
  }
}

const AlarmContext = createContext<AlarmContextValue | null>(null);

export function useAlarm(): AlarmContextValue {
  const ctx = useContext(AlarmContext);
  if (!ctx) throw new Error("useAlarm deve ser utilizado dentro de um AlarmProvider.");
  return ctx;
}

export function AlarmProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [config, setConfig] = useState<AlarmConfig>(() => {
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback padrão
    }
    return DEFAULT_CONFIG;
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal global de produto
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const onSavedCallbackRef = useRef<(() => void) | null>(null);

  const alarmedBeforeRef = useRef<Set<string>>(new Set());

  const updateConfig = useCallback((newCfg: Partial<AlarmConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...newCfg };
      try {
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage cheio
      }
      return next;
    });
  }, []);

  const refreshProducts = useCallback(async () => {
    if (!user) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("validade", { ascending: true });
      if (error) throw error;
      setProducts((data ?? []) as Product[]);
    } catch (e) {
      console.error("Erro ao sincronizar produtos no AlarmProvider:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  // Lista de produtos em alarme
  const alarmedItems = useMemo<AlarmedItem[]>(() => {
    if (!config.enabled) return [];
    const items: AlarmedItem[] = [];
    for (const p of products) {
      const dd = diffDays(p.validade);
      if (dd !== null && dd <= config.days) {
        items.push({
          product: p,
          days: dd,
          vencido: dd < 0,
        });
      }
    }
    return items.sort((a, b) => a.days - b.days);
  }, [products, config.enabled, config.days]);

  const { vencidosCount, expiringCount } = useMemo(() => {
    let vencidos = 0;
    let expiring = 0;
    for (const item of alarmedItems) {
      if (item.vencido) vencidos++;
      else expiring++;
    }
    return { vencidosCount: vencidos, expiringCount: expiring };
  }, [alarmedItems]);

  // Disparo de som / notificação do navegador para novos itens em risco
  useEffect(() => {
    if (!config.enabled || alarmedItems.length === 0) return;

    let hasNew = false;
    for (const item of alarmedItems) {
      const key = item.product.sku || item.product.id;
      if (!alarmedBeforeRef.current.has(key)) {
        alarmedBeforeRef.current.add(key);
        hasNew = true;

        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          try {
            new Notification(item.vencido ? "Produto vencido!" : "Produto próximo do vencimento", {
              body: `${item.product.nome} — ${item.vencido ? `venceu há ${Math.abs(item.days)} dia(s)` : `vence em ${item.days} dia(s)`}`,
            });
          } catch {
            // Ignorar erro de notificação
          }
        }
      }
    }

    if (hasNew && config.sound) {
      playBeep();
    }
  }, [alarmedItems, config.enabled, config.sound]);

  const openProductModal = useCallback((product?: Product | null, onSaved?: () => void) => {
    setProductToEdit(product ?? null);
    onSavedCallbackRef.current = onSaved ?? null;
    setIsProductModalOpen(true);
  }, []);

  const closeProductModal = useCallback(() => {
    setIsProductModalOpen(false);
    setProductToEdit(null);
    onSavedCallbackRef.current = null;
  }, []);

  const notifyProductSaved = useCallback(() => {
    refreshProducts();
    onSavedCallbackRef.current?.();
  }, [refreshProducts]);

  const value = useMemo(
    () => ({
      config,
      updateConfig,
      products,
      alarmedItems,
      vencidosCount,
      expiringCount,
      loading,
      refreshProducts,
      isProductModalOpen,
      productToEdit,
      openProductModal,
      closeProductModal,
      notifyProductSaved,
    }),
    [
      config,
      updateConfig,
      products,
      alarmedItems,
      vencidosCount,
      expiringCount,
      loading,
      refreshProducts,
      isProductModalOpen,
      productToEdit,
      openProductModal,
      closeProductModal,
      notifyProductSaved,
    ]
  );

  return <AlarmContext.Provider value={value}>{children}</AlarmContext.Provider>;
}
