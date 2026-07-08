import { Check, Loader2 } from "lucide-react";

// One dynamic "whole journey" step spine, shared by every creation pipeline. It
// replaces the three copy-pasted numbered progress bars. Parents feed a fully
// resolved task list; this component is purely presentational.
//
// Task shape: { id, label, kind, state, progress? }
//   kind:  'input'  manual data entry (Prompt/Brief)
//          'review' manual checkpoint the user approves (Script/Frames/Generate)
//          'auto'   machine task (script/scene/video gen) OR a review that the
//                   user set to auto-approve - always shown, never clickable
//   state: 'pending' | 'active' | 'done' | 'running'
//   progress?: 0-100, optional caption under the single running auto node
//
// Manual nodes (input/review) get a sequential number so the count never jumps
// when a review is auto-approved (auto nodes are icon-only).

const GRADIENT = "linear-gradient(135deg, #C1440E, #E8603C)";

function TaskNode({ task, manualNumber, clickable, onClick }) {
  const { kind, state, label } = task;
  const isAuto = kind === "auto";
  const done = state === "done";
  const running = state === "running";
  const active = state === "active";

  let circle;
  if (done) {
    circle = (
      <div
        className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center"
        style={{ background: GRADIENT, color: "#fff" }}
      >
        <Check className="w-4 h-4" strokeWidth={3} />
      </div>
    );
  } else if (isAuto && running) {
    circle = (
      <div
        className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center"
        style={{ background: "#FFF0E6", border: "2px solid #C1440E", color: "#C1440E" }}
      >
        <Loader2 className="w-4 h-4 animate-spin" strokeWidth={3} />
      </div>
    );
  } else if (isAuto) {
    // pending machine step: a small dot, visually distinct from numbered manual steps
    circle = (
      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center">
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#D9CFC7" }} />
      </div>
    );
  } else {
    // manual node (input/review), pending or active - numbered
    circle = (
      <div
        className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-bold transition-all"
        style={
          active
            ? { background: "#FFF0E6", color: "#C1440E", border: "2px solid #C1440E" }
            : { background: "#F0EAE5", color: "#7A6A62" }
        }
      >
        {manualNumber}
      </div>
    );
  }

  if (clickable) {
    return (
      <button type="button" onClick={onClick} className="flex items-center justify-center" aria-label={`Go to ${label}`}>
        {circle}
      </button>
    );
  }
  return circle;
}

export default function JourneyTimeline({ tasks = [], onStepClick, className = "" }) {
  // Sequential numbers for manual nodes only, so auto nodes stay icon-only and
  // the numbering never jumps when a review step is auto-approved.
  let manualCount = 0;
  const numbered = tasks.map((t) => {
    const isManual = t.kind === "input" || t.kind === "review";
    return { task: t, manualNumber: isManual ? ++manualCount : null };
  });

  return (
    <div
      className={`px-3 md:px-6 py-3 border-b ${className}`}
      style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", borderColor: "rgba(45,34,53,0.08)" }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          {numbered.map(({ task, manualNumber }, index) => {
            const isManual = task.kind === "input" || task.kind === "review";
            // Only completed manual nodes behind the active one are clickable.
            const clickable = !!onStepClick && isManual && task.state === "done";
            return (
              <div key={task.id} className={`flex items-center ${index < numbered.length - 1 ? "flex-1" : ""}`}>
                <TaskNode
                  task={task}
                  manualNumber={manualNumber}
                  clickable={clickable}
                  onClick={clickable ? () => onStepClick(task) : undefined}
                />
                {index < numbered.length - 1 && (
                  <div
                    className="flex-1 h-1 mx-2 rounded-full"
                    style={{ background: task.state === "done" ? GRADIENT : "#F0EAE5" }}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="hidden sm:flex justify-between text-xs">
          {numbered.map(({ task }) => {
            const isActive = task.state === "active" || task.state === "running";
            return (
              <span key={task.id} className="font-medium" style={{ color: isActive ? "#C1440E" : "#7A6A62" }}>
                {task.label}
                {task.state === "running" && typeof task.progress === "number" && (
                  <span style={{ opacity: 0.7 }}> {Math.round(task.progress)}%</span>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
