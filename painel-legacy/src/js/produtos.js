/**
 * Precifica+ — Gestão de Produtos (Cadastro, Edição, Listagem e Métricas)
 */

// Lista inicial de fallback baseada em docs/seed.sql
const DEFAULT_PRODUCTS = [
  {
    id: "p-1",
    nome: "Banana Prata (kg)",
    sku: "HOR-0001",
    categoria: "Hortifruti",
    unidade: "kg",
    custo: 3.1,
    preco_venda: 5.99,
    estoque_atual: 60,
    estoque_min: 15,
    validade: getDateOffset(2),
  },
  {
    id: "p-2",
    nome: "Tomate Italiano (kg)",
    sku: "HOR-0002",
    categoria: "Hortifruti",
    unidade: "kg",
    custo: 4.0,
    preco_venda: 7.99,
    estoque_atual: 25,
    estoque_min: 12,
    validade: getDateOffset(1),
  },
  {
    id: "p-3",
    nome: "Iogurte Grego 100g",
    sku: "LAT-0001",
    categoria: "Laticínios",
    unidade: "un",
    custo: 2.2,
    preco_venda: 4.5,
    estoque_atual: 40,
    estoque_min: 10,
    validade: getDateOffset(4),
  },
  {
    id: "p-4",
    nome: "Alface Crespa (un)",
    sku: "HOR-0003",
    categoria: "Hortifruti",
    unidade: "un",
    custo: 1.5,
    preco_venda: 3.99,
    estoque_atual: 18,
    estoque_min: 8,
    validade: getDateOffset(3),
  },
  {
    id: "p-5",
    nome: "Feijão Preto 1kg",
    sku: "MER-0001",
    categoria: "Mercearia",
    unidade: "un",
    custo: 4.8,
    preco_venda: 8.99,
    estoque_atual: 5,
    estoque_min: 10,
    validade: getDateOffset(180),
  },
  {
    id: "p-6",
    nome: "Óleo de Soja 900ml",
    sku: "MER-0002",
    categoria: "Mercearia",
    unidade: "un",
    custo: 5.3,
    preco_venda: 7.49,
    estoque_atual: 36,
    estoque_min: 12,
    validade: getDateOffset(150),
  },
  {
    id: "p-7",
    nome: "Leite Integral 1L",
    sku: "LAT-0002",
    categoria: "Laticínios",
    unidade: "L",
    custo: 3.85,
    preco_venda: 5.49,
    estoque_atual: 90,
    estoque_min: 24,
    validade: getDateOffset(10),
  },
  {
    id: "p-8",
    nome: "Pão Francês (kg)",
    sku: "PAD-0001",
    categoria: "Padaria",
    unidade: "kg",
    custo: 6.0,
    preco_venda: 12.9,
    estoque_atual: 12,
    estoque_min: 10,
    validade: getDateOffset(0),
  },
];

let productsState = [];
let currentCategoryMap = {};

function getDateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatCurrency(val) {
  return Number(val || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function calculateMargin(custo, preco) {
  const c = parseFloat(custo) || 0;
  const p = parseFloat(preco) || 0;
  if (p <= 0) return 0;
  return ((p - c) / p) * 100;
}

function getDaysUntilDate(dateStr) {
  if (!dateStr) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Inicialização
document.addEventListener("DOMContentLoaded", async () => {
  initRealtimeMarginCalc();
  initModalHandlers();
  initFilterHandlers();
  await loadProducts();
});

async function loadProducts() {
  const client = typeof getSupabaseClient === "function" ? getSupabaseClient() : null;
  let loadedFromSupabase = false;

  if (client) {
    try {
      const {
        data: { session },
      } = await client.auth.getSession();

      if (session && session.user) {
        // Carrega categorias do usuário para mapear ID -> Nome
        const { data: categories } = await client
          .from("categories")
          .select("id, nome")
          .order("nome");

        if (categories && categories.length > 0) {
          currentCategoryMap = {};
          categories.forEach((c) => {
            currentCategoryMap[c.id] = c.nome;
          });
          populateCategorySelects(categories);
        }

        // Carrega produtos do usuário no Supabase
        const { data: prods, error } = await client
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && prods && prods.length > 0) {
          productsState = prods.map((p) => ({
            id: p.id,
            nome: p.nome,
            sku: p.sku || "—",
            categoria: currentCategoryMap[p.category_id] || "Geral",
            category_id: p.category_id,
            unidade: p.unidade || "un",
            custo: parseFloat(p.custo || 0),
            preco_venda: parseFloat(p.preco_venda || 0),
            estoque_atual: parseInt(p.estoque_atual, 10) || 0,
            estoque_min: parseInt(p.estoque_min, 10) || 5,
            validade: p.validade || "",
          }));
          loadedFromSupabase = true;
        }
      }
    } catch (err) {
      console.warn("Aviso ao buscar produtos do Supabase:", err);
    }
  }

  // Fallback: localStorage ou dados padrão de demonstração
  if (!loadedFromSupabase) {
    const local = localStorage.getItem("PRECIFICA_DEMO_PRODUCTS");
    if (local) {
      try {
        productsState = JSON.parse(local);
      } catch {
        productsState = [...DEFAULT_PRODUCTS];
      }
    } else {
      productsState = [...DEFAULT_PRODUCTS];
      saveLocalProducts();
    }
  }

  renderProducts();
  updateKPIs();
}

function saveLocalProducts() {
  localStorage.setItem("PRECIFICA_DEMO_PRODUCTS", JSON.stringify(productsState));
}

function populateCategorySelects(categories) {
  const formCat = document.getElementById("prodCategoria");
  const filterCat = document.getElementById("filterCategoria");

  if (formCat && categories.length > 0) {
    formCat.innerHTML = '<option value="">Selecione uma categoria…</option>';
    categories.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.nome;
      formCat.appendChild(opt);
    });
  }

  if (filterCat && categories.length > 0) {
    filterCat.innerHTML = '<option value="todas">Todas as categorias</option>';
    categories.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.nome.toLowerCase();
      opt.textContent = c.nome;
      filterCat.appendChild(opt);
    });
  }
}

function updateKPIs() {
  const totalEl = document.getElementById("kpiTotal");
  const validadeEl = document.getElementById("kpiValidade");
  const estoqueEl = document.getElementById("kpiEstoque");
  const margemEl = document.getElementById("kpiMargem");

  const total = productsState.length;
  let critValidade = 0;
  let baixoEstoque = 0;
  let somaMargens = 0;

  productsState.forEach((p) => {
    const days = getDaysUntilDate(p.validade);
    if (days <= 7) critValidade++;
    if (p.estoque_atual <= p.estoque_min) baixoEstoque++;
    somaMargens += calculateMargin(p.custo, p.preco_venda);
  });

  const margemMedia = total > 0 ? (somaMargens / total).toFixed(1) : "0.0";

  if (totalEl) totalEl.textContent = total;
  if (validadeEl) validadeEl.textContent = critValidade;
  if (estoqueEl) estoqueEl.textContent = baixoEstoque;
  if (margemEl) margemEl.textContent = `${margemMedia}%`;
}

function renderValidityCell(p) {
  if (!p.validade) {
    return '<div class="validity-cell"><span class="badge ok">Sem data</span></div>';
  }

  const days = getDaysUntilDate(p.validade);
  const dataFormatada = p.validade.split("-").reverse().join("/");

  let badgeHtml = "";
  let dateClass = "validity-date";

  if (days < 0) {
    const absDays = Math.abs(days);
    const textoDias = absDays === 1 ? "Vencido há 1 dia" : `Vencido há ${absDays} dias`;
    badgeHtml = `<span class="badge critical">${textoDias}</span>`;
    dateClass += " expired";
  } else if (days === 0) {
    badgeHtml = '<span class="badge critical">Vence hoje</span>';
    dateClass += " expired";
  } else if (days === 1) {
    badgeHtml = '<span class="badge critical">Vence amanhã</span>';
    dateClass += " expired";
  } else if (days <= 3) {
    badgeHtml = `<span class="badge critical">Vence em ${days} dias</span>`;
    dateClass += " expired";
  } else if (days <= 7) {
    badgeHtml = `<span class="badge warn">Vence em ${days} dias</span>`;
  } else {
    badgeHtml = `<span class="badge ok">Em dia (${days}d)</span>`;
  }

  return `
    <div class="validity-cell">
      ${badgeHtml}
      <span class="${dateClass}">${dataFormatada}</span>
    </div>
  `;
}

function renderProducts() {
  const tbody = document.getElementById("productsTableBody");
  const emptyState = document.getElementById("emptyState");
  const searchVal = (document.getElementById("searchProduct")?.value || "").toLowerCase().trim();
  const catVal = (document.getElementById("filterCategoria")?.value || "todas").toLowerCase();
  const statusVal = document.getElementById("filterStatus")?.value || "todos";

  if (!tbody) return;

  const filtered = productsState.filter((p) => {
    // Filtro texto
    const matchSearch =
      !searchVal ||
      p.nome.toLowerCase().includes(searchVal) ||
      (p.sku && p.sku.toLowerCase().includes(searchVal));

    // Filtro categoria
    const matchCat = catVal === "todas" || p.categoria.toLowerCase() === catVal;

    // Filtro status
    let matchStatus = true;
    const days = getDaysUntilDate(p.validade);
    const margin = calculateMargin(p.custo, p.preco_venda);

    if (statusVal === "validade") {
      matchStatus = days <= 7;
    } else if (statusVal === "estoque") {
      matchStatus = p.estoque_atual <= p.estoque_min;
    } else if (statusVal === "margem_baixa") {
      matchStatus = margin < 15;
    }

    return matchSearch && matchCat && matchStatus;
  });

  tbody.innerHTML = "";

  if (filtered.length === 0) {
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  filtered.forEach((p) => {
    const tr = document.createElement("tr");
    const margin = calculateMargin(p.custo, p.preco_venda);

    // Margem class
    let marginClass = "high";
    if (margin < 15) marginClass = "low";
    else if (margin < 25) marginClass = "mid";

    // Estoque badge/info
    const isEstoqueBaixo = p.estoque_atual <= p.estoque_min;
    const estoqueDisplay = `
      <div>
        <strong>${p.estoque_atual} ${p.unidade || "un"}</strong>
        <span style="font-size: 11px; color: var(--text-dim);"> (mín. ${p.estoque_min})</span>
        ${isEstoqueBaixo ? '<div style="font-size: 10.5px; color: var(--neon-red); font-weight: 600;">Estoque baixo</div>' : ""}
      </div>
    `;

    tr.innerHTML = `
      <td>
        <div class="product-cell">
          <span class="product-name">${escapeHtml(p.nome)}</span>
          <span class="product-sku">SKU: ${escapeHtml(p.sku || "—")}</span>
        </div>
      </td>
      <td><span class="category-pill">${escapeHtml(p.categoria || "Geral")}</span></td>
      <td><strong>${escapeHtml(p.unidade || "un")}</strong></td>
      <td>${formatCurrency(p.custo)}</td>
      <td><strong>${formatCurrency(p.preco_venda)}</strong></td>
      <td><span class="margin-tag ${marginClass}">${margin.toFixed(1)}%</span></td>
      <td>${estoqueDisplay}</td>
      <td>${renderValidityCell(p)}</td>
      <td>
        <div class="actions-cell">
          <button type="button" class="action-btn edit" title="Editar produto" aria-label="Editar produto" onclick="editProduct('${p.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button type="button" class="action-btn delete" title="Excluir produto" aria-label="Excluir produto" onclick="deleteProduct('${p.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Cálculo em tempo real da Margem ao preencher o formulário
function initRealtimeMarginCalc() {
  const custoInput = document.getElementById("prodCusto");
  const precoInput = document.getElementById("prodPreco");
  const marginDisplay = document.getElementById("marginPreviewValue");

  function update() {
    if (!marginDisplay) return;
    const custo = parseFloat(custoInput?.value) || 0;
    const preco = parseFloat(precoInput?.value) || 0;

    if (preco > 0) {
      const margin = calculateMargin(custo, preco);
      const lucro = preco - custo;
      marginDisplay.textContent = `${margin.toFixed(1)}% (${formatCurrency(lucro)} lucro)`;
      if (margin >= 25) {
        marginDisplay.style.color = "var(--primary)";
      } else if (margin >= 15) {
        marginDisplay.style.color = "var(--neon-amber)";
      } else {
        marginDisplay.style.color = "var(--neon-red)";
      }
    } else {
      marginDisplay.textContent = "0.0% (R$ 0,00 lucro)";
      marginDisplay.style.color = "var(--primary)";
    }
  }

  custoInput?.addEventListener("input", update);
  precoInput?.addEventListener("input", update);
}

// Handlers do Modal
function initModalHandlers() {
  const btnAdd = document.getElementById("btnOpenModal");
  const btnClose = document.getElementById("btnCloseModal");
  const btnCancel = document.getElementById("btnCancelModal");
  const overlay = document.getElementById("modalOverlay");
  const form = document.getElementById("formNewProduct");

  function openNewModal() {
    const editIdInput = document.getElementById("prodEditId");
    const modalTitle = document.getElementById("modalTitle");
    const btnSubmit = document.getElementById("btnSubmitModal");

    if (editIdInput) editIdInput.value = "";
    if (modalTitle) modalTitle.textContent = "Cadastrar Novo Produto";
    if (btnSubmit) btnSubmit.textContent = "Salvar Produto";

    form?.reset();
    const marginDisplay = document.getElementById("marginPreviewValue");
    if (marginDisplay) marginDisplay.textContent = "0.0% (R$ 0,00 lucro)";

    overlay?.classList.add("open");
    document.getElementById("prodNome")?.focus();
  }

  function closeModal() {
    overlay?.classList.remove("open");
    form?.reset();
    const editIdInput = document.getElementById("prodEditId");
    if (editIdInput) editIdInput.value = "";
    const marginDisplay = document.getElementById("marginPreviewValue");
    if (marginDisplay) marginDisplay.textContent = "0.0% (R$ 0,00 lucro)";
  }

  btnAdd?.addEventListener("click", openNewModal);
  btnClose?.addEventListener("click", closeModal);
  btnCancel?.addEventListener("click", closeModal);

  overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay?.classList.contains("open")) {
      closeModal();
    }
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await handleSaveProduct(form, closeModal);
  });
}

// Abrir modal para Editar Produto existente
function editProduct(id) {
  const p = productsState.find((item) => item.id === id);
  if (!p) return;

  const overlay = document.getElementById("modalOverlay");
  const modalTitle = document.getElementById("modalTitle");
  const btnSubmit = document.getElementById("btnSubmitModal");
  const editIdInput = document.getElementById("prodEditId");

  if (editIdInput) editIdInput.value = p.id;
  if (modalTitle) modalTitle.textContent = "Editar Produto";
  if (btnSubmit) btnSubmit.textContent = "Salvar Alterações";

  const nomeEl = document.getElementById("prodNome");
  const skuEl = document.getElementById("prodSku");
  const catEl = document.getElementById("prodCategoria");
  const unidEl = document.getElementById("prodUnidade");
  const custoEl = document.getElementById("prodCusto");
  const precoEl = document.getElementById("prodPreco");
  const estEl = document.getElementById("prodEstoque");
  const estMinEl = document.getElementById("prodEstoqueMin");
  const valEl = document.getElementById("prodValidade");

  if (nomeEl) nomeEl.value = p.nome || "";
  if (skuEl) skuEl.value = p.sku && p.sku !== "—" ? p.sku : "";

  if (catEl) {
    if (p.category_id) {
      catEl.value = p.category_id;
    } else {
      for (let i = 0; i < catEl.options.length; i++) {
        if (catEl.options[i].text.toLowerCase() === (p.categoria || "").toLowerCase()) {
          catEl.selectedIndex = i;
          break;
        }
      }
    }
  }

  if (unidEl) unidEl.value = p.unidade || "un";
  if (custoEl) custoEl.value = p.custo !== undefined ? p.custo : 0;
  if (precoEl) precoEl.value = p.preco_venda !== undefined ? p.preco_venda : 0;
  if (estEl) estEl.value = p.estoque_atual !== undefined ? p.estoque_atual : 0;
  if (estMinEl) estMinEl.value = p.estoque_min !== undefined ? p.estoque_min : 5;
  if (valEl) valEl.value = p.validade || "";

  // Atualiza exibição de margem
  const marginDisplay = document.getElementById("marginPreviewValue");
  if (marginDisplay) {
    const custo = parseFloat(custoEl?.value) || 0;
    const preco = parseFloat(precoEl?.value) || 0;
    if (preco > 0) {
      const margin = calculateMargin(custo, preco);
      const lucro = preco - custo;
      marginDisplay.textContent = `${margin.toFixed(1)}% (${formatCurrency(lucro)} lucro)`;
      marginDisplay.style.color =
        margin >= 25 ? "var(--primary)" : margin >= 15 ? "var(--neon-amber)" : "var(--neon-red)";
    } else {
      marginDisplay.textContent = "0.0% (R$ 0,00 lucro)";
    }
  }

  overlay?.classList.add("open");
  nomeEl?.focus();
}

// Salvar produto (Criação ou Edição)
async function handleSaveProduct(form, closeModal) {
  const editId = document.getElementById("prodEditId")?.value;
  const nome = document.getElementById("prodNome")?.value.trim();
  const sku =
    document.getElementById("prodSku")?.value.trim() || `SKU-${Date.now().toString().slice(-4)}`;
  const catSelect = document.getElementById("prodCategoria");
  const categoryIdOrName = catSelect?.value;
  const categoriaNome = catSelect?.options[catSelect.selectedIndex]?.text || "Geral";
  const unidade = document.getElementById("prodUnidade")?.value || "un";
  const custo = parseFloat(document.getElementById("prodCusto")?.value) || 0;
  const preco = parseFloat(document.getElementById("prodPreco")?.value) || 0;
  const estoque = parseInt(document.getElementById("prodEstoque")?.value, 10) || 0;
  const estoqueMin = parseInt(document.getElementById("prodEstoqueMin")?.value, 10) || 5;
  const validade = document.getElementById("prodValidade")?.value || "";

  if (!nome || preco <= 0) {
    alert("Por favor, preencha o Nome do produto e um Preço de Venda válido.");
    return;
  }

  const client = typeof getSupabaseClient === "function" ? getSupabaseClient() : null;

  if (editId) {
    // Modo EDIÇÃO
    if (client && !editId.startsWith("local-") && !editId.startsWith("p-")) {
      try {
        const payload = {
          nome,
          sku,
          custo,
          preco_venda: preco,
          estoque_atual: estoque,
          estoque_min: estoqueMin,
          validade: validade || null,
        };

        if (categoryIdOrName && categoryIdOrName.length > 20) {
          payload.category_id = categoryIdOrName;
        }

        const { error } = await client.from("products").update(payload).eq("id", editId);
        if (error) {
          console.warn("Erro ao atualizar no Supabase:", error);
        }
      } catch (err) {
        console.warn("Erro ao comunicar com Supabase na edição:", err);
      }
    }

    const index = productsState.findIndex((p) => p.id === editId);
    if (index !== -1) {
      productsState[index] = {
        ...productsState[index],
        nome,
        sku,
        categoria: categoriaNome,
        category_id:
          categoryIdOrName && categoryIdOrName.length > 20
            ? categoryIdOrName
            : productsState[index].category_id,
        unidade,
        custo,
        preco_venda: preco,
        estoque_atual: estoque,
        estoque_min: estoqueMin,
        validade,
      };
    }
  } else {
    // Modo NOVO CADASTRO
    let savedId = `local-${Date.now()}`;

    if (client) {
      try {
        const {
          data: { session },
        } = await client.auth.getSession();

        if (session && session.user) {
          const payload = {
            user_id: session.user.id,
            nome,
            sku,
            custo,
            preco_venda: preco,
            estoque_atual: estoque,
            estoque_min: estoqueMin,
            validade: validade || null,
          };

          if (categoryIdOrName && categoryIdOrName.length > 20) {
            payload.category_id = categoryIdOrName;
          }

          const { data, error } = await client.from("products").insert([payload]).select().single();

          if (error) {
            console.warn("Erro ao salvar no Supabase (salvando localmente):", error);
          } else if (data) {
            savedId = data.id;
          }
        }
      } catch (err) {
        console.warn("Erro ao comunicar com Supabase:", err);
      }
    }

    const newProduct = {
      id: savedId,
      nome,
      sku,
      categoria: categoriaNome,
      category_id: categoryIdOrName && categoryIdOrName.length > 20 ? categoryIdOrName : null,
      unidade,
      custo,
      preco_venda: preco,
      estoque_atual: estoque,
      estoque_min: estoqueMin,
      validade,
    };

    productsState.unshift(newProduct);
  }

  saveLocalProducts();
  renderProducts();
  updateKPIs();
  closeModal();
}

// Excluir Produto
async function deleteProduct(id) {
  if (!confirm("Deseja realmente remover este produto?")) return;

  const client = typeof getSupabaseClient === "function" ? getSupabaseClient() : null;

  if (client && id && !id.startsWith("local-") && !id.startsWith("p-")) {
    try {
      await client.from("products").delete().eq("id", id);
    } catch (err) {
      console.warn("Erro ao deletar no Supabase:", err);
    }
  }

  productsState = productsState.filter((p) => p.id !== id);
  saveLocalProducts();
  renderProducts();
  updateKPIs();
}

// Filtros
function initFilterHandlers() {
  const search = document.getElementById("searchProduct");
  const cat = document.getElementById("filterCategoria");
  const status = document.getElementById("filterStatus");

  search?.addEventListener("input", renderProducts);
  cat?.addEventListener("change", renderProducts);
  status?.addEventListener("change", renderProducts);
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
