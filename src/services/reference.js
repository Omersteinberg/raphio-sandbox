import axios from './api.js';
import { API_BASE as BASE } from '../config.js';
import { pollJobUntilDone } from "./session.js";

const API = `${BASE}/video`;

/**
 * Add a reference (character or setting) with optional image upload
 */
export async function addReference(sessionId, { type, name, description, imageFile }) {
  const formData = new FormData();
  formData.append('type', type);
  formData.append('name', name);
  formData.append('description', description || '');
  if (imageFile) {
    formData.append('image', imageFile);
  }

  const response = await axios.post(`${API}/${sessionId}/references`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

/**
 * Remove a reference
 */
export async function removeReference(sessionId, refId) {
  const response = await axios.delete(`${API}/${sessionId}/references/${refId}`);
  return response.data;
}

/**
 * AI-generate a reference image via Seedream
 */
export async function generateReferenceImage(sessionId, refId) {
  const response = await axios.post(`${API}/${sessionId}/references/${refId}/generate`);
  return response.data;
}

// Reference locking (AI-generate missing images + restyle uploads) moved fully
// server-side: the backend pipeline runner runs it as one REF_LOCK job, driven by
// POST /:id/advance, so a closed tab can no longer strand a session at the lock
// step. The old generateAllReferenceImages/restyleReferences wrappers are gone.

/**
 * Approve a single reference
 */
export async function approveReference(sessionId, refId) {
  const response = await axios.post(`${API}/${sessionId}/references/${refId}/approve`);
  return response.data;
}

/**
 * Approve all references and advance stage
 */
export async function approveAllReferences(sessionId) {
  const response = await axios.post(`${API}/${sessionId}/references/approve-all`);
  return response.data;
}

/**
 * Regenerate a single reference
 */
export async function regenerateReference(sessionId, refId, { feedback } = {}) {
  const response = await axios.post(`${API}/${sessionId}/references/${refId}/regenerate`, { feedback });
  return response.data;
}

/**
 * Generate scene frames for all script sections
 */
export async function generateSceneFrames(sessionId) {
  // 202 names the job holding the session's single slot, which is the runner's own
  // REF_SCENE_FRAMES when it got there first. Wait on that one specifically, so this
  // can't resolve on a later job and return its result as our frames.
  const { data } = await axios.post(`${API}/${sessionId}/references/scene-frames`);
  return await pollJobUntilDone(sessionId, { expectedJobType: data?.jobType });
}

/**
 * Approve generated scene frames without starting final video generation
 */
export async function approveSceneFrames(sessionId) {
  const response = await axios.post(`${API}/${sessionId}/references/scene-frames/approve`);
  return response.data;
}

/**
 * Ask the AI what each uploaded reference picture is: a short name to @mention it by
 * and whether it is a person, a place, a product or a logo. Stateless, like
 * improve-prompt: there is no session yet when references are being added.
 *
 * @param {{images: string[], existingNames?: string[]}} params - downscaled data URLs
 * @returns {Promise<{references: Array<{type:string,name:string,description:string}|null>}>}
 *   one entry per image, in the same order
 */
export async function describeReferences({ images, existingNames = [] }) {
  const response = await axios.post(`${API}/describe-references`, { images, existingNames });
  return response.data;
}

/**
 * Which kind of video this is, from the words and the pictures, before a session
 * exists. Returns { mode, confidence, uncertain, headline, seen, businessName,
 * references } where references is one labelled entry per image, in order.
 */
export async function routeIntent({ userPrompt = "", images = [], targetDuration = null, photoCount = null }) {
  const response = await axios.post(`${API}/route-intent`, { userPrompt, images, targetDuration, photoCount });
  return response.data;
}

/**
 * Improve the story prompt with AI, before a session exists. Stateless: sends the
 * current text plus whatever context the mode has, gets improved text back.
 *
 * Shared by every pipeline, so `mode` decides both what comes back and which
 * fields matter. `references`, `image` and `prompt` return { improvedPrompt,
 * recommendedVoiceKey, recommendedAccent, recommendedUseCase, recommendedReason }.
 * `intro` returns { improvedPrompt, businessName } and reads businessName,
 * targetDuration and logoDataUrl on the way in.
 */
export async function improvePrompt({
  userPrompt,
  references,
  style,
  mode,
  imageDataUrls,
  businessName,
  targetDuration,
  logoDataUrl,
  aspectRatio,
  voiceId,
  referenceImages,
}) {
  const response = await axios.post(`${API}/improve-prompt`, {
    userPrompt,
    references,
    style,
    mode,
    imageDataUrls,
    businessName,
    targetDuration,
    logoDataUrl,
    // References and Idea: with the length known, the backend writes a scene-by-scene
    // brief sized to it, and with the reference pictures attached it can look at them.
    aspectRatio,
    voiceId,
    referenceImages,
  });
  return response.data;
}

/**
 * Regenerate a single scene frame
 */
export async function regenerateSceneFrame(sessionId, index, { feedback } = {}) {
  const response = await axios.post(
    `${API}/${sessionId}/references/scene-frames/${index}/regenerate`,
    { feedback }
  );
  return response.data;
}

/**
 * Regenerate a single scene's script (narration/visual/scene prompt) + its frame
 */
/**
 * Keep one of a scene's other takes as its frame.
 */
export async function chooseSceneFrame(sessionId, index, url) {
  const response = await axios.post(`${API}/${sessionId}/references/scene-frames/${index}/choose`, { url });
  return response.data;
}

export async function regenerateSceneFrameScript(sessionId, index, { feedback } = {}) {
  const response = await axios.post(
    `${API}/${sessionId}/references/scene-frames/${index}/regenerate-script`,
    { feedback }
  );
  return response.data;
}

/**
 * Delete a scene (persists to the backend so the generated video respects it)
 */
export async function deleteSceneFrame(sessionId, index) {
  const response = await axios.delete(`${API}/${sessionId}/references/scene-frames/${index}`);
  return response.data;
}
