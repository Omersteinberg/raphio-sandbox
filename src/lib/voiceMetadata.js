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
