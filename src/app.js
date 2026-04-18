import { DATA, getCustomer, setJobs } from "./state.js";
import { emitSocketRequest } from "./socket.js";
import { openCustomerForm, openJobForm, openStatusDialog } from "./dialogs.js";
import { STATUS_LABELS, escapeHtml, formatCurrency, formatDate, jobTotal } from "./utils.js";

const app = () => document.getElementById("app");

// ── Render ────────────────────────────────────────────────────────────────────

export function renderPage() {
  app().innerHTML = `
    <div class="page-shell">
      <header class="top-bar">
        <h1 class="top-bar__title">Bicycle Hotline</h1>
        <div class="top-bar__actions">
          <button type="button" id="open-customer-form" class="btn">+ Customer</button>
          <button type="button" id="open-job-form" class="btn btn--primary">+ Job</button>
        </div>
      </header>

      <nav class="sort-controls">
        ${renderSortButton("queue", "Queue Order")}
        ${renderSortButton("startDate", "Start Date")}
        ${renderSortButton("expectedDate", "Expected Date")}
      </nav>

      <main class="content">
        <section class="jobs-section">
          ${renderJobTable()}
        </section>
        <aside class="customers-section">
          <h2>Customers</h2>
          ${renderCustomerList()}
        </aside>
      </main>

      ${DATA.errorMessage ? `<div class="error-banner">${escapeHtml(DATA.errorMessage)}</div>` : ""}
    </div>
  `;

  bindHandlers();
}

function renderSortButton(mode, label) {
  const active = DATA.sortMode === mode ? "sort-btn--active" : "";
  return `<button type="button" class="sort-btn ${active}" data-sort="${mode}">${label}</button>`;
}

function renderJobTable() {
  const jobs = DATA.jobs;
  if (!jobs.length) return `<div class="empty-state">No jobs yet.</div>`;
  const showArrows = DATA.sortMode === "queue";

  return `
    <table class="job-table">
      <thead>
        <tr>
          ${showArrows ? "<th></th>" : ""}
          <th>Customer</th>
          <th>Description</th>
          <th>Status</th>
          <th>Start</th>
          <th>Expected</th>
          <th>Total</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${jobs.map((job, i) => renderJobRow(job, i, jobs.length, showArrows)).join("")}
      </tbody>
    </table>
  `;
}

function renderJobRow(job, index, total, showArrows) {
  const customer = getCustomer(job.customerId);
  const statusLabel = STATUS_LABELS[job.status] || job.status;
  const arrows = showArrows
    ? `
      <td class="arrow-cell">
        <button type="button" class="arrow-btn job-up" data-job-id="${escapeHtml(job._id)}"
          ${index === 0 ? "disabled" : ""}>▲</button>
        <button type="button" class="arrow-btn job-down" data-job-id="${escapeHtml(job._id)}"
          ${index === total - 1 ? "disabled" : ""}>▼</button>
      </td>`
    : "";

  return `
    <tr class="job-row" data-job-id="${escapeHtml(job._id)}">
      ${arrows}
      <td>${escapeHtml(customer?.name || "—")}</td>
      <td>${escapeHtml(job.description || "")}</td>
      <td>
        <button type="button" class="status-badge status-badge--${escapeHtml(job.status)}" data-job-id="${escapeHtml(job._id)}">
          ${escapeHtml(statusLabel)}
        </button>
      </td>
      <td>${formatDate(job.startDate)}</td>
      <td>${formatDate(job.expectedDate)}</td>
      <td>${formatCurrency(jobTotal(job))}</td>
      <td>
        <button type="button" class="icon-btn job-edit" data-job-id="${escapeHtml(job._id)}">✏️</button>
        <button type="button" class="icon-btn job-delete" data-job-id="${escapeHtml(job._id)}">🗑</button>
      </td>
    </tr>
  `;
}

function renderCustomerList() {
  if (!DATA.customers.length) return `<div class="empty-state">No customers yet.</div>`;
  return `
    <ul class="customer-list">
      ${DATA.customers
        .map(
          (c) => `
        <li class="customer-item" data-customer-id="${escapeHtml(c._id)}">
          <span class="customer-name">${escapeHtml(c.name)}</span>
          <span class="customer-contact">${escapeHtml(c.phone || c.email || "")}</span>
          <div class="customer-actions">
            <button type="button" class="icon-btn customer-edit" data-customer-id="${escapeHtml(c._id)}">✏️</button>
            <button type="button" class="icon-btn customer-delete" data-customer-id="${escapeHtml(c._id)}">🗑</button>
          </div>
        </li>`
        )
        .join("")}
    </ul>
  `;
}

// ── Handlers ──────────────────────────────────────────────────────────────────

function bindHandlers() {
  document.getElementById("open-job-form")?.addEventListener("click", () => {
    openJobForm(null, renderPage);
  });

  document.getElementById("open-customer-form")?.addEventListener("click", () => {
    openCustomerForm(null, renderPage);
  });

  document.querySelectorAll(".sort-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      DATA.sortMode = btn.dataset.sort;
      const res = await emitSocketRequest("crm:job:list", { sort: DATA.sortMode });
      setJobs(res.data.jobs);
      renderPage();
    });
  });

  document.querySelectorAll(".job-up, .job-down").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const jobId = btn.dataset.jobId;
      const direction = btn.classList.contains("job-up") ? "up" : "down";
      try {
        await emitSocketRequest("crm:job:reorder", { jobId, direction });
      } catch (err) {
        console.error("[app] reorder failed", err.message);
      }
    });
  });

  document.querySelectorAll(".status-badge").forEach((btn) => {
    btn.addEventListener("click", () => {
      const job = DATA.jobs.find((j) => j._id === btn.dataset.jobId);
      if (job) openStatusDialog(job, renderPage);
    });
  });

  document.querySelectorAll(".job-edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      const job = DATA.jobs.find((j) => j._id === btn.dataset.jobId);
      if (job) openJobForm(job, renderPage);
    });
  });

  document.querySelectorAll(".job-delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this job?")) return;
      try {
        await emitSocketRequest("crm:job:delete", { jobId: btn.dataset.jobId });
      } catch (err) {
        console.error("[app] delete job failed", err.message);
      }
    });
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
