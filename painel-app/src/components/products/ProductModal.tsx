/**
 * Precifica+ — Modal Canônico de Cadastro e Edição de Produtos (Compartilhado).
 * Usado globalmente no topo da aplicação, na listagem de produtos e no painel de validades.
 */
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useAlarm } from "../../context/AlarmContext";
import { createCategory, ensureDefaultCategories } from "../../lib/categories";
import { formatCurrency } from "../../lib/format";
import type { Category } from "../../lib/supabase";
import { supabase } from "../../lib/supabase";
import { useToast } from "../ui/Toast";
import styles from "./ProductModal.module.css";

interface ProductFormData {
  nome: string;
  sku: string;
  category_id: string;
  custo: string;
  preco: string;
  estoque: string;
  estoqueMin: string;
  validade: string;
}

const EMPTY_FORM: ProductFormData = {
  nome: "",
  sku: "",
  category_id: "",
  custo: "",
  preco: "",
  estoque: "10",
  estoqueMin: "5",
  validade: "",
};

export function ProductModal() {
  const { user } = useAuth();
  const toast = useToast();
  const { isProductModalOpen, productToEdit, closeProductModal, notifyProductSaved, products } =
    useAlarm();

  const [form, setForm] = useState<ProductFormData>(EMPTY_FORM);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatSaving, setNewCatSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Inicializa dados do formulário
  useEffect(() => {
    if (!isProductModalOpen) return;

    if (productToEdit) {
      setForm({
        nome: productToEdit.nome ?? "",
        sku: productToEdit.sku && productToEdit.sku !== "—" ? productToEdit.sku : "",
        category_id: productToEdit.category_id ?? "",
        custo: String(productToEdit.custo ?? ""),
        preco: String(productToEdit.preco_venda ?? ""),
        estoque: String(productToEdit.estoque_atual ?? "0"),
        estoqueMin: String(productToEdit.estoque_min ?? "5"),
        validade: productToEdit.validade ?? "",
      });
    } else {
      // Sugere próximo SKU sequencial
      const max = products.reduce((acc, p) => {
        const num = Number.parseInt(p.sku ?? "", 10);
        return !Number.isNaN(num) && num > acc ? num : acc;
      }, 7891000);

      setForm({
        ...EMPTY_FORM,
        sku: String(max + 1),
      });
    }

    setNewCatOpen(false);
    setNewCatName("");

    // Carrega/assegura categorias
    if (user?.id) {
      ensureDefaultCategories(user.id)
        .then((cats) => {
          setCategories(cats);
          if (!productToEdit && cats.length > 0) {
            setForm((prev) => (prev.category_id ? prev : { ...prev, category_id: cats[0].id }));
          }
        })
        .catch((e) => console.error("Erro ao carregar categorias no modal:", e));
    }

    const timer = setTimeout(() => nameInputRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, [isProductModalOpen, productToEdit, user?.id, products]);

  // Tecla Escape para fechar
  useEffect(() => {
    if (!isProductModalOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeProductModal();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isProductModalOpen, closeProductModal]);

  const marginPreview = useMemo(() => {
    const custo = Number.parseFloat(form.custo) || 0;
    const preco = Number.parseFloat(form.preco) || 0;
    if (preco <= 0) return { text: "0.0% (R$ 0,00 margem)", tone: "high" as const };
    const margin = ((preco - custo) / preco) * 100;
    const tone =
      margin >= 25 ? ("high" as const) : margin >= 15 ? ("mid" as const) : ("low" as const);
    return { text: `${margin.toFixed(1)}% (${formatCurrency(preco - custo)} lucro)`, tone };
  }, [form.custo, form.preco]);

  const setField = <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreateCategory = async () => {
    if (!user || !newCatName.trim()) return;
    setNewCatSaving(true);
    try {
      const created = await createCategory(user.id, newCatName);
      setCategories((prev) => [...prev, created].sort((a, b) => a.nome.localeCompare(b.nome)));
      setField("category_id", created.id);
      setNewCatName("");
      setNewCatOpen(false);
      toast(`Categoria "${created.nome}" criada!`);
    } catch (e) {
      console.error("Erro ao criar categoria:", e);
      toast("Não foi possível criar a categoria.", "error");
    } finally {
      setNewCatSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = form.nome.trim();
    const preco = Number.parseFloat(form.preco.replace(",", ".")) || 0;

    if (!nome || preco <= 0) {
      toast("Preencha o nome do produto e um preço de venda válido.", "error");
      return;
    }
    if (!user) {
      toast("Sessão expirada. Entre novamente.", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nome,
        sku: form.sku.trim() || null,
        category_id: form.category_id || null,
        custo: Number.parseFloat(form.custo.replace(",", ".")) || 0,
        preco_venda: preco,
        estoque_atual: Number.parseInt(form.estoque, 10) || 0,
        estoque_min: Number.parseInt(form.estoqueMin, 10) || 5,
        validade: form.validade || null,
      };

      if (productToEdit) {
        const { error: err } = await supabase
          .from("products")
          .update(payload)
          .eq("id", productToEdit.id);
        if (err) throw err;
        toast("Produto atualizado com sucesso!");
      } else {
        const { error: err } = await supabase
          .from("products")
          .insert([{ ...payload, user_id: user.id }]);
        if (err) throw err;
        toast("Produto cadastrado com sucesso!");
      }

      notifyProductSaved();
      closeProductModal();
    } catch (err) {
      console.error("Erro ao salvar produto:", err);
      toast("Não foi possível salvar o produto.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!isProductModalOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeProductModal();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") closeProductModal();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="prodModalTitle"
    >
      <div className={styles.modalCard}>
        <div className={styles.modalHeader}>
          <div className={styles.headerTitle}>
            <h2 id="prodModalTitle">
              {productToEdit ? "Editar produto" : "Cadastrar novo produto"}
            </h2>
            <p>
              {productToEdit
                ? "Altere os dados do estoque ou preço"
                : "Novo registro no catálogo e estoque"}
            </p>
          </div>
          <button
            type="button"
            className={styles.btnClose}
            onClick={closeProductModal}
            aria-label="Fechar"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="12" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className={styles.modalBody}>
            <div className={styles.sectionTitle}>1. Identificação do Produto</div>
            <div className={styles.formGrid}>
              <div className={`${styles.field} ${styles.full}`}>
                <label htmlFor="prodNome">Nome do Produto *</label>
                <input
                  type="text"
                  id="prodNome"
                  ref={nameInputRef}
                  placeholder="Ex: Frango Desfiado 500g"
                  required
                  value={form.nome}
                  onChange={(e) => setField("nome", e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="prodSku">Código / SKU</label>
                <input
                  type="text"
                  id="prodSku"
                  placeholder="7891055 ou EAN..."
                  value={form.sku}
                  onChange={(e) => setField("sku", e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <div className={styles.fieldHeader}>
                  <label htmlFor="prodCategoria">Categoria</label>
                  <button
                    type="button"
                    className={styles.btnInlineAction}
                    onClick={() => setNewCatOpen((v) => !v)}
                  >
                    {newCatOpen ? "Cancelar" : "+ Nova categoria"}
                  </button>
                </div>
                {newCatOpen ? (
                  <div className={styles.newCatRow}>
                    <input
                      type="text"
                      placeholder="Nome (ex: Congelados)"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateCategory();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className={styles.btnSaveInline}
                      onClick={handleCreateCategory}
                      disabled={newCatSaving || !newCatName.trim()}
                    >
                      {newCatSaving ? "…" : "Salvar"}
                    </button>
                  </div>
                ) : (
                  <select
                    id="prodCategoria"
                    value={form.category_id}
                    onChange={(e) => setField("category_id", e.target.value)}
                  >
                    <option value="">Selecione uma categoria…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className={styles.sectionTitle}>2. Custos &amp; Precificação</div>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label htmlFor="prodCusto">Preço de Custo (R$)</label>
                <input
                  type="number"
                  id="prodCusto"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.custo}
                  onChange={(e) => setField("custo", e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="prodPreco">Preço de Venda (R$) *</label>
                <input
                  type="number"
                  id="prodPreco"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  required
                  value={form.preco}
                  onChange={(e) => setField("preco", e.target.value)}
                />
              </div>

              <div className={styles.marginPreview}>
                <span>Margem Bruta Estimada:</span>
                <span
                  className={
                    styles[
                      marginPreview.tone === "high"
                        ? "marginHigh"
                        : marginPreview.tone === "mid"
                          ? "marginMid"
                          : "marginLow"
                    ]
                  }
                >
                  {marginPreview.text}
                </span>
              </div>
            </div>

            <div className={styles.sectionTitle}>3. Estoque &amp; Perecibilidade</div>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label htmlFor="prodEstoque">Estoque Atual (Qtd) *</label>
                <input
                  type="number"
                  id="prodEstoque"
                  min="0"
                  required
                  value={form.estoque}
                  onChange={(e) => setField("estoque", e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="prodEstoqueMin">Estoque Mínimo (Alerta)</label>
                <input
                  type="number"
                  id="prodEstoqueMin"
                  min="0"
                  value={form.estoqueMin}
                  onChange={(e) => setField("estoqueMin", e.target.value)}
                />
              </div>

              <div className={`${styles.field} ${styles.full}`}>
                <label htmlFor="prodValidade">Data de Validade</label>
                <input
                  type="date"
                  id="prodValidade"
                  value={form.validade}
                  onChange={(e) => setField("validade", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnCancel} onClick={closeProductModal}>
              Cancelar
            </button>
            <button type="submit" className={styles.btnSave} disabled={saving}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {saving ? "Salvando…" : productToEdit ? "Salvar alterações" : "Cadastrar produto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
