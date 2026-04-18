import { DATA } from "./state.js";
import { ALL_STATUSES, STATUS_LABELS, escapeHtml } from "./utils.js";
import { emitSocketRequest } from "./socket.js";

const overlay = () => document.getElementById("dialog-overlay");

function closeDialog() {
  DATA.activeDialog = null;
  overlay().innerHTML = "";
  overlay().classList.remove("active");
}

function openDialog(html) {
  overlay().innerHTML = html;
  overlay().classList.add("active");
  overlay().querySelector(".dialog__close")?.addEventListener("click", closeDialog);
  overlay().addEventListener("click", (e) => { if (e.target === overlay()) closeDialog(); });
}

// ── Status Dialog ─────────────────────────────────────────────────────────────

export function openStatusDialog(job, onDone) {
  const statusButtons = ALL_STATUSES.map((s) => `
    <button type="button" class="status-btn ${s === job.status ? "status-btn--active" : ""}" data-status="${escapeHtml(s)}">
      ${escapeHtml(STATUS_LABELS[s])}
    </button>`).join("");

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
      if (status !== job.status) {
        try {
          await emitSocketRequest("crm:job:status", { jobId: job._id, status });
        } catch (err) {
          console.error("[dialog] status update failed", err.message);
        }
      }
      closeDialog();
      onDone?.();
    });
  });
}

// ── Job Form Dialog ───────────────────────────────────────────────────────────

export function openJobForm(job = null, onDone) {
  const isEdit = Boolean(job);

  const customerOptions = DATA.customers.map((c) =>
    `<option value="${escapeHtml(c._id)}" ${job?.customerId === c._id ? "selected" : ""}>${escapeHtml(c.name)}</option>`
  ).join("");

  const bikeOptions = `<option value="">— No bike —</option>` +
    DATA.bikes.map((b) => {
      const owner = b.customerId ? DATA.customers.find((c) => c._id === b.customerId) : null;
      const label = [b.make, b.model].filter(Boolean).join(" ") + (owner ? ` (${owner.name})` : "");
      return `<option value="${escapeHtml(b._id)}" ${job?.bikeId === b._id ? "selected" : ""}>${escapeHtml(label)}</option>`;
    }).join("");

  const expenses = (job?.expenses || []).map((e, i) => expenseRow(e, i)).join("");

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
          <label>Bike
            <select name="bikeId">${bikeOptions}</select>
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
              <button type="button" id="add-expense" class="btn">+ Add</button>
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
    const div = document.createElement("div");
    div.innerHTML = expenseRow({ id: "", description: "", price: 0 }, list.children.length);
    list.appendChild(div.firstElementChild);
    bindExpenseRemove(list.lastElementChild);
  });

  overlay().querySelectorAll(".expense-remove").forEach(bindExpenseRemove);

  overlay().querySelector("#job-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const expenses = [...overlay().querySelectorAll(".expense-row")].map((row) => ({
      id: row.dataset.expenseId || window.crypto.randomUUID(),
      description: row.querySelector(".expense-desc").value.trim(),
      price: parseFloat(row.querySelector(".expense-price").value) || 0,
    }));

    const payload = {
      customerId: form.customerId.value,
      bikeId: form.bikeId.value || null,
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

function expenseRow(e, i) {
  return `
    <div class="expense-row" data-expense-id="${escapeHtml(e.id || "")}">
      <input type="text" class="expense-desc" placeholder="Description" value="${escapeHtml(e.description || "")}" />
      <input type="number" class="expense-price" placeholder="Price" value="${escapeHtml(String(e.price ?? 0))}" min="0" step="0.01" />
      <button type="button" class="expense-remove">✕</button>
    </div>`;
}

function bindExpenseRemove(row) {
  row.querySelector(".expense-remove")?.addEventListener("click", () => row.remove());
}

// ── Bike Form Dialog ──────────────────────────────────────────────────────────

export function openBikeForm(bike = null, onDone) {
  const isEdit = Boolean(bike);

  const customerOptions = `<option value="">— No customer —</option>` +
    DATA.customers.map((c) =>
      `<option value="${escapeHtml(c._id)}" ${bike?.customerId === c._id ? "selected" : ""}>${escapeHtml(c.name)}</option>`
    ).join("");

  openDialog(`
    <div class="dialog">
      <div class="dialog__header">
        <span>${isEdit ? "Edit Bike" : "New Bike"}</span>
        <button type="button" class="dialog__close">✕</button>
      </div>
      <div class="dialog__body">
        <form id="bike-form">
          <label>Customer
            <select name="customerId">${customerOptions}</select>
          </label>
          <label>Make
            <input type="text" name="make" value="${escapeHtml(bike?.make || "")}" placeholder="Trek, Specialized…" />
          </label>
          <label>Model
            <input type="text" name="model" value="${escapeHtml(bike?.model || "")}" placeholder="FX3, Allez…" />
          </label>
          <label>Color
            <input type="text" name="color" value="${escapeHtml(bike?.color || "")}" placeholder="Matte black…" />
          </label>
          <label>Notes
            <textarea name="description" rows="3" placeholder="Any identifying details…">${escapeHtml(bike?.description || "")}</textarea>
          </label>
          <div class="dialog__actions">
            <button type="submit" class="btn btn--primary">${isEdit ? "Save" : "Create"}</button>
          </div>
        </form>
      </div>
    </div>
  `);

  overlay().querySelector("#bike-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const payload = {
      customerId: form.customerId.value || null,
      make: form.make.value.trim(),
      model: form.model.value.trim(),
      color: form.color.value.trim(),
      description: form.description.value.trim(),
    };
    try {
      if (isEdit) {
        await emitSocketRequest("crm:bike:update", { bikeId: bike._id, ...payload });
      } else {
        await emitSocketRequest("crm:bike:create", payload);
      }
    } catch (err) {
      console.error("[dialog] bike save failed", err.message);
    }
    closeDialog();
    onDone?.();
  });
}

// ── Customer Form Dialog ──────────────────────────────────────────────────────

export function openCustomerForm(customer = null, onDone) {
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
