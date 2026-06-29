import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, Film, Edit3, RefreshCw, Trash2, GripVertical, Layers,
} from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, arrayMove, useSortable,
} from "@dnd-kit/sortable";
import {
  getSession, enterEditingMode, updateClip, regenerateClip,
  regenerateNarration, reorderClips, deleteClip, reassembleVideo,
} from "@/services/session";
import { TimelineEditor } from "@/components/timeline";
import ClipEditModal from "@/components/session/ClipEditModal";
import ExportProgressModal from "@/components/timeline/modals/ExportProgressModal";

// One clip row. Drag listeners live only on the grip handle (touch-action:none)
// so the list still scrolls; dnd-kit is touch-safe (unlike framer Reorder).
function ClipRow({ id, section, index, onEdit, onRegenerate, onDelete, busy }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 20 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 rounded-xl bg-white border border-border">
      <button {...attributes} {...listeners} className="touch-none p-1 text-ink-muted shrink-0 cursor-grab active:cursor-grabbing" aria-label="Drag to reorder">
        <GripVertical className="w-5 h-5" />
      </button>
      <span className="shrink-0 w-6 h-6 rounded-full bg-terra/10 text-terra text-xs font-bold flex items-center justify-center">
        {index + 1}
      </span>
      <div className="w-16 h-10 rounded-md overflow-hidden bg-gray-900 shrink-0 relative flex items-center justify-center">
        {section.imageUrl ? (
          <img src={section.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Film className="w-4 h-4 text-white/50" />
        )}
        {section.status === "GENERATING" && (
          <span className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink truncate">
          {section.narrationText || section.sectionType || `Clip ${index + 1}`}
        </p>
        <p className="text-xs text-ink-muted">
          {(section.clipDuration || 5)}s{section.status === "FAILED" ? " · failed" : ""}
        </p>
      </div>
      <button onClick={onEdit} className="p-2 text-ink-muted shrink-0" aria-label="Edit clip">
        <Edit3 className="w-4 h-4" />
      </button>
      <button onClick={onRegenerate} disabled={busy || section.status === "GENERATING"} className="p-2 text-ink-muted shrink-0 disabled:opacity-40" aria-label="Regenerate clip">
        <RefreshCw className={`w-4 h-4 ${section.status === "GENERATING" ? "animate-spin" : ""}`} />
      </button>
      <button onClick={onDelete} disabled={busy} className="p-2 text-red-500 shrink-0 disabled:opacity-40" aria-label="Delete clip">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// Standalone mobile editing flow — mirrors desktop's two screens (Edit Clips
// list → Timeline editor) but built directly on the session services, bypassing
// the Creator/useSession wizard whose entry loops on mobile.
export default function MobileEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reassembling, setReassembling] = useState(false);
  const [reassembleProgress, setReassembleProgress] = useState(null); // { percentage, label }
  const [view, setView] = useState("clips"); // 'clips' | 'timeline'
  const [editingClip, setEditingClip] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
  );

  const load = useCallback(async () => {
    try {
      const data = await getSession(id);
      setSession(data);
    } catch (err) {
      toast.error("Failed to load video");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Enter editing mode once, then load the session.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { await enterEditingMode(id); } catch (err) { console.error("[MobileEditorPage] enterEditingMode:", err); }
      if (!cancelled) await load();
    })();
    return () => { cancelled = true; };
  }, [id, load]);

  const sections = [...(session?.video?.sections || [])].sort((a, b) => a.orderIndex - b.orderIndex);

  const handleReorder = async ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldI = sections.findIndex((s) => s.id === active.id);
    const newI = sections.findIndex((s) => s.id === over.id);
    if (oldI < 0 || newI < 0) return;
    const next = arrayMove(sections, oldI, newI).map((s, i) => ({ ...s, orderIndex: i }));
    setSession((prev) => ({ ...prev, video: { ...prev.video, sections: next } })); // optimistic
    try {
      await reorderClips(id, next.map((s, i) => ({ sectionId: s.id, orderIndex: i })));
    } catch (err) {
      toast.error("Couldn't save the new order");
      load();
    }
  };

  const handleDelete = async (clipId) => {
    if (!window.confirm("Delete this clip?")) return;
    setBusy(true);
    try { await deleteClip(id, clipId); await load(); }
    catch (err) { toast.error("Delete failed"); }
    finally { setBusy(false); }
  };

  const handleRegenerate = async (clipId, opts = {}) => {
    setBusy(true);
    try {
      await regenerateClip(id, clipId, opts);
      toast.info("Regenerating clip — this can take a few minutes.");
      await load();
    } catch (err) { toast.error("Regenerate failed"); }
    finally { setBusy(false); }
  };

  const handleReassemble = async () => {
    setReassembling(true);
    setReassembleProgress({ percentage: 0, label: "Starting…" });
    try {
      const result = await reassembleVideo(id, { regenerateAudio: false }, setReassembleProgress);
      // null = another job superseded ours; stay quiet instead of a false success.
      if (result) {
        toast.success("Video updated!");
        await load();
      }
    } catch (err) { toast.error(err?.message || "Reassemble failed"); }
    finally { setReassembling(false); setReassembleProgress(null); }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-surface-alt font-figtree">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-terra mx-auto mb-4" />
          <p className="text-ink-muted">Loading editor…</p>
        </div>
      </div>
    );
  }

  // Timeline editor view (the real touch-enabled TimelineEditor).
  if (view === "timeline") {
    return (
      <TimelineEditor
        sessionId={id}
        onBack={() => { setView("clips"); load(); }}
        // After export, go to the finished-video page (player + Download), the
        // same payoff desktop gives — not back to the Edit Clips list, which
        // shows no result and makes users think the export didn't "save."
        onExportComplete={() => navigate(`/video/${id}`)}
        onUpdateSection={async (sectionId, updates) => { await updateClip(id, sectionId, updates); }}
        onRegenerateNarration={async (sectionId, text, voiceId) => {
          await regenerateNarration(id, sectionId, { narrationText: text, voiceId });
        }}
      />
    );
  }

  // Edit Clips list view (mirrors desktop's EditingStep).
  return (
    <div className="w-full h-full flex flex-col bg-surface-alt font-figtree">
      {/* Header */}
      <div className="bg-white border-b border-border px-3 py-2 flex items-center justify-between gap-2 shrink-0">
        <Button variant="ghost" onClick={() => navigate(`/video/${id}`)} className="px-2 text-ink-muted">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <h2 className="text-base font-semibold text-ink truncate">Edit Clips</h2>
        <Button onClick={handleReassemble} disabled={reassembling || busy} size="sm" className="text-white border-0" style={{ background: "var(--gradient-brand)" }}>
          {reassembling ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
          Rebuild Video
        </Button>
      </div>

      {/* Open timeline editor */}
      <div className="px-4 pt-3 shrink-0">
        <Button variant="outline" onClick={() => setView("timeline")} className="w-full border-terra text-terra hover:bg-terra/5">
          <Layers className="w-4 h-4 mr-2" />
          Open Timeline Editor
        </Button>
      </div>

      {/* Clips list */}
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-sm text-ink-muted mb-3">Drag to reorder · edit, regenerate, or delete a clip.</p>
        {sections.length === 0 ? (
          <div className="text-center py-12 text-ink-muted">
            <Film className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No clips yet</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleReorder}>
            <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {sections.map((section, index) => (
                  <ClipRow
                    key={section.id}
                    id={section.id}
                    section={section}
                    index={index}
                    busy={busy}
                    onEdit={() => setEditingClip(section)}
                    onRegenerate={() => handleRegenerate(section.id)}
                    onDelete={() => handleDelete(section.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Clip edit modal (reused from desktop) */}
      {editingClip && (
        <ClipEditModal
          clip={editingClip}
          loading={busy}
          onClose={() => setEditingClip(null)}
          onSave={async (updates) => { await updateClip(id, editingClip.id, updates); await load(); setEditingClip(null); }}
          onRegenerate={async (opts) => { await handleRegenerate(editingClip.id, opts); setEditingClip(null); }}
          onRegenerateNarration={async ({ narrationText }) => { await regenerateNarration(id, editingClip.id, { narrationText }); await load(); }}
        />
      )}

      {/* Rebuild progress (replaces the bare button spinner) */}
      {reassembling && (
        <ExportProgressModal progress={reassembleProgress} title="Rebuilding your video" />
      )}
    </div>
  );
}
