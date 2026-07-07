import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import ProgressChecklist from "@/components/session/ProgressChecklist";

const SUB_STEPS = [
  { id: "session",  label: "Setting up your session", range: [0, 15]  },
  { id: "upload",   label: "Uploading your images",   range: [15, 40] },
  { id: "analyze",  label: "Analyzing images",         range: [40, 55] },
  { id: "restyle",  label: "Restyling images",         range: [55, 70] },
  { id: "script",   label: "Generating script",        range: [70, 100] },
];

function statusFor(range, progress) {
  if (progress >= range[1]) return "completed";
  if (progress >= range[0]) return "processing";
  return "pending";
}

// The script-generation progress screen. It renders the shared ProgressChecklist
// (same design as the video generating screen) as a full-screen overlay, so the
// whole journey uses one consistent progress component.
export default function ScriptLoadingScreen({ progress = 0, subSteps, estimate = "~7 minutes", title = "Writing your script" }) {
  const steps = subSteps ?? SUB_STEPS;

  // Ease the displayed value toward the target so the bar and checklist advance
  // smoothly instead of snapping between milestones.
  const [displayed, setDisplayed] = useState(0);
  const displayedRef = useRef(0);
  const rafRef = useRef(null);
  const targetRef = useRef(progress);

  useEffect(() => {
    targetRef.current = progress;
    const tick = () => {
      const diff = targetRef.current - displayedRef.current;
      if (Math.abs(diff) < 0.3) {
        displayedRef.current = targetRef.current;
        setDisplayed(targetRef.current);
        return;
      }
      displayedRef.current += diff * 0.07;
      setDisplayed(Math.round(displayedRef.current));
      rafRef.current = requestAnimationFrame(tick);
    };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [progress]);

  const dp = Math.round(displayed);
  const tasks = steps.map((s) => ({ id: s.id, name: s.label, status: statusFor(s.range, dp) }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 z-40"
      style={{ background: "#F5F0EB" }}
    >
      <ProgressChecklist
        title={title}
        caption={`Estimated time: ${estimate}`}
        progress={dp}
        tasks={tasks}
        headerIcon={Sparkles}
      />
    </motion.div>
  );
}
