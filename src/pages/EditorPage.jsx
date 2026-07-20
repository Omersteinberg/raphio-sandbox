import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { enterEditingMode, updateClip, regenerateNarration } from "@/services/session";
import { TimelineEditor } from "@/components/timeline";

// The single editor route (/video/:id/edit) for BOTH desktop and mobile. It
// renders the responsive timeline editor directly - no "Edit Clips" list, no
// Creator/useSession wizard (whose stage round-trip could land desktop on the
// result screen, and whose entry loops on mobile).
//
// enterEditingMode only flips the session stage (COMPLETED → EDITING); it does
// NOT build the timeline, and getTimeline works regardless. So we fire it in the
// background instead of gating the UI behind a second loading screen - that
// extra spinner (on top of the editor's own "Loading timeline…") caused a flash
// on entry. Now there's a single, smooth loader.
export default function EditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    enterEditingMode(id).catch((err) =>
      console.error("[EditorPage] enterEditingMode:", err)
    );
  }, [id]);

  return (
    <TimelineEditor
      sessionId={id}
      onBack={() => navigate(`/video/${id}`)}
      onExportComplete={() => navigate(`/video/${id}`)}
      onUpdateSection={async (sectionId, updates) => {
        await updateClip(id, sectionId, updates);
      }}
      onRegenerateNarration={async (sectionId, text, voiceId, tone) => {
        await regenerateNarration(id, sectionId, { narrationText: text, voiceId, tone });
      }}
    />
  );
}
