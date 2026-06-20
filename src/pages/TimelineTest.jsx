import { useState } from "react";
import { TimelineEditor } from "@/components/timeline";

export default function TimelineTest() {
  const [sessionId, setSessionId] = useState("");
  const [showEditor, setShowEditor] = useState(false);

  const handleStart = () => {
    if (sessionId.trim()) {
      setShowEditor(true);
    }
  };

  if (showEditor) {
    return (
      <div className="h-screen">
        <TimelineEditor
          sessionId={sessionId}
          onBack={() => setShowEditor(false)}
          onExportComplete={(video) => {
            console.log("Export complete:", video);
            alert("Export complete! URL: " + video.finalVideoUrl);
          }}
        />
      </div>
    );
  }

  return (
    <div className="editor-dark min-h-screen bg-background flex items-center justify-center">
      <div className="bg-card rounded-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-foreground mb-6">Timeline Editor Test</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-2">
              Session ID
            </label>
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="Enter session ID (e.g., cm...)"
              className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:border-terra"
            />
          </div>

          <button
            onClick={handleStart}
            disabled={!sessionId.trim()}
            className="w-full bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed text-primary-foreground font-medium py-3 rounded-lg transition-colors"
          >
            Open Timeline Editor
          </button>

          <p className="text-xs text-muted-foreground mt-4">
            Enter an existing session ID to test the timeline editor directly.
            You can find session IDs in your browser console or database.
          </p>
        </div>
      </div>
    </div>
  );
}
