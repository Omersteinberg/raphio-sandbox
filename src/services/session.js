import axios from "axios";

const API_BASE = "http://localhost:3000/api/wizard";

/**
 * Create a new session
 */
export async function startSession({ userPrompt, style, targetDuration, voiceId }) {
  const url = `${API_BASE}/start`;
  const payload = {
    userPrompt,
    style,
    targetDuration,
    voiceId,
  };
  
  console.log("[sessionService] POST", url);
  console.log("[sessionService] Payload:", payload);
  
  try {
    const response = await axios.post(url, payload);
    console.log("[sessionService] Response status:", response.status);
    console.log("[sessionService] Response data:", response.data);
    return response.data;
  } catch (error) {
    console.error("[sessionService] Request failed:", error.message);
    if (error.response) {
      console.error("[sessionService] Response status:", error.response.status);
      console.error("[sessionService] Response data:", error.response.data);
    } else if (error.request) {
      console.error("[sessionService] No response received - is the backend running?");
    }
    throw error;
  }
}

/**
 * Get session status
 */
export async function getSession(sessionId) {
  const response = await axios.get(`${API_BASE}/${sessionId}`);
  return response.data;
}

/**
 * List sessions
 */
export async function listSessions({ stage, limit, offset } = {}) {
  const params = new URLSearchParams();
  if (stage) params.append("stage", stage);
  if (limit) params.append("limit", limit.toString());
  if (offset) params.append("offset", offset.toString());

  const response = await axios.get(`${API_BASE}?${params.toString()}`);
  return response.data;
}

/**
 * Upload images to session
 */
export async function uploadImages(sessionId, files) {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("images", file);
  });

  const response = await axios.post(
    `${API_BASE}/${sessionId}/images`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return response.data;
}

/**
 * Analyze uploaded images
 */
export async function analyzeImages(sessionId) {
  const response = await axios.post(`${API_BASE}/${sessionId}/analyze`);
  return response.data;
}

/**
 * Generate script from prompt and image analysis
 */
export async function generateScript(sessionId) {
  const response = await axios.post(`${API_BASE}/${sessionId}/generate-script`);
  return response.data;
}

/**
 * Update script (direct update or AI-assisted edit)
 */
export async function updateScript(sessionId, { scriptData, editRequest }) {
  const response = await axios.put(`${API_BASE}/${sessionId}/script`, {
    scriptData,
    editRequest,
  });
  return response.data;
}

/**
 * Approve script and move to next stage
 */
export async function approveScript(sessionId) {
  const url = `${API_BASE}/${sessionId}/approve-script`;
  
  console.log("[sessionService] POST", url);
  
  try {
    const response = await axios.post(url);
    console.log("[sessionService] approveScript response status:", response.status);
    console.log("[sessionService] approveScript response data:", response.data);
    return response.data;
  } catch (error) {
    console.error("[sessionService] approveScript failed:", error.message);
    if (error.response) {
      console.error("[sessionService] Response status:", error.response.status);
      console.error("[sessionService] Response data:", error.response.data);
    }
    throw error;
  }
}

/**
 * Configure opening/closing frames
 */
export async function configureFrames(sessionId, { opening, closing }) {
  const url = `${API_BASE}/${sessionId}/frames`;
  const payload = { opening, closing };
  
  console.log("[sessionService] POST", url);
  console.log("[sessionService] configureFrames payload:", payload);
  
  try {
    const response = await axios.post(url, payload);
    console.log("[sessionService] configureFrames response status:", response.status);
    console.log("[sessionService] configureFrames response data:", response.data);
    return response.data;
  } catch (error) {
    console.error("[sessionService] configureFrames failed:", error.message);
    if (error.response) {
      console.error("[sessionService] Response status:", error.response.status);
      console.error("[sessionService] Response data:", error.response.data);
    }
    throw error;
  }
}

/**
 * Start video generation
 */
export async function startGeneration(sessionId, { videoModel, voiceId } = {}) {
  const url = `${API_BASE}/${sessionId}/generate`;
  const payload = { videoModel, voiceId };
  
  console.log("[sessionService] POST", url);
  console.log("[sessionService] startGeneration payload:", payload);
  
  try {
    const response = await axios.post(url, payload);
    console.log("[sessionService] startGeneration response status:", response.status);
    console.log("[sessionService] startGeneration response data:", response.data);
    return response.data;
  } catch (error) {
    console.error("[sessionService] startGeneration failed:", error.message);
    if (error.response) {
      console.error("[sessionService] Response status:", error.response.status);
      console.error("[sessionService] Response data:", error.response.data);
    }
    throw error;
  }
}

/**
 * Enter editing mode for completed video
 */
export async function enterEditingMode(sessionId) {
  const response = await axios.post(`${API_BASE}/${sessionId}/edit`);
  return response.data;
}

/**
 * Update a clip's prompt/narration
 */
export async function updateClip(sessionId, clipId, updates) {
  const response = await axios.put(`${API_BASE}/${sessionId}/clips/${clipId}`, updates);
  return response.data;
}

/**
 * Regenerate a single clip
 */
export async function regenerateClip(sessionId, clipId, { prompt, model } = {}) {
  const response = await axios.post(`${API_BASE}/${sessionId}/clips/${clipId}/regenerate`, {
    prompt,
    model,
  });
  return response.data;
}

/**
 * Reorder clips
 */
export async function reorderClips(sessionId, order) {
  const response = await axios.put(`${API_BASE}/${sessionId}/clips/reorder`, { order });
  return response.data;
}

/**
 * Reassemble video after edits
 */
export async function reassembleVideo(sessionId, { regenerateAudio, voiceId } = {}) {
  const response = await axios.post(`${API_BASE}/${sessionId}/reassemble`, {
    regenerateAudio,
    voiceId,
  });
  return response.data;
}

/**
 * Delete a clip
 */
export async function deleteClip(sessionId, clipId) {
  const response = await axios.delete(`${API_BASE}/${sessionId}/clips/${clipId}`);
  return response.data;
}

/**
 * Add a new clip
 */
export async function addClip(sessionId, clipData) {
  const response = await axios.post(`${API_BASE}/${sessionId}/clips`, clipData);
  return response.data;
}

/**
 * Delete session
 */
export async function deleteSession(sessionId) {
  const response = await axios.delete(`${API_BASE}/${sessionId}`);
  return response.data;
}
