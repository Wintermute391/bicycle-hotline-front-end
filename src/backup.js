import { emitSocketRequest } from "./socket.js";

// Persists across button presses for the session — user only picks the folder once
let dirHandle = null;

async function fetchBackupPayload() {
  const [customersRes, bikesRes, jobsRes] = await Promise.all([
    emitSocketRequest("crm:customer:list"),
    emitSocketRequest("crm:bike:list"),
    emitSocketRequest("crm:job:list", { sort: "queue" }),
  ]);

  return {
    createdAt: new Date().toISOString(),
    customers: customersRes.data.customers,
    bikes: bikesRes.data.bikes,
    jobs: jobsRes.data.jobs,
  };
}

function makeFilename() {
  const ts = new Date().toISOString().replace(/:/g, "-").replace(/\..+/, "");
  return `bicycle-hotline-${ts}.json`;
}

function triggerDownload(json, filename) {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function writeToDirectory(json, filename) {
  // Ask once per session; reuse the handle on subsequent backups
  if (!dirHandle) {
    dirHandle = await window.showDirectoryPicker({ mode: "readwrite", startIn: "documents" });
  }
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(json);
  await writable.close();
}

export async function runBackup() {
  const payload = await fetchBackupPayload();
  const filename = makeFilename();
  const json = JSON.stringify(payload, null, 2);

  // Always trigger the browser download
  triggerDownload(json, filename);

  // Also write directly to a folder if the API is available
  if (window.showDirectoryPicker) {
    try {
      await writeToDirectory(json, filename);
    } catch (err) {
      // User cancelled the picker or permission denied — not a hard failure
      if (err.name !== "AbortError") {
        console.warn("[backup] direct write failed:", err.message);
      }
    }
  }

  return { filename, counts: { customers: payload.customers.length, bikes: payload.bikes.length, jobs: payload.jobs.length } };
}

// Call this to reset the saved folder (e.g. if user wants to change it)
export function resetBackupFolder() {
  dirHandle = null;
}
