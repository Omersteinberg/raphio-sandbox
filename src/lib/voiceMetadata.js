function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function getVoiceStyleLabel(voice = {}) {
  const styleLabel = normalizeText(voice.styleLabel);
  if (styleLabel) return styleLabel;

  const labels = voice.labels || {};
  const labelDescription = normalizeText(labels.description);
  if (labelDescription) return labelDescription;

  const useCase = normalizeText(labels.use_case || voice.useCase || voice.category);
  if (useCase) return useCase;

  return normalizeText(voice.description);
}

export function getVoiceSecondaryLabel(voice = {}) {
  const accent = normalizeText(voice.accent);
  const style = getVoiceStyleLabel(voice);

  if (accent && style && accent.toLowerCase() !== style.toLowerCase()) {
    return `${accent} - ${style}`;
  }

  return style || accent || "Voice";
}

export function getVoiceOptionLabel(voice = {}) {
  const style = getVoiceStyleLabel(voice);
  return style ? `${voice.name} - ${style}` : voice.name;
}

// The picker's filters are ElevenLabs' own facets, read straight off each voice's
// `labels` (the same object their voice library filters on): accent, use_case,
// gender, age, descriptive. Each reader falls back through the flattened fields the
// API also sends, so a live-metadata merge and the static list both work.

export function getVoiceUseCase(voice = {}) {
  const labels = voice.labels || {};
  return normalizeText(voice.useCase || labels.use_case || voice.category);
}

export function getVoiceAccent(voice = {}) {
  const labels = voice.labels || {};
  return normalizeText(voice.accent || labels.accent);
}

export function getVoiceGender(voice = {}) {
  const labels = voice.labels || {};
  return normalizeText(voice.gender || labels.gender);
}

export function getVoiceAge(voice = {}) {
  const labels = voice.labels || {};
  return normalizeText(voice.age || labels.age);
}

export function getVoiceDescriptive(voice = {}) {
  const labels = voice.labels || {};
  return normalizeText(voice.descriptive || labels.descriptive);
}

// ElevenLabs writes its label values in snake_case ("middle_aged",
// "informative_educational"). Render them as words.
export function humanizeFacetValue(value = "") {
  const text = normalizeText(value);
  if (!text) return "";
  if (!text.includes("_") && text[0] === text[0].toUpperCase()) return text;
  return text
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Distinct values present in the fetched list as { value, count }, MOST COMMON
// FIRST. Ordering by how many voices carry a value puts the options people actually
// reach for at the top of the dropdown, instead of burying "American" behind an
// alphabetical accident. Ties break alphabetically so the order is stable between
// loads. The count is shown next to each option so an empty result is predictable
// before you pick it.
export function collectVoiceFacet(voices = [], read) {
  const counts = new Map();
  for (const voice of voices) {
    const value = read(voice);
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value, count]) => ({ value, count }));
}
