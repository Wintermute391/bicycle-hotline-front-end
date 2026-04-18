import { DATA, setMode } from "./state.js";
import { escapeHtml } from "./utils.js";
import { emitSocketRequest } from "./socket.js";
import { renderJobsMode } from "./modes/jobs.js";
import { renderCustomersMode } from "./modes/customers.js";
import { renderBikesMode } from "./modes/bikes.js";

const MODES = [
  { key: "JOBS",      icon: "⚙",  label: "Jobs" },
  { key: "CUSTOMERS", icon: "👤", label: "Customers" },
  { key: "BIKES",     icon: "🚲", label: "Bikes" },
];

export function renderPage() {
  const app = document.getElementById("app");

  app.innerHTML = `
    <div class="page-shell">
      <header class="top-bar">
        <h1 class="top-bar__title">Bicycle Hotline</h1>
        <nav class="mode-nav">
          ${MODES.map((m) => `
            <button type="button"
              class="mode-btn ${DATA.MODE === m.key ? "mode-btn--active" : ""}"
              data-mode="${m.key}"
              title="${m.label}"
            >${m.icon}</button>
          `).join("")}
          <button type="button" id="backup-btn" class="mode-btn" title="Backup database">💾</button>
        </nav>
      </header>
      ${DATA.errorMessage ? `<div class="error-banner">${escapeHtml(DATA.errorMessage)}</div>` : ""}
      <main class="content" id="mode-content"></main>
    </div>
  `;

  app.querySelectorAll(".mode-btn[data-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      DATA.errorMessage = "";
      setMode(btn.dataset.mode);
      renderPage();
    });
  });

  app.querySelector("#backup-btn").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = "⏳";
    try {
      const res = await emitSocketRequest("crm:backup:create");
      const { filename, counts } = res.data;
      alert(`Backup saved: ${filename}\n${counts.customers} customers · ${counts.bikes} bikes · ${counts.jobs} jobs`);
    } catch (err) {
      alert(`Backup failed: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = "💾";
    }
  });

  const container = document.getElementById("mode-content");

  if (DATA.MODE === "JOBS") renderJobsMode(container);
  else if (DATA.MODE === "CUSTOMERS") renderCustomersMode(container);
  else if (DATA.MODE === "BIKES") renderBikesMode(container);
}
