import { useEffect, useState } from "react";
import { MessageCircle, User } from "lucide-react";

const C = {
  ink: "var(--ink-warm)",
  muted: "#7A6A62",
  terra: "#C1440E",
  border: "#EFDCD2",
  surface: "#FFFAF7",
  success: "#0D9669", // DESIGN.md --success
};

// Static fallback, matching what's already configured in the Crisp dashboard
// (Settings > Operating Hours). Only shown while the SDK hasn't reported a
// real value yet - see the effect below for the live path.
const FALLBACK_STATUS_TEXT = "We reply between 9am–9pm AEST";

/**
 * Reads live team-availability from the Crisp SDK already loaded by
 * CrispChat.jsx (rendered once elsewhere on this page) rather than
 * hardcoding a status that could go stale or contradict the real widget.
 * $crisp.is("website:available") / the "website:availability:changed" event
 * are both documented, client-side-safe SDK methods - no backend call needed.
 * Does not touch CrispChat.jsx's own mount/teardown logic.
 */
function useCrispAvailability() {
  const [isAvailable, setIsAvailable] = useState(null); // null = not yet known

  useEffect(() => {
    if (typeof window === "undefined" || !window.$crisp) return;

    if (typeof window.$crisp.is === "function") {
      try {
        setIsAvailable(window.$crisp.is("website:available"));
      } catch {
        // SDK not fully booted yet - the event subscription below will catch up.
      }
    }

    window.$crisp.push(["on", "website:availability:changed", (available) => setIsAvailable(available)]);
  }, []);

  return isAvailable;
}

export default function ChatStatusBar() {
  const isAvailable = useCrispAvailability();

  const openChat = () => window.$crisp?.push(["do", "chat:open"]);

  const statusText =
    isAvailable === true ? "Our team is online now" : isAvailable === false ? "Our team is away right now" : FALLBACK_STATUS_TEXT;

  return (
    <div
      className="mt-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5"
      style={{ background: C.surface, border: `1px solid ${C.border}` }}
    >
      <style>{`
        .chat-bar-cta { transition: transform 160ms ease-out, box-shadow 200ms ease-out; }
        .chat-bar-cta:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(193,68,14,0.30); }
        .chat-bar-cta:active { transform: scale(0.98); }
      `}</style>

      <div className="flex items-center gap-3">
        <div className="flex items-center" style={{ marginLeft: 4 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center justify-center rounded-full"
              style={{
                width: 32, height: 32, marginLeft: i === 0 ? 0 : -8,
                background: i === 1 ? "var(--gradient-brand)" : "rgba(193,68,14,0.14)",
                border: "2px solid " + C.surface,
              }}
            >
              <User style={{ width: 15, height: 15, color: i === 1 ? "#fff" : C.terra }} />
            </div>
          ))}
        </div>
        <div>
          <p className="font-figtree font-bold flex items-center gap-1.5" style={{ fontSize: 14, color: C.ink }}>
            <MessageCircle style={{ width: 15, height: 15, color: C.terra }} />
            Live chat
          </p>
          <p className="text-sm mt-0.5 flex items-center gap-1.5" style={{ color: C.muted }}>
            {isAvailable !== null && (
              <span
                className="inline-block rounded-full flex-shrink-0"
                style={{ width: 7, height: 7, background: isAvailable ? C.success : "#B7A99C" }}
                aria-hidden="true"
              />
            )}
            {statusText}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={openChat}
        className="chat-bar-cta font-figtree font-bold text-sm text-white flex-shrink-0"
        style={{ height: 44, padding: "0 24px", borderRadius: 9999, border: "none", background: "var(--gradient-brand)" }}
      >
        Start live chat
      </button>
    </div>
  );
}
