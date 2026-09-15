import { useState } from "react";
import { Image, Music, Type, Shapes, Settings, ChevronLeft, ChevronRight } from "lucide-react";
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
    <div data-tour="asset-panel" className="relative z-10 flex bg-card border-r border-border shrink-0 editor-surface-raised">
      {/* Rail. Icon and label sit side-by-side on one row (was stacked, which
          forced a 64px column and a cramped 10px label); the wider rail lets
          both use their normal sizes with real breathing room. The active row
          is marked by a terracotta left bar as well as fill + colour, so the
          current section is legible without relying on colour alone. */}
      <div className="w-32 flex flex-col py-3 px-2 gap-1 border-r border-border shrink-0">
        {SECTIONS.map(({ key, label, Icon }) => {
          const isActive = !collapsed && active === key;
          return (
            <button
              key={key}
              onClick={() => selectSection(key)}
              className={`relative w-full flex items-center gap-2.5 py-2.5 px-3 rounded-lg transition-colors ${
                isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              aria-current={isActive}
            >
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-primary" />
              )}
              <Icon className="w-[18px] h-[18px] shrink-0" />
              <span className="text-sm font-medium leading-none">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Active section's panel. w-80 rather than the previous w-64: the
          Audio panel's sub-tabs (Narration / Audio / Music, each with a
          count) could not all fit at 256px and were being pushed into a
          horizontal scroll. Width is spent so every tab is visible at once,
          which is the point of a tab row.

          Media is visual-only and Audio owns every audio asset and action -
          the same AssetPanel in two scopes, so nothing is listed in both. */}
      {!collapsed && (
        <div className="w-80 overflow-y-auto flex flex-col">
          {active === "media" && (
            <AssetPanel
              scope="media"
              sections={sections}
              onRegenerateClip={onRegenerateClip}
              regenerateLabel={regenerateLabel}
            />
          )}

          {active === "audio" && (
            <AssetPanel
              scope="audio"
              sections={sections}
              audioAssets={audioAssets}
              onDeleteAudio={onDeleteAudio}
              onNarrationEdit={onNarrationEdit}
              onRegenerateMusic={onRegenerateMusic}
              onOpenAudioUpload={onOpenAudioUpload}
              onOpenVoice={onOpenVoice}
            />
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
