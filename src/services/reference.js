import axios from './api.js';
import { API_BASE as BASE } from '../config.js';

const API = `${BASE}/video`;

/**
 * Add a reference (character or setting) with optional image upload
 */
export async function addReference(sessionId, { type, name, description, imageFile }) {
  const formData = new FormData();
  formData.append('type', type);
  formData.append('name', name);
  formData.append('description', description);
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
 * Restyle all references that need it
 */
export async function restyleReferences(sessionId) {
  const response = await axios.post(`${API}/${sessionId}/references/restyle`);
  return response.data;
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
  const response = await axios.post(`${API}/${sessionId}/references/scene-frames`);
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
