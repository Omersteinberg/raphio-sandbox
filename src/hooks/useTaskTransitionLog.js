import { useEffect, useRef } from "react";
import { logStep, logFailure, logWarning } from "@/lib/genLog";

/**
 * Log every checklist row status change exactly once.
 *
 * Called from ProgressChecklist, which is the single component every phase
 * (script, frames, video) and every pipeline already renders, so one call site
 * covers them all. `tasks` is rebuilt on each render, so this effect runs often;
 * the prev-status map is what keeps the log to genuine transitions.
 */
export function useTaskTransitionLog(tasks, { sessionId, phase = "video" } = {}) {
  const previous = useRef(new Map());

  // buildVideoTasks returns a fresh array every render, so depending on `tasks`
  // would re-run this on every render. The signature is a primitive that only
  // changes when a row's status actually does, which is the only thing worth
  // reacting to. `tasks` is read from the same render's closure, so it always
  // matches the signature that triggered the effect.
  const signature = tasks.map((t) => `${t.id}:${t.status}`).join("|");

  useEffect(() => {
    const next = new Map();

    for (const task of tasks) {
      next.set(task.id, task.status);
      const before = previous.current.get(task.id);
      if (before === task.status) continue;

      if (task.status === "failed") {
        logFailure({ phase, stepId: task.id, reason: task.reason || "Step failed", sessionId });
      } else if (task.status === "warning") {
        logWarning({ phase, stepId: task.id, reason: task.reason || "Step degraded" });
      } else if (before !== undefined) {
        logStep(phase, task.id, before, task.status);
      } else if (task.status !== "pending") {
        logStep(phase, task.id, "init", task.status);
      }
    }

    previous.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, sessionId, phase]);
}

export default useTaskTransitionLog;
