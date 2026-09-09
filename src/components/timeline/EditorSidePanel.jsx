import { useState } from "react";
import { Image, Music, Type, Shapes, Settings, Upload, Mic, ChevronLeft, ChevronRight } from "lucide-react";
import AssetPanel from "./AssetPanel";

const SECTIONS = [
  { key: "media", label: "Media", Icon: Image },
  { key: "audio", label: "Audio", Icon: Music },
  { key: "text", label: "Text", Icon: Type },
  { key: "elements", label: "Elements", Icon: Shapes },
  { key: "settings", label: "Settings", Icon: Settings },
];

const COLLAPSE_KEY = "merge:editor:sidePanelCollapsed";

function ComingSoon({ label }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6 text-center">
      <p className="text-sm text-muted-foreground">{label} isn't available yet.</p>
    </div>
  );
}

/**
 * Persistent left navigation: a slim icon rail (Media/Audio/Text/Elements/
 * Settings) plus the active section's panel content beside it. A manual
 * collapse toggle hides the content panel (rail stays, so categories are
 * still reachable) to give the canvas/timeline the width back - collapsed
 * state persists across sessions via localStorage. Never auto-collapses:
 * it only changes on an explicit click of the toggle. Desktop only; mobile
 * gets its own bottom-icon-row equivalent.
 *
 * The toggle itself is a small chevron "notch" docked to the panel's outer
 * right edge, vertically centered - the common sidebar-collapse affordance
 * (VS Code, Notion, Figma) - rather than buried at the bottom of the rail
 * where it went unnoticed. It's positioned relative to the whole panel
 * (not just the rail), so it stays in the same spot whether the content
 * panel is open or collapsed.
 */
export default function EditorSidePanel({
  sections,
  audioAssets,
  onDeleteAudio,
  onNarrationEdit,
  onRegenerateClip,
  onRegenerateMusic,
  regenerateLabel,
  onOpenAudioUpload,
  onOpenVoice,
}) {
  const [active, setActive] = useState("media");
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* localStorage unavailable - collapse still works for this session */
      }
      return next;
    });
  };

  // Picking a category while collapsed should actually show it - a rail icon
  // that does nothing when clicked would be a dead control.
  const selectSection = (key) => {
    setActive(key);
    if (collapsed) toggleCollapsed();
  };

  return (
    <div data-tour="asset-panel" className="relative flex bg-card border-r border-border shrink-0">
      {/* Rail */}
      <div className="w-16 flex flex-col items-center py-2 gap-1 border-r border-border shrink-0">
        {SECTIONS.map(({ key, label, Icon }) => {
          const isActive = !collapsed && active === key;
          return (
            <button
              key={key}
              onClick={() => selectSection(key)}
              className={`w-full flex flex-col items-center gap-1 py-2.5 rounded-lg mx-1 ${
                isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              aria-current={isActive}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Active section's panel */}
      {!collapsed && (
        <div className="w-56 overflow-y-auto flex flex-col">
          {active === "media" && (
            <AssetPanel
              sections={sections}
              audioAssets={audioAssets}
              onDeleteAudio={onDeleteAudio}
              onNarrationEdit={onNarrationEdit}
              onRegenerateClip={onRegenerateClip}
              onRegenerateMusic={onRegenerateMusic}
              regenerateLabel={regenerateLabel}
            />
          )}

          {active === "audio" && (
            <div className="p-3 space-y-2">
              <button
                onClick={onOpenAudioUpload}
                className="w-full flex items-center gap-2 py-2.5 px-3 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted"
              >
                <Upload className="w-4 h-4" />
                Upload audio
              </button>
              <button
                onClick={onOpenVoice}
                className="w-full flex items-center gap-2 py-2.5 px-3 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted"
              >
                <Mic className="w-4 h-4" />
                Generate AI voice
              </button>
              <p className="text-xs text-muted-foreground px-1 pt-1">
                Already-generated narration and music live under Media.
              </p>
            </div>
          )}

          {active === "text" && <ComingSoon label="Text overlays" />}
          {active === "elements" && <ComingSoon label="Elements" />}
          {active === "settings" && <ComingSoon label="Editor settings" />}
        </div>
      )}

      {/* Collapse notch - docked to the panel's outer edge, vertically
          centered, so it's immediately visible without scrolling or hunting
          and stays put whether the panel is expanded or collapsed. */}
      <button
        onClick={toggleCollapsed}
        title={collapsed ? "Expand panel" : "Collapse panel"}
        aria-label={collapsed ? "Expand panel" : "Collapse panel"}
        className="absolute top-1/2 -right-3.5 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-card border border-border text-muted-foreground shadow-sm hover:text-primary hover:border-primary/50"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
