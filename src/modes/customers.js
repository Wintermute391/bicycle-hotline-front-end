import { DATA } from "../state.js";
import { emitSocketRequest } from "../socket.js";
import { openCustomerForm } from "../dialogs.js";
import { escapeHtml } from "../utils.js";
import { renderPage } from "../app.js";

export function renderCustomersMode(container) {
  container.innerHTML = `
    <div class="mode-toolbar">
      <h2 class="mode-title">Customers</h2>
      <button type="button" id="open-customer-form" class="btn btn--primary">+ Customer</button>
    </div>
    <div class="customer-grid">
      ${renderCustomerCards()}
    </div>
  `;

  document.getElementById("open-customer-form").addEventListener("click", () => {
    openCustomerForm(null, renderPage);
  });

  document.querySelectorAll(".customer-edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      const customer = DATA.customers.find((c) => c._id === btn.dataset.customerId);
      if (customer) openCustomerForm(customer, renderPage);
    });
  });

  document.querySelectorAll(".customer-delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this customer?")) return;
      try {
        await emitSocketRequest("crm:customer:delete", { customerId: btn.dataset.customerId });
      } catch (err) {
        DATA.errorMessage = err.message;
        renderPage();
      }
    });
  });
}

function renderCustomerCards() {
  if (!DATA.customers.length) {
    return `<div class="empty-state">No customers yet.</div>`;
  }

  return DATA.customers.map((c) => {
    const jobCount = DATA.jobs.filter((j) => j.customerId === c._id).length;
    const bikeCount = DATA.bikes.filter((b) => b.customerId === c._id).length;

    return `
      <div class="customer-card">
        <div class="customer-card__header">
          <span class="customer-card__name">${escapeHtml(c.name)}</span>
          <div class="customer-card__actions">
            <button type="button" class="icon-btn customer-edit" data-customer-id="${escapeHtml(c._id)}" title="Edit">✏️</button>
            <button type="button" class="icon-btn customer-delete" data-customer-id="${escapeHtml(c._id)}" title="Delete">🗑</button>
          </div>
        </div>
        ${c.phone ? `<div class="customer-card__detail">📞 ${escapeHtml(c.phone)}</div>` : ""}
        ${c.email ? `<div class="customer-card__detail">✉️ ${escapeHtml(c.email)}</div>` : ""}
        <div class="customer-card__counts">
          <span>${jobCount} job${jobCount !== 1 ? "s" : ""}</span>
          <span>${bikeCount} bike${bikeCount !== 1 ? "s" : ""}</span>
        </div>
      </div>
    `;
  }).join("");
}
