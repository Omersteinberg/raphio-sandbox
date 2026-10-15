import axios from "./api.js";
import { API_BASE as BASE } from "../config.js";

const API_BASE = `${BASE}/video`;

// Kick off the v2 run: uploads, script, voice and storyboard, then it stops for approval.
export async function startPipeline(sessionId, { photos = [], brief, targetDuration, aspectRatio, voiceId, style }) {
  const formData = new FormData();
  photos.forEach((p) => formData.append("images", p.file));
  formData.append("labels", JSON.stringify(photos.map((p) => p.label || "")));
  if (brief) formData.append("brief", brief);
  if (targetDuration) formData.append("targetDuration", String(targetDuration));
  if (aspectRatio) formData.append("aspectRatio", aspectRatio);
  if (voiceId) formData.append("voiceId", voiceId);
  if (style) formData.append("style", style);
  const { data } = await axios.post(`${API_BASE}/${sessionId}/pipeline/script`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// Where the run is, plus the script and storyboard to review. Null when no run exists yet.
export async function getPipeline(sessionId) {
  try {
    const { data } = await axios.get(`${API_BASE}/${sessionId}/pipeline`);
    return data;
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
}

// Save narration/visual edits; the backend redoes the voice and storyboard from them.
export async function editScript(sessionId, clips) {
  const { data } = await axios.put(`${API_BASE}/${sessionId}/pipeline/script`, { clips });
  return data;
}

// Rewrite the script before any charge, optionally with a new length, shape or voice.
export async function regenerateScript(sessionId, input = {}) {
  const { data } = await axios.post(`${API_BASE}/${sessionId}/pipeline/script/regenerate`, input);
  return data;
}

// Leave the storyboard and reopen the script.
export async function backToScript(sessionId) {
  const { data } = await axios.post(`${API_BASE}/${sessionId}/pipeline/back-to-script`);
  return data;
}

// Redraw one clip's storyboard frames. Free. `instruction` is what the user wants changed.
export async function redrawStills(sessionId, clipIndex, instruction = "") {
  const { data } = await axios.post(`${API_BASE}/${sessionId}/pipeline/stills/${clipIndex}/regenerate`, { instruction });
  return data;
}

// First gate: draws the stills. Free.
export async function approveScript(sessionId) {
  const { data } = await axios.post(`${API_BASE}/${sessionId}/pipeline/approve-script`);
  return data;
}

// Second gate: charges credits and renders the clips.
export async function approveFrames(sessionId) {
  const { data } = await axios.post(`${API_BASE}/${sessionId}/pipeline/approve-frames`);
  return data;
}

// Redraw one clip of a finished run and recut. `instruction` is what the user wants changed.
export async function regenerateClip(sessionId, clipIndex, instruction = "") {
  const { data } = await axios.post(`${API_BASE}/${sessionId}/pipeline/clips/${clipIndex}/regenerate`, { instruction });
  return data;
}
