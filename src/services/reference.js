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

/**
 * AI-generate images for ALL references that need it, in a single job-backed
 * batch. Uses the detached job + poll pattern so a slow image provider can't
 * time out the HTTP request mid-generation (the failure mode that stranded
 * sessions at the reference-lock step). Resolves once the batch finishes;
 * individual refs that fail keep null URLs and are recoverable via Retry.
 */
export async function generateAllReferenceImages(sessionId) {
  await axios.post(`${API}/${sessionId}/references/generate-all`);
  return await pollJobUntilDone(sessionId);
}

/**
 * Restyle all references that need it
 */
export async function restyleReferences(sessionId) {
  await axios.post(`${API}/${sessionId}/references/restyle`);
  return await pollJobUntilDone(sessionId);
}

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
  await axios.post(`${API}/${sessionId}/references/scene-frames`);
  return await pollJobUntilDone(sessionId);
}

/**
 * Approve generated scene frames without starting final video generation
 */
export async function approveSceneFrames(sessionId) {
  const response = await axios.post(`${API}/${sessionId}/references/scene-frames/approve`);
  return response.data;
}

/**
 * Improve the story prompt with AI (references pipeline, before a session
 * exists). Stateless: sends the current prompt + references, gets improved text.
 */
export async function improvePrompt({ userPrompt, references, style, mode, imageDataUrls }) {
  const response = await axios.post(`${API}/improve-prompt`, { userPrompt, references, style, mode, imageDataUrls });
  return response.data.improvedPrompt;
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
