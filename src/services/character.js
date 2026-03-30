import axios from './api.js';
import { API_BASE as BASE } from '../config.js';

const CHARACTER_API = `${BASE}/video`;

export async function uploadCharacter(sessionId, { name, description, imageFile }) {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('name', name);
  formData.append('description', description);

  const response = await axios.post(`${CHARACTER_API}/${sessionId}/characters`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function lockCharacter(sessionId, { feedback } = {}) {
  const response = await axios.post(`${CHARACTER_API}/${sessionId}/lock-character`, { feedback });
  return response.data;
}

export async function approveCharacter(sessionId) {
  const response = await axios.post(`${CHARACTER_API}/${sessionId}/approve-character`);
  return response.data;
}

export async function generateSceneFrames(sessionId) {
  const response = await axios.post(`${CHARACTER_API}/${sessionId}/generate-scene-frames`);
  return response.data;
}

export async function regenerateSceneFrame(sessionId, index, { feedback } = {}) {
  const response = await axios.post(
    `${CHARACTER_API}/${sessionId}/scene-frames/${index}/regenerate`,
    { feedback }
  );
  return response.data;
}

export async function generateCharacterImage(sessionId, { name, description }) {
  const response = await axios.post(`${CHARACTER_API}/${sessionId}/character/generate`, {
    name,
    description,
  });
  return response.data;
}
