import { useState, useCallback } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ClipEditModal from "./ClipEditModal";

export default function EditingStep({
  session,
  updateClip,
  regenerateClip,
  regenerateNarration,
  reorderClips,
  reassembleVideo,
  deleteClip,
  goToResult,
  loading,
}) {
  const [editingClip, setEditingClip] = useState(null);
  const [playingClip, setPlayingClip] = useState(null);
  const [reassembling, setReassembling] = useState(false);

  const sections = session?.video?.sections || [];
  const sortedSections = [...sections].sort((a, b) => a.orderIndex - b.orderIndex);

  // Handle drag reorder
  const handleReorder = async (newOrder) => {
    const orderMap = newOrder.map((section, index) => ({
      sectionId: section.id,
      orderIndex: index,
    }));
    await reorderClips(orderMap);
  };

  // Handle clip regeneration
  const handleRegenerate = async (clipId, options = {}) => {
    await regenerateClip(clipId, options);
  };

  // Handle narration regeneration
  const handleRegenerateNarration = async (clipId, options = {}) => {
    if (regenerateNarration) {
      await regenerateNarration(clipId, options);
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
    } finally {
      setReassembling(false);
    }
  };

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
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={goToResult}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Video
          </Button>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Edit Clips</h2>
            <p className="text-sm text-gray-500">{sections.length} clips in your video</p>
          </div>
        </div>
        <Button
          onClick={handleReassemble}
          disabled={reassembling || loading}
          className="bg-purple-600 hover:bg-purple-700 text-white"
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

      {/* Clips Timeline */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm text-gray-600 mb-4">
            Drag clips to reorder. Click to edit individual clips.
          </p>

          <Reorder.Group
            axis="y"
            values={sortedSections}
            onReorder={handleReorder}
            className="space-y-3"
          >
            {sortedSections.map((section, index) => (
              <Reorder.Item
                key={section.id}
                value={section}
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
                      ? "border-purple-300"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Drag Handle */}
                    <div className="flex items-center text-gray-400">
                      <GripVertical className="w-5 h-5" />
                    </div>

                    {/* Clip Index */}
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-medium text-sm">
                      {index + 1}
                    </div>

                    {/* Video Thumbnail */}
                    <div className="flex-shrink-0 w-32 h-20 bg-gray-900 rounded-lg overflow-hidden relative">
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
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                          <Film className="w-8 h-8" />
                        </div>
                      )}

                      {/* Status Badge */}
                      {section.status === "GENERATING" && (
                        <div className="absolute top-1 right-1 bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded">
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
                            : "bg-purple-100 text-purple-800"
                        }`}>
                          {section.sectionType}
                        </span>
                        <span className="text-xs text-gray-500">
                          {section.clipDuration || 5}s
                        </span>
                      </div>

                      {section.narrationText && (
                        <p className="text-sm text-gray-900 line-clamp-2 mb-1">
                          {section.narrationText}
                        </p>
                      )}

                      {section.visualDescription && (
                        <p className="text-xs text-gray-500 line-clamp-1 italic">
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
                      {section.sectionType === "CONTENT" && (
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
                      )}
                    </div>
                  </div>
                </motion.div>
              </Reorder.Item>
            ))}
          </Reorder.Group>

          {sections.length === 0 && (
            <div className="text-center py-12 text-gray-500">
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
