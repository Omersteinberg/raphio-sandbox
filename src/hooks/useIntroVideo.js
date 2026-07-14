import { useCallback, useState } from "react";
import { useAuth } from "./useAuth";
import { introGate, introVideoSrc, introVideoTitle, resolveIntro } from "@/lib/introVideos";

/**
 * Tutorial video for one surface: opens itself on the first visit, and can be
 * replayed on demand afterwards from the help FAB.
 *
 * `tourEnabled` must be fed into that page's useStepTour `enabled` option: it is
 * false while the FIRST-VISIT modal is open and true once it closes, which is what
 * makes the tour wait for the video instead of racing it. A manual `replay()`
 * deliberately does not move it: the tour's auto-run has long since fired by then,
 * and flapping `enabled` would only churn useStepTour's effect.
 *
 * @param {string} key one of INTRO_VIDEO_KEYS
 * @param {{enabled?: boolean}} [opts] `enabled: false` suppresses the first-visit
 *   video without marking it seen (e.g. PromptStep when resuming a draft). Replay
 *   still works there: an explicit click is not an interruption.
 */
export function useIntroVideo(key, { enabled = true } = {}) {
  const { user, loading, settingsReady, introVideosSeen, markIntroVideoSeen } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [replaying, setReplaying] = useState(false);

  const { ready, suppressed } = introGate({ user, loading, settingsReady, enabled, dismissed });

  const src = introVideoSrc(key);
  const { open: firstVisitOpen, tourEnabled } = resolveIntro({
    key,
    ready,
    seen: introVideosSeen,
    src,
    dismissed: suppressed,
  });

  const seen = (introVideosSeen || []).includes(key);

  const close = useCallback(() => {
    setReplaying(false);
    setDismissed(true);
    if (!seen) markIntroVideoSeen(key);
  }, [key, markIntroVideoSeen, seen]);

  // Load-error path: hide the modal but persist nothing, so a network blip does
  // not permanently consume the user's first viewing. Must clear `replaying` too -
  // the error state routes every one of its exits here, and the modal's backdrop
  // is inert, so leaving it set would trap the user in an unclosable dialog.
  const dismissWithoutSeen = useCallback(() => {
    setReplaying(false);
    setDismissed(true);
  }, []);

  const replay = useCallback(() => setReplaying(true), []);

  return {
    open: firstVisitOpen || replaying,
    src,
    title: introVideoTitle(key),
    close,
    dismissWithoutSeen,
    tourEnabled,
    // null (not a no-op) when there is nothing to play, so HelpFab can treat
    // "is this a function?" as the whole decision and hide the option entirely.
    replay: src ? replay : null,
  };
}
