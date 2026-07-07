import { HelpCircle } from "lucide-react";

// Shared "How to use" floating button for every screen with a product tour
// (creation screen, script review, reference lock, scene frames, My Videos).
// Size scales with the viewport: 48px on phones (still above the 44px touch
// minimum), 56px from md up. `positionClass` REPLACES the default position so
// callers can relocate it without Tailwind class conflicts (ScriptStep stacks
// it above its Edit-with-AI FAB on compact screens).
export default function HelpFab({ onClick, positionClass = "bottom-6 right-6" }) {
  return (
    <button
      onClick={onClick}
      aria-label="How to use"
      data-tour="help"
      className={`fixed ${positionClass} z-50 w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center`}
      style={{
        background: "linear-gradient(135deg, #C1440E, #E8603C)",
        color: "#fff",
        boxShadow: "0 6px 20px rgba(193,68,14,0.45)",
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
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
  );
}
