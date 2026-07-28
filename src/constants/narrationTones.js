/**
 * Narration delivery tones offered in the Edit Narration modal.
 *
 * Keys MUST match the backend map in merge-api src/constants/narrationTones.js:
 * they travel in the regenerate-narration request body, and the API rejects an
 * unknown key with a 400 rather than quietly narrating it flat. Same mirroring
 * arrangement as the offline voices fallback list.
 *
 * The backend turns each key into an ElevenLabs v3 audio tag. The tag never reaches
 * this side: narrationText is stored and displayed untagged, so the textarea shows
 * the script the user wrote, not "[excited] ...".
 */
export const NARRATION_TONES = [
  { key: "neutral", label: "Neutral" },
  { key: "excited", label: "Excited" },
  { key: "cheerful", label: "Cheerful" },
  { key: "warm", label: "Warm" },
  { key: "calm", label: "Calm" },
  { key: "serious", label: "Serious" },
  { key: "sad", label: "Somber" },
  { key: "whisper", label: "Whisper" },
];

export const DEFAULT_TONE = "neutral";
