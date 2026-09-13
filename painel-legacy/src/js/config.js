/**
 * Precifica+ — Lógica da Página de Configurações
 */

document.addEventListener("DOMContentLoaded", async () => {
  const client = getSupabaseClient();
  await initAuthGuard();

  // Navegação entre abas de configurações
  const tabs = document.querySelectorAll(".settings-tab");
  tabs.forEach((tabBtn) => {
    tabBtn.addEventListener("click", () => {
      document.querySelectorAll(".settings-tab").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".settings-panel").forEach((p) => p.classList.remove("active"));

      tabBtn.classList.add("active");
      const targetPanel = document.getElementById("panel-" + tabBtn.dataset.tab);
      if (targetPanel) {
        targetPanel.classList.add("active");
      }
    });
  });

  // Logout global (em todos os dispositivos)
  const btnLogoutAll = document.getElementById("btnLogoutAll");
  if (btnLogoutAll && client) {
    btnLogoutAll.addEventListener("click", async () => {
      if (confirm("Isso vai encerrar sua sessão em todos os dispositivos. Continuar?")) {
        await client.auth.signOut({ scope: "global" });
        window.location.href = "login.html";
      }
    });
  }
});
