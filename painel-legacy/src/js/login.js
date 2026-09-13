/**
 * Precifica+ — Lógica da Tela de Autenticação (Login, Cadastro & Recuperação)
 */

let currentMode = "login";

function toggleAuthMode(mode) {
  currentMode = mode;
  hideAlert();
  const title = document.getElementById("formTitle");
  const subtitle = document.getElementById("formSubtitle");
  const nameField = document.getElementById("nameField");
  const companyField = document.getElementById("companyField");
  const rememberRow = document.getElementById("rememberRow");
  const btnText = document.getElementById("btnSubmitText");
  const footer = document.getElementById("formFooter");

  if (mode === "signup") {
    title.textContent = "Criar conta";
    subtitle.textContent = "Comece seu teste de 14 dias grátis no Precifica+.";
    nameField.style.display = "block";
    companyField.style.display = "block";
    rememberRow.style.display = "none";
    btnText.textContent = "Criar minha conta";
    footer.innerHTML =
      'Já tem uma conta? <a href="#" onclick="toggleAuthMode(\'login\'); return false;">Entrar</a>';
  } else {
    title.textContent = "Entrar";
    subtitle.textContent = "Acesse sua conta para gerenciar margens e estoque com IA.";
    nameField.style.display = "none";
    companyField.style.display = "none";
    rememberRow.style.display = "flex";
    btnText.textContent = "Continuar";
    footer.innerHTML =
      'Ainda não tem conta? <a href="#" onclick="toggleAuthMode(\'signup\'); return false;">Criar conta grátis</a>';
  }
}

function showAlert(message, type = "error") {
  const alertEl = document.getElementById("authAlert");
  if (!alertEl) return;
  alertEl.textContent = message;
  alertEl.className = "auth-alert " + type;
}

function hideAlert() {
  const alertEl = document.getElementById("authAlert");
  if (alertEl) {
    alertEl.className = "auth-alert";
    alertEl.textContent = "";
  }
}

function setLoading(isLoading) {
  const btn = document.getElementById("btnLogin");
  if (!btn) return;
  btn.disabled = isLoading;
  if (isLoading) {
    btn.classList.add("loading");
  } else {
    btn.classList.remove("loading");
  }
}

// Verifica se o usuário já possui sessão ativa ao abrir a página
document.addEventListener("DOMContentLoaded", async () => {
  const client = getSupabaseClient();
  if (!client || SUPABASE_URL.includes("YOUR_SUPABASE_PROJECT_ID")) {
    return;
  }

  try {
    const {
      data: { session },
      error,
    } = await client.auth.getSession();
    if (session && !error) {
      window.location.href = "dashboard.html";
    }
  } catch (err) {
    console.warn("Erro ao verificar sessão:", err);
  }
});

// Submit unificado: Login ou Cadastro
async function handleAuthSubmit(event) {
  if (event) event.preventDefault();
  hideAlert();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("senha").value;
  const nome = document.getElementById("nome").value.trim();
  const empresa = document.getElementById("empresa").value.trim();

  if (!email || !password) {
    showAlert("Preencha seu e-mail e senha.");
    return;
  }

  const client = getSupabaseClient();
  if (!client) {
    showAlert("Não foi possível inicializar o Supabase.");
    return;
  }

  setLoading(true);

  try {
    if (currentMode === "signup") {
      // CADASTRO DE NOVO USUÁRIO
      const { data, error } = await client.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: nome || email.split("@")[0],
            company: empresa || "Meu Supermercado",
          },
        },
      });

      if (error) {
        showAlert(error.message || "Erro ao criar conta. Verifique os dados informados.");
        setLoading(false);
        return;
      }

      if (data.session) {
        showAlert("Conta criada com sucesso! Redirecionando...", "success");
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 800);
      } else if (data.user) {
        showAlert(
          "Conta criada com sucesso! Se a confirmação de e-mail estiver ativa no Supabase, verifique sua caixa de entrada.",
          "success"
        );
        setLoading(false);
      }
    } else {
      // LOGIN DE USUÁRIO EXISTENTE
      const { data, error } = await client.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          showAlert(
            'E-mail ou senha incorretos. Ainda não tem conta? Clique em "Criar conta grátis" abaixo.'
          );
        } else if (error.message.includes("Email not confirmed")) {
          showAlert("Por favor, confirme seu e-mail antes de entrar.");
        } else {
          showAlert(error.message || "Erro ao autenticar.");
        }
        setLoading(false);
        return;
      }

      if (data && data.session) {
        showAlert("Login realizado com sucesso! Redirecionando...", "success");
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 500);
      }
    }
  } catch (err) {
    console.error("Erro de autenticação:", err);
    showAlert("Ocorreu um erro inesperado ao conectar ao Supabase.");
    setLoading(false);
  }
}

// Login Social (Google / Microsoft Azure)
async function handleOAuth(provider) {
  hideAlert();
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const redirectTo = new URL("dashboard.html", window.location.href).href;
    const { error } = await client.auth.signInWithOAuth({
      provider: provider,
      options: { redirectTo: redirectTo },
    });
    if (error) showAlert(error.message || "Erro ao iniciar login social.");
  } catch {
    showAlert("Erro ao conectar com provedor.");
  }
}

// Recuperação de Senha
async function handleForgotPassword(event) {
  if (event) event.preventDefault();
  hideAlert();

  const email = document.getElementById("email").value.trim();
  if (!email) {
    showAlert('Digite seu e-mail no campo acima e clique em "Esqueci minha senha" novamente.');
    document.getElementById("email").focus();
    return;
  }

  const client = getSupabaseClient();
  if (!client) return;

  setLoading(true);
  try {
    const redirectTo = new URL("login.html", window.location.href).href;
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: redirectTo });

    if (error) {
      showAlert(error.message || "Não foi possível solicitar a recuperação.");
    } else {
      showAlert("E-mail de recuperação enviado! Verifique sua caixa de entrada.", "success");
    }
  } catch {
    showAlert("Erro ao enviar solicitação de recuperação.");
  } finally {
    setLoading(false);
  }
}
