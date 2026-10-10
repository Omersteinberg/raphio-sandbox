import { useCallback, useEffect, useRef, useState } from "react";
import * as pipelineService from "@/services/pipeline";
import { useAuth } from "@/hooks/useAuth";

const POLL_MS = 3000;
const GRACE_MS = 12000;
const GATE_POLL_MS = 5000;
const GATE_WATCH_MS = 35000;
export const ACTIVE_STATUSES = ["SCRIPTING", "FRAMING", "GENERATING"];

// Within one active status the checklist only moves forward: a poll that reads lower keeps the last stage, bar and count.
function holdProgress(prev, data) {
  if (!prev || !data || prev.status !== data.status || !ACTIVE_STATUSES.includes(data.status)) return data;
  if ((data.progress ?? 0) >= (prev.progress ?? 0)) return data;
  return { ...data, stage: prev.stage, progress: prev.progress, detail: prev.detail };
}

// Polls the v2 run for a session while a job is working on it.
export function usePipelineSession(sessionId) {
  const [run, setRun] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [pollError, setPollError] = useState(null);
  const failuresRef = useRef(0);
  const pendingRef = useRef(null);
  const statusRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!sessionId) return null;
    try {
      const data = await pipelineService.getPipeline(sessionId);
      failuresRef.current = 0;
      setPollError(null);
      const pending = pendingRef.current;
      if (pending && Date.now() - pending.at < GRACE_MS && (!data || data.status === pending.from)) {
        if (data) setRun({ ...data, status: pending.to, stage: null, progress: 0, detail: null, error: null });
      } else {
        pendingRef.current = null;
        setRun((prev) => holdProgress(prev, data));
      }
      setLoaded(true);
      return data;
    } catch (err) {
      failuresRef.current += 1;
      if (failuresRef.current >= 5) setPollError(err);
      return null;
    }
  }, [sessionId]);

  useEffect(() => {
    setRun(null);
    setLoaded(false);
    pendingRef.current = null;
    if (sessionId) refresh();
  }, [sessionId, refresh]);

  const status = run ? (run.status || "SCRIPTING") : null;
  const active = ACTIVE_STATUSES.includes(status);
  statusRef.current = status;

  useEffect(() => {
    if (!sessionId || !active) return undefined;
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [sessionId, active, refresh]);

  const { autoApprove } = useAuth();
  const skipStoryboard = Boolean(autoApprove?.storyboard);
  const atGate = status === "AWAITING_FRAMES";
  const [gateFresh, setGateFresh] = useState(false);

  // Opens a short watch window each time the run arrives at the storyboard gate.
  useEffect(() => {
    if (!atGate) {
      setGateFresh(false);
      return undefined;
    }
    setGateFresh(true);
    const timer = setTimeout(() => setGateFresh(false), GATE_WATCH_MS);
    return () => clearTimeout(timer);
  }, [atGate]);

  // Keeps polling at the gate so a backend auto approval is picked up.
  useEffect(() => {
    if (!sessionId || !atGate || !(skipStoryboard || gateFresh)) return undefined;
    const timer = setInterval(refresh, GATE_POLL_MS);
    return () => clearInterval(timer);
  }, [sessionId, atGate, skipStoryboard, gateFresh, refresh]);

  // Optimistically move the run, and hold it there until the job's own status lands.
  const markStatus = useCallback((next) => {
    pendingRef.current = { from: statusRef.current, to: next, at: Date.now() };
    setRun((prev) => ({ ...(prev || {}), status: next, stage: null, progress: 0, detail: null, error: null }));
  }, []);

  return {
    run,
    status,
    active,
    loaded,
    pollError,
    plan: run?.plan || null,
    storyboard: run?.storyboard || [],
    progress: active ? (run?.progress ?? 0) : status === "DONE" ? 100 : null,
    detail: active ? (run?.detail || null) : null,
    failures: run?.failures || [],
    refresh,
    markStatus,
    setRun,
  };
}
