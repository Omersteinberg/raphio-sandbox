import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const FALLBACK_MESSAGE =
  "We're having an internal issue on our side and our team is already working on it. " +
  "Your progress is saved, so please come back shortly and try again. You won't be charged.";

/**
 * Shown in place of the wizard when the backend refuses to start because OUR video
 * provider is out of credits. Renders over the creator's content area rather than
 * navigating, so PromptStep stays mounted underneath and the user's prompt and
 * photos survive a retry.
 */
export default function ProviderUnavailableScreen({ message, onRetry, onDismiss, loading }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center overflow-y-auto bg-background p-6"
      role="alert"
      aria-live="assertive"
    >
      <motion.div
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md text-center"
      >
        <img src="/logo.svg" alt="" className="mx-auto mb-8 h-8" />

        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
          <AlertTriangle className="h-7 w-7 text-amber-600" />
        </div>

        <h2 className="mb-3 text-xl font-bold text-ink">We hit a snag on our side</h2>
        <p className="mb-8 text-ink-muted">{message || FALLBACK_MESSAGE}</p>

        <div className="flex flex-col gap-3">
          <Button
            onClick={onRetry}
            disabled={loading}
            className="w-full rounded-2xl border-0 py-6 text-sm font-bold text-white shadow-xl shadow-orange-200/40 transition-all duration-300 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #C1440E, #E8603C)" }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2 font-black tracking-wide">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="h-4 w-4 rounded-full border-2 border-white border-t-transparent"
                />
                Trying again...
              </span>
            ) : (
              <span className="font-black">Try again</span>
            )}
          </Button>

          {onDismiss && (
            <Button
              variant="ghost"
              onClick={onDismiss}
              disabled={loading}
              className="w-full text-ink-muted"
            >
              Go back
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
