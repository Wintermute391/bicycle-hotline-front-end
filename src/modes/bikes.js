import { DATA, getCustomer } from "../state.js";
import { emitSocketRequest } from "../socket.js";
import { openBikeForm } from "../dialogs.js";
import { escapeHtml } from "../utils.js";
import { renderPage } from "../app.js";

export function renderBikesMode(container) {
  container.innerHTML = `
    <div class="mode-toolbar">
      <h2 class="mode-title">Bikes</h2>
      <button type="button" id="open-bike-form" class="btn btn--primary">+ Bike</button>
    </div>
    <div class="bike-grid">
      ${renderBikeCards()}
    </div>
  `;

  document.getElementById("open-bike-form").addEventListener("click", () => {
    openBikeForm(null, renderPage);
  });

  document.querySelectorAll(".bike-edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      const bike = DATA.bikes.find((b) => b._id === btn.dataset.bikeId);
      if (bike) openBikeForm(bike, renderPage);
    });
  });

  document.querySelectorAll(".bike-delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this bike?")) return;
      try {
        await emitSocketRequest("crm:bike:delete", { bikeId: btn.dataset.bikeId });
      } catch (err) {
        DATA.errorMessage = err.message;
        renderPage();
      }
    });
  });
}

function renderBikeCards() {
  if (!DATA.bikes.length) {
    return `<div class="empty-state">No bikes yet.</div>`;
  }

  return DATA.bikes.map((b) => {
    const customer = b.customerId ? getCustomer(b.customerId) : null;
    const title = [b.make, b.model].filter(Boolean).join(" ") || "Unnamed Bike";

    return `
      <div class="bike-card">
        <div class="bike-card__header">
          <span class="bike-card__title">${escapeHtml(title)}</span>
          <div class="bike-card__actions">
            <button type="button" class="icon-btn bike-edit" data-bike-id="${escapeHtml(b._id)}" title="Edit">✏️</button>
            <button type="button" class="icon-btn bike-delete" data-bike-id="${escapeHtml(b._id)}" title="Delete">🗑</button>
          </div>
        </div>
        ${b.color ? `<div class="bike-card__detail bike-color"><span class="color-dot" style="background:${escapeHtml(b.color)}"></span>${escapeHtml(b.color)}</div>` : ""}
        ${customer ? `<div class="bike-card__detail">👤 ${escapeHtml(customer.name)}</div>` : ""}
        ${b.description ? `<div class="bike-card__desc">${escapeHtml(b.description)}</div>` : ""}
      </div>
    `;
  }).join("");
}
