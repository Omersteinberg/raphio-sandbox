// Shared layout constants for the timeline's track stack.
//
// TimelineCanvas.jsx (renders the tracks) and TimelineEditor.jsx (sizes the
// container around them) each need to agree on how tall "all tracks, no
// scroll" actually is. These used to be two independently hand-maintained
// numbers - TimelineCanvas's `totalTracks` local and a hardcoded arithmetic
// literal in TimelineEditor's TIMELINE_DEFAULT_HEIGHT - kept in sync by
// memory alone, and they drifted out of sync at least twice (see the
// timelineHeight.v2 / .v3 localStorage key history). Both files import from
// here now instead, so there is exactly one place a track-count or
// row-height change has to be made.
export const TRACK_HEIGHT = 64; // px, one track row (TimelineTrack's own height)
export const TOTAL_TRACKS = 3; // Video, Narration, Audio/Music
export const RULER_HEIGHT = 32; // px, TimelineRuler's h-8

// Width of the label column at the head of every track row (TimelineTrack's
// and TimelineRuler's `w-32`, plus the ruler's `left-32` tick offset). It sits
// INSIDE the scrolling content, so every conversion between a pointer x and a
// time - drops, trims, ruler seeks, playhead scrubs - and every absolutely
// positioned overlay (playhead, snap line, past-the-end fill) has to offset by
// it. TimelinePlayhead used to carry its own hardcoded 80 for this, which
// silently went stale when the column widened and left the playhead 48px
// short of the 0:00.0 tick. Shared here so there is exactly one number.
export const TRACK_LABEL_WIDTH = 128;

// Ruler + every track row stacked - the exact "fits everything, no vertical
// scroll" content height. TimelineCanvas's playhead/snap-line/past-the-end
// fill and TimelineEditor's default canvas height both key off this.
export const TIMELINE_CONTENT_HEIGHT = RULER_HEIGHT + TRACK_HEIGHT * TOTAL_TRACKS;

// Extra height TimelineEditor gives the canvas beyond its content. A classic
// (Windows, non-overlay) horizontal scrollbar takes layout space INSIDE the
// overflow-auto canvas - measured at 15px in Chromium - so once a project is
// wider than the panel, the rows lose that much room and a spurious vertical
// scrollbar appears. The canvas styles its scrollbars thin (8px WebKit,
// `scrollbar-width: thin` elsewhere - see `.timeline-scroll` in index.css);
// this reserve covers that with margin for Firefox's wider "thin".
export const TIMELINE_SCROLLBAR_RESERVE = 16;
