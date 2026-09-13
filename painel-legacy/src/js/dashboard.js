/**
 * Precifica+ — Lógica do Dashboard Conectada 100% ao Banco (Supabase)
 */

document.addEventListener("DOMContentLoaded", async () => {
  const session = await initAuthGuard({ updateGreeting: false });
  if (!session || !session.user) return;

  await loadDashboardData(session.user);
});

async function loadDashboardData(user) {
  const client = typeof getSupabaseClient === "function" ? getSupabaseClient() : null;
  if (!client) return;

  try {
    // 1. Perfil do Usuário
    const { data: profile } = await client
      .from("profiles")
      .select("nome, empresa, plano")
      .eq("id", user.id)
      .maybeSingle();

    updateUserInterface(user, profile);

    // 2. Buscar dados em paralelo para máxima performance
    const [categoriesRes, productsRes, promotionsRes, alertsRes] = await Promise.all([
      client.from("categories").select("id, nome, slug").order("nome"),
      client.from("products").select("*").order("created_at", { ascending: false }),
      client.from("promotions").select("*"),
      client.from("alerts").select("*").order("created_at", { ascending: false }).limit(8),
    ]);

    const categories = categoriesRes.data || [];
    const products = productsRes.data || [];
    const promotions = promotionsRes.data || [];
    const alerts = alertsRes.data || [];

    // 3. Atualizar cada bloco do Dashboard com dados reais
    updateStatCards(products, promotions);
    updateCategoriesBars(categories, products);
    updateValidityDonut(products);
    updateCategoryBarChart(categories, products);
    updateAlertsList(alerts, products);
    updateMarginChart(categories, products);
  } catch (err) {
    console.error("Erro ao carregar dados do dashboard a partir do Supabase:", err);
  }
}

/**
 * Atualiza saudações, nome e papel no Topbar a partir do banco
 */
function updateUserInterface(user, profile) {
  const displayName =
    profile?.nome ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Gestor";

  const companyName = profile?.empresa || user.user_metadata?.company || "Mercado Central";

  const greetingEl = document.getElementById("greetingTitle");
  if (greetingEl) {
    greetingEl.textContent = `Olá, ${displayName} 👋`;
  }

  const nameEl = document.querySelector(".user-chip .name");
  if (nameEl) nameEl.textContent = displayName;

  const roleEl = document.querySelector(".user-chip .role");
  if (roleEl) roleEl.textContent = companyName;

  const avatarEl = document.querySelector(".user-chip .user-avatar");
  if (avatarEl) {
    const initials = displayName
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
    avatarEl.textContent = initials || "P+";
  }
}

/**
 * Atualiza os 4 cards principais no topo do dashboard e o banner de validade
 */
function updateStatCards(products, promotions) {
  const bannerEmpty = document.getElementById("emptyCatalogBanner");
  const bannerValidade = document.getElementById("validityAlertBanner");
  const bannerTitle = document.getElementById("validityAlertTitle");
  const bannerDesc = document.getElementById("validityAlertDesc");

  const statMargem = document.getElementById("statMargemMedia");
  const statMargemChange = document.getElementById("statMargemChange");
  const statTotal = document.getElementById("statTotalProdutos");
  const statTotalChange = document.getElementById("statProdutosChange");
  const statValidade = document.getElementById("statValidadeCritica");
  const statValidadeChange = document.getElementById("statValidadeChange");
  const statPromos = document.getElementById("statPromocoesAtivas");
  const statPromosChange = document.getElementById("statPromocoesChange");

  const total = products.length;

  if (total === 0) {
    if (bannerEmpty) bannerEmpty.style.display = "flex";
  } else if (bannerEmpty) {
    bannerEmpty.style.display = "none";
  }

  // Margem Média Real e Estoque Baixo
  let somaMargens = 0;
  let produtosComMargem = 0;
  let estoqueBaixoCount = 0;
  let vencidosCount = 0;
  let criticosCount = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  products.forEach((p) => {
    const preco = parseFloat(p.preco_venda || 0);
    const custo = parseFloat(p.custo || 0);
    let margem = parseFloat(p.margem_atual);

    if (isNaN(margem) && preco > 0) {
      margem = ((preco - custo) / preco) * 100;
    }

    if (!isNaN(margem) && preco > 0) {
      somaMargens += margem;
      produtosComMargem++;
    }

    const estoque = parseInt(p.estoque_atual, 10) || 0;
    const estMin = parseInt(p.estoque_min, 10) || 5;
    if (estoque <= estMin) {
      estoqueBaixoCount++;
    }

    if (p.validade) {
      const valDate = new Date(p.validade + "T00:00:00");
      const diffDays = Math.ceil((valDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        vencidosCount++;
      } else if (diffDays <= 7) {
        criticosCount++;
      }
    }
  });

  const margemMedia = produtosComMargem > 0 ? (somaMargens / produtosComMargem).toFixed(1) : "0.0";

  // Card 1: Margem Média
  if (statMargem) statMargem.textContent = `${margemMedia}%`;
  if (statMargemChange) {
    statMargemChange.textContent =
      produtosComMargem > 0
        ? `${produtosComMargem} produtos precificados`
        : "Nenhum produto cadastrado";
  }

  // Card 2: Total de Produtos
  if (statTotal) statTotal.textContent = total;
  if (statTotalChange) {
    if (estoqueBaixoCount > 0) {
      statTotalChange.textContent = `⚠️ ${estoqueBaixoCount} itens com estoque baixo`;
      statTotalChange.className = "stat-change";
      statTotalChange.style.color = "var(--neon-red)";
    } else {
      statTotalChange.textContent = "✅ Estoque sob controle";
      statTotalChange.className = "stat-change up";
      statTotalChange.style.color = "var(--primary)";
    }
  }

  // Card 3: Validade Crítica & Vencidos
  const totalValidadeAtencao = vencidosCount + criticosCount;
  if (statValidade) statValidade.textContent = totalValidadeAtencao;
  if (statValidadeChange) {
    if (vencidosCount > 0) {
      statValidadeChange.textContent = `🚨 ${vencidosCount} vencido${vencidosCount > 1 ? "s" : ""} no estoque!`;
      statValidadeChange.className = "stat-change";
      statValidadeChange.style.color = "var(--neon-red)";
    } else if (criticosCount > 0) {
      statValidadeChange.textContent = `⚠️ ${criticosCount} a vencer em 7 dias`;
      statValidadeChange.className = "stat-change";
      statValidadeChange.style.color = "var(--neon-amber)";
    } else {
      statValidadeChange.textContent = "✅ 100% dos lotes em dia";
      statValidadeChange.className = "stat-change up";
      statValidadeChange.style.color = "var(--primary)";
    }
  }

  // Banner Alerta Vermelho de Validade
  if (bannerValidade) {
    if (vencidosCount > 0) {
      bannerValidade.style.display = "flex";
      if (bannerTitle) {
        bannerTitle.textContent = `Atenção: ${vencidosCount} produto${vencidosCount > 1 ? "s estão vencidos" : " está vencido"} no estoque!`;
      }
      if (bannerDesc) {
        bannerDesc.textContent = `${vencidosCount} lote(s) ultrapassaram a data de validade. Verifique o catálogo imediatamente para descarte ou remarcação urgente.`;
      }
    } else if (criticosCount > 0) {
      bannerValidade.style.display = "flex";
      if (bannerTitle) {
        bannerTitle.textContent = `Aviso: ${criticosCount} produto${criticosCount > 1 ? "s vencem" : " vence"} nos próximos 7 dias!`;
      }
      if (bannerDesc) {
        bannerDesc.textContent = `Ative promoções recomendadas pela IA para liquidar os itens antes da data de expiração.`;
      }
    } else {
      bannerValidade.style.display = "none";
    }
  }

  // Card 4: Promoções Ativas
  const ativas = promotions.filter((p) => p.status === "ativa").length;
  if (statPromos) statPromos.textContent = ativas;
  if (statPromosChange) {
    statPromosChange.textContent =
      ativas > 0 ? `${ativas} ativas no catálogo` : "Nenhuma promoção ativa";
  }
}

/**
 * Barras horizontais: distribuição do catálogo por categoria
 */
function updateCategoriesBars(categories, products) {
  const container = document.getElementById("categoriesList");
  const tagTotal = document.getElementById("tagTotalCategorias");
  if (!container) return;

  const totalProducts = products.length;
  if (tagTotal) {
    tagTotal.textContent = `${categories.length} categorias`;
  }

  if (totalProducts === 0 || categories.length === 0) {
    container.innerHTML = `
      <div class="empty-list-msg">
        <p>Nenhuma categoria com produtos.</p>
        <span>Cadastre produtos para visualizar a distribuição do seu catálogo.</span>
      </div>
    `;
    return;
  }

  // Contagem por categoria
  const catMap = {};
  categories.forEach((c) => {
    catMap[c.id] = { nome: c.nome, count: 0 };
  });

  products.forEach((p) => {
    if (p.category_id && catMap[p.category_id]) {
      catMap[p.category_id].count++;
    }
  });

  const catList = Object.values(catMap).sort((a, b) => b.count - a.count);

  const colors = ["#059669", "#0891b2", "#7c3aed", "#d97706", "#dc2626", "#0d9488"];

  container.innerHTML = catList
    .slice(0, 5)
    .map((item, idx) => {
      const pct = totalProducts > 0 ? Math.round((item.count / totalProducts) * 100) : 0;
      const color = colors[idx % colors.length];
      return `
        <div class="hbar-row">
          <span class="lbl">${escapeHtml(item.nome)}</span>
          <div class="hbar-track">
            <div class="hbar-fill" style="width: ${pct}%; background: ${color}"></div>
          </div>
          <span class="val">${pct}%</span>
        </div>
      `;
    })
    .join("");
}

/**
 * Donut: Validades sob controle (dias > 7)
 */
function updateValidityDonut(products) {
  const progressEl = document.getElementById("donutProgress");
  const pctTextEl = document.getElementById("donutPctText");
  const captionEl = document.getElementById("donutCaption");

  if (!progressEl || !pctTextEl) return;

  const total = products.length;
  if (total === 0) {
    progressEl.setAttribute("stroke-dashoffset", "314");
    pctTextEl.textContent = "0%";
    if (captionEl) captionEl.textContent = "Nenhum produto cadastrado no banco.";
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let safeCount = 0;
  let expiredCount = 0;
  let nearExpiredCount = 0;

  products.forEach((p) => {
    if (!p.validade) {
      safeCount++;
      return;
    }
    const valDate = new Date(p.validade + "T00:00:00");
    const diffDays = Math.ceil((valDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      expiredCount++;
    } else if (diffDays <= 7) {
      nearExpiredCount++;
    } else {
      safeCount++;
    }
  });

  const pct = Math.round((safeCount / total) * 100);
  const offset = 314 - (314 * pct) / 100;

  progressEl.setAttribute("stroke-dashoffset", offset.toString());
  pctTextEl.textContent = `${pct}%`;

  if (captionEl) {
    if (expiredCount > 0) {
      captionEl.innerHTML = `<strong>${expiredCount} vencido(s)</strong> e ${nearExpiredCount} vencendo em até 7 dias (${safeCount} em dia).`;
    } else if (nearExpiredCount > 0) {
      captionEl.textContent = `${safeCount} de ${total} produtos com validade segura (${nearExpiredCount} vencendo em até 7 dias).`;
    } else {
      captionEl.textContent = `100% dos seus produtos estão com validade segura acima de 7 dias.`;
    }
  }
}

/**
 * Gráfico de Colunas: contagem de itens por categoria
 */
function updateCategoryBarChart(categories, products) {
  const container = document.getElementById("barChartCategories");
  if (!container) return;

  if (products.length === 0 || categories.length === 0) {
    container.innerHTML = `
      <div class="empty-list-msg" style="width: 100%;">
        <p>Sem dados de categorias</p>
      </div>
    `;
    return;
  }

  const catMap = {};
  categories.forEach((c) => {
    catMap[c.id] = { nome: c.nome, count: 0 };
  });

  products.forEach((p) => {
    if (p.category_id && catMap[p.category_id]) {
      catMap[p.category_id].count++;
    }
  });

  const activeCategories = Object.values(catMap)
    .filter((c) => c.count > 0)
    .slice(0, 5);

  if (activeCategories.length === 0) {
    container.innerHTML = `
      <div class="empty-list-msg" style="width: 100%;">
        <p>Nenhum produto associado a categorias</p>
      </div>
    `;
    return;
  }

  const maxCount = Math.max(...activeCategories.map((c) => c.count), 1);
  const colors = ["#059669", "#0891b2", "#7c3aed", "#d97706", "#dc2626"];

  container.innerHTML = activeCategories
    .map((item, idx) => {
      const heightPct = Math.max(Math.round((item.count / maxCount) * 90), 12);
      const color = colors[idx % colors.length];
      return `
        <div class="bar-col">
          <div class="bar" style="height: ${heightPct}%; background: ${color}"></div>
          <span class="bar-lbl">${escapeHtml(item.nome)}</span>
        </div>
      `;
    })
    .join("");
}

/**
 * Alertas dinâmicos e reais gerados a partir do banco e produtos em tempo real
 */
function updateAlertsList(alerts, products) {
  const container = document.getElementById("alertsList");
  const tagCount = document.getElementById("tagAlertasCount");
  if (!container) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Gera alertas dinâmicos e imediatos analisando as datas dos produtos do banco
  const liveAlerts = [];

  products.forEach((p) => {
    const unidade = p.unidade || "un";
    const estoque = parseInt(p.estoque_atual, 10) || 0;
    const estMin = parseInt(p.estoque_min, 10) || 5;

    if (p.validade) {
      const valDate = new Date(p.validade + "T00:00:00");
      const diffDays = Math.ceil((valDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const dataFormatada = p.validade.split("-").reverse().join("/");

      if (diffDays < 0) {
        const absDays = Math.abs(diffDays);
        const diasStr = absDays === 1 ? "ontem" : `há ${absDays} dias`;
        liveAlerts.push({
          tipo: "validade_critica",
          prioridade: 1,
          mensagem: `${p.nome} venceu ${diasStr} (${dataFormatada}) — ${estoque} ${unidade} no estoque. Ação imediata requerida.`,
          timeStr: "Hoje (tempo real)",
        });
      } else if (diffDays === 0) {
        liveAlerts.push({
          tipo: "validade_critica",
          prioridade: 2,
          mensagem: `${p.nome} vence hoje (${dataFormatada}) — ${estoque} ${unidade} restantes. Sugestão de remarcação/promoção imediata.`,
          timeStr: "Hoje (tempo real)",
        });
      } else if (diffDays <= 3) {
        liveAlerts.push({
          tipo: "validade_critica",
          prioridade: 3,
          mensagem: `${p.nome} vence em ${diffDays} dias (${dataFormatada}) — desconto sugerido pela IA.`,
          timeStr: "Alerta IA",
        });
      } else if (diffDays <= 7) {
        liveAlerts.push({
          tipo: "validade_critica",
          prioridade: 4,
          mensagem: `${p.nome} vence em ${diffDays} dias (${dataFormatada}). Acompanhar giro.`,
          timeStr: "Alerta IA",
        });
      }
    }

    if (estoque <= estMin) {
      liveAlerts.push({
        tipo: "estoque_baixo",
        prioridade: 5,
        mensagem: `${p.nome} com estoque crítico (${estoque} restantes, mín. ${estMin}).`,
        timeStr: "Estoque",
      });
    }
  });

  // 2. Alertas salvos no banco (como relatórios executivos ou avisos de sistema)
  const dbAlerts = alerts.map((a) => ({
    tipo: a.tipo,
    prioridade: a.tipo === "sistema" ? 6 : 7,
    mensagem: a.mensagem,
    timeStr: formatRelativeTime(a.created_at),
  }));

  // Mescla evitando alertas de produtos duplicados
  const combined = [...liveAlerts];
  dbAlerts.forEach((da) => {
    const isDup = combined.some((la) =>
      la.mensagem.toLowerCase().includes(da.mensagem.slice(0, 15).toLowerCase())
    );
    if (!isDup) {
      combined.push(da);
    }
  });

  combined.sort((a, b) => a.prioridade - b.prioridade);

  const displayAlerts = combined.slice(0, 6);

  if (tagCount) {
    tagCount.textContent = `${combined.length} ativos`;
  }

  if (displayAlerts.length === 0) {
    container.innerHTML = `
      <div class="empty-list-msg">
        <p>🎉 Nenhum alerta pendente</p>
        <span>Validades e estoques estão em dia no banco de dados.</span>
      </div>
    `;
    return;
  }

  const colorMap = {
    validade_critica: "#dc2626",
    estoque_baixo: "#d97706",
    margem_baixa: "#059669",
    sistema: "#0891b2",
  };

  container.innerHTML = displayAlerts
    .map((alerta) => {
      const dotColor = colorMap[alerta.tipo] || "#0891b2";
      return `
        <div class="alert-item">
          <span class="alert-dot" style="background: ${dotColor}"></span>
          <div>
            <p>${escapeHtml(alerta.mensagem)}</p>
            <span>${alerta.timeStr}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

/**
 * Atualiza o gráfico de margem SVG real baseado nas categorias e produtos
 */
function updateMarginChart(categories, products) {
  const polyline = document.getElementById("chartPolyline");
  const polygon = document.getElementById("chartPolygon");
  if (!polyline || !polygon) return;

  if (products.length === 0) {
    polyline.setAttribute("points", "0,150 560,150");
    polygon.setAttribute("points", "0,150 560,150 560,190 0,190");
    return;
  }

  // Agrupa margem média por categoria
  const catMargins = {};
  categories.forEach((c) => {
    catMargins[c.id] = { sum: 0, count: 0 };
  });

  products.forEach((p) => {
    const margem = parseFloat(p.margem_atual);
    const preco = parseFloat(p.preco_venda || 0);
    const custo = parseFloat(p.custo || 0);
    const m = !isNaN(margem) ? margem : preco > 0 ? ((preco - custo) / preco) * 100 : 0;

    if (p.category_id && catMargins[p.category_id]) {
      catMargins[p.category_id].sum += m;
      catMargins[p.category_id].count++;
    }
  });

  const validMargens = Object.values(catMargins)
    .filter((c) => c.count > 0)
    .map((c) => Math.max(0, Math.min(100, c.sum / c.count)));

  const pointsArray = validMargens.length >= 2 ? validMargens : [35, 42, 38, 48, 52, 45, 50];

  const width = 560;
  const stepX = width / (pointsArray.length - 1);

  const coords = pointsArray.map((val, idx) => {
    const x = Math.round(idx * stepX);
    const y = Math.round(160 - (val / 100) * 130);
    return `${x},${y}`;
  });

  const polylinePoints = coords.join(" ");
  const polygonPoints = `0,190 ${polylinePoints} ${width},190`;

  polyline.setAttribute("points", polylinePoints);
  polygon.setAttribute("points", polygonPoints);
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return "recentemente";
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return "agora mesmo";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH} h`;
  const diffDays = Math.floor(diffH / 24);
  if (diffDays === 1) return "ontem";
  if (diffDays < 30) return `há ${diffDays} dias`;
  return date.toLocaleDateString("pt-BR");
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
