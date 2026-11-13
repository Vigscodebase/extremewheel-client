// Follows Vehicle Note saves that run in the background.
//
//   submit()  -> sends the save (the only part the person waits for: the upload)
//   then the server queues it and a worker writes it to MongoDB. This hook tells
//   the page what is happening, in this order of preference:
//     1. WebSocket push (instant)                      — the app-wide socket (realtime/realtimeClient.js)
//     2. polling GET /vehicle-notes/save-status/:jobId — if a message was missed
//
// `saves` is the list the tray (components/SaveStatusTray.jsx) and the grid draw.
// Each entry: { clientRef, kind, label, status, retrying, message, vehicleId, ... }
//   status: "sending" (still uploading) | "queued" | "processing" | "done" | "failed"
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { vehicleNotesKey } from "./queries/useVehicleNotes";
import {
  fetchVehicleNote,
  fetchVehicleNoteSaveStatus,
  submitVehicleNoteSave,
} from "../api/vehicleNotesApi";
import { acquire, on, useRealtimeStore } from "../realtime/realtimeClient";

const RANK = { sending: 0, queued: 1, processing: 2, done: 3, failed: 3 };
const isActive = (s) => s.status === "queued" || s.status === "processing";
const isFinished = (s) => s.status === "done" || s.status === "failed";

const DONE_VISIBLE_MS = 4000; // how long "Saved" stays on screen
const POLL_MS_LIVE = 6000; // WebSocket is up: polling is only a backstop
const POLL_MS_OFFLINE = 2500; // no WebSocket: poll quickly

const newRef = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;

// What the person should read when sending the save itself failed.
export function saveErrorMessage(err) {
  const fromServer = err?.response?.data?.message;
  if (fromServer) return fromServer;
  if (err?.code === "ECONNABORTED") return "The upload took too long. Check your connection and try again.";
  if (err?.response?.status === 413) return "The photos on this vehicle are too large to save. Remove a photo or use smaller images and try again.";
  if (!err?.response) return "Couldn't reach the server. Check your connection and try again.";
  return "Something went wrong. Please try again.";
}

export default function useVehicleNoteSaves({ enabled = true } = {}) {
  const queryClient = useQueryClient();
  // The ref is the source of truth (async callbacks read it synchronously);
  // the state copy only exists to re-render.
  const store = useRef([]);
  const [saves, setSaves] = useState([]);
  const socketUp = useRealtimeStore((s) => s.connected);
  const connected = enabled && socketUp;
  const timers = useRef(new Set());
  const pollNow = useRef(null);
  const alive = useRef(true);

  const commit = useCallback((next) => {
    store.current = next;
    if (alive.current) setSaves(next);
  }, []);

  // New / changed vehicles → the paged list, the suggestion box and the detail
  // pages all refetch (they all live under ["vehicle-notes"], same as the old
  // mutations invalidated). The dashboard's vehicle counts are matched by name
  // since its query key isn't known here.
  const refreshVehicleData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: vehicleNotesKey });
    // The server adds a saved Submodel / Tire size / Wheel offset to its dropdown
    // list; refetch the lists so the open form shows it (with its delete button).
    queryClient.invalidateQueries({ queryKey: ["vehicle-lookup"] });
    queryClient.invalidateQueries({
      predicate: (q) => JSON.stringify(q.queryKey).toLowerCase().includes("dashboard"),
    });
  }, [queryClient]);

  const dismiss = useCallback((clientRef) => {
    commit(store.current.filter((s) => s.clientRef !== clientRef));
  }, [commit]);

  const scheduleDismiss = useCallback((clientRef) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      dismiss(clientRef);
    }, DONE_VISIBLE_MS);
    timers.current.add(t);
  }, [dismiss]);

  // One place decides how a status change is applied: it may only move forward
  // (queued → processing → done / failed), because messages can arrive out of
  // order (the worker can finish before the "queued" message is delivered).
  const applyUpdate = useCallback((evt) => {
    const entry = store.current.find(
      (s) => (evt.clientRef && s.clientRef === evt.clientRef) || (evt.jobId && s.jobId && s.jobId === String(evt.jobId))
    );
    if (!entry) {
      // Another tab of the same person saved something — just refresh the list.
      if (evt.status === "done") refreshVehicleData();
      return;
    }
    if (isFinished(entry) || RANK[evt.status] === undefined || RANK[evt.status] < RANK[entry.status]) return;

    const next = {
      ...entry,
      status: evt.status,
      retrying: evt.status === "processing" && Boolean(evt.retrying),
      message: evt.status === "failed" ? evt.message || "Something went wrong on our end." : "",
      jobId: entry.jobId || (evt.jobId ? String(evt.jobId) : undefined),
      vehicleId: evt.vehicle?._id || entry.vehicleId,
      // The (possibly many-MB) payload is only kept while a retry might need it.
      payload: evt.status === "done" ? null : entry.payload,
      hidden: false,
    };
    commit(store.current.map((s) => (s === entry ? next : s)));

    if (evt.status === "done") {
      refreshVehicleData();
      scheduleDismiss(entry.clientRef);
      try { entry.onDone?.(evt.vehicle); } catch { /* a follow-up must never break the save UI */ }
    }
  }, [commit, refreshVehicleData, scheduleDismiss]);

  /**
   * Send a save. Resolves once the server has ACCEPTED it (fast — the person
   * can carry on); rejects if it could not even be sent (validation, offline,
   * too large…) so the caller can show the error on the form.
   *
   * { kind: "create"|"update", id, payload, label, formSnapshot, editingSnapshot,
   *   onUploadProgress(pct), onDone(vehicle) }
   */
  const submit = useCallback(async (job) => {
    const entry = {
      clientRef: newRef(),
      kind: job.kind,
      editId: job.id,
      label: job.label || "vehicle",
      status: "sending",
      retrying: false,
      message: "",
      payload: job.payload,
      formSnapshot: job.formSnapshot,
      editingSnapshot: job.editingSnapshot,
      onDone: job.onDone,
      vehicleId: job.id,
      createdAt: Date.now(),
      hidden: !job.showWhileSending, // the form is still open and shows its own progress
    };
    commit([entry, ...store.current]);
    try {
      const result = await submitVehicleNoteSave({
        kind: job.kind,
        id: job.id,
        payload: job.payload,
        clientRef: entry.clientRef,
        onUploadProgress: job.onUploadProgress,
      });
      const current = store.current.find((s) => s.clientRef === entry.clientRef) || entry;
      commit(store.current.map((s) => (s.clientRef === entry.clientRef
        ? { ...current, jobId: result.jobId, vehicleId: result.vehicleId || current.vehicleId, hidden: false }
        : s)));
      if (result.queued) {
        // A WebSocket message may already have been applied while the response
        // was on its way; applyUpdate never moves a save backwards, so this
        // only lifts "sending" to "queued".
        applyUpdate({ clientRef: entry.clientRef, status: "queued" });
      } else {
        // Queue unavailable: the server saved it inline — already done.
        applyUpdate({ clientRef: entry.clientRef, status: "done", vehicle: result.vehicle });
      }
      return entry.clientRef;
    } catch (err) {
      commit(store.current.filter((s) => s.clientRef !== entry.clientRef));
      throw err;
    }
  }, [applyUpdate, commit]);

  /** Send a failed save again (fresh clientRef: the failed job is still on record server-side). */
  const retry = useCallback(async (clientRef) => {
    const old = store.current.find((s) => s.clientRef === clientRef);
    if (!old?.payload) return;
    commit(store.current.filter((s) => s !== old));
    try {
      await submit({
        kind: old.kind,
        id: old.editId,
        payload: old.payload,
        label: old.label,
        formSnapshot: old.formSnapshot,
        editingSnapshot: old.editingSnapshot,
        onDone: old.onDone,
        showWhileSending: true,
      });
    } catch (err) {
      commit([{ ...old, status: "failed", message: saveErrorMessage(err), hidden: false }, ...store.current]);
    }
  }, [commit, submit]);

  // --- Live push: listen on the shared, app-wide WebSocket ---------------------
  // (connecting, ticketing, reconnect back-off all live in realtime/realtimeClient.js)
  useEffect(() => {
    if (!enabled) return undefined;
    const release = acquire();
    const offReady = on("ready", () => pollNow.current?.()); // catch up on anything missed while offline
    const offSave = on("vehicle-save", applyUpdate);
    return () => {
      offReady();
      offSave();
      release();
    };
  }, [enabled, applyUpdate]);

  // --- Polling backstop --------------------------------------------------------
  const activeKey = saves.filter((s) => isActive(s) && s.jobId).map((s) => s.jobId).join(",");
  useEffect(() => {
    if (!activeKey) {
      pollNow.current = null;
      return undefined;
    }
    let running = false;
    const tick = async () => {
      if (running) return;
      running = true;
      try {
        for (const s of store.current.filter((x) => isActive(x) && x.jobId)) {
          try {
            const st = await fetchVehicleNoteSaveStatus(s.jobId);
            applyUpdate({ ...st, clientRef: s.clientRef, jobId: s.jobId });
          } catch (err) {
            // 404: the queue no longer remembers the job (finished long ago, or
            // Redis was reset). Ask the database instead of leaving it spinning.
            if (err?.response?.status === 404 && Date.now() - s.createdAt > 15000) {
              if (s.kind === "create") {
                try {
                  await fetchVehicleNote(s.vehicleId);
                  applyUpdate({ clientRef: s.clientRef, status: "done" });
                } catch {
                  applyUpdate({ clientRef: s.clientRef, status: "failed", message: "We lost track of this save. Please check the list, then try again." });
                }
              } else {
                applyUpdate({ clientRef: s.clientRef, status: "done" }); // list refresh shows the truth
              }
            }
            // anything else (offline, 503): keep waiting, try again next tick
          }
        }
      } finally {
        running = false;
      }
    };
    pollNow.current = tick;
    const id = setInterval(tick, connected ? POLL_MS_LIVE : POLL_MS_OFFLINE);
    const first = setTimeout(tick, 1500); // a quick first look, in case the push was missed
    return () => {
      clearInterval(id);
      clearTimeout(first);
    };
  }, [activeKey, connected, applyUpdate]);

  useEffect(() => {
    alive.current = true;
    const pending = timers.current;
    return () => {
      alive.current = false;
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  return { saves, connected, submit, retry, dismiss };
}
