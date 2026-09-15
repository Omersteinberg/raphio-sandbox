import { useState } from "react";
import {
  Trash2,
  Play,
  Pencil,
  RefreshCw,
  Upload,
  Mic,
} from "lucide-react";

// One panel, two scopes, so the rail's Media and Audio categories don't list
// the same assets twice. "media" is visual-only (video clips - a single group,
// so no tab row); "audio" carries the narration / uploads / music groups as a
// tab row, plus the upload and AI-voice actions at the top. The row markup
// and drag payloads are shared, so a clip behaves identically wherever it's
// listed.
const SCOPES = {
  media: [{ key: "video", label: "Video" }],
  audio: [
    { key: "narration", label: "Narration" },
    { key: "audio", label: "Audio" },
    { key: "music", label: "Music" },
  ],
};

export default function AssetPanel({
  scope = "media",
  sections,
  audioAssets = [], // media scope lists no audio, so the host doesn't pass any
  onDeleteAudio,
  onNarrationEdit,
  onRegenerateClip,
  // Opens the background-music prompt modal. Optional: the Music group hides the
  // action when the host does not provide one.
  onRegenerateMusic,
  // "Regenerate" everywhere except the intro pipeline, where a clip is a designed
  // brand scene and the action reworks it rather than re-rolling AI footage.
  regenerateLabel = "Regenerate",
  // Audio scope only: the two quick actions above the groups.
  onOpenAudioUpload,
  onOpenVoice,
}) {
  const TABS = SCOPES[scope];
  const [activeTab, setActiveTab] = useState(TABS[0].key);
  const [playingAudio, setPlayingAudio] = useState(null);

  // Every payload carries the asset's real length. The canvas fits the drop into
  // a gap that size, so it has to be the length the item will actually get (see
  // handleAssetDrop in TimelineEditor, which reads the same fields). It used to
  // send ids only, leaving the canvas to assume 3 seconds for everything and
  // place a 5 second clip in a gap it does not fit.

  // Handle drag start for video clips
  const handleVideoDragStart = (e, section) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        type: "video",
        sectionId: section.id,
        duration: Number(section.clipDuration) || 5,
      })
    );
    e.dataTransfer.effectAllowed = "copy";
  };

  // Handle drag start for audio assets
  const handleAudioDragStart = (e, asset) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        type: "audio",
        audioAssetId: asset.id,
        duration: Number(asset.duration) || 5,
      })
    );
    e.dataTransfer.effectAllowed = "copy";
  };

  // Handle drag start for section narration
  const handleNarrationDragStart = (e, section) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        type: "audio",
        sectionId: section.id,
        duration: Number(section.narrationDuration || section.clipDuration) || 5,
      })
    );
    e.dataTransfer.effectAllowed = "copy";
  };

  // Play audio preview
  const handlePlayAudio = (url) => {
    if (playingAudio === url) {
      setPlayingAudio(null);
    } else {
      setPlayingAudio(url);
    }
  };

  const narrationSections = sections.filter((s) => s.narrationUrl);
  const ttsAssets = audioAssets.filter((a) => a.sourceType === "TTS");
  const uploadAssets = audioAssets.filter((a) => a.sourceType !== "TTS" && a.sourceType !== "AI_MUSIC");
  const musicAssets = audioAssets.filter((a) => a.sourceType === "AI_MUSIC");

  // One draggable audio-asset row (uploads / TTS / music share this markup).
  // Card-tier radius and roomier padding so a row reads as a designed list
  // item rather than a tinted rectangle; the play button keeps its own
  // rounding one tier down, per the Rounder-With-Emphasis rule.
  const assetRow = (asset, btnClass) => (
    <div
      key={asset.id}
      className="bg-muted/50 rounded-xl p-2.5 cursor-grab hover:bg-muted hover:border-primary/30 transition-colors group border border-border"
      draggable
      onDragStart={(e) => handleAudioDragStart(e, asset)}
    >
      <div className="flex items-center gap-2.5">
        <button className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-lg transition-transform active:scale-95 ${btnClass}`} onClick={() => handlePlayAudio(asset.url)}>
          <Play className="w-3 h-3 text-white" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground truncate">{asset.name}</p>
          <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">{Number(asset.duration || 0).toFixed(1)}s</p>
        </div>
        <button
          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1.5 text-muted-foreground hover:text-destructive transition-opacity shrink-0"
          title="Delete"
          aria-label={`Delete ${asset.name}`}
          onClick={(e) => { e.stopPropagation(); onDeleteAudio(asset.id); }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  const emptyNote = (text) => (
    <p className="text-xs text-muted-foreground text-center py-8 px-2 leading-relaxed">{text}</p>
  );

  const tabCounts = {
    video: sections.filter((s) => s.generatedClipUrl).length,
    narration: narrationSections.length + ttsAssets.length,
    audio: uploadAssets.length,
    music: musicAssets.length,
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 pt-4 pb-3">
        <h3 className="text-sm font-semibold text-foreground">{scope === "audio" ? "Audio" : "Media"}</h3>
      </div>

      {scope === "audio" && (
        <div className="px-3 pb-3 space-y-2">
          <button
            onClick={onOpenAudioUpload}
            className="w-full flex items-center gap-2.5 py-3 px-3.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted hover:border-primary/40 transition-colors"
          >
            <Upload className="w-4 h-4 text-primary shrink-0" />
            Upload audio
          </button>
          <button
            onClick={onOpenVoice}
            className="w-full flex items-center gap-2.5 py-3 px-3.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted hover:border-primary/40 transition-colors"
          >
            <Mic className="w-4 h-4 text-primary shrink-0" />
            Generate AI voice
          </button>
        </div>
      )}

      {/* Tab row - underline-marked rather than filled, so it stays quiet
          against the panel and the terracotta underline is the only accent.
          Each tab is flex-1, so all are the same width and the row is evenly
          divided regardless of label length; the panel is sized (w-80 in
          EditorSidePanel) so none of them truncate. No horizontal scroll - a
          tab row you have to scroll to see defeats the point. Skipped when
          the scope has one group: a single tab is just a heading. */}
      {TABS.length > 1 && (
      <div className="flex items-stretch px-3 border-b border-border shrink-0">
        {TABS.map(({ key, label }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              aria-current={isActive}
              className={`relative flex-1 min-w-0 flex items-center justify-center gap-1 px-1 pb-2.5 pt-1 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="text-xs font-semibold truncate">{label}</span>
              {tabCounts[key] > 0 && (
                <span className="text-xs font-medium opacity-60 tabular-nums shrink-0">{tabCounts[key]}</span>
              )}
              {isActive && (
                <span className="absolute left-1 right-1 -bottom-px h-0.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Video clips */}
        {activeTab === "video" && (
          <>
            {sections
              .filter((s) => s.generatedClipUrl)
              .map((section) => (
                <div
                  key={section.id}
                  className="group bg-primary/5 rounded-xl p-2.5 cursor-grab hover:bg-primary/10 hover:border-primary/40 transition-colors border border-primary/20"
                  draggable
                  onDragStart={(e) => handleVideoDragStart(e, section)}
                >
                  <div className="flex items-center gap-2.5">
                    {section.imageUrl && (
                      <img
                        src={section.imageUrl}
                        alt=""
                        className="w-11 h-11 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">
                        {section.narrationText?.substring(0, 40) ||
                          `Clip ${section.orderIndex + 1}`}
                      </p>
                      <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                        {Number(section.clipDuration || 5).toFixed(1)}s
                      </p>
                    </div>
                    {onRegenerateClip && (
                      <button
                        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1.5 text-muted-foreground hover:text-primary transition-opacity flex-shrink-0"
                        title={`${regenerateLabel} clip`}
                        aria-label={`${regenerateLabel} clip`}
                        onClick={(e) => { e.stopPropagation(); onRegenerateClip(section); }}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            {tabCounts.video === 0 && emptyNote("No video clips available yet.")}
          </>
        )}

        {/* Narration (section narration + TTS voice) */}
        {activeTab === "narration" && (
          <>
            {narrationSections.map((section) => (
              <div
                key={`narration-${section.id}`}
                className="bg-blue-500/5 rounded-xl p-2.5 cursor-grab hover:bg-blue-500/10 hover:border-blue-500/40 transition-colors group border border-blue-500/25"
                draggable
                onDragStart={(e) => handleNarrationDragStart(e, section)}
              >
                <div className="flex items-center gap-2.5">
                  <button
                    className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg bg-blue-500 hover:bg-blue-400 transition-transform active:scale-95"
                    aria-label={`Play narration ${section.orderIndex + 1}`}
                    onClick={() => handlePlayAudio(section.narrationUrl)}
                  >
                    <Play className="w-3 h-3 text-white" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">Narration {section.orderIndex + 1}</p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{section.narrationText?.substring(0, 30)}…</p>
                  </div>
                  {onNarrationEdit && (
                    <button
                      className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1.5 text-muted-foreground hover:text-blue-500 transition-opacity shrink-0"
                      title="Edit narration"
                      aria-label={`Edit narration ${section.orderIndex + 1}`}
                      onClick={(e) => { e.stopPropagation(); onNarrationEdit(section); }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {ttsAssets.map((asset) => assetRow(asset, "bg-blue-500 hover:bg-blue-400"))}
            {tabCounts.narration === 0 && emptyNote("No narration yet.")}
          </>
        )}

        {/* Audio (uploaded files) */}
        {activeTab === "audio" && (
          <>
            {uploadAssets.map((asset) => assetRow(asset, "bg-green-500 hover:bg-green-400"))}
            {tabCounts.audio === 0 && emptyNote("No uploaded audio yet.")}
          </>
        )}

        {/* Music (background music) */}
        {activeTab === "music" && (
          <>
            {onRegenerateMusic && (
              <button
                onClick={onRegenerateMusic}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-border text-xs font-medium text-primary hover:bg-primary/5 hover:border-primary/40 transition-colors"
                title={musicAssets.length ? "Generate a different background track" : "Generate background music for this video"}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {musicAssets.length ? "Regenerate music" : "Generate music"}
              </button>
            )}
            {musicAssets.map((asset) => assetRow(asset, "bg-purple-500 hover:bg-purple-400"))}
            {tabCounts.music === 0 && emptyNote("No background music yet.")}
          </>
        )}
      </div>

      {/* Audio player */}
      {playingAudio && (
        <audio
          src={playingAudio}
          autoPlay
          onEnded={() => setPlayingAudio(null)}
          className="hidden"
        />
      )}
    </div>
  );
}
