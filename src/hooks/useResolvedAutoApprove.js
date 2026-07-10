import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { EMPTY_AUTO_APPROVE } from "@/api/settings";

/**
 * The auto-approve flags that govern a run.
 *
 * The backend snapshots the user's toggles onto WizardSession.autoApprove when the
 * session is created, and its nudge emails read that snapshot. The wizard must read
 * the same thing: driving the gates from live account settings means a preference
 * toggled mid-run changes how a resumed session behaves. Turning `generate` off
 * mid-render parks the user on a review screen while a render is already in flight;
 * turning it on makes a resume auto-fire a generation the user meant to review.
 *
 * Falls back to live settings only for a session that has no snapshot: a brand-new
 * run, or one created before the column existed.
 *
 * `ready` mirrors useAuth().settingsReady. A snapshot is ready immediately (it
 * arrived with the session), which also removes the two-hop settings race for
 * resumed sessions. Every gate must wait on it: the flags default to all-false, so
 * a gate decided before they load is decided wrong.
 *
 * @param {object|null} session the loaded backend session (not the hook wrapper)
 * @returns {{prefs: object, ready: boolean, source: 'session'|'settings'}}
 */
// Tolerate a raw JSON string from an API that has not yet parsed the column.
function parseSnapshot(value) {
  let parsed = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  return parsed && typeof parsed === "object" ? parsed : null;
}

export function useResolvedAutoApprove(session) {
  const { autoApprove: livePrefs, settingsReady } = useAuth();

  // The 5s poll hands back a fresh session object, so `session.autoApprove` has a
  // new identity every tick even when nothing changed. Depend on the flags
  // themselves, or `prefs` churns every poll and defeats every downstream memo.
  const snapshot = parseSnapshot(session?.autoApprove);
  const hasSnapshot = !!snapshot;
  const { references, script, bridges, frames, generate } = snapshot || EMPTY_AUTO_APPROVE;

  return useMemo(() => {
    if (!hasSnapshot) return { prefs: livePrefs, ready: settingsReady, source: "settings" };
    return {
      prefs: {
        references: !!references,
        script: !!script,
        bridges: !!bridges,
        frames: !!frames,
        generate: !!generate,
      },
      ready: true,
      source: "session",
    };
  }, [hasSnapshot, references, script, bridges, frames, generate, livePrefs, settingsReady]);
}
