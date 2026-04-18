import { DATA, getBike, getCustomer, setJobs } from "../state.js";
import { emitSocketRequest } from "../socket.js";
import { openJobForm, openStatusDialog } from "../dialogs.js";
import { STATUS_LABELS, escapeHtml, formatCurrency, formatDate, jobTotal } from "../utils.js";
import { renderPage } from "../app.js";

export function renderJobsMode(container) {
  container.innerHTML = `
    <nav class="sort-controls">
      ${sortBtn("queue", "Queue Order")}
      ${sortBtn("startDate", "Start Date")}
      ${sortBtn("expectedDate", "Expected Date")}
      <button type="button" id="open-job-form" class="btn btn--primary" style="margin-left:auto">+ Job</button>
    </nav>
    <div class="jobs-wrap">
      ${renderJobTable()}
    </div>
  `;

  document.getElementById("open-job-form").addEventListener("click", () => {
    openJobForm(null, renderPage);
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
      const direction = btn.classList.contains("job-up") ? "up" : "down";
      try {
        await emitSocketRequest("crm:job:reorder", { jobId: btn.dataset.jobId, direction });
      } catch (err) {
        console.error("[jobs] reorder failed", err.message);
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
        console.error("[jobs] delete failed", err.message);
      }
    });
  });
}

function sortBtn(mode, label) {
  const active = DATA.sortMode === mode ? "sort-btn--active" : "";
  return `<button type="button" class="sort-btn ${active}" data-sort="${mode}">${label}</button>`;
}

function renderJobTable() {
  const { jobs } = DATA;
  if (!jobs.length) return `<div class="empty-state">No jobs yet. Create one to get started.</div>`;
  const showArrows = DATA.sortMode === "queue";

  return `
    <table class="job-table">
      <thead>
        <tr>
          ${showArrows ? "<th class=\"arrow-col\"></th>" : ""}
          <th>Customer</th>
          <th>Bike</th>
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
  const bike = job.bikeId ? getBike(job.bikeId) : null;
  const bikeLabel = bike ? escapeHtml(`${bike.make} ${bike.model}`.trim() || "—") : "—";
  const statusLabel = STATUS_LABELS[job.status] || job.status;

  const arrows = showArrows ? `
    <td class="arrow-col">
      <button type="button" class="arrow-btn job-up" data-job-id="${escapeHtml(job._id)}" ${index === 0 ? "disabled" : ""}>▲</button>
      <button type="button" class="arrow-btn job-down" data-job-id="${escapeHtml(job._id)}" ${index === total - 1 ? "disabled" : ""}>▼</button>
    </td>` : "";

  return `
    <tr class="job-row">
      ${arrows}
      <td>${escapeHtml(customer?.name || "—")}</td>
      <td class="bike-label">${bikeLabel}</td>
      <td>${escapeHtml(job.description || "")}</td>
      <td>
        <button type="button" class="status-badge status-badge--${escapeHtml(job.status)}" data-job-id="${escapeHtml(job._id)}">
          ${escapeHtml(statusLabel)}
        </button>
      </td>
      <td>${formatDate(job.startDate)}</td>
      <td>${formatDate(job.expectedDate)}</td>
      <td>${formatCurrency(jobTotal(job))}</td>
      <td class="row-actions">
        <button type="button" class="icon-btn job-edit" data-job-id="${escapeHtml(job._id)}" title="Edit">✏️</button>
        <button type="button" class="icon-btn job-delete" data-job-id="${escapeHtml(job._id)}" title="Delete">🗑</button>
      </td>
    </tr>
  `;
}
