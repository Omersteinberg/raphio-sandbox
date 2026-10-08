// The shots inside a scene, read off the script's visual description, each with the
// references it names.
//
// On a model that cuts inside a clip, a scene is two or three shots, but the
// storyboard shows one still: the opening frame of the first shot. A client who
// uploaded their team and their roof, and sees only the homeowner at the ceiling,
// concludes the other photos went unused. This pulls the shots apart so each can be
// shown with the pictures that feed it.

// "SHOT 2 [00:03-00:05]: ..." or "Shot 2: ..." starts a shot; the STYLE line ends them.
const SHOT_RE = /\bSHOT\s+(\d+)\s*(?:\[[^\]]*\])?\s*:\s*/gi;

/**
 * @param {string} visual - section.visualDescription
 * @returns {Array<{number:number, text:string}>} empty when the text has no shots
 */
export function splitShots(visual) {
  const text = String(visual || "");
  const starts = [...text.matchAll(SHOT_RE)];
  if (!starts.length) return [];
  return starts.map((m, i) => {
    const from = m.index + m[0].length;
    const to = i + 1 < starts.length ? starts[i + 1].index : text.length;
    const body = text.slice(from, to).replace(/\bSTYLE\s*:.*$/is, "").trim();
    return { number: Number(m[1]) || i + 1, text: body };
  });
}

/**
 * The references a piece of text names, by exact whole-word name (the script
 * writes them without the @).
 * @param {string} text
 * @param {Array<{name:string}>} references
 */
export function referencesIn(text, references) {
  const hay = String(text || "");
  return (references || []).filter((r) => {
    const name = String(r?.name || "").trim();
    if (!name) return false;
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^\\w])${esc}(?![\\w])`).test(hay);
  });
}

/** The picture to show for a reference card, whatever stage it is at. */
export function referenceThumb(r) {
  return r?.lockedUrl || r?.originalUrl || r?.referenceImage || r?.imageUrl || null;
}
