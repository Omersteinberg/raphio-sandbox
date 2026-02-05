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
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-white mb-6">Timeline Editor Test</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Session ID
            </label>
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="Enter session ID (e.g., cm...)"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            />
          </div>

          <button
            onClick={handleStart}
            disabled={!sessionId.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
          >
            Open Timeline Editor
          </button>

          <p className="text-xs text-gray-500 mt-4">
            Enter an existing session ID to test the timeline editor directly.
            You can find session IDs in your browser console or database.
          </p>
        </div>
      </div>
    </div>
  );
}
