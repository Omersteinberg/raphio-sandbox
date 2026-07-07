import { motion } from "framer-motion";
import { Film, Loader2, Check } from "lucide-react";
import ProgressBar, { EMAIL_WAIT_NOTE } from "@/components/ui/ProgressBar";

// The single, shared progress screen for the whole creation journey. Every
// automatic phase (script generation, scene generation, video generation) renders
// this same component, fed a `tasks` checklist. When no approval separates two
// phases, they're passed as one combined task list so the user sees a single
// continuous checklist instead of two separate screens.
//
// task: { id, name, description, icon, status: 'pending'|'processing'|'completed' }

export default function ProgressChecklist({
  title = "Creating your video",
  subtitle,
  caption,
  progress = null,
  tasks = [],
  note = EMAIL_WAIT_NOTE,
  headerIcon = Film,
  failure = null, // { message, onRetry, retryLabel }
  onLeave, // optional: shows the "leave / go to My Videos" hint
  leaveLabel = "Go to My Videos",
}) {
  const HeaderIcon = headerIcon;
  if (failure) {
    return (
      <div className="w-full h-full flex flex-col items-center overflow-y-auto px-4 py-6 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg text-center my-auto"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
            <HeaderIcon className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-ink mb-2">{failure.title || "Something went wrong"}</h1>
          {failure.subtitle && <p className="text-ink-muted mb-4">{failure.subtitle}</p>}
          <div className="p-4 bg-red-50 rounded-lg border border-red-200 text-left mb-6">
            <p className="text-sm text-red-800 break-words">{failure.message}</p>
          </div>
          {failure.hint && <p className="text-sm text-ink-muted mb-6">{failure.hint}</p>}
          {failure.onRetry && (
            <button
              onClick={failure.onRetry}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-medium shadow-sm hover:opacity-90 transition-opacity"
              style={{ background: "var(--gradient-brand)" }}
            >
              {failure.retryLabel || "Try Again"}
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center overflow-y-auto px-4 py-6 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg my-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="inline-flex items-center justify-center w-20 h-20 bg-terra/10 rounded-full mb-4"
          >
            <HeaderIcon className="w-10 h-10 text-terra" />
          </motion.div>
          <h1 className="text-2xl font-bold text-ink mb-2">{title}</h1>
          {subtitle && <p className="text-ink-muted">{subtitle}</p>}
          {caption && <p className="text-ink-muted text-sm mt-1">{caption}</p>}
        </div>

        {/* Progress Bar */}
        {progress != null && (
          <div className="mb-8">
            <div className="flex justify-between text-sm text-ink-muted mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <ProgressBar value={progress} showPercent={false} note={note} />
          </div>
        )}

        {/* Task checklist */}
        <div className="space-y-4">
          {tasks.map((task, index) => {
            const Icon = task.icon;
            const isActive = task.status === "processing";
            const isComplete = task.status === "completed";

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.06 }}
                className={`flex items-center gap-4 p-4 rounded-lg border ${
                  isActive
                    ? "border-terra bg-terra/5"
                    : isComplete
                    ? "border-green-200 bg-green-50"
                    : "border-border bg-surface-alt"
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    isActive ? "bg-terra/10" : isComplete ? "bg-green-100" : "bg-surface-alt"
                  }`}
                >
                  {isActive ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                      <Loader2 className="w-6 h-6 text-terra" />
                    </motion.div>
                  ) : isComplete ? (
                    <Check className="w-6 h-6 text-green-600" />
                  ) : Icon ? (
                    <Icon className="w-6 h-6 text-ink-muted" />
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full bg-ink-muted/30" />
                  )}
                </div>
                <div className="flex-1">
                  <h3
                    className={`font-medium ${
                      isActive ? "text-terra" : isComplete ? "text-green-900" : "text-ink-muted"
                    }`}
                  >
                    {task.name}
                  </h3>
                  {task.description && (
                    <p
                      className={`text-sm ${
                        isActive ? "text-terra" : isComplete ? "text-green-600" : "text-ink-muted"
                      }`}
                    >
                      {task.description}
                    </p>
                  )}
                </div>
                {isComplete && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center"
                  >
                    <Check className="w-5 h-5 text-white" />
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Leave hint */}
        {onLeave && (
          <div className="mt-8 p-4 bg-terra/5 rounded-lg border border-terra/20 text-center">
            <p className="text-sm text-terra-dark">
              You can leave this page. Your video keeps generating in the background. Come back to My Videos to
              check progress.
            </p>
            <button
              type="button"
              onClick={onLeave}
              className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-terra/25 bg-white text-sm font-medium text-terra hover:bg-terra/5 transition-colors"
            >
              {leaveLabel}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
