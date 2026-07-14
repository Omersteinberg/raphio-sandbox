import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, X, AlertTriangle } from "lucide-react";
import { useIsMobile } from "@/hooks/useMediaQuery";

const C = { dark: "#2D2235", muted: "#6B5E7B" };
const GRADIENT = "linear-gradient(135deg, #C1440E, #E8632A)";

/**
 * One-time tutorial video popup. Dismissal is permanent and there is no replay,
 * so the backdrop deliberately does NOT close it (unlike InsufficientCreditsModal):
 * a stray tap on a phone must not destroy the video forever.
 *
 * `onDismissWithoutSeen` is used only from the load-error state, so a failed
 * download never consumes the user's single viewing.
 */
export default function IntroVideoModal({ open, src, title, onClose, onDismissWithoutSeen }) {
  // AnimatePresence stays mounted so the exit animation can actually run, and the
  // dialog unmounts on close, which resets its play/error state without an effect.
  return (
    <AnimatePresence>
      {open && src ? (
        <IntroVideoDialog
          key={src}
          src={src}
          title={title}
          onClose={onClose}
          onDismissWithoutSeen={onDismissWithoutSeen}
        />
      ) : null}
    </AnimatePresence>
  );
}

function IntroVideoDialog({ src, title, onClose, onDismissWithoutSeen }) {
  const videoRef = useRef(null);
  const isMobile = useIsMobile();
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);

  const dismiss = failed ? onDismissWithoutSeen : onClose;
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;

  // Subscribes once for the dialog's lifetime: reading the handler through a ref
  // keeps the listener stable when `failed` flips.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") dismissRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // These are 1848x1080 screen recordings: inline on a phone the recorded UI is
  // illegible, so mobile playback goes fullscreen. Requesting it explicitly (not
  // relying on iOS dropping playsInline) keeps Android and iOS consistent.
  async function handlePlay() {
    const v = videoRef.current;
    if (!v) return;
    try {
      await v.play();
    } catch {
      return;
    }
    setStarted(true);
    if (!isMobile) return;
    if (typeof v.webkitEnterFullscreen === "function") {
      v.webkitEnterFullscreen();
    } else if (typeof v.requestFullscreen === "function") {
      await v.requestFullscreen().catch(() => {});
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(28,25,23,0.55)", backdropFilter: "blur(4px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <motion.div
        className="w-full max-w-2xl rounded-3xl bg-white overflow-hidden font-figtree max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: "0 20px 60px rgba(45,34,53,0.30)" }}
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3 sm:px-6">
          <h2
            className="font-extrabold tracking-tight"
            style={{ color: C.dark, fontSize: 19, letterSpacing: "-0.01em" }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close"
            className="shrink-0 inline-flex items-center justify-center rounded-full transition-colors hover:bg-black/5"
            style={{ width: 44, height: 44, color: C.muted }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 sm:px-6">
          {failed ? (
            <div
              className="flex items-start gap-2 rounded-2xl p-4"
              style={{ background: "rgba(193,68,14,0.06)", border: "1px solid rgba(193,68,14,0.22)" }}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#C1440E" }} />
              <p style={{ color: "#C1440E", fontSize: 13, lineHeight: 1.5, fontWeight: 600 }}>
                We couldn&apos;t load this video. You can carry on, and we&apos;ll try again next time.
              </p>
            </div>
          ) : (
            // 1848x1080 exactly. aspect-video (16:9) would letterbox it.
            <div className="relative w-full aspect-[77/45] rounded-2xl overflow-hidden bg-black">
              <video
                ref={videoRef}
                src={src}
                controls
                preload="metadata"
                playsInline={!isMobile}
                onError={() => setFailed(true)}
                onPlay={() => setStarted(true)}
                className="absolute inset-0 w-full h-full object-contain"
              />
              {started ? null : (
                <button
                  type="button"
                  onClick={handlePlay}
                  aria-label="Play video"
                  className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors hover:bg-black/15"
                >
                  <span
                    className="inline-flex items-center justify-center rounded-full"
                    style={{ width: 64, height: 64, background: GRADIENT, boxShadow: "0 8px 24px rgba(193,68,14,0.45)" }}
                  >
                    <Play className="w-7 h-7 text-white translate-x-0.5" fill="currentColor" />
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="p-5 sm:p-6">
          <button
            type="button"
            onClick={dismiss}
            className="w-full inline-flex items-center justify-center rounded-2xl font-bold text-white transition-transform active:scale-[0.99]"
            style={{
              height: 50,
              fontSize: 15,
              background: GRADIENT,
              boxShadow: "0 6px 16px rgba(193,68,14,0.28)",
            }}
          >
            {failed ? "Close" : "Got it"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
