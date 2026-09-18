import { TimelineEditor } from "@/components/timeline";

// The old "Edit Clips" list was removed - editing now happens entirely in the
// timeline editor. This thin wrapper drops the user straight into it and keeps
// the same prop signature the pipeline creators already pass.
export default function EditingStep({
  sessionId,
  updateClip,
  regenerateNarration,
  goToResult,
  refreshSession,
}) {
  const handleExportComplete = async () => {
    // Refresh the session so finalVideoUrl is current on the result page.
    if (refreshSession) await refreshSession();
    goToResult();
  };

  return (
    <TimelineEditor
      sessionId={sessionId}
      onBack={goToResult}
      onExportComplete={handleExportComplete}
      onUpdateSection={async (sectionId, updates) => {
        await updateClip(sectionId, updates);
      }}
      // `tone` is the delivery the user picked in the narration modal. Dropping
      // it here silently fell back to the section's saved tone, so the picker did
      // nothing from inside the wizard while working from the My Videos editor
      // (EditorPage), which always passed it through.
      onRegenerateNarration={async (sectionId, text, voiceId, tone) => {
        if (regenerateNarration) {
          await regenerateNarration(sectionId, { narrationText: text, voiceId, tone });
        }
      }}
    />
  );
}
