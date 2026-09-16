import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import TimelineRuler from "./TimelineRuler";
import TimelinePlayhead from "./TimelinePlayhead";
import TimelineTrack from "./TimelineTrack";
import { toast } from "@/lib/toast";
import { TRACK_HEIGHT, TOTAL_TRACKS, TRACK_LABEL_WIDTH } from "@/lib/timelineLayout";

const SNAP_THRESHOLD_PX = 10; // Snap within 10 pixels
const MIN_DURATION = 0.5; // Shortest a clip can be trimmed to (seconds)

// How far a dropped asset may be nudged to avoid an overlap, in pixels, so the
// nudge scales with zoom the way the user's sense of "about here" does. Past
// this the drop keeps the position it was made at and simply overlaps (the
// track flags overlapping clips in red).
//
// Without a limit, findNonOverlappingPosition returns the nearest free slot
// ANYWHERE on the row. A brand intro tiles its video track edge to edge with no
// gaps, so the only free slot is past the last clip: every drop silently landed
// at the end of the timeline, off screen, which read as the drag doing nothing.
const DROP_NUDGE_LIMIT_PX = 80;

// Clips that merely touch are not overlapping. Timeline rows are written from
// frame math and stored as doubles, so a butt joint lands a fraction either side
// of exact: a freshly assembled intro has a pair whose ends differ by 1.78e-15s.
// With no tolerance that reads as an overlap, which paints the pair red and lets
// the noise reject slots that are genuinely free. 5ms is well under a frame at
// 30fps and a quarter of a pixel at zoom 1, so nothing visible can hide in it.
const OVERLAP_EPSILON = 0.005;

export default function TimelineCanvas({
  videoItems,
  audioItems,
  duration,
  playheadPosition,
  pixelsPerSecond,
  selectedItem,
  onSelectItem,
  onSeek,
  onUpdateItem,
  onItemEdit,
  getSection,
  getAudioAsset,
  onAssetDrop,
  sessionId,
  onBoundaryClick,
}) {
  const containerRef = useRef(null);
  // Visible width of the scroll container itself, so timelineWidth (below)
  // can use it as the floor instead of a hardcoded guess. Without this, a
  // fixed floor is either too wide for a narrow panel (forcing a horizontal
  // scrollbar - which then eats vertical space inside this overflow-auto box
  // and can trigger an unwanted vertical scrollbar too) or too narrow for a
  // wide one (leaving dead space that should've been filled, no scroll
  // needed either way). ResizeObserver rather than a one-time read because
  // the panel is user-resizable (drag handle) and the window can resize.
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState(null); // 'move', 'trim-start', 'trim-end'
  const [dragItem, setDragItem] = useState(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartValue, setDragStartValue] = useState(0);
  const [dragOffset, setDragOffset] = useState(0); // Current drag offset in pixels
  const [snapIndicator, setSnapIndicator] = useState(null); // { time: number } for visual snap line
  const [dropRow, setDropRow] = useState(null); // { trackType, trackIndex } row under an asset being dragged in

  // The actual content this row of tracks needs: the label column plus every
  // second of the project, plus a little breathing room past the last clip so
  // a drop there doesn't land flush against the edge. Floored at the
  // container's own measured width (not a fixed guess) so a short/empty
  // project fills the panel exactly - no horizontal scrollbar - and only a
  // genuinely wide project (content wider than the panel) grows past it.
  // Floored: contentRect.width is fractional under flex layouts / browser
  // zoom, and a 1103.5px content box inside a 1103px client box rounds
  // scrollWidth up to 1104 - a phantom 1px horizontal scrollbar.
  const timelineWidth = Math.max(
    TRACK_LABEL_WIDTH + duration * pixelsPerSecond + 40,
    Math.floor(containerWidth)
  );
  // Both imported from lib/timelineLayout.js rather than declared locally -
  // TimelineEditor's default-canvas-height math reads the same module, so
  // the two can no longer drift the way they did twice before (see that
  // file's header comment).
  const trackHeight = TRACK_HEIGHT;
  const totalTracks = TOTAL_TRACKS;

  // Group audio into two rows by source KIND (not stored trackIndex, so older
  // timelines map correctly): Narration (section narration + TTS voice), and
  // Audio/Music (uploads + background music, merged into one row - they were
  // two rows before; per-item styling still tells them apart, see
  // TimelineItem's own audioKind()).
  const audioKind = (item) => {
    if (item.sectionId) return "narration";
    const a = item.audioAssetId ? getAudioAsset(item.audioAssetId) : null;
    if (a?.sourceType === "AI_MUSIC") return "music";
    if (a?.sourceType === "TTS") return "narration";
    return "audio"; // UPLOAD or anything else
  };
  const narrationItems = audioItems.filter((i) => audioKind(i) === "narration");
  const audioMusicItems = audioItems.filter((i) => audioKind(i) !== "narration");

  // The items on one ROW, addressed the way the rows are rendered below. Used
  // for drops, where there is no existing item to infer the row from.
  const rowItems = useCallback(
    (trackType, trackIndex) => {
      if (trackType === "VIDEO") return videoItems;
      if (trackIndex === 1) return audioMusicItems;
      return narrationItems;
    },
    [videoItems, narrationItems, audioMusicItems]
  );

  // The row an item lives on. An existing item knows its own by membership
  // (kind-based), so it is found regardless of the trackIndex stored against it.
  // Something being dropped has no item yet, and inferring from a null id used to
  // fall through every branch to the narration row: audio dropped on Audio or
  // Music was fitted around lines it could not collide with, and landed on top of
  // the clips that were really there.
  const rowFor = useCallback(
    (itemId, trackType, trackIndex = 0) => {
      if (!itemId) return rowItems(trackType, trackIndex);
      if (trackType === "VIDEO") return videoItems;
      if (audioMusicItems.some((i) => i.id === itemId)) return audioMusicItems;
      return narrationItems;
    },
    [rowItems, videoItems, narrationItems, audioMusicItems]
  );

  // The clip boundary nearest `time` on a row: 0, or the start or end of one of
  // its clips. An insert goes BETWEEN clips, never through the middle of one, so
  // a drop that lands inside a clip is taken to the closer of its two edges.
  const nearestInsertPoint = useCallback(
    (time, trackType, trackIndex = 0) => {
      const edges = [0];
      for (const it of rowItems(trackType, trackIndex)) {
        edges.push(it.startTime, it.startTime + it.duration);
      }
      return edges.reduce((best, e) => (Math.abs(e - time) < Math.abs(best - time) ? e : best), 0);
    },
    [rowItems]
  );

  // Would an item of `itemDuration` starting at `st` collide with anything else
  // on its own row?
  const collidesOnRow = useCallback(
    (itemId, st, itemDuration, trackType, trackIndex = 0) =>
      rowFor(itemId, trackType, trackIndex).some(
        (o) =>
          o.id !== itemId &&
          st < o.startTime + o.duration - OVERLAP_EPSILON &&
          st + itemDuration > o.startTime + OVERLAP_EPSILON
      ),
    [rowFor]
  );

  // Underlying source length for a clip - used to clamp trimming.
  const getSourceDuration = (item) => {
    if (item.trackType === "VIDEO") {
      const s = item.sectionId ? getSection(item.sectionId) : null;
      return s?.clipDuration || (item.trimStart || 0) + item.duration;
    }
    const a = item.audioAssetId ? getAudioAsset(item.audioAssetId) : null;
    if (a?.duration) return a.duration;
    const s = item.sectionId ? getSection(item.sectionId) : null;
    return s?.narrationDuration ?? s?.clipDuration ?? ((item.trimStart || 0) + item.duration);
  };

  // Snap points: the edges of EVERY clip on EVERY track (so a clip lines up with
  // clips above/below it, like CapCut), plus the playhead, the timeline start,
  // and the timeline end. No fine grid - that made dragging feel steppy and
  // drowned out the meaningful alignment points.
  const getSnapPoints = useCallback(
    (draggedItem) => {
      const points = new Set();

      [...videoItems, ...narrationItems, ...audioMusicItems].forEach((item) => {
        if (item.id === draggedItem.id) return;
        points.add(item.startTime);
        points.add(item.startTime + item.duration);
      });

      points.add(playheadPosition);
      points.add(0);
      if (duration > 0) points.add(duration);

      return [...points];
    },
    [videoItems, narrationItems, audioMusicItems, playheadPosition, duration]
  );

  // Find the nearest snap target for a given time value
  const findSnapTarget = useCallback(
    (time, draggedItem) => {
      const snapPoints = getSnapPoints(draggedItem);
      const thresholdTime = SNAP_THRESHOLD_PX / pixelsPerSecond;

      let closest = null;
      let closestDist = Infinity;

      for (const point of snapPoints) {
        const dist = Math.abs(time - point);
        if (dist < closestDist && dist <= thresholdTime) {
          closest = point;
          closestDist = dist;
        }
      }

      return closest;
    },
    [getSnapPoints, pixelsPerSecond]
  );

  // Find nearest non-overlapping position for an item.
  //
  // `maxNudge` caps how far the result may sit from `startTime`; past it the
  // request is returned untouched. Callers that are placing something at a
  // deliberate position (a drop) pass one, so a row with no gap near the pointer
  // overlaps in place instead of teleporting to the end of the timeline.
  const findNonOverlappingPosition = useCallback(
    (itemId, startTime, itemDuration, trackType, trackIdx = 0, maxNudge = Infinity) => {
      // Only VIDEO needs its items kept apart - the export concatenates video
      // clips in start order, so overlap there silently plays both clips in
      // full rather than compositing, producing a longer video than the
      // timeline implies (see detectOverlaps below). AUDIO items amix, so
      // overlap is a normal, intended edit (a narration line over a music
      // bed) - detectOverlaps/videoOverlaps already never flags it as an
      // error for audio; this system was the one place still disagreeing
      // with that, silently nudging a dragged/dropped audio item away from
      // an overlap it should have been allowed to create.
      if (trackType !== "VIDEO") return startTime;

      const others = rowFor(itemId, trackType, trackIdx).filter((it) => it.id !== itemId);

      const wouldOverlap = (st) => {
        const end = st + itemDuration;
        return others.some(
          (o) =>
            st < o.startTime + o.duration - OVERLAP_EPSILON &&
            end > o.startTime + OVERLAP_EPSILON
        );
      };

      if (!wouldOverlap(startTime)) return startTime;

      // Try snapping to the end of the overlapping item, or the start minus duration
      let bestPos = startTime;
      let bestDist = Infinity;

      for (const other of others) {
        // Place right after this item
        const afterPos = other.startTime + other.duration;
        if (!wouldOverlap(afterPos)) {
          const dist = Math.abs(afterPos - startTime);
          if (dist < bestDist) {
            bestDist = dist;
            bestPos = afterPos;
          }
        }

        // Place right before this item
        const beforePos = other.startTime - itemDuration;
        if (beforePos >= 0 && !wouldOverlap(beforePos)) {
          const dist = Math.abs(beforePos - startTime);
          if (dist < bestDist) {
            bestDist = dist;
            bestPos = beforePos;
          }
        }
      }

      if (bestDist > maxNudge) return startTime;
      return Math.max(0, bestPos);
    },
    [rowFor]
  );

  // Where a moved clip actually lands: snapped, then kept off its neighbours.
  //
  // Shared by the drag preview and the commit, so the clip stops where it was
  // drawn. They used to run their own copies of the snap and only the commit
  // avoided overlaps, so a clip visibly jumped on release.
  const resolveMoveStart = useCallback(
    (item, rawStart) => {
      const dur = item.duration;
      const snapStart = findSnapTarget(rawStart, item);
      const snapEnd = findSnapTarget(rawStart + dur, item);

      const candidates = [];
      if (snapStart !== null) candidates.push({ pos: snapStart, dist: Math.abs(rawStart - snapStart) });
      if (snapEnd !== null) candidates.push({ pos: snapEnd - dur, dist: Math.abs(rawStart + dur - snapEnd) });
      candidates.sort((a, b) => a.dist - b.dist);

      // Snap points are the edges of every clip on every track, which is what
      // lets a clip line up with one on the track above. On its OWN row that
      // means the nearest point can be a neighbour's START, and snapping to it
      // lays the clip straight on top of that neighbour: a collision, not an
      // alignment, and one the user saw flagged red the moment it landed. So a
      // snap that leaves the row clear wins over a nearer one that does not -
      // VIDEO only. AUDIO overlap is a legitimate edit (see
      // findNonOverlappingPosition), so audio just takes the nearest snap
      // candidate outright; biasing it away from a "colliding" one would
      // still be second-guessing an overlap the user is allowed to make.
      const clear =
        item.trackType === "VIDEO"
          ? candidates.find(
              (c) => c.pos >= 0 && !collidesOnRow(item.id, Math.max(0, c.pos), dur, item.trackType, item.trackIndex)
            )
          : null;
      const chosen = clear || candidates[0];
      const snapped = Math.max(0, chosen ? chosen.pos : rawStart);

      return findNonOverlappingPosition(
        item.id,
        snapped,
        dur,
        item.trackType,
        item.trackIndex,
        DROP_NUDGE_LIMIT_PX / pixelsPerSecond
      );
    },
    [findSnapTarget, findNonOverlappingPosition, collidesOnRow, pixelsPerSecond]
  );

  // Detect overlapping items
  const detectOverlaps = useCallback((items) => {
    const overlaps = new Set();
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        const aStart = a.startTime;
        const aEnd = a.startTime + a.duration;
        const bStart = b.startTime;
        const bEnd = b.startTime + b.duration;

        // Check if they overlap. Touching edges do not count - see OVERLAP_EPSILON.
        if (aStart < bEnd - OVERLAP_EPSILON && aEnd > bStart + OVERLAP_EPSILON) {
          overlaps.add(a.id);
          overlaps.add(b.id);
        }
      }
    }
    return overlaps;
  }, []);

  // Overlaps are only a problem on the VIDEO row. The export concatenates video
  // items in start order and black-fills the gaps, so two clips sharing a moment
  // do not composite, they play one after the other and the finished video comes
  // out longer than the timeline says. Audio items are delayed and amixed, which
  // is precisely what overlapping audio is FOR: a line over a music bed is the
  // normal case, not a fault. Painting those red said something was wrong when
  // nothing was.
  const videoOverlaps = useMemo(() => detectOverlaps(videoItems), [videoItems, detectOverlaps]);
  const noOverlaps = useMemo(() => new Set(), []);

  // One boundary per pair of adjacent (touching, no gap) VIDEO clips, in
  // nominal startTime/duration terms - the same terms adjacency is defined in
  // everywhere else on this canvas (OVERLAP_EPSILON), and the terms that stay
  // stable regardless of whether a transition is currently applied there (a
  // transition never changes startTime/duration, only how the pair renders
  // via effectiveStartTime and how it exports). `transitionIn`/
  // `transitionInDuration` live on the LATER clip of the pair - "this clip
  // transitions in from the one before it".
  const videoBoundaries = useMemo(() => {
    const sorted = [...videoItems].sort((a, b) => a.startTime - b.startTime);
    const boundaries = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const before = sorted[i];
      const after = sorted[i + 1];
      const gap = after.startTime - (before.startTime + before.duration);
      if (Math.abs(gap) > OVERLAP_EPSILON) continue; // a real gap - not a valid transition boundary
      boundaries.push({
        id: `${before.id}:${after.id}`,
        time: before.startTime + before.duration,
        beforeId: before.id,
        afterId: after.id,
        // Any real transition type, not just crossfade - was hardcoded to
        // "crossfade" only, so Fade to Black/Wipe/Slide silently rendered as
        // "no transition" here even though they saved correctly.
        transition:
          after.transitionIn && after.transitionIn !== "none"
            ? { type: after.transitionIn, duration: Number(after.transitionInDuration) || 0.5 }
            : null,
      });
    }
    return boundaries;
  }, [videoItems]);

  // Calculate drag preview position for the dragged item (with snapping)
  const getDragPreview = useCallback(() => {
    if (!isDragging || !dragItem) return null;

    const deltaTime = dragOffset / pixelsPerSecond;

    if (dragType === "move") {
      return {
        itemId: dragItem.id,
        previewStartTime: resolveMoveStart(dragItem, Math.max(0, dragStartValue + deltaTime)),
        previewDuration: dragItem.duration,
        dragType,
      };
    }

    if (dragType === "trim-end") {
      const sourceDuration = getSourceDuration(dragItem);
      const ts = dragItem.trimStart || 0;
      const newDuration = Math.max(MIN_DURATION, Math.min(dragStartValue + deltaTime, sourceDuration - ts));
      return { itemId: dragItem.id, previewStartTime: dragItem.startTime, previewDuration: newDuration, dragType };
    }

    if (dragType === "trim-start") {
      // Right edge stays fixed: trimming the in-point moves startTime and shrinks duration.
      const te = dragItem.trimEnd ?? ((dragItem.trimStart || 0) + dragItem.duration);
      const newTrimStart = Math.max(0, Math.min(dragStartValue + deltaTime, te - MIN_DURATION));
      const delta = newTrimStart - (dragItem.trimStart || 0);
      return {
        itemId: dragItem.id,
        previewStartTime: Math.max(0, dragItem.startTime + delta),
        previewDuration: te - newTrimStart,
        dragType,
      };
    }

    return null;
  }, [isDragging, dragItem, dragType, dragOffset, dragStartValue, pixelsPerSecond, resolveMoveStart, getSection, getAudioAsset]);

  const dragPreview = getDragPreview();

  // Update snap indicator whenever drag preview changes
  useEffect(() => {
    if (!dragPreview || !dragItem) {
      setSnapIndicator(null);
      return;
    }
    // Snapping only applies to move; trimming has no snap line.
    if (dragType !== "move") {
      setSnapIndicator(null);
      return;
    }

    const deltaTime = dragOffset / pixelsPerSecond;
    const rawStartTime = Math.max(0, dragStartValue + deltaTime);

    // Check if we actually snapped (preview differs from raw position)
    const snappedStart = dragPreview.previewStartTime;
    const threshold = SNAP_THRESHOLD_PX / pixelsPerSecond;

    if (Math.abs(snappedStart - rawStartTime) > 0.001) {
      // We snapped the start edge
      const endSnap = snappedStart + dragItem.duration;
      const rawEnd = rawStartTime + dragItem.duration;
      // Show the snap line at whichever edge snapped
      if (Math.abs(snappedStart - rawStartTime) <= Math.abs(endSnap - rawEnd)) {
        setSnapIndicator({ time: snappedStart });
      } else {
        setSnapIndicator({ time: endSnap });
      }
    } else {
      setSnapIndicator(null);
    }
  }, [dragPreview, dragItem, dragOffset, dragStartValue, pixelsPerSecond]);

  // Handle scroll
  const handleScroll = (e) => {
    setScrollLeft(e.target.scrollLeft);
  };

  // Read an X coordinate from either a mouse or a touch event.
  const eventClientX = (e) =>
    e.clientX ?? e.touches?.[0]?.clientX ?? e.changedTouches?.[0]?.clientX ?? null;

  // Handle ruler click / tap to seek
  const handleRulerSeek = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = eventClientX(e);
    if (clientX == null) return;
    const x = clientX - rect.left + scrollLeft - TRACK_LABEL_WIDTH;
    const time = x / pixelsPerSecond;
    onSeek(Math.max(0, Math.min(duration, time)));
  };

  // Handle item drag start (mouse or touch)
  const handleItemDragStart = (item, type, e) => {
    e.stopPropagation();
    const clientX = eventClientX(e);
    setIsDragging(true);
    setDragType(type);
    setDragItem(item);
    setDragStartX(clientX ?? 0);
    setDragStartValue(
      type === "move"
        ? item.startTime
        : type === "trim-start"
        ? (item.trimStart || 0)
        : item.duration
    );
  };

  // Handle drag move
  const handleDragMove = useCallback(
    (e) => {
      if (!isDragging || !dragItem) return;
      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      if (clientX == null) return;
      // Stop the timeline (and page) from scrolling while dragging a clip on touch.
      if (e.cancelable) e.preventDefault();
      const deltaX = clientX - dragStartX;
      setDragOffset(deltaX); // Update drag offset for visual feedback
    },
    [isDragging, dragItem, dragStartX]
  );

  // Handle drag end (with snapping + overlap prevention)
  // Would this proposed change pull a VIDEO clip away from a neighbour it has
  // an active transition against? Checked before the update is sent, not only
  // after a backend rejection - the backend throws for the same reason
  // (adjacency required), but the UI should never show a drag "succeed" and
  // then have it silently revert once the save comes back an error.
  const wouldBreakTransition = useCallback(
    (item, newStartTime, newDuration) => {
      if (item.trackType !== "VIDEO") return false;
      const others = videoItems.filter((o) => o.id !== item.id);

      // This item's own incoming transition (from whichever clip currently
      // touches its left edge) breaks if that left edge moves away. Any real
      // transition type, not just crossfade - was hardcoded, so dragging a
      // clip with a Fade to Black/Wipe/Slide transition didn't protect it
      // from being pulled away from its neighbour.
      if (item.transitionIn && item.transitionIn !== "none") {
        const leftNeighbor = others.find(
          (o) => Math.abs(o.startTime + o.duration - item.startTime) <= OVERLAP_EPSILON
        );
        if (
          leftNeighbor &&
          Math.abs(leftNeighbor.startTime + leftNeighbor.duration - newStartTime) > OVERLAP_EPSILON
        ) {
          return true;
        }
      }

      // The next clip's incoming transition (referencing THIS item) breaks if
      // this item's right edge moves away from that neighbour's start.
      const currentEnd = item.startTime + item.duration;
      const rightNeighbor = others.find((o) => Math.abs(o.startTime - currentEnd) <= OVERLAP_EPSILON);
      if (rightNeighbor?.transitionIn && rightNeighbor.transitionIn !== "none") {
        const newEnd = newStartTime + newDuration;
        if (Math.abs(rightNeighbor.startTime - newEnd) > OVERLAP_EPSILON) return true;
      }

      return false;
    },
    [videoItems]
  );

  const handleDragEnd = useCallback(
    async (e) => {
      if (!isDragging || !dragItem) return;

      const clientX = e.clientX ?? e.changedTouches?.[0]?.clientX ?? dragStartX;
      const deltaX = clientX - dragStartX;

      // A click/tap with no real movement must not persist anything - otherwise
      // selecting a clip re-saves its position and flashes a "Saving…" spinner.
      if (Math.abs(deltaX) < 3) {
        setIsDragging(false);
        setDragType(null);
        setDragItem(null);
        setDragOffset(0);
        setSnapIndicator(null);
        return;
      }

      const deltaTime = deltaX / pixelsPerSecond;

      let updates = {};

      if (dragType === "move") {
        // Snap, then keep off the neighbours, capped so a row with no room holds
        // the clip where it was released rather than flinging it to the end of
        // the timeline. Exactly what the preview drew, from the same call.
        updates.startTime = resolveMoveStart(dragItem, Math.max(0, dragStartValue + deltaTime));
      } else if (dragType === "trim-end") {
        const sourceDuration = getSourceDuration(dragItem);
        const ts = dragItem.trimStart || 0;
        const newDuration = Math.max(MIN_DURATION, Math.min(dragStartValue + deltaTime, sourceDuration - ts));
        updates.duration = newDuration;
        updates.trimEnd = ts + newDuration;
      } else if (dragType === "trim-start") {
        const te = dragItem.trimEnd ?? ((dragItem.trimStart || 0) + dragItem.duration);
        const newTrimStart = Math.max(0, Math.min(dragStartValue + deltaTime, te - MIN_DURATION));
        const delta = newTrimStart - (dragItem.trimStart || 0);
        updates.trimStart = newTrimStart;
        updates.startTime = Math.max(0, dragItem.startTime + delta);
        updates.duration = te - newTrimStart;
      }

      // Clear drag state immediately so mouse movements stop being tracked
      setIsDragging(false);
      setDragType(null);
      setDragItem(null);
      setDragOffset(0);
      setSnapIndicator(null);

      if (Object.keys(updates).length > 0) {
        const proposedStart = updates.startTime ?? dragItem.startTime;
        const proposedDuration = updates.duration ?? dragItem.duration;
        if (wouldBreakTransition(dragItem, proposedStart, proposedDuration)) {
          toast.error("This clip has a transition — remove it before moving these clips apart.");
          return;
        }
        await onUpdateItem(dragItem.id, updates);
      }
    },
    [isDragging, dragItem, dragStartX, dragStartValue, dragType, pixelsPerSecond, onUpdateItem, resolveMoveStart, getSection, getAudioAsset, wouldBreakTransition]
  );

  // Add mouse + touch event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
      // touchmove must be non-passive so we can preventDefault (stop scrolling).
      window.addEventListener("touchmove", handleDragMove, { passive: false });
      window.addEventListener("touchend", handleDragEnd);
      window.addEventListener("touchcancel", handleDragEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleDragMove);
      window.removeEventListener("touchend", handleDragEnd);
      window.removeEventListener("touchcancel", handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Handle drop from asset panel (with overlap prevention)
  const handleDrop = (e, trackType, trackIndex) => {
    e.preventDefault();
    setDropRow(null);
    const data = e.dataTransfer.getData("application/json");
    if (!data) return;

    try {
      const asset = JSON.parse(data);
      const rect = containerRef.current.getBoundingClientRect();
      // Minus the label column: the pointer is measured against the scroll
      // container, the time axis starts after the labels.
      const x = e.clientX - rect.left + scrollLeft - TRACK_LABEL_WIDTH;
      let startTime = Math.max(0, x / pixelsPerSecond);

      // The panel sends the asset's real length, so the gap this is fitted into
      // is the gap the item will actually occupy. It used to assume 3s for
      // everything, which fits where a 5s clip does not and dropped it
      // overlapping anyway.
      const assetDuration = Number(asset.duration) > 0 ? Number(asset.duration) : 3;
      startTime = findNonOverlappingPosition(
        null, // no existing item id
        startTime,
        assetDuration,
        trackType,
        trackIndex,
        DROP_NUDGE_LIMIT_PX / pixelsPerSecond
      );

      // A video row that has no room for the clip takes it as an INSERT rather
      // than a stack: everything from the insert point on shifts right by the
      // clip's length. Stacking is meaningless there (the export concatenates
      // video, so a stacked clip just makes the video longer somewhere the user
      // did not ask for), and a brand intro's row is tiled edge to edge, so
      // without this there is nowhere at all to put a clip. Audio rows are left
      // alone: they mix, so laying one under another is a real edit.
      const ripple =
        trackType === "VIDEO" &&
        collidesOnRow(null, startTime, assetDuration, trackType, trackIndex);
      if (ripple) startTime = nearestInsertPoint(startTime, trackType, trackIndex);

      onAssetDrop(asset, trackType, startTime, trackIndex, { ripple });
    } catch (err) {
      console.error("Failed to parse drop data:", err);
    }
  };

  // Highlight the row under the pointer while an asset is being dragged over it,
  // so it is clear where the drop will land (and that dropping is possible).
  const handleDragOver = (e, trackType, trackIndex) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (dropRow?.trackType !== trackType || dropRow?.trackIndex !== trackIndex) {
      setDropRow({ trackType, trackIndex });
    }
  };

  // Fires when the pointer crosses out of a row, including into one of its own
  // children, so the row is only cleared when the pointer has genuinely left it.
  const handleDragLeave = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDropRow(null);
  };

  return (
    <div
      ref={containerRef}
      data-timeline-container
      className="w-full h-full overflow-auto bg-background timeline-scroll"
      onScroll={handleScroll}
    >
      <div
        className="relative"
        style={{ width: timelineWidth, minHeight: "100%" }}
      >
        {/* Ruler. Same bg-background tone as the canvas root below it - ruler
            and track body read as one continuous surface. The toolbar above
            (TimelineEditor's transport strip) intentionally uses a slightly
            different tone (--timeline-surface, #FCF7F4 vs this bg-background
            #F5F0EB) - a subtle, few-point difference, not a stark one, so
            the toolbar reads as a related-but-separate panel rather than
            either fully fused with or jarringly distinct from the timeline
            body beneath it. The ruler's own border-b (in TimelineRuler.jsx)
            marks the seam with the track rows - a hairline, not a tonal or
            shadow break. */}
        <div
          className="sticky top-0 z-20 bg-background"
          onClick={handleRulerSeek}
          onTouchEnd={handleRulerSeek}
        >
          <TimelineRuler
            duration={duration}
            pixelsPerSecond={pixelsPerSecond}
            width={timelineWidth}
          />
        </div>

        {/* Tracks Container - tapping empty space deselects (clips stopPropagation) */}
        <div className="relative" onClick={() => onSelectItem(null)}>
          {/* Video Track */}
          <TimelineTrack
            label="Video"
            trackType="VIDEO"
            trackIndex={0}
            items={videoItems}
            height={trackHeight}
            pixelsPerSecond={pixelsPerSecond}
            selectedItem={selectedItem}
            onSelectItem={onSelectItem}
            onItemDragStart={handleItemDragStart}
            onItemEdit={onItemEdit}
            getSection={getSection}
            getAudioAsset={getAudioAsset}
            onDrop={(e) => handleDrop(e, "VIDEO", 0)}
            onDragOver={(e) => handleDragOver(e, "VIDEO", 0)}
            onDragLeave={handleDragLeave}
            isDropTarget={dropRow?.trackType === "VIDEO"}
            overlappingItems={videoOverlaps}
            dragPreview={dragPreview}
            sessionId={sessionId}
            boundaries={videoBoundaries}
            onBoundaryClick={onBoundaryClick}
          />

          {/* Narration Track (section narration + TTS voice) */}
          <TimelineTrack
            label="Narration"
            trackType="AUDIO"
            trackIndex={0}
            items={narrationItems}
            height={trackHeight}
            pixelsPerSecond={pixelsPerSecond}
            selectedItem={selectedItem}
            onSelectItem={onSelectItem}
            onItemDragStart={handleItemDragStart}
            onItemEdit={onItemEdit}
            getSection={getSection}
            getAudioAsset={getAudioAsset}
            onDrop={(e) => handleDrop(e, "AUDIO", 0)}
            onDragOver={(e) => handleDragOver(e, "AUDIO", 0)}
            onDragLeave={handleDragLeave}
            isDropTarget={dropRow?.trackType === "AUDIO" && dropRow?.trackIndex === 0}
            overlappingItems={noOverlaps}
            dragPreview={dragPreview}
            sessionId={sessionId}
          />

          {/* Audio/Music Track - uploads and AI background music merged into
              one row (was two: "Audio" at index 1, "Music" at index 2).
              trackIndex stays 1 for the merged row; TimelineCanvas's rowFor/
              rowItems route both kinds there now. Each clip still shows its
              own kind (upload vs music) via TimelineItem's own audioKind() -
              only the ROW grouping changed, not per-clip styling. */}
          <TimelineTrack
            label="Audio / Music"
            trackType="AUDIO"
            trackIndex={1}
            items={audioMusicItems}
            height={trackHeight}
            pixelsPerSecond={pixelsPerSecond}
            selectedItem={selectedItem}
            onSelectItem={onSelectItem}
            onItemDragStart={handleItemDragStart}
            onItemEdit={onItemEdit}
            getSection={getSection}
            getAudioAsset={getAudioAsset}
            onDrop={(e) => handleDrop(e, "AUDIO", 1)}
            onDragOver={(e) => handleDragOver(e, "AUDIO", 1)}
            onDragLeave={handleDragLeave}
            isDropTarget={dropRow?.trackType === "AUDIO" && dropRow?.trackIndex === 1}
            overlappingItems={noOverlaps}
            dragPreview={dragPreview}
            sessionId={sessionId}
          />

          {/* Past-the-end fill - timelineWidth pads a couple hundred px past
              `duration` for scroll/drop breathing room, and every track row
              stretches to fill it, so without this the tracks read as
              ambiguous empty rows continuing forever once scrolled/zoomed
              past the last clip. Painted bg-background - the SAME token
              the canvas's own root scroll container uses (below) - so this
              reads as a seamless continuation of that surface rather than a
              second, differently-shaded fill butted up against it. Spans the
              full track stack height (every row, not just Video) and sits
              above the tracks' own colored fill and grid lines (default
              stacking order, rendered after them) but below the snap
              line/playhead/boundary markers. Pointer-events-none: nothing
              should ever exist past `duration` anyway, but this must never
              be what blocks a drop there if it did. */}
          {duration * pixelsPerSecond + TRACK_LABEL_WIDTH < timelineWidth && (
            <div
              className="absolute top-0 bg-background pointer-events-none"
              style={{
                left: duration * pixelsPerSecond + TRACK_LABEL_WIDTH,
                width: timelineWidth - (duration * pixelsPerSecond + TRACK_LABEL_WIDTH),
                height: trackHeight * totalTracks,
              }}
            />
          )}

          {/* Snap indicator line */}
          {snapIndicator && (
            <div
              className="absolute top-0 w-px bg-accent pointer-events-none z-30"
              style={{
                left: snapIndicator.time * pixelsPerSecond + TRACK_LABEL_WIDTH,
                height: trackHeight * totalTracks,
                boxShadow: "0 0 4px hsl(var(--accent) / 0.6)",
              }}
            />
          )}

          {/* Playhead. Height is exactly the track stack - it used to be
              +40px, and because it's absolutely positioned inside the tracks
              container that overhang still counted toward scrollHeight, which
              is what let the canvas scroll ~40px down past the Music track
              into empty space. Mirrors the horizontal past-the-end fix: the
              scrollable area should be exactly the content, no further. */}
          <TimelinePlayhead
            position={playheadPosition}
            pixelsPerSecond={pixelsPerSecond}
            height={trackHeight * totalTracks}
            onSeek={onSeek}
          />
        </div>
      </div>
    </div>
  );
}
