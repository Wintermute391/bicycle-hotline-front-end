export function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatCurrency(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

export function jobTotal(job) {
  return (job.expenses || []).reduce((sum, e) => sum + Number(e.price || 0), 0);
}

export const STATUS_LABELS = {
  in_queue: "In Queue",
  waiting_for_parts: "Waiting for Parts",
  in_progress: "In Progress",
  completed: "Completed",
  picked_up: "Picked Up",
};

export const ALL_STATUSES = Object.keys(STATUS_LABELS);
