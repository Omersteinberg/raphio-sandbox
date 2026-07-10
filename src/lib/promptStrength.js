// Scores how "complete" a references-mode story prompt is, and returns a
// transparent checklist so the UI can double as guidance (tooltips go unread).
// Pure + synchronous - no AI call. The four factors mirror what actually drives
// good reference-pipeline output: naming the references you added (their names
// flow verbatim into the AI script), enough detail, a described setting, and a
// tone + story beat rather than a bare list of nouns.

// Vocabulary intentionally overlaps the in-app PROMPT_DICTIONARY (mood/style)
// and adds place/action words the dictionary doesn't cover.
const MOOD_TONE_WORDS = [
  'cinematic', 'nostalgic', 'dramatic', 'serene', 'energetic', 'mysterious',
  'cozy', 'epic', 'melancholic', 'triumphant', 'warm', 'moody', 'playful',
  'emotional', 'upbeat', 'calm', 'tense', 'joyful', 'romantic', 'gritty',
  'elegant', 'vibrant', 'somber', 'whimsical', 'intense', 'peaceful',
  'heartfelt', 'bold', 'dreamy', 'hopeful', 'melancholy', 'uplifting',
];

const SETTING_WORDS = [
  'office', 'street', 'kitchen', 'beach', 'park', 'city', 'room', 'forest',
  'mountain', 'cafe', 'coffee shop', 'studio', 'home', 'house', 'outdoor',
  'indoor', 'night', 'sunset', 'sunrise', 'dawn', 'dusk', 'workshop', 'garage',
  'warehouse', 'desert', 'ocean', 'river', 'lake', 'field', 'garden', 'rooftop',
  'stage', 'store', 'shop', 'restaurant', 'bar', 'bedroom', 'living room',
  'hallway', 'lobby', 'countryside', 'village', 'town', 'downtown', 'highway',
  'road', 'sidewalk', 'alley', 'building', 'apartment', 'construction site',
  'gym', 'school', 'hospital', 'airport', 'station', 'market', 'landscape',
  'skyline', 'snow', 'rain', 'fog', 'morning', 'evening', 'afternoon',
];

const SETTING_CUES = [' in a ', ' in the ', ' at a ', ' at the ', ' inside ', ' outside ', ' on a ', ' on the '];

const ACTION_VERBS = [
  'walk', 'run', 'open', 'hold', 'drive', 'look', 'react', 'discover', 'struggle',
  'celebrate', 'reach', 'grab', 'lift', 'turn', 'push', 'pull', 'lean', 'smile',
  'laugh', 'cry', 'jump', 'sit', 'stand', 'enter', 'exit', 'arrive', 'leave',
  'pour', 'type', 'write', 'read', 'point', 'wave', 'dance', 'climb', 'ride',
  'throw', 'catch', 'build', 'fix', 'carry', 'chase', 'search', 'find', 'watch',
  'show', 'reveal', 'pick', 'drop', 'raise', 'gaze', 'step', 'move', 'work',
];

// Clause connectors that signal a described sequence of events (a story beat).
const STORY_CUES = [' then ', ' as ', ' while ', ' before ', ' after ', ' until ', ' when '];

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countWords(text) {
  const t = (text || '').trim();
  return t ? t.split(/\s+/).filter(Boolean).length : 0;
}

function containsAny(haystack, words) {
  return words.some((w) => new RegExp(`\\b${escapeRegExp(w)}\\b`, 'i').test(haystack));
}

/**
 * @param {{ userPrompt?: string, references?: Array<{name?: string}>,
 *   mode?: 'references'|'image' }} params
 *   mode 'image' has no named references, so the coverage factor is dropped and
 *   the remaining factors are reweighted to sum to 100.
 * @returns {{ score: number, band: 'weak'|'ok'|'strong', label: string,
 *   factors: Array<{ id, label, met, weight, hint, detail? }> }}
 */
export function scorePrompt({ userPrompt = '', references = [], mode = 'references' } = {}) {
  const isRefMode = mode !== 'image';
  const text = userPrompt || '';
  const lower = ` ${text.toLowerCase()} `;
  const words = countWords(text);

  const namedRefs = references.filter((r) => r?.name?.trim());
  const usedRefs = namedRefs.filter((r) =>
    new RegExp(`\\b${escapeRegExp(r.name.trim())}\\b`, 'i').test(text)
  );
  const coverageRatio = namedRefs.length ? usedRefs.length / namedRefs.length : 0;

  // Detail: full credit from 25 words up. Partial credit below.
  let detailPoints;
  if (words >= 25) detailPoints = 1;
  else if (words >= 15) detailPoints = 0.6;
  else if (words >= 8) detailPoints = 0.3;
  else detailPoints = 0;

  const hasSetting = containsAny(lower, SETTING_WORDS) || SETTING_CUES.some((c) => lower.includes(c));
  const hasTone = containsAny(lower, MOOD_TONE_WORDS);
  const hasAction =
    containsAny(lower, ACTION_VERBS) ||
    STORY_CUES.some((c) => lower.includes(c)) ||
    (text.match(/[.,;]/g) || []).length >= 2;
  // Tone/action factor: full credit needs both a mood word AND a story beat;
  // half credit for either alone.
  const toneActionPoints = (hasTone ? 0.5 : 0) + (hasAction ? 0.5 : 0);

  const factors = [];

  // Coverage - how many mentionable targets appear in the prompt. In references
  // mode the targets are named references (exact-match consistency, weighted
  // heavily). In image mode the targets are uploaded scenes (a softer ordering
  // hint, lighter weight). Image mode only shows it once photos are uploaded;
  // references mode always shows it to nudge adding + mentioning references.
  if (isRefMode || namedRefs.length > 0) {
    factors.push({
      id: 'coverage',
      label: isRefMode ? 'Mentions your references' : 'Mentions your scenes',
      weight: isRefMode ? 40 : 20,
      points: coverageRatio,
      met: isRefMode
        ? namedRefs.length > 0 && coverageRatio === 1
        : coverageRatio > 0,
      detail: namedRefs.length
        ? `${usedRefs.length} of ${namedRefs.length} ${isRefMode ? 'used' : 'referenced'}`
        : 'none added yet',
      hint: isRefMode
        ? (namedRefs.length
            ? 'Type "@" to mention each reference by name so the AI keeps them consistent.'
            : 'Add a reference, then type "@" to mention it in your prompt.')
        : 'Type "@" to reference a scene by its label, which helps the AI order your shots.',
    });
  }

  factors.push({
    id: 'detail',
    label: 'Enough detail',
    weight: isRefMode ? 15 : 25,
    points: detailPoints,
    met: detailPoints >= 1,
    detail: `${words} words`,
    hint: 'Aim for 25 or more words, enough to paint the scene.',
  });
  factors.push({
    id: 'setting',
    label: 'Describes a setting',
    weight: isRefMode ? 20 : 25,
    points: hasSetting ? 1 : 0,
    met: hasSetting,
    hint: 'Say where it happens: a place, time of day, or environment.',
  });
  factors.push({
    id: 'toneAction',
    label: 'Sets a tone & what happens',
    weight: isRefMode ? 25 : 30,
    points: toneActionPoints,
    met: toneActionPoints >= 1,
    hint: 'Add a mood (e.g. warm, dramatic) and a clear action or story beat.',
  });

  // Weighted average → 0-100, robust to whichever factors are present.
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const score = Math.round(
    (factors.reduce((sum, f) => sum + f.weight * f.points, 0) / totalWeight) * 100
  );

  let band = 'weak';
  let label = 'Add more detail';
  if (score >= 75) {
    band = 'strong';
    label = 'Strong prompt';
  } else if (score >= 40) {
    band = 'ok';
    label = 'Getting there';
  }

  // Public factor shape excludes the internal `points` weighting.
  const publicFactors = factors.map((f) => ({
    id: f.id,
    label: f.label,
    weight: f.weight,
    met: f.met,
    detail: f.detail,
    hint: f.hint,
  }));
  return { score, band, label, factors: publicFactors };
}
