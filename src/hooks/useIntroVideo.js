import { useCallback, useState } from "react";
import { useAuth } from "./useAuth";
import { introGate, introVideoSrc, introVideoTitle, resolveIntro } from "@/lib/introVideos";

/**
 * First-visit tutorial video for one surface.
 *
 * `tourEnabled` must be fed into that page's useStepTour `enabled` option: it is
 * false while the modal is open and true once it closes, which is what makes the
 * tour wait for the video instead of racing it.
 *
 * @param {string} key one of INTRO_VIDEO_KEYS
 * @param {{enabled?: boolean}} [opts] `enabled: false` suppresses the video
 *   without marking it seen (e.g. PromptStep when resuming a draft).
 */
export function useIntroVideo(key, { enabled = true } = {}) {
  const { user, loading, settingsReady, introVideosSeen, markIntroVideoSeen } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  const { ready, suppressed } = introGate({ user, loading, settingsReady, enabled, dismissed });

  const src = introVideoSrc(key);
  const { open, tourEnabled } = resolveIntro({
    key,
    ready,
    seen: introVideosSeen,
    src,
    dismissed: suppressed,
  });

  const close = useCallback(() => {
    setDismissed(true);
    markIntroVideoSeen(key);
  }, [key, markIntroVideoSeen]);

  // Load-error path: hide the modal but persist nothing, so a network blip does
  // not permanently consume the user's single viewing.
  const dismissWithoutSeen = useCallback(() => setDismissed(true), []);

  return { open, src, title: introVideoTitle(key), close, dismissWithoutSeen, tourEnabled };
}
