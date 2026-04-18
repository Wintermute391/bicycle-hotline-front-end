import { emitSocketRequest } from "./socket.js";

function triggerDownload(json, filename) {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function runBackup() {
  // Server fetches all data, saves to ./backups/ on its filesystem, returns the payload
  const res = await emitSocketRequest("crm:backup:create");
  const { filename, payload } = res.data;

  // Also download to the client's machine
  triggerDownload(JSON.stringify(payload, null, 2), filename);

  return { filename, counts: { customers: payload.customers.length, bikes: payload.bikes.length, jobs: payload.jobs.length } };
}
