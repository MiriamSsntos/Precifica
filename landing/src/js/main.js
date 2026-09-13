/* ══════════════════════════════════════════════
   SISTEMA DE CENAS POR SEÇÃO
   ══════════════════════════════════════════════ */
const SCENES = {
  hero: {
    c1: "5,150,105",
    c2: "16,185,129",
    g1: "#047857",
    g2: "#065F46",
    g3: "#10B981",
    scan: "rgba(5,150,105,0.7)",
    speed: 1.0,
  },
  features: {
    c1: "16,185,129",
    c2: "5,150,105",
    g1: "#059669",
    g2: "#047857",
    g3: "#34D399",
    scan: "rgba(16,185,129,0.7)",
    speed: 1.3,
  },
  howto: {
    c1: "5,150,105",
    c2: "16,185,129",
    g1: "#047857",
    g2: "#065F46",
    g3: "#10B981",
    scan: "rgba(16,185,129,0.7)",
    speed: 0.9,
  },
  testi: {
    c1: "245,158,11",
    c2: "5,150,105",
    g1: "#B45309",
    g2: "#047857",
    g3: "#F59E0B",
    scan: "rgba(245,158,11,0.7)",
    speed: 1.1,
  },
  pricing: {
    c1: "5,150,105",
    c2: "16,185,129",
    g1: "#065F46",
    g2: "#047857",
    g3: "#34D399",
    scan: "rgba(5,150,105,0.8)",
    speed: 1.4,
  },
  signup: {
    c1: "16,185,129",
    c2: "5,150,105",
    g1: "#065F46",
    g2: "#047857",
    g3: "#34D399",
    scan: "rgba(16,185,129,0.8)",
    speed: 0.8,
  },
};

let currentScene = "hero";
window.__scenes = SCENES; // Expoe pro canvas

/* ── Elementos das camadas ── */
const pg1 = document.getElementById("pg1");
const pg2 = document.getElementById("pg2");
const pg3 = document.getElementById("pg3");
const scanEl = document.getElementById("scan-line");

/* ══════════════════════════════════════════════
   SCAN LINE LASER
   ══════════════════════════════════════════════ */
let scanAnim = null;
let scanInterval = null;

function fireScan() {
  if (currentPerfMode === "eco" || !scanEl) return;
  if (scanAnim) scanAnim.cancel();

  const vh = window.innerHeight;
  scanEl.style.top = "-2px";
  scanEl.style.opacity = "1";
  if (typeof scanEl.animate === "function") {
    scanAnim = scanEl.animate(
      [
        { top: "-2px", opacity: 0, offset: 0 },
        { top: "2px", opacity: 0.9, offset: 0.02 },
        { top: vh * 0.5 + "px", opacity: 0.6, offset: 0.5 },
        { top: vh + "px", opacity: 0, offset: 1 },
      ],
      { duration: 1600, easing: "ease-in", fill: "forwards" }
    );
    scanAnim.onfinish = () => {
      scanEl.style.opacity = "0";
    };
  } else {
    scanEl.style.opacity = "0";
  }
}

function startScanLoop() {
  if (scanInterval) clearInterval(scanInterval);
  scanInterval = setInterval(fireScan, 8000);
}

function stopScanLoop() {
  if (scanInterval) {
    clearInterval(scanInterval);
    scanInterval = null;
  }
  if (scanAnim) scanAnim.cancel();
  if (scanEl) scanEl.style.opacity = "0";
}

/* ══════════════════════════════════════════════
   CANVAS GRID ANIMADO E DOTS FLUTUANTES
   ══════════════════════════════════════════════ */
let canvasAnimId = null;
let drawGridFn = null;

(function initCanvas() {
  const canvas = document.getElementById("cyber-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const CELL = 52;

  let speedMult = 1.0;
  let colorA = [5, 150, 105];
  let colorB = [16, 185, 129];
  let targetA = [5, 150, 105];
  let targetB = [16, 185, 129];

  let isMobile = window.innerWidth < 768;

  function lerpColor(from, to, t) {
    return from.map((v, i) => Math.round(v + (to[i] - v) * t));
  }

  window.__setCanvasColors = (c1str, c2str, spd) => {
    if (!c1str || !c2str) return;
    targetA = c1str.split(",").map(Number);
    targetB = c2str.split(",").map(Number);
    speedMult = spd || 1.0;
  };

  const PARTICLE_COUNT = isMobile ? 10 : 22;
  const particles = [];

  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    isMobile = window.innerWidth < 768;
  }
  resize();
  window.addEventListener("resize", resize, { passive: true });

  function randomParticle(forceNew) {
    const horiz = Math.random() < 0.5;
    const useA = Math.random() < 0.6;
    if (horiz) {
      return {
        horiz: true,
        x: forceNew ? -100 : Math.random() * canvas.width,
        y: Math.floor(Math.random() * Math.ceil(canvas.height / CELL)) * CELL,
        len: 50 + Math.random() * 80,
        speed: 0.7 + Math.random() * 0.9,
        alpha: 0.12 + Math.random() * 0.15,
        useA,
      };
    } else {
      return {
        horiz: false,
        x: Math.floor(Math.random() * Math.ceil(canvas.width / CELL)) * CELL,
        y: forceNew ? -100 : Math.random() * canvas.height,
        len: 50 + Math.random() * 80,
        speed: 0.7 + Math.random() * 0.9,
        alpha: 0.12 + Math.random() * 0.15,
        useA,
      };
    }
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(randomParticle(false));

  drawGridFn = function drawGrid() {
    if (currentPerfMode === "eco") {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    colorA = lerpColor(colorA, targetA, 0.03);
    colorB = lerpColor(colorB, targetB, 0.03);

    const ca = colorA.join(",");
    const cb = colorB.join(",");

    // Grade sutil
    ctx.beginPath();
    ctx.strokeStyle = `rgba(${ca},0.035)`;
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += CELL) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
    }
    for (let y = 0; y <= canvas.height; y += CELL) {
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();

    // Nós / Dots flutuantes de conexão brilhantes nas junções do grid (Ultra leve, sem shadowBlur)
    const visW = Math.ceil(canvas.width / CELL);
    const visH = Math.ceil(canvas.height / CELL);
    const now = Date.now();
    for (let xi = 0; xi <= visW; xi++) {
      for (let yi = 0; yi <= visH; yi++) {
        const hash = (xi * 1000 + yi * 73 + Math.floor(now / 2000)) % 100;
        if (hash < 5) {
          const pulse = Math.sin(now / 600 + xi + yi) * 0.5 + 0.5;
          const px = xi * CELL;
          const py = yi * CELL;

          // Halo externo suave
          ctx.beginPath();
          ctx.arc(px, py, 3.5 + pulse * 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${ca},${0.08 + pulse * 0.12})`;
          ctx.fill();

          // Ponto central luminoso
          ctx.beginPath();
          ctx.arc(px, py, 1.6 + pulse * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${ca},${0.4 + pulse * 0.5})`;
          ctx.fill();
        }
      }
    }

    // Partículas e feixes de dados deslizantes
    particles.forEach((p, i) => {
      const col = p.useA ? ca : cb;
      const spd = p.speed * speedMult;

      if (p.horiz) {
        const grad = ctx.createLinearGradient(p.x, p.y, p.x + p.len, p.y);
        grad.addColorStop(0, `rgba(${col},0)`);
        grad.addColorStop(0.35, `rgba(${col},${p.alpha})`);
        grad.addColorStop(0.65, `rgba(${col},${p.alpha})`);
        grad.addColorStop(1, `rgba(${col},0)`);
        ctx.beginPath();
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.len, p.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(p.x + p.len * 0.75, p.y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col},${p.alpha * 2})`;
        ctx.fill();
        p.x += spd;
        if (p.x > canvas.width + 30) particles[i] = randomParticle(true);
      } else {
        const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.len);
        grad.addColorStop(0, `rgba(${col},0)`);
        grad.addColorStop(0.35, `rgba(${col},${p.alpha})`);
        grad.addColorStop(0.65, `rgba(${col},${p.alpha})`);
        grad.addColorStop(1, `rgba(${col},0)`);
        ctx.beginPath();
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, p.y + p.len);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(p.x, p.y + p.len * 0.75, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col},${p.alpha * 2})`;
        ctx.fill();
        p.y += spd;
        if (p.y > canvas.height + 30) particles[i] = randomParticle(true);
      }
    });

    canvasAnimId = requestAnimationFrame(drawGrid);
  };
})();

function startCanvasEffects() {
  if (canvasAnimId) cancelAnimationFrame(canvasAnimId);
  if (drawGridFn) drawGridFn();
  startScanLoop();
}

function stopCanvasEffects() {
  if (canvasAnimId) {
    cancelAnimationFrame(canvasAnimId);
    canvasAnimId = null;
  }
  const canvas = document.getElementById("cyber-canvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  stopScanLoop();
}

/* ══════════════════════════════════════════════
   GERENCIADOR DE MODOS DE DESEMPENHO (Efeitos vs. Economia)
   ══════════════════════════════════════════════ */
let currentPerfMode = (function () {
  try {
    const saved = localStorage.getItem("precifica_perf_mode");
    if (saved) return saved;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return "eco";
  } catch {}
  return "effects";
})();

function setPerfMode(mode, showNotification) {
  currentPerfMode = mode;
  document.documentElement.setAttribute("data-perf-mode", mode);
  try {
    localStorage.setItem("precifica_perf_mode", mode);
  } catch {}

  const mobileStatus = document.getElementById("perfMobileStatus");
  if (mobileStatus) {
    mobileStatus.textContent = mode === "eco" ? "🍃 Economia Ativa" : "⚡ Efeitos Ativos";
  }

  if (mode === "eco") {
    stopCanvasEffects();
  } else {
    startCanvasEffects();
  }

  if (showNotification) {
    showPerfToast(
      mode === "eco"
        ? "🍃 Modo Economia Ativado: Animações e dots pausados para máxima fluidez e economia de bateria."
        : "⚡ Modo Efeitos Ativado: Experiência visual completa com dots, luzes e animações ativas."
    );
  }
}

function togglePerfMode() {
  const nextMode = currentPerfMode === "eco" ? "effects" : "eco";
  setPerfMode(nextMode, true);
}
window.togglePerfMode = togglePerfMode;

function showPerfToast(msg) {
  let toast = document.getElementById("perf-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "perf-toast";
    toast.className = "perf-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("show");
  if (window._perfToastTimeout) clearTimeout(window._perfToastTimeout);
  window._perfToastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

// Detecção inteligente de economia de bateria no navegador
if (!localStorage.getItem("precifica_perf_mode") && navigator.getBattery) {
  navigator
    .getBattery()
    .then((battery) => {
      if (battery.level <= 0.2 && !battery.charging) {
        setPerfMode("eco", false);
      }
    })
    .catch(() => {});
}

// Inicia no modo correto após todas as funções estarem declaradas
setPerfMode(currentPerfMode, false);

/* ─── APLICAÇÃO DE CENAS E TRANSIÇÃO SUAVE ─── */
function applyScene(name, targetElement) {
  if (name === currentScene) return;
  currentScene = name;
  const s = SCENES[name];
  if (!s) return;

  document.documentElement.style.setProperty("--amb-c1", s.c1);
  document.documentElement.style.setProperty("--amb-c2", s.c2);

  if (window.__setCanvasColors) {
    window.__setCanvasColors(s.c1, s.c2, s.speed);
  }
  if (pg1 && s.g1) pg1.style.backgroundColor = s.g1;
  if (pg2 && s.g2) pg2.style.backgroundColor = s.g2;
  if (pg3 && s.g3) pg3.style.backgroundColor = s.g3;

  if (targetElement && currentPerfMode !== "eco") {
    targetElement.classList.add("section-flash");
    setTimeout(() => {
      targetElement.classList.remove("section-flash");
    }, 600);
  }
}

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        const scene = e.target.dataset.scene;
        if (scene) applyScene(scene, e.target);
      }
    });
  },
  { threshold: 0.35 }
);

document.querySelectorAll("[data-scene]").forEach((s) => sectionObserver.observe(s));

// Init da cena inicial
if (window.__scenes && window.__scenes.hero) {
  document.documentElement.style.setProperty("--amb-c1", window.__scenes.hero.c1);
  document.documentElement.style.setProperty("--amb-c2", window.__scenes.hero.c2);
}

/* ─── COMPORTAMENTOS GERAIS DE UI ─── */
const hamburger = document.getElementById("hamburger");
const navMobile = document.getElementById("nav-mobile");
hamburger.addEventListener("click", () => {
  navMobile.classList.toggle("open");
  const spans = hamburger.querySelectorAll("span");
  const isOpen = navMobile.classList.contains("open");
  spans[0].style.transform = isOpen ? "translateY(7px) rotate(45deg)" : "";
  spans[1].style.opacity = isOpen ? "0" : "1";
  spans[2].style.transform = isOpen ? "translateY(-7px) rotate(-45deg)" : "";
});
function closeMobile() {
  navMobile.classList.remove("open");
}

function smoothScrollToElement(el, duration = 650) {
  if (!el) return;
  const navHeight = 75;
  const targetY = Math.max(0, el.getBoundingClientRect().top + window.pageYOffset - navHeight);
  const startY = window.pageYOffset;
  const distance = targetY - startY;
  let startTime = null;

  function step(currentTime) {
    if (!startTime) startTime = currentTime;
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Curva cúbica suave (desacelera no final)
    const ease = 1 - Math.pow(1 - progress, 3);
    window.scrollTo(0, startY + distance * ease);
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }
  requestAnimationFrame(step);
}

function scrollTo(id) {
  const el = document.getElementById(id);
  if (el) smoothScrollToElement(el, 650);
}

function selectPlan(planId, btn) {
  document.querySelectorAll(".plan-btn").forEach((b) => b.classList.remove("selected"));
  btn.classList.add("selected");
  const select = document.getElementById("plano");
  if (planId === "essencial") {
    select.selectedIndex = 1;
  } else if (planId === "scale") {
    select.selectedIndex = 2;
  } else if (planId === "enterprise") {
    select.selectedIndex = 3;
  }
  scrollTo("cadastro");
}
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const href = a.getAttribute("href");
    if (!href || href === "#") return;
    const id = href.slice(1);
    const target = document.getElementById(id);
    if (target) {
      e.preventDefault();
      smoothScrollToElement(target, 650);
    }
  });
});

function toggleFaq(btn) {
  const answer = btn.nextElementSibling;
  const isOpen = answer.classList.contains("open");
  document.querySelectorAll(".faq-a").forEach((a) => a.classList.remove("open"));
  document.querySelectorAll(".faq-q").forEach((q) => q.classList.remove("open"));
  if (!isOpen) {
    answer.classList.add("open");
    btn.classList.add("open");
  }
}

async function submitForm() {
  const nome = document.getElementById("nome").value.trim();
  const email = document.getElementById("email").value.trim();
  const mercado = document.getElementById("mercado").value.trim();
  const telefone = document.getElementById("telefone").value.trim();
  const cidade = document.getElementById("cidade").value.trim();
  const produtos = document.getElementById("produtos").value;
  const plano = document.getElementById("plano").value;
  const senha = document.getElementById("senha").value;
  const senha2 = document.getElementById("senha2").value;
  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const telRx = /^\(?\d{2,}\)?\s?\d{4,5}-?\d{4}$/;
  let valid = true;
  const errNome = document.getElementById("err-nome");
  const errEmail = document.getElementById("err-email");
  const errMercado = document.getElementById("err-mercado");
  const errTelefone = document.getElementById("err-telefone");
  const errProdutos = document.getElementById("err-produtos");
  const errPlano = document.getElementById("err-plano");
  const errLgpd = document.getElementById("err-lgpd");
  const errSenha = document.getElementById("err-senha");
  const errSenha2 = document.getElementById("err-senha2");
  const errForm = document.getElementById("err-form");
  errNome.style.display = errEmail.style.display = errMercado.style.display = "";
  if (errTelefone) errTelefone.style.display = "";
  if (errProdutos) errProdutos.style.display = "";
  if (errPlano) errPlano.style.display = "";
  if (errLgpd) errLgpd.style.display = "";
  if (errSenha) errSenha.style.display = "";
  if (errSenha2) errSenha2.style.display = "";
  if (errForm) errForm.style.display = "";
  if (!nome) {
    errNome.style.display = "block";
    valid = false;
  }
  if (!emailRx.test(email)) {
    errEmail.style.display = "block";
    valid = false;
  }
  if (!mercado) {
    errMercado.style.display = "block";
    valid = false;
  }
  if (!telRx.test(telefone)) {
    if (errTelefone) errTelefone.style.display = "block";
    valid = false;
  }
  if (!produtos || produtos === "Selecione a quantidade...") {
    if (errProdutos) errProdutos.style.display = "block";
    valid = false;
  }
  if (!plano || plano === "Selecione uma opção...") {
    if (errPlano) errPlano.style.display = "block";
    valid = false;
  }
  if (senha.length < 6) {
    if (errSenha) errSenha.style.display = "block";
    valid = false;
  }
  if (senha !== senha2) {
    if (errSenha2) errSenha2.style.display = "block";
    valid = false;
  }
  const lgpdChecked = document.getElementById("lgpd-consent").checked;
  if (!lgpdChecked) {
    if (errLgpd) errLgpd.style.display = "block";
    valid = false;
  }
  if (!valid) return;

  const client = getLandingSupabaseClient();
  if (!client) {
    if (errForm) {
      errForm.textContent = "Não foi possível conectar ao serviço de cadastro. Tente novamente.";
      errForm.style.display = "block";
    }
    return;
  }

  const btn = document.getElementById("form-submit-btn");
  btn.classList.add("loading");
  btn.disabled = true;

  try {
    const { data, error } = await client.auth.signUp({
      email,
      password: senha,
      options: {
        data: { full_name: nome, company: mercado },
      },
    });

    if (error) {
      let msg = "Erro ao criar conta. Verifique os dados e tente novamente.";
      if (/already registered|já cadastrad/i.test(error.message)) {
        msg = 'Este e-mail já possui conta. Use o botão "Já sou cliente" para entrar.';
      } else if (/password/i.test(error.message)) {
        msg = "A senha deve ter pelo menos 6 caracteres.";
      } else if (/rate limit/i.test(error.message)) {
        msg = "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
      }
      if (errForm) {
        errForm.textContent = msg;
        errForm.style.display = "block";
      }
      btn.classList.remove("loading");
      btn.disabled = false;
      return;
    }

    if (data && data.user && data.session) {
      await client
        .from("profiles")
        .update({ telefone, cidade, portfolio_skus: produtos, plano })
        .eq("id", data.user.id);
    }

    document.getElementById("form-area").style.display = "none";
    document.getElementById("success-msg").style.display = "block";
    setTimeout(() => {
      window.location.href = "../painel/dashboard.html";
    }, 1400);
  } catch {
    if (errForm) {
      errForm.textContent = "Erro inesperado ao criar conta. Tente novamente.";
      errForm.style.display = "block";
    }
    btn.classList.remove("loading");
    btn.disabled = false;
  }
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.05, rootMargin: "0px 0px 80px 0px" }
);

document
  .querySelectorAll(".reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-fade")
  .forEach((el) => {
    revealObserver.observe(el);
  });

// Fallback de segurança: ativa elementos visíveis no carregamento imediato
setTimeout(() => {
  document
    .querySelectorAll(
      ".reveal:not(.active), .reveal-left:not(.active), .reveal-right:not(.active), .reveal-scale:not(.active), .reveal-fade:not(.active)"
    )
    .forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight + 100) {
        el.classList.add("active");
      }
    });
}, 300);

// Otimização UI/UX: Spotlight pontual apenas no card ativo (Zero Layout Thrashing no modo Eco)
document.querySelectorAll(".feat-card, .plan, .testi-card").forEach((card) => {
  card.addEventListener(
    "mousemove",
    (e) => {
      if (currentPerfMode === "eco") return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
      card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
    },
    { passive: true }
  );
});

// Contador regressivo
(function () {
  const cdDays = document.getElementById("cd-days");
  const cdHours = document.getElementById("cd-hours");
  const cdMins = document.getElementById("cd-mins");
  const cdSecs = document.getElementById("cd-secs");
  if (!cdDays) return;
  let target = localStorage.getItem("precifica_countdown");
  if (!target) {
    target = Date.now() + 14 * 24 * 60 * 60 * 1000;
    localStorage.setItem("precifica_countdown", target);
  }
  function pad(n) {
    return String(n).padStart(2, "0");
  }
  function tick() {
    const diff = Math.max(0, +target - Date.now());
    cdDays.textContent = Math.floor(diff / 86400000);
    cdHours.textContent = pad(Math.floor((diff % 86400000) / 3600000));
    cdMins.textContent = pad(Math.floor((diff % 3600000) / 60000));
    cdSecs.textContent = pad(Math.floor((diff % 60000) / 1000));
  }
  tick();
  setInterval(tick, 1000);
})();

// Modal de Login
function showLoginModal() {
  document.getElementById("login-overlay").classList.add("open");
  document.body.style.overflow = "hidden";
  setTimeout(() => document.getElementById("login-email")?.focus(), 300);
}

function closeLoginModal(event) {
  if (event && event.target !== document.getElementById("login-overlay")) return;
  document.getElementById("login-overlay").classList.remove("open");
  document.body.style.overflow = "";
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const overlay = document.getElementById("login-overlay");
    if (overlay.classList.contains("open")) overlay.classList.remove("open");
    document.body.style.overflow = "";
  }
});

// Configuração Supabase da Landing Page
const LANDING_SUPABASE_URL =
  window.__ENV_SUPABASE_URL ||
  localStorage.getItem("PRECIFICA_SUPABASE_URL") ||
  "https://pxubluofynemndcbhjcv.supabase.co";
const LANDING_SUPABASE_ANON_KEY =
  window.__ENV_SUPABASE_ANON_KEY ||
  localStorage.getItem("PRECIFICA_SUPABASE_ANON_KEY") ||
  "sb_publishable_nZ3OMYEP1YszHcnv2R-DLg_wFlBn_ZI";

let landingSupabaseClient = null;
function getLandingSupabaseClient() {
  if (!landingSupabaseClient && window.supabase) {
    landingSupabaseClient = window.supabase.createClient(
      LANDING_SUPABASE_URL,
      LANDING_SUPABASE_ANON_KEY
    );
  }
  return landingSupabaseClient;
}

async function handleLogin() {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();
  if (!email || !password) {
    alert("Preencha seu e-mail e senha para continuar.");
    return;
  }

  const client = getLandingSupabaseClient();
  if (!client) {
    alert("Cliente Supabase não inicializado.");
    return;
  }

  const submitBtn =
    document.querySelector(".login-modal .btn-continue") ||
    document.querySelector(".login-modal .form-submit");
  const originalText = submitBtn ? submitBtn.innerHTML : "";
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = "Entrando...";
  }

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        alert("E-mail ou senha incorretos.");
      } else if (error.message.includes("API key")) {
        alert(
          'Chave do Supabase inválida. Certifique-se de usar a chave "anon public" do Supabase (que começa com eyJ...).'
        );
      } else {
        alert("Erro ao autenticar: " + (error.message || "Verifique seus dados."));
      }
      return;
    }

    if (data && data.session) {
      window.location.href = "../painel/dashboard.html";
    }
  } catch (err) {
    console.error("Erro no login:", err);
    alert("Erro inesperado ao conectar ao Supabase.");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  }
}

// Botão Voltar ao Topo
function initScrollToTop() {
  const scrollTopBtn = document.getElementById("scrollTopBtn");
  if (!scrollTopBtn) return;

  function checkScroll() {
    const y =
      window.pageYOffset ||
      (document.documentElement ? document.documentElement.scrollTop : 0) ||
      (document.body ? document.body.scrollTop : 0) ||
      0;
    if (y > 250) {
      scrollTopBtn.classList.add("visible");
    } else {
      scrollTopBtn.classList.remove("visible");
    }
  }

  window.addEventListener("scroll", checkScroll, { passive: true });
  checkScroll();

  scrollTopBtn.addEventListener("click", (e) => {
    e.preventDefault();
    scrollToTop();
  });
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: "smooth",
  });
  if (document.documentElement) {
    document.documentElement.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }
}
window.scrollToTop = scrollToTop;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initScrollToTop);
} else {
  initScrollToTop();
}
