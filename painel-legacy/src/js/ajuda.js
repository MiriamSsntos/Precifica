/**
 * Precifica+ — Lógica da Central de Ajuda
 */

document.addEventListener("DOMContentLoaded", async () => {
  await initAuthGuard();

  // Acordeão de FAQs
  const faqQuestions = document.querySelectorAll(".faq-question");
  faqQuestions.forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq-item");
      if (!item) return;

      const wasOpen = item.classList.contains("open");

      // Fecha outros itens abertos para manter uma experiência limpa
      document.querySelectorAll(".faq-item").forEach((i) => i.classList.remove("open"));

      if (!wasOpen) {
        item.classList.add("open");
      }
    });
  });

  // Busca em tempo real nos FAQs
  const searchInput = document.querySelector(".help-search input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase().trim();
      const items = document.querySelectorAll(".faq-item");

      items.forEach((item) => {
        const text = item.textContent.toLowerCase();
        if (!query || text.includes(query)) {
          item.style.display = "";
          if (query) item.classList.add("open");
        } else {
          item.style.display = "none";
          item.classList.remove("open");
        }
      });
    });
  }
});
