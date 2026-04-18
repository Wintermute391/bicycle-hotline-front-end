import { DATA } from "./state.js";
import { ALL_STATUSES, STATUS_LABELS, escapeHtml } from "./utils.js";
import { emitSocketRequest } from "./socket.js";

const overlay = () => document.getElementById("dialog-overlay");

function closeDialog() {
  DATA.activeDialog = null;
  DATA.dialogPayload = null;
  overlay().innerHTML = "";
  overlay().classList.remove("active");
}

function openDialog(html) {
  overlay().innerHTML = html;
  overlay().classList.add("active");
  overlay().querySelector(".dialog__close")?.addEventListener("click", closeDialog);
  overlay().addEventListener("click", (e) => {
    if (e.target === overlay()) closeDialog();
  });
}

// ── Status Dialog ─────────────────────────────────────────────────────────────

export function openStatusDialog(job, onDone) {
  DATA.activeDialog = "status";
  DATA.dialogPayload = job;

  const statusButtons = ALL_STATUSES.map(
    (s) => `
    <button
      type="button"
      class="status-btn ${s === job.status ? "status-btn--active" : ""}"
      data-status="${escapeHtml(s)}"
    >
      ${escapeHtml(STATUS_LABELS[s])}
    </button>`
  ).join("");

  openDialog(`
    <div class="dialog">
      <div class="dialog__header">
        <span>Update Status</span>
        <button type="button" class="dialog__close">✕</button>
      </div>
      <div class="dialog__body">
        <p class="dialog__job-desc">${escapeHtml(job.description || "")}</p>
        <div class="status-grid">${statusButtons}</div>
      </div>
    </div>
  `);

  overlay().querySelectorAll(".status-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const status = btn.dataset.status;
      if (status === job.status) { closeDialog(); return; }
      try {
        await emitSocketRequest("crm:job:status", { jobId: job._id, status });
      } catch (err) {
        console.error("[dialog] status update failed", err.message);
      }
      closeDialog();
      onDone?.();
    });
  });
}

// ── Job Form Dialog ───────────────────────────────────────────────────────────

export function openJobForm(job = null, onDone) {
  DATA.activeDialog = "job-form";
  DATA.dialogPayload = job;

  const isEdit = Boolean(job);
  const customers = DATA.customers;
  const customerOptions = customers
    .map(
      (c) => `<option value="${escapeHtml(c._id)}" ${job?.customerId === c._id ? "selected" : ""}>
        ${escapeHtml(c.name)}
      </option>`
    )
    .join("");

  const expenses = (job?.expenses || [])
    .map(
      (e, i) => `
    <div class="expense-row" data-index="${i}">
      <input type="text" class="expense-desc" placeholder="Description" value="${escapeHtml(e.description)}" />
      <input type="number" class="expense-price" placeholder="Price" value="${escapeHtml(String(e.price))}" min="0" step="0.01" />
      <button type="button" class="expense-remove">✕</button>
    </div>`
    )
    .join("");

  openDialog(`
    <div class="dialog dialog--wide">
      <div class="dialog__header">
        <span>${isEdit ? "Edit Job" : "New Job"}</span>
        <button type="button" class="dialog__close">✕</button>
      </div>
      <div class="dialog__body">
        <form id="job-form">
          <label>Customer
            <select name="customerId" required>${customerOptions}</select>
          </label>
          <label>Description
            <textarea name="description" rows="2">${escapeHtml(job?.description || "")}</textarea>
          </label>
          <label>Start Date
            <input type="date" name="startDate" value="${escapeHtml(job?.startDate?.slice(0, 10) || "")}" />
          </label>
          <label>Expected Date
            <input type="date" name="expectedDate" value="${escapeHtml(job?.expectedDate?.slice(0, 10) || "")}" />
          </label>
          <div class="expenses-section">
            <div class="expenses-header">
              <span>Expenses</span>
              <button type="button" id="add-expense">+ Add</button>
            </div>
            <div id="expense-list">${expenses}</div>
          </div>
          <div class="dialog__actions">
            <button type="submit" class="btn btn--primary">${isEdit ? "Save" : "Create"}</button>
          </div>
        </form>
      </div>
    </div>
  `);

  overlay().querySelector("#add-expense").addEventListener("click", () => {
    const list = overlay().querySelector("#expense-list");
    const i = list.querySelectorAll(".expense-row").length;
    const row = document.createElement("div");
    row.className = "expense-row";
    row.dataset.index = i;
    row.innerHTML = `
      <input type="text" class="expense-desc" placeholder="Description" />
      <input type="number" class="expense-price" placeholder="Price" value="0" min="0" step="0.01" />
      <button type="button" class="expense-remove">✕</button>
    `;
    list.appendChild(row);
    bindRemoveExpense(row);
  });

  overlay().querySelectorAll(".expense-remove").forEach(bindRemoveExpense);

  function bindRemoveExpense(btn) {
    (btn.classList.contains("expense-remove") ? btn : btn.querySelector(".expense-remove"))
      ?.addEventListener("click", function () {
        this.closest(".expense-row").remove();
      });
  }
  overlay().querySelectorAll(".expense-remove").forEach((btn) => {
    btn.addEventListener("click", function () {
      this.closest(".expense-row").remove();
    });
  });

  overlay().querySelector("#job-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const expenseRows = [...overlay().querySelectorAll(".expense-row")];
    const expenses = expenseRows.map((row) => ({
      id: window.crypto.randomUUID(),
      description: row.querySelector(".expense-desc").value.trim(),
      price: parseFloat(row.querySelector(".expense-price").value) || 0,
    }));

    const payload = {
      customerId: form.customerId.value,
      description: form.description.value.trim(),
      startDate: form.startDate.value || undefined,
      expectedDate: form.expectedDate.value || undefined,
      expenses,
    };

    try {
      if (isEdit) {
        await emitSocketRequest("crm:job:update", { jobId: job._id, ...payload });
      } else {
        await emitSocketRequest("crm:job:create", payload);
      }
    } catch (err) {
      console.error("[dialog] job save failed", err.message);
    }
    closeDialog();
    onDone?.();
  });
}

// ── Customer Form Dialog ──────────────────────────────────────────────────────

export function openCustomerForm(customer = null, onDone) {
  DATA.activeDialog = "customer-form";
  DATA.dialogPayload = customer;

  const isEdit = Boolean(customer);

  openDialog(`
    <div class="dialog">
      <div class="dialog__header">
        <span>${isEdit ? "Edit Customer" : "New Customer"}</span>
        <button type="button" class="dialog__close">✕</button>
      </div>
      <div class="dialog__body">
        <form id="customer-form">
          <label>Name
            <input type="text" name="name" required value="${escapeHtml(customer?.name || "")}" />
          </label>
          <label>Phone
            <input type="tel" name="phone" value="${escapeHtml(customer?.phone || "")}" />
          </label>
          <label>Email
            <input type="email" name="email" value="${escapeHtml(customer?.email || "")}" />
          </label>
          <div class="dialog__actions">
            <button type="submit" class="btn btn--primary">${isEdit ? "Save" : "Create"}</button>
          </div>
        </form>
      </div>
    </div>
  `);

  overlay().querySelector("#customer-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const payload = {
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
    };
    try {
      if (isEdit) {
        await emitSocketRequest("crm:customer:update", { customerId: customer._id, ...payload });
      } else {
        await emitSocketRequest("crm:customer:create", payload);
      }
    } catch (err) {
      console.error("[dialog] customer save failed", err.message);
    }
    closeDialog();
    onDone?.();
  });
}
