import { motion, AnimatePresence } from "framer-motion";
import { X, Layers } from "lucide-react";

const TYPE_LABELS = { character: "Character", setting: "Setting", logo: "Logo" };

// Read-only gallery of the references the user used for a references-pipeline
// video. Shows the locked (styled) image the model actually used, plus each
// reference's name and description.
export default function ReferencesModal({ references = [], onClose }) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-card rounded-lg w-full max-w-3xl max-h-[85vh] flex flex-col"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-terra" />
              <h3 className="text-lg font-semibold text-foreground">References used in this video</h3>
            </div>
            <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4">
            {references.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No references were used for this video.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {references.map((ref) => (
                  <div key={ref.id} className="border border-border rounded-xl overflow-hidden bg-muted/30">
                    <div className="aspect-square bg-muted/50">
                      {ref.imageUrl ? (
                        <img src={ref.imageUrl} alt={ref.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-foreground truncate">{ref.name}</h4>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-terra/15 text-terra shrink-0">
                          {TYPE_LABELS[ref.type] || ref.type}
                        </span>
                      </div>
                      {ref.description && (
                        <p className="text-xs text-muted-foreground line-clamp-3">{ref.description}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-2">
                        {ref.source === "uploaded" ? "Uploaded" : "AI generated"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
