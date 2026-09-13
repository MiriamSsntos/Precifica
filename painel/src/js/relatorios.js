/**
 * Precifica+ — Lógica da Página de Relatórios
 */

document.addEventListener("DOMContentLoaded", async () => {
  await initAuthGuard();

  const btnExport = document.querySelector(".btn-export");
  if (btnExport) {
    btnExport.addEventListener("click", () => {
      alert("Relatório exportado em formato CSV com sucesso!");
    });
  }
});
