/**
 * Precifica+ — Cliente Supabase & Helpers de Autenticação
 */

const SUPABASE_URL =
  window.__ENV_SUPABASE_URL ||
  localStorage.getItem("PRECIFICA_SUPABASE_URL") ||
  "https://pxubluofynemndcbhjcv.supabase.co";

const SUPABASE_ANON_KEY =
  window.__ENV_SUPABASE_ANON_KEY ||
  localStorage.getItem("PRECIFICA_SUPABASE_ANON_KEY") ||
  "sb_publishable_nZ3OMYEP1YszHcnv2R-DLg_wFlBn_ZI";

let supabaseClient = null;

function getSupabaseClient() {
  if (!supabaseClient && window.supabase && !SUPABASE_URL.includes("YOUR_SUPABASE_PROJECT_ID")) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseClient;
}

/**
 * Verifica a sessão atual, atualiza o chip de usuário no cabeçalho e adiciona listener de logout.
 */
async function initAuthGuard(options = {}) {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const {
      data: { session },
      error,
    } = await client.auth.getSession();

    if (!session || error) {
      if (options.requireAuth !== false) {
        window.location.href = "login.html";
      }
      return null;
    }

    if (session && session.user) {
      const userEmail = session.user.email || "";
      const userNameEl = document.querySelector(".user-chip .name");
      const userAvatarEl = document.querySelector(".user-chip .user-avatar");
      const pageHeadingEl = document.querySelector(".page-heading h1");
      const emailPerfilInput = document.getElementById("emailPerfil");

      if (userEmail) {
        const displayName =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          userEmail.split("@")[0];

        if (userNameEl) userNameEl.textContent = displayName;
        if (pageHeadingEl && options.updateGreeting) {
          pageHeadingEl.textContent = `Olá, ${displayName} 👋`;
        }
        if (userAvatarEl) {
          userAvatarEl.textContent = displayName.slice(0, 2).toUpperCase();
        }
        if (emailPerfilInput) {
          emailPerfilInput.value = userEmail;
        }
      }
    }

    // Configura o evento de clique para logout no user-chip
    const userChip = document.querySelector(".user-chip");
    if (userChip && !userChip.dataset.hasLogoutListener) {
      userChip.dataset.hasLogoutListener = "true";
      userChip.style.cursor = "pointer";
      userChip.title = "Clique para sair";
      userChip.addEventListener("click", async () => {
        if (confirm("Deseja sair da sua conta?")) {
          await client.auth.signOut();
          window.location.href = "login.html";
        }
      });
    }

    return session;
  } catch (err) {
    console.warn("Verificação de sessão:", err);
    return null;
  }
}
