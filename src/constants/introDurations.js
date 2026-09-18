// Lengths offered for the intro pipeline. A stinger, not a film, so this stops at
// 30s where the main pipeline's picker runs on to 60.
//
// Must stay in step with INTRO_DURATIONS in the API's src/prompts/introPrompt.js:
// the backend snaps whatever it receives onto its own list, so a value only in
// this file would silently render at a different length than the one shown here.
export const INTRO_DURATION_OPTIONS = [
  { value: 10, label: "10s", desc: "Quick sting" },
  { value: 15, label: "15s", desc: "Standard" },
  { value: 20, label: "20s", desc: "Room to explain" },
  { value: 30, label: "30s", desc: "Full story" },
];

export const DEFAULT_INTRO_DURATION = 15;
