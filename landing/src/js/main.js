/* ══════════════════════════════════════════════
   SISTEMA DE CENAS POR SEÇÃO
══════════════════════════════════════════════ */
      const SCENES = {
        hero: { c1: "5,150,105", c2: "16,185,129", g1: "#047857", g2: "#065F46", g3: "#10B981", scan: "rgba(5,150,105,0.7)", speed: 1.0 },
        features: { c1: "16,185,129", c2: "5,150,105", g1: "#059669", g2: "#047857", g3: "#34D399", scan: "rgba(16,185,129,0.7)", speed: 1.3 },
        howto: { c1: "5,150,105", c2: "16,185,129", g1: "#047857", g2: "#065F46", g3: "#10B981", scan: "rgba(16,185,129,0.7)", speed: 0.9 },
        testi: { c1: "245,158,11", c2: "5,150,105", g1: "#B45309", g2: "#047857", g3: "#F59E0B", scan: "rgba(245,158,11,0.7)", speed: 1.1 },
        pricing: { c1: "5,150,105", c2: "16,185,129", g1: "#065F46", g2: "#047857", g3: "#34D399", scan: "rgba(5,150,105,0.8)", speed: 1.4 },
        signup: { c1: "16,185,129", c2: "5,150,105", g1: "#065F46", g2: "#047857", g3: "#34D399", scan: "rgba(16,185,129,0.8)", speed: 0.8 },
      };

      let currentScene = "hero";
      window.__scenes = SCENES; // Expoe pro canvas

      /* ── Elementos das camadas ── */
      const ambientEl = document.getElementById("ambient-layer");
      const pg1 = document.getElementById("pg1");
      const pg2 = document.getElementById("pg2");
      const pg3 = document.getElementById("pg3");
      const scanEl = document.getElementById("scan-line");

      /* ══════════════════════════════════════════════
   MOTOR DE AMBIENTE VIVO E PARALLAX (LERP)
══════════════════════════════════════════════ */
      let scrollY = window.scrollY;
      let targetScroll = window.scrollY;
      let scrollVelocity = 0;
      let time = 0;

      window.addEventListener("scroll", () => {
        targetScroll = window.scrollY;
      });

      function renderLoop() {
        time += 0.01;
        const diff = targetScroll - scrollY;
        scrollY += diff * 0.1; // LERP
        scrollVelocity = Math.abs(diff);

        const baseSpeed = SCENES[currentScene] ? SCENES[currentScene].speed : 1.0;
        window.__dynamicSpeed = baseSpeed + scrollVelocity * 0.03; // Inércia repassada pro canvas

        // Flutuação orgânica das luzes no fundo
        if (pg1 && pg2 && pg3) {
          const float1Y = Math.sin(time) * 30;
          const float1X = Math.cos(time * 0.8) * 20;
          const float2Y = Math.sin(time * 1.2 + Math.PI) * 40;
          const float2X = Math.cos(time * 0.9) * 30;
          const float3Y = Math.sin(time * 0.7) * 50;

          pg1.style.transform = `translate(${float1X}px, ${float1Y - scrollY * 0.03}px) scale(${1 + Math.sin(time) * 0.05})`;
          pg2.style.transform = `translate(${float2X}px, ${float2Y + scrollY * 0.04}px) scale(${1 + Math.cos(time) * 0.05})`;
          pg3.style.transform = `translate(0px, ${float3Y - scrollY * 0.02}px)`;
        }
        requestAnimationFrame(renderLoop);
      }
      renderLoop();

      /* ─── APLICAÇÃO DE CENAS E FLASH DE SEÇÃO ─── */
      function applyScene(name, targetElement) {
        if (name === currentScene) return;
        currentScene = name;
        const s = SCENES[name];

        document.documentElement.style.setProperty("--amb-c1", s.c1);
        document.documentElement.style.setProperty("--amb-c2", s.c2);

        pg1.style.backgroundColor = s.g1;
        pg2.style.backgroundColor = s.g2;
        pg3.style.backgroundColor = s.g3;

        scanEl.style.setProperty("--scan-color", s.scan);
        if (window.__setCanvasColors) window.__setCanvasColors(s.c1, s.c2, s.speed);
        fireScan();

        // Flash interativo na seção ao entrar
        if (targetElement) {
          targetElement.classList.remove("section-flash");
          void targetElement.offsetWidth; // Reflow
          targetElement.classList.add("section-flash");
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
        { threshold: 0.45 },
      ); // Só transiciona com boa visibilidade

      document.querySelectorAll("[data-scene]").forEach((s) => sectionObserver.observe(s));

      /* ══════════════════════════════════════════════
   SCAN LINE 
══════════════════════════════════════════════ */
      let scanAnim = null;
      function fireScan() {
        if (scanAnim) {
          scanAnim.cancel();
        }
        const vh = window.innerHeight;
        scanEl.style.top = "-2px";
        scanEl.style.opacity = "1";
        scanAnim = scanEl.animate(
          [
            { top: "-2px", opacity: 0, offset: 0 },
            { top: "2px", opacity: 0.9, offset: 0.02 },
            { top: vh * 0.5 + "px", opacity: 0.6, offset: 0.5 },
            { top: vh + "px", opacity: 0, offset: 1 },
          ],
          { duration: 1600, easing: "ease-in", fill: "forwards" },
        );
        scanAnim.onfinish = () => {
          scanEl.style.opacity = "0";
        };
      }
      setInterval(fireScan, 8000);

      /* ══════════════════════════════════════════════
   CANVAS GRID ANIMADO
══════════════════════════════════════════════ */
      (function () {
        const canvas = document.getElementById("cyber-canvas");
        const ctx = canvas.getContext("2d");
        const CELL = 48;

        let speedMult = 1.0;
        let colorA = [200, 226, 168];
        let colorB = [4, 52, 44];
        let targetA = [200, 226, 168];
        let targetB = [4, 52, 44];

        let frameSkip = 0;
        let perfTier = "high";
        let isMobile = window.innerWidth < 768;
        if (isMobile) {
          perfTier = "low";
        }

        function lerpColor(from, to, t) {
          return from.map((v, i) => Math.round(v + (to[i] - v) * t));
        }

        window.__setCanvasColors = (c1str, c2str, spd) => {
          targetA = c1str.split(",").map(Number);
          targetB = c2str.split(",").map(Number);
          speedMult = spd;
        };

        const PARTICLE_COUNT = isMobile ? 8 : 22;
        const particles = [];

        function resize() {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          isMobile = window.innerWidth < 768;
        }
        resize();
        window.addEventListener("resize", resize);

        function randomParticle(forceNew) {
          const horiz = Math.random() < 0.5;
          const useA = Math.random() < 0.6;
          if (horiz) {
            return {
              horiz: true,
              x: forceNew ? -100 : Math.random() * canvas.width,
              y: Math.floor(Math.random() * Math.ceil(canvas.height / CELL)) * CELL,
              len: 50 + Math.random() * 90,
              speed: 0.7 + Math.random() * 0.9,
              alpha: 0.09 + Math.random() * 0.14,
              useA,
            };
          } else {
            return {
              horiz: false,
              x: Math.floor(Math.random() * Math.ceil(canvas.width / CELL)) * CELL,
              y: forceNew ? -100 : Math.random() * canvas.height,
              len: 50 + Math.random() * 90,
              speed: 0.7 + Math.random() * 0.9,
              alpha: 0.09 + Math.random() * 0.14,
              useA,
            };
          }
        }

        for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(randomParticle(false));

        function drawGrid() {
          frameSkip++;
          if (perfTier === "low" && frameSkip % 2 === 0) {
            requestAnimationFrame(drawGrid);
            return;
          }
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          colorA = lerpColor(colorA, targetA, 0.025);
          colorB = lerpColor(colorB, targetB, 0.025);

          const ca = colorA.join(",");
          const cb = colorB.join(",");

          ctx.beginPath();
          ctx.strokeStyle = `rgba(${ca},0.022)`;
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

          const visW = Math.ceil(canvas.width / CELL);
          const visH = Math.ceil(canvas.height / CELL);
          if (perfTier !== "low") {
            for (let xi = 0; xi <= visW; xi++) {
              for (let yi = 0; yi <= visH; yi++) {
                const hash = (xi * 1000 + yi * 73 + Math.floor(Date.now() / 2000)) % 100;
                if (hash < 3) {
                  ctx.beginPath();
                  ctx.arc(xi * CELL, yi * CELL, 1.5, 0, Math.PI * 2);
                  ctx.fillStyle = `rgba(${ca},0.35)`;
                  ctx.fill();
                }
              }
            }
          }

          particles.forEach((p, i) => {
            const col = p.useA ? ca : cb;
            const currentGlobalSpeed = window.__dynamicSpeed || speedMult;
            const spd = p.speed * currentGlobalSpeed;

            if (p.horiz) {
              const grad = ctx.createLinearGradient(p.x, p.y, p.x + p.len, p.y);
              grad.addColorStop(0, `rgba(${col},0)`);
              grad.addColorStop(0.35, `rgba(${col},${p.alpha})`);
              grad.addColorStop(0.65, `rgba(${col},${p.alpha})`);
              grad.addColorStop(1, `rgba(${col},0)`);
              ctx.beginPath();
              ctx.strokeStyle = grad;
              ctx.lineWidth = 1.5;
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p.x + p.len, p.y);
              ctx.stroke();
              ctx.beginPath();
              ctx.arc(p.x + p.len * 0.75, p.y, 2, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(${col},${p.alpha * 2})`;
              ctx.fill();
              p.x += spd;
              if (p.x > canvas.width + 20) particles[i] = randomParticle(true);
            } else {
              const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.len);
              grad.addColorStop(0, `rgba(${col},0)`);
              grad.addColorStop(0.35, `rgba(${col},${p.alpha})`);
              grad.addColorStop(0.65, `rgba(${col},${p.alpha})`);
              grad.addColorStop(1, `rgba(${col},0)`);
              ctx.beginPath();
              ctx.strokeStyle = grad;
              ctx.lineWidth = 1.5;
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p.x, p.y + p.len);
              ctx.stroke();
              ctx.beginPath();
              ctx.arc(p.x, p.y + p.len * 0.75, 2, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(${col},${p.alpha * 2})`;
              ctx.fill();
              p.y += spd;
              if (p.y > canvas.height + 20) particles[i] = randomParticle(true);
            }
          });

          requestAnimationFrame(drawGrid);
        }

        drawGrid();
      })();

      // Init Manual p/ forçar a primeira cor corretamente no carregamento
      if (window.__setCanvasColors) {
        window.__setCanvasColors(window.__scenes.hero.c1, window.__scenes.hero.c2, window.__scenes.hero.speed);
        document.documentElement.style.setProperty("--amb-c1", window.__scenes.hero.c1);
        document.documentElement.style.setProperty("--amb-c2", window.__scenes.hero.c2);
        pg1.style.backgroundColor = window.__scenes.hero.g1;
        pg2.style.backgroundColor = window.__scenes.hero.g2;
        pg3.style.backgroundColor = window.__scenes.hero.g3;
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

      function scrollTo(id) {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }

      function selectPlan(planId, btn) {
        document.querySelectorAll('.plan-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const select = document.getElementById('plano');
        if (planId === 'essencial') {
          select.selectedIndex = 1;
        } else if (planId === 'scale') {
          select.selectedIndex = 2;
        } else if (planId === 'enterprise') {
          select.selectedIndex = 3;
        }
        scrollTo('cadastro');
      }
      document.querySelectorAll('a[href^="#"]').forEach((a) => {
        a.addEventListener("click", (e) => {
          const id = a.getAttribute("href").slice(1);
          const target = document.getElementById(id);
          if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: "smooth" });
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

      function submitForm() {
        const nome = document.getElementById("nome").value.trim();
        const email = document.getElementById("email").value.trim();
        const mercado = document.getElementById("mercado").value.trim();
        const telefone = document.getElementById("telefone").value.trim();
        const produtos = document.getElementById("produtos").value;
        const plano = document.getElementById("plano").value;
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
        errNome.style.display = errEmail.style.display = errMercado.style.display = "";
        if (errTelefone) errTelefone.style.display = "";
        if (errProdutos) errProdutos.style.display = "";
        if (errPlano) errPlano.style.display = "";
        if (errLgpd) errLgpd.style.display = "";
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
        const lgpdChecked = document.getElementById("lgpd-consent").checked;
        if (!lgpdChecked) {
          if (errLgpd) errLgpd.style.display = "block";
          valid = false;
        }
        if (!valid) return;
        const btn = document.getElementById("form-submit-btn");
        btn.classList.add("loading");
        btn.disabled = true;
        const data = {
          nome, email, mercado,
          telefone: document.getElementById("telefone").value.trim(),
          cidade: document.getElementById("cidade").value.trim(),
          produtos: document.getElementById("produtos").value,
          plano: document.getElementById("plano").value,
          lgpd_consent: true,
        };
        fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_key: "SUA_CHAVE_AQUI",
            ...data,
          }),
        }).catch(() => {}).finally(() => {
          document.getElementById("form-area").style.display = "none";
          document.getElementById("success-msg").style.display = "block";
          if (typeof lucide !== "undefined" && lucide.createIcons) lucide.createIcons();
        });
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
        { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
      );

      document.querySelectorAll(".reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-fade").forEach((el) => {
        revealObserver.observe(el);
      });

      document.addEventListener("mousemove", (e) => {
        document.querySelectorAll(".feat-card, .plan, .testi-card").forEach((card) => {
          const rect = card.getBoundingClientRect();
          card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
          card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
        });
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
  function pad(n) { return String(n).padStart(2, "0"); }
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
  document.getElementById('login-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('login-email')?.focus(), 300);
}

function closeLoginModal(event) {
  if (event && event.target !== document.getElementById('login-overlay')) return;
  document.getElementById('login-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const overlay = document.getElementById('login-overlay');
    if (overlay.classList.contains('open')) overlay.classList.remove('open');
    document.body.style.overflow = '';
  }
});

function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();
  if (!email || !password) {
    alert('Preencha seu e-mail e senha para continuar.');
    return;
  }
  alert('Área do cliente em desenvolvimento. Em breve você poderá acessar o sistema completo do Precifica+ direto daqui!');
}

// Inicializa os ícones do Lucide
lucide.createIcons();
