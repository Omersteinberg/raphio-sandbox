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

// ── Brand Intro brief scoring ────────────────────────────────────────────
// Separate from scorePrompt() on purpose: a brand-intro brief isn't a video
// scene (no setting/mood/action to describe), it's a business identity
// statement - what it offers, who it's for, and what it wants the viewer to
// do next. Same contract - { score, band, label, factors } - and the same
// lexical-matching technique (word lists + regex, no AI call), but new
// vocabulary for a new domain. No "differentiator" factor: there's no
// reliable lexical signal for "what makes this business different" - a
// keyword list here would flag green on briefs that aren't actually
// differentiated, which is worse than not scoring it at all.

// Trade/service/business-type nouns, drawn from IntroBriefStep's own worked
// examples (heating engineer(s), hair studio, app, garden design) plus common
// adjacent categories - what kind of business this brief is describing.
// Singular AND plural listed explicitly for count nouns: containsAny (shared
// with scorePrompt, not touched) matches whole words/phrases only, so
// "heating engineer" alone does not match "heating engineers" - confirmed by
// running this against IntroBriefStep's own first worked example, which
// failed this factor on that exact gap before both forms were added here.
const BUSINESS_TYPE_WORDS = [
  'plumber', 'plumbers', 'plumbing', 'electrician', 'electricians',
  'heating engineer', 'heating engineers', 'hvac', 'roofer', 'roofers', 'roofing',
  'builder', 'builders', 'contractor', 'contractors', 'landscaper', 'landscapers',
  'landscaping', 'gardener', 'gardeners', 'garden design',
  'cleaner', 'cleaners', 'cleaning', 'handyman', 'handymen', 'decorator', 'decorators',
  'painter', 'painters',
  'salon', 'salons', 'studio', 'studios', 'barber', 'barbers', 'hairdresser', 'hairdressers',
  'hair studio', 'spa', 'spas', 'clinic', 'clinics',
  'dentist', 'dentists', 'dental', 'therapist', 'therapists', 'therapy',
  'chiropractor', 'chiropractors',
  'restaurant', 'restaurants', 'cafe', 'cafes', 'coffee shop', 'bakery', 'bakeries',
  'bar', 'bars', 'catering', 'food truck',
  'gym', 'gyms', 'fitness', 'personal trainer', 'personal trainers', 'coach', 'coaches',
  'coaching', 'yoga', 'pilates',
  'agency', 'agencies', 'consultancy', 'consultant', 'consultants', 'freelancer',
  'freelancers', 'firm', 'firms',
  'app', 'software', 'saas', 'startup', 'startups', 'developer', 'developers',
  'designer', 'designers', 'platform',
  'shop', 'shops', 'store', 'stores', 'boutique', 'boutiques', 'retailer', 'retailers',
  'ecommerce', 'marketplace',
  'photographer', 'photographers', 'photography', 'videographer', 'videographers',
  'florist', 'florists',
  'lawyer', 'lawyers', 'attorney', 'attorneys', 'accountant', 'accountants',
  'bookkeeper', 'bookkeepers', 'realtor', 'realtors', 'estate agent', 'estate agents',
  'mechanic', 'mechanics', 'garage', 'auto repair', 'car detailing',
  'tutor', 'tutors', 'tutoring', 'school', 'academy', 'course',
  'vet', 'vets', 'veterinary', 'pet groomer', 'pet groomers', 'dog walker', 'dog walkers',
  'pet sitter', 'pet sitters',
  'brewery', 'breweries', 'winery', 'wineries', 'farm', 'farms', 'nursery', 'nurseries',
  'daycare', 'childcare',
];

// Service/product-offering language - a second, independent way to signal
// "what you do" alongside BUSINESS_TYPE_WORDS above. Some business types are
// self-evidently a service ("heating engineer"), but plenty aren't ("app",
// "studio" could be either) - an explicit offer/service/product verb closes
// that gap without requiring it.
const OFFER_WORDS = [
  'offer', 'offers', 'offering', 'provide', 'provides', 'providing',
  'service', 'services', 'product', 'products', 'sell', 'sells', 'selling',
  'deliver', 'delivers', 'delivering', 'specialize in', 'specialise in', 'specializing in',
  'bespoke', 'custom', 'tailored', 'handmade', 'made to order',
  'subscription', 'membership', 'package', 'packages', 'treatment', 'treatments',
  'repair', 'repairs', 'install', 'installs', 'installation',
  'build', 'builds', 'design', 'designs', 'create', 'creates', 'making',
  'stock', 'supply', 'supplies', 'range of',
];

// Audience nouns and "who this is for" cue phrases.
const AUDIENCE_WORDS = [
  'homeowners', 'families', 'business', 'businesses', 'customers', 'clients',
  'professionals', 'students', 'parents', 'couples', 'freelancers', 'startups',
  'renters', 'landlords', 'athletes', 'pet owners', 'brides', 'homebuyers',
  'small businesses', 'local businesses', 'entrepreneurs', 'teams', 'companies',
  'residents', 'commuters', 'travelers', 'shoppers', 'beginners', 'everyone',
  'first-time buyers', 'new parents', 'busy professionals',
];
// Deliberately no bare " for " here: it's the single most common preposition
// in ordinary English and matched almost any sentence regardless of actual
// audience content ("for how far we travel," "for the numbers that matter")
// - confirmed false-positiving on every one of IntroBriefStep's own worked
// examples during testing, none of which state a real target audience. The
// remaining cues are multi-word and specific enough not to fire on
// incidental "for" usage.
const AUDIENCE_CUES = [
  ' serving ', ' helping ', ' aimed at ', ' designed for ',
  ' built for ', ' who need ', ' who want ', ' catering to ',
];

// Connector/outcome phrasing - a deliberately approximate proxy for "does
// this brief tie its business fact to a takeaway for the viewer," not a real
// clarity check (no lexical signal can actually verify a message is clear).
// Only meaningful once there's a fact to connect (see the identityPoints
// gate below) - "so" alone is far too common a word to check ungated (the
// same over-broad-preposition problem AUDIENCE_CUES' comment already
// documents for bare " for "), but behind that gate it stops being a
// standalone false-positive risk: it can no longer manufacture a "clear
// message" out of nothing, only sharpen a business claim that's already
// there.
const CONNECTOR_PHRASES = [
  'so', 'so you', 'so that', 'so they know', 'so they can', 'so customers',
  'means', 'meaning', 'which means',
  'helps', 'helps you', 'help you', 'helping you',
  'know that', 'knowing', 'trust', 'trusted',
  'feel', 'feel confident', 'confidence',
  'shows', 'showing', 'proves', 'proving',
  'because', 'giving you', 'gives you', 'letting you', 'lets you',
  'ensuring', 'ensures', 'guaranteeing', 'guarantees',
  'reassures', 'reassuring', 'peace of mind',
];

/**
 * @param {{ userPrompt?: string }} params
 * @returns {{ score: number, band: 'weak'|'ok'|'strong', label: string,
 *   factors: Array<{ id, label, met, weight, hint, detail? }> }}
 */
export function scoreIntroBrief({ userPrompt = '' } = {}) {
  const text = userPrompt || '';
  const lower = ` ${text.toLowerCase()} `;
  const words = countWords(text);

  // Reuses scorePrompt's own word-count thresholds unmodified, per the task -
  // duplicated rather than extracted into a shared helper, so scorePrompt's
  // file/behavior stays untouched rather than being refactored to delegate.
  let detailPoints;
  if (words >= 25) detailPoints = 1;
  else if (words >= 15) detailPoints = 0.6;
  else if (words >= 8) detailPoints = 0.3;
  else detailPoints = 0;

  // "What you offer" - business-type nouns OR offer/service/product
  // language, either is sufficient (they're overlapping evidence of the
  // same thing, not two separate requirements).
  const hasWhatYouDo = containsAny(lower, BUSINESS_TYPE_WORDS) || containsAny(lower, OFFER_WORDS);
  const hasAudience = containsAny(lower, AUDIENCE_WORDS) || AUDIENCE_CUES.some((c) => lower.includes(c));
  // "What you offer" carries the criterion (0.7) - confirmed by testing
  // against all four of IntroBriefStep's own worked examples: none of them
  // state an explicit audience phrase (they scope by trade + location
  // instead - "heating engineers in Manchester," "garden design... across
  // Surrey"), so a strict half-and-half split marked every one of the app's
  // own reference briefs as failing this factor. Audience is a real signal
  // when present (0.3, on top), but not required to pass - `met` at 0.7 lets
  // the offer signal alone clear the bar.
  const identityPoints = (hasWhatYouDo ? 0.7 : 0) + (hasAudience ? 0.3 : 0);

  // Gated structural check, not an independent keyword hit: factor 2 has to
  // have scored something first (the brief has stated an actual business
  // fact - what it offers and/or who for) before a connector phrase counts
  // for anything. Without that anchor there's nothing for "so," "helps," or
  // "trust" to connect TO, so a vague brief that happens to contain one of
  // those words in isolation still scores zero here - the gate, not the
  // word list, is what keeps this from false-positiving the way an ungated
  // check would.
  const hasAnchor = identityPoints > 0;
  const hasConnector = hasAnchor && containsAny(lower, CONNECTOR_PHRASES);
  let clearMessagePoints;
  if (!hasAnchor) clearMessagePoints = 0;
  else if (hasConnector) clearMessagePoints = 1;
  else clearMessagePoints = 0.4; // anchor present, no connector - partial credit

  const factors = [
    {
      id: 'detail',
      label: 'Enough detail',
      weight: 30,
      points: detailPoints,
      met: detailPoints >= 1,
      detail: `${words} words`,
      hint: 'Aim for 25 or more words, enough to write a good script from.',
    },
    {
      id: 'identity',
      label: "What you offer & who it's for",
      weight: 40,
      points: identityPoints,
      // >= 0.7, not >= 1: the offer signal alone clears this (see
      // identityPoints above) - audience language on top still raises the
      // numeric score, it just isn't required for the checkmark.
      met: identityPoints >= 0.7,
      hint: 'Say what you offer (a service or product) and who it serves.',
    },
    {
      id: 'clearMessage',
      label: 'Clear message',
      weight: 30,
      points: clearMessagePoints,
      met: clearMessagePoints >= 1,
      hint: hasAnchor
        ? 'Connect it to a takeaway - "so you know we\'re licensed," "which means faster service."'
        : "Say what you offer or who it's for first - there's nothing to connect a message to yet.",
    },
  ];

  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const score = Math.round(
    (factors.reduce((sum, f) => sum + f.weight * f.points, 0) / totalWeight) * 100
  );

  let band = 'weak';
  let label = 'Add more detail';
  if (score >= 75) {
    band = 'strong';
    label = 'Strong brief';
  } else if (score >= 40) {
    band = 'ok';
    label = 'Getting there';
  }

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
