import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { FlaskConical } from "lucide-react";
import { getMockStatus } from "@/services/session";

// Persistent indicator shown whenever the backend is in MOCK_AI mode (dummy data,
// no credits, no real videos). A fixed pill so it's visible on every page, plus a
// one-time toast on load. Renders nothing when mock mode is off.
export default function MockModeBadge() {
  const [mock, setMock] = useState(false);
  const toasted = useRef(false);

  useEffect(() => {
    let cancelled = false;
    getMockStatus().then((on) => {
      if (cancelled) return;
      setMock(on);
      if (on && !toasted.current) {
        toasted.current = true;
        toast.warn("Mock mode is ON: dummy data, no credits, no real videos.", {
          autoClose: 6000,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!mock) return null;

  return (
    <div
      className="fixed bottom-4 left-4 z-[70] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide select-none"
      style={{
        background: "#B45309",
        color: "#FFF7ED",
        boxShadow: "0 4px 14px rgba(180,83,9,0.45)",
        letterSpacing: "0.06em",
      }}
      title="Backend is in MOCK_AI mode: dummy data, no credits, no real generation."
    >
      <FlaskConical className="w-3.5 h-3.5" />
      Mock mode
    </div>
  );
}
