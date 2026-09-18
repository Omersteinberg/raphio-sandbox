import { motion } from "framer-motion";
import { X } from "lucide-react";

// Extracted from RegenerateClipModal/RegenerateMusicModal/NarrationEditModal,
// which had copy-pasted this exact wrapper three times: the .editor-scrim/
// .editor-modal overlay+card, the scale/opacity entrance transition, the
// header row (icon + title + close), and the max-w-lg/max-h-[90vh] sizing.
// Body and footer stay as free-form slots rather than further sub-props -
// NarrationEditModal's footer has a third left-aligned button the other two
// don't, so a rigid primary/cancel prop shape would either lose that or need
// an escape hatch anyway. The shell owns exactly the part that was identical.
//
// `icon`/`iconClassName` render the header icon at one consistent size/color
// (w-4 h-4 text-primary) so every modal's header matches without each one
// repeating that class string - previously each modal set this individually.
export default function EditorModalShell({ icon: Icon, title, onClose, children, footer }) {
  return (
    <div
      className="fixed inset-0 editor-scrim flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
        className="bg-card border border-border rounded-xl editor-modal p-5 md:p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-primary" />} {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {children}

        {footer && <div className="mt-6">{footer}</div>}
      </motion.div>
    </div>
  );
}
