import { useRef, useState } from "react";
import { HelpCircle } from "lucide-react";
import HelpMenuModal from "./HelpMenuModal";
import { resolveHelpMode } from "@/lib/helpFab";
import { destroyActiveTour } from "@/lib/tourCore";


export default function HelpFab({ onStartTour, onPlayVideo, positionClass = "bottom-6 right-6" }) {
  const buttonRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const mode = resolveHelpMode({
    hasTour: typeof onStartTour === "function",
    hasVideo: typeof onPlayVideo === "function",
  });
  if (mode === "none") return null;

  // Every tour's last step highlights this button and invites a click on it, and
  // driver.js leaves the highlight interactive. Tear the tour down first or the
  // menu opens underneath its overlay (and a replayed tour would stack on itself).
  const handleClick = () => {
    destroyActiveTour();
    if (mode === "menu") setMenuOpen(true);
    else if (mode === "tour") onStartTour();
    else onPlayVideo();
  };

  // Focus lives on the FAB, so the menu can hand it straight back on the way out.
  const pick = (run) => () => {
    setMenuOpen(false);
    buttonRef.current?.focus();
    run();
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleClick}
        aria-label="How to use"
        aria-haspopup={mode === "menu" ? "dialog" : undefined}
        aria-expanded={mode === "menu" ? menuOpen : undefined}
        data-tour="help"
        className={`fixed ${positionClass} z-50 w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
        style={{
          background: "linear-gradient(135deg, #C1440E, #E8603C)",
          color: "#fff",
          boxShadow: "0 6px 20px rgba(193,68,14,0.45)",
          transition: "transform 0.18s ease, box-shadow 0.18s ease",
          "--tw-ring-color": "#C1440E",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.08)";
          e.currentTarget.style.boxShadow = "0 10px 28px rgba(193,68,14,0.55)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 6px 20px rgba(193,68,14,0.45)";
        }}
      >
        <HelpCircle className="w-6 h-6 md:w-7 md:h-7" strokeWidth={2.5} />
      </button>

      {mode === "menu" && (
        <HelpMenuModal
          open={menuOpen}
          onClose={() => {
            setMenuOpen(false);
            buttonRef.current?.focus();
          }}
          onStartTour={pick(onStartTour)}
          onPlayVideo={pick(onPlayVideo)}
        />
      )}
    </>
  );
}
