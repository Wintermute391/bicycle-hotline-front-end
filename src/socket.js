import { io } from "socket.io-client";
import {
  removeCustomer, removeBike, removeJob,
  setJobs, upsertCustomer, upsertBike, upsertJob,
} from "./state.js";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  "https://bicycle-hotline-back-end-production.up.railway.app";

export const socket = io(SOCKET_URL, {
  path: "/socket.io/",
  transports: ["polling", "websocket"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  timeout: 10000,
});

socket.on("connect", () => console.log("[socket] connected", { id: socket.id }));
socket.on("disconnect", (reason) => console.warn("[socket] disconnected", { reason }));
socket.on("connect_error", (err) => console.error("[socket] connect_error", err.message));

function createCorrelationId() {
  return window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function emitSocketRequest(eventName, payload = {}, { timeoutMs = 8000 } = {}) {
  const correlationId = createCorrelationId();
  const responseEvent = `${eventName}:response`;

  return new Promise((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      socket.off(responseEvent, onResponse);
      socket.off("disconnect", onDisconnect);
    };

    const fail = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      reject(err);
    };

    function onResponse(res) {
      if (!res || res.correlationId !== correlationId) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      if (res.ok) resolve(res);
      else reject(new Error(res.error || "Request failed"));
    }

    function onDisconnect(reason) {
      fail(new Error(`Socket disconnected before ${responseEvent}: ${reason}`));
    }

    const timer = setTimeout(
      () => fail(new Error(`Timed out waiting for ${responseEvent}`)),
      timeoutMs
    );

    socket.on(responseEvent, onResponse);
    socket.on("disconnect", onDisconnect);
    socket.emit(eventName, { ...payload, correlationId });
  });
}

export function bindBroadcasts(onUpdate) {
  socket.on("crm:customerChanged", ({ customer }) => { upsertCustomer(customer); onUpdate(); });
  socket.on("crm:customerRemoved", ({ customerId }) => { removeCustomer(customerId); onUpdate(); });
  socket.on("crm:bikeChanged", ({ bike }) => { upsertBike(bike); onUpdate(); });
  socket.on("crm:bikeRemoved", ({ bikeId }) => { removeBike(bikeId); onUpdate(); });
  socket.on("crm:jobChanged", ({ job }) => { upsertJob(job); onUpdate(); });
  socket.on("crm:jobRemoved", ({ jobId }) => { removeJob(jobId); onUpdate(); });
  socket.on("crm:queueChanged", ({ jobs }) => { setJobs(jobs); onUpdate(); });
}
