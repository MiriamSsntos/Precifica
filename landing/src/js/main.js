/* ─── MENU MOBILE & SCROLL ─── */
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

function smoothScrollToElement(el, duration = 850) {
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
      window.location.href = "../painel/";
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
      window.location.href = "../painel/";
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
