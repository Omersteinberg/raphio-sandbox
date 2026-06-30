import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  Film,
  Play,
  Pause,
  RefreshCw,
  Edit3,
  Trash2,
  Plus,
  GripVertical,
  Image,
  Mic,
  Save,
  ArrowLeft,
  Loader2,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ClipEditModal from "./ClipEditModal";
import { TimelineEditor } from "@/components/timeline";

export default function EditingStep({
  session,
  sessionId,
  updateClip,
  regenerateClip,
  regenerateNarration,
  reorderClips,
  reassembleVideo,
  deleteClip,
  goToResult,
  refreshSession,
  loading,
}) {
  const [editingClip, setEditingClip] = useState(null);
  const [playingClip, setPlayingClip] = useState(null);
  const [reassembling, setReassembling] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const sections = session?.video?.sections || [];
  const sortedSections = [...sections].sort((a, b) => a.orderIndex - b.orderIndex);

  // Local order state for visual drag feedback (only saves on drop)
  const [localOrder, setLocalOrder] = useState(null);
  const displaySections = localOrder || sortedSections;

  // Clear local order when session data updates from backend
  useEffect(() => {
    setLocalOrder(null);
  }, [sections]);

  // Update visual order during drag (no API call)
  const handleReorder = (newOrder) => {
    setLocalOrder(newOrder);
  };

  // Save reorder to backend on drag end
  const handleDragEnd = async () => {
    if (!localOrder) return;
    const orderMap = localOrder.map((section, index) => ({
      sectionId: section.id,
      orderIndex: index,
    }));
    setLocalOrder(null);
    await reorderClips(orderMap);
  };

  // Handle clip regeneration
  const handleRegenerate = async (clipId, options = {}) => {
    await regenerateClip(clipId, options);
    setHasChanges(true);
  };

  // Handle narration regeneration
  const handleRegenerateNarration = async (clipId, options = {}) => {
    if (regenerateNarration) {
      await regenerateNarration(clipId, options);
      setHasChanges(true);
    }
  };

  // Handle clip deletion
  const handleDelete = async (clipId) => {
    if (window.confirm("Are you sure you want to delete this clip?")) {
      await deleteClip(clipId);
    }
  };

  // Handle reassemble
  const handleReassemble = async () => {
    setReassembling(true);
    try {
      await reassembleVideo({ regenerateAudio: false });
      setHasChanges(false);
    } finally {
      setReassembling(false);
    }
  };

  // Handle back to video: plain navigation back to the result page.
  const handleBackToVideo = () => {
    goToResult();
  };

  // Handle timeline export complete
  const handleTimelineExportComplete = async (video) => {
    setShowTimeline(false);
    // Refresh session so finalVideoUrl is up to date on the result page
    if (refreshSession) {
      await refreshSession();
    }
    goToResult();
  };

  // Show timeline editor
  if (showTimeline) {
    return (
      <TimelineEditor
        sessionId={sessionId}
        onBack={() => setShowTimeline(false)}
        onExportComplete={handleTimelineExportComplete}
        onUpdateSection={async (sectionId, updates) => {
          await updateClip(sectionId, updates);
        }}
        onRegenerateNarration={async (sectionId, text, voiceId) => {
          console.log("[EditingStep] onRegenerateNarration called from TimelineEditor");
          console.log("[EditingStep] sectionId:", sectionId);
          console.log("[EditingStep] text:", text);
          console.log("[EditingStep] voiceId:", voiceId);
          console.log("[EditingStep] regenerateNarration exists:", !!regenerateNarration);
          if (regenerateNarration) {
            console.log("[EditingStep] Calling regenerateNarration(useSession)...");
            await regenerateNarration(sectionId, { narrationText: text, voiceId });
            console.log("[EditingStep] regenerateNarration(useSession) completed");
          } else {
            console.warn("[EditingStep] regenerateNarration prop is not available!");
          }
        }}
      />
    );
  }

  // Play clip preview
  const handlePlayClip = (clipId) => {
    if (playingClip === clipId) {
      setPlayingClip(null);
    } else {
      setPlayingClip(clipId);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={handleBackToVideo}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Video
          </Button>
          <div>
            <h2 className="text-xl font-semibold text-ink">Edit Clips</h2>
            <p className="text-sm text-ink-muted">{sections.length} clips in your video</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setShowTimeline(true)}
            variant="outline"
            className="border-terra text-terra hover:bg-terra/5"
          >
            <Layers className="w-4 h-4 mr-2" />
            Video Editor
          </Button>
          <Button
            onClick={handleReassemble}
            disabled={reassembling || loading}
            className="text-white border-0"
            style={{ background: "var(--gradient-brand)" }}
          >
            {reassembling ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Reassembling...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Reassemble Video
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Clips Timeline */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-surface-alt">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm text-ink-muted mb-4">
            Drag clips to reorder. Click to edit individual clips.
          </p>

          <Reorder.Group
            axis="y"
            values={displaySections}
            onReorder={handleReorder}
            className="space-y-3"
          >
            {displaySections.map((section, index) => (
              <Reorder.Item
                key={section.id}
                value={section}
                onDragEnd={handleDragEnd}
                className="cursor-grab active:cursor-grabbing"
              >
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white rounded-lg border p-4 ${
                    section.status === "FAILED"
                      ? "border-red-300"
                      : section.status === "GENERATING"
                      ? "border-terra/40"
                      : "border-border"
                  }`}
                >
                  <div className="flex gap-2 md:gap-4">
                    {/* Drag Handle */}
                    <div className="flex items-center text-ink-muted">
                      <GripVertical className="w-5 h-5" />
                    </div>

                    {/* Clip Index */}
                    <div className="flex-shrink-0 w-8 h-8 bg-terra/10 rounded-full flex items-center justify-center text-terra font-medium text-sm">
                      {index + 1}
                    </div>

                    {/* Video Thumbnail */}
                    <div className="flex-shrink-0 w-24 h-16 md:w-32 md:h-20 bg-gray-900 rounded-lg overflow-hidden relative">
                      {section.generatedClipUrl ? (
                        <>
                          {playingClip === section.id ? (
                            <video
                              src={section.generatedClipUrl}
                              autoPlay
                              onEnded={() => setPlayingClip(null)}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full relative">
                              {section.imageUrl && (
                                <img
                                  src={section.imageUrl}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              )}
                              <button
                                onClick={() => handlePlayClip(section.id)}
                                className="absolute inset-0 bg-black/30 flex items-center justify-center hover:bg-black/50 transition-colors"
                              >
                                <Play className="w-8 h-8 text-white" />
                              </button>
                            </div>
                          )}
                        </>
                      ) : section.imageUrl ? (
                        <img
                          src={section.imageUrl}
                          alt=""
                          className="w-full h-full object-cover opacity-50"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-ink-muted">
                          <Film className="w-8 h-8" />
                        </div>
                      )}

                      {/* Status Badge */}
                      {section.status === "GENERATING" && (
                        <div className="absolute top-1 right-1 bg-terra text-white text-xs px-1.5 py-0.5 rounded">
                          Generating...
                        </div>
                      )}
                      {section.status === "FAILED" && (
                        <div className="absolute top-1 right-1 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded">
                          Failed
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          section.sectionType === "OPENING"
                            ? "bg-green-100 text-green-800"
                            : section.sectionType === "CLOSING"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-terra/10 text-terra"
                        }`}>
                          {section.sectionType}
                        </span>
                        <span className="text-xs text-ink-muted">
                          {section.clipDuration || 5}s
                        </span>
                      </div>

                      {section.narrationText && (
                        <p className="text-sm text-ink line-clamp-2 mb-1">
                          {section.narrationText}
                        </p>
                      )}

                      {section.visualDescription && (
                        <p className="text-xs text-ink-muted line-clamp-1 italic">
                          Visual: {section.visualDescription}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingClip(section)}
                        title="Edit clip"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRegenerate(section.id)}
                        disabled={loading || section.status === "GENERATING"}
                        title="Regenerate video"
                      >
                        <RefreshCw className={`w-4 h-4 ${section.status === "GENERATING" ? "animate-spin" : ""}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(section.id)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete clip"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </Reorder.Item>
            ))}
          </Reorder.Group>

          {sections.length === 0 && (
            <div className="text-center py-12 text-ink-muted">
              <Film className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No clips in your video yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingClip && (
          <ClipEditModal
            clip={editingClip}
            onClose={() => setEditingClip(null)}
            onSave={async (updates) => {
              await updateClip(editingClip.id, updates);
              setHasChanges(true);
              setEditingClip(null);
            }}
            onRegenerate={async (options) => {
              await handleRegenerate(editingClip.id, options);
              setEditingClip(null);
            }}
            onRegenerateNarration={async (options) => {
              await handleRegenerateNarration(editingClip.id, options);
            }}
            loading={loading}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
