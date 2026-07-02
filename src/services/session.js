import axios from "./api.js";
import { API_BASE as BASE } from "../config.js";

const API_BASE = `${BASE}/video`;

/**
 * Create a new session
 */
export async function startSession({ userPrompt, style, imageDuration, voiceId, pipelineMode, enableBridges, targetDuration, aspectRatio }) {
  const url = `${API_BASE}/start`;
  const payload = {
    userPrompt,
    style,
    imageDuration,
    voiceId,
    pipelineMode: pipelineMode || 'image',
    enableBridges: enableBridges || false,
    ...(targetDuration ? { targetDuration } : {}),
    ...(aspectRatio ? { aspectRatio } : {}),
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
 * @returns {{ data: Array, total: number }}
 */
export async function listSessions({ stage, status, limit, offset } = {}) {
  const params = new URLSearchParams();
  if (stage) params.append("stage", stage);
  if (status) params.append("status", status);
  if (limit) params.append("limit", limit.toString());
  if (offset != null) params.append("offset", offset.toString());

  const response = await axios.get(`${API_BASE}?${params.toString()}`);
  return response.data;
}

/**
 * Estimate resulting video length from image count vs. target duration.
 * Stateless: safe to call before a session exists (while the user is still
 * choosing images/duration on the prompt screen).
 * @returns {{ status: string, estimatedDuration: number, message: string, options: Array }}
 */
export async function estimateDuration({ imageCount, targetDuration, videoModel, enableBridges }) {
  const response = await axios.post(`${API_BASE}/estimate-duration`, {
    imageCount,
    ...(targetDuration != null ? { targetDuration } : {}),
    ...(videoModel ? { videoModel } : {}),
    enableBridges: Boolean(enableBridges),
  });
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
 * Upload a logo for the intro pipeline.
 * @returns {{ logoUrl: string }}
 */
export async function uploadLogo(sessionId, file) {
  const formData = new FormData();
  formData.append("image", file);
  const response = await axios.post(
    `${API_BASE}/${sessionId}/logo`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return response.data;
}

/**
 * Save the intro business brief.
 * @returns {{ introData: object }}
 */
export async function saveIntroBrief(sessionId, { businessName, description, targetAudience, style }) {
  const response = await axios.put(`${API_BASE}/${sessionId}/intro-brief`, {
    businessName,
    description,
    targetAudience,
    style,
  });
  return response.data;
}

/**
 * Generate (or revise) the intro montage+narration script.
 * @param {string} sessionId
 * @param {object} [opts] - { editRequest } natural-language revision request
 * @returns updated session (stage INTRO_SCRIPT_GENERATED)
 */
export async function generateIntroScript(sessionId, { editRequest } = {}) {
  await axios.post(`${API_BASE}/${sessionId}/generate-script`, { editRequest }); // 202: starts the job
  return await pollJobUntilDone(sessionId);
}

/**
 * Save edits to the intro script (montage plan + narration + voice).
 * @returns updated session
 */
export async function updateIntroScript(sessionId, { businessName, vignettes, motionPrompt, musicPrompt, narration, voiceId }) {
  const response = await axios.put(`${API_BASE}/${sessionId}/intro-script`, {
    businessName, vignettes, motionPrompt, musicPrompt, narration, voiceId,
  });
  return response.data;
}

/**
 * Upload an opening/closing frame image. Unlike uploadImages, this does NOT
 * add the file to the session's content-image pool.
 * @returns {{ imageUrl: string }}
 */
export async function uploadFrameImage(sessionId, file) {
  const formData = new FormData();
  formData.append("image", file);
  const response = await axios.post(
    `${API_BASE}/${sessionId}/frame-image`,
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
 * Check current state of Flux Kontext restyle jobs for a session.
 * Returns { total, complete, pending, failed, skipped, done }.
 */
export async function getRestyleStatus(sessionId) {
  const response = await axios.get(`${API_BASE}/${sessionId}/restyle-status`);
  return response.data;
}

/**
 * Poll /restyle-status until every Kontext job has settled. Each poll resolves
 * in well under a second so no proxy/CDN idle timeout fires.
 *
 * @param {string} sessionId
 * @param {object} [options]
 * @param {number} [options.intervalMs=3000]
 * @param {number} [options.timeoutMs=600000] - 10 min cap
 * @param {(status: object) => void} [options.onProgress]
 */
export async function pollRestyleUntilDone(sessionId, options = {}) {
  const { intervalMs = 3000, timeoutMs = 600000, onProgress } = options;
  const startedAt = Date.now();

  while (true) {
    const status = await getRestyleStatus(sessionId);
    if (typeof onProgress === 'function') onProgress(status);
    if (status.done) return status;
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`Restyle polling timed out after ${Math.round(timeoutMs / 1000)}s (still ${status.pending} pending)`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

/**
 * One-shot read of the current background job for a session.
 */
export async function getJobStatus(sessionId) {
  const response = await axios.get(`${API_BASE}/${sessionId}/job-status`);
  return response.data;
}

/**
 * Poll /job-status until the background job finishes. Resolves with the job's
 * stored result (e.g. the updated session). Throws with the backend error
 * message if the job failed. Each poll is sub-second, so no proxy/cPanel
 * timeout can kill it.
 *
 * @param {string} sessionId
 * @param {object} [options]
 * @param {number} [options.intervalMs=3000]
 * @param {number} [options.timeoutMs=600000] - 10 min client cap
 * @param {(status: object) => void} [options.onProgress]
 * @param {string} [options.expectedJobType] - if set, ignore states belonging to
 *   a different job. A session has ONE job slot shared by export/reassemble, so
 *   without this an export's poller could react to a reassemble's DONE/FAILED
 *   (and vice-versa) — e.g. a stray "Reassemble failed" during an export.
 */
export async function pollJobUntilDone(sessionId, options = {}) {
  const { intervalMs = 3000, timeoutMs = 600000, onProgress, expectedJobType } = options;
  const startedAt = Date.now();

  while (true) {
    const status = await getJobStatus(sessionId);

    // The slot now holds a DIFFERENT job than the one we started — another
    // operation took over. Stop quietly rather than reporting its result as ours.
    if (expectedJobType && status.jobType && status.jobType !== expectedJobType) {
      return null;
    }

    if (typeof onProgress === 'function') onProgress(status);
    if (status.jobStatus === 'DONE') return status.result;
    if (status.jobStatus === 'FAILED') throw new Error(status.jobError || 'Job failed');
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`Job polling timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

/**
 * Generate a frame image (opening or closing) using DALL-E
 * @param {string} sessionId
 * @param {string} frameType - 'opening' or 'closing'
 * @param {string} prompt - The prompt for DALL-E image generation
 * @param {string} description - Context description for the frame
 */
export async function generateFrameImage(sessionId, frameType, prompt, description = "") {
  const url = `${API_BASE}/${sessionId}/generate-frame-image`;
  const payload = { type: frameType, prompt, description };

  console.log("[sessionService] POST", url);
  console.log("[sessionService] generateFrameImage payload:", payload);

  try {
    const response = await axios.post(url, payload);
    console.log("[sessionService] generateFrameImage response status:", response.status);
    console.log("[sessionService] generateFrameImage response data:", response.data);
    return response.data;
  } catch (error) {
    console.error("[sessionService] generateFrameImage failed:", error.message);
    if (error.response) {
      console.error("[sessionService] Response status:", error.response.status);
      console.error("[sessionService] Response data:", error.response.data);
    }
    throw error;
  }
}

/**
 * Generate script from prompt and image analysis
 * @param {string} sessionId
 * @param {Object} frameOptions - Optional frame configuration
 * @param {string} frameOptions.opening - 'none' | 'ai_generate' | 'user_image'
 * @param {string} frameOptions.openingPrompt - AI prompt for opening frame
 * @param {string} frameOptions.openingImageUrl - User image URL for opening
 * @param {string} frameOptions.openingNarration - Custom narration for opening
 * @param {string} frameOptions.closing - 'none' | 'ai_generate' | 'user_image'
 * @param {string} frameOptions.closingPrompt - AI prompt for closing frame
 * @param {string} frameOptions.closingImageUrl - User image URL for closing
 * @param {string} frameOptions.closingNarration - Custom narration for closing
 */
export async function generateScript(sessionId, frameOptions = null, options = {}) {
  const payload = frameOptions ? { frameOptions } : {};
  await axios.post(`${API_BASE}/${sessionId}/generate-script`, payload); // 202: starts the job
  return await pollJobUntilDone(sessionId, {
    onProgress: (status) => options.onProgress?.(status.jobProgress),
  });
}

/**
 * Generate story outline with bridge frame proposals.
 * @param {object} [options]
 * @param {(progress: {percentage:number,label:string}|null) => void} [options.onProgress]
 *   Called on each poll with the backend's current sub-stage progress (or null).
 */
export async function generateOutline(sessionId, frameOptions = null, options = {}) {
  const payload = frameOptions ? { frameOptions } : {};
  await axios.post(`${API_BASE}/${sessionId}/generate-outline`, payload); // 202: starts the job
  return await pollJobUntilDone(sessionId, {
    onProgress: (status) => options.onProgress?.(status.jobProgress),
  });
}

/**
 * Approve outline and trigger bridge frame image generation
 */
export async function approveOutline(sessionId) {
  await axios.post(`${API_BASE}/${sessionId}/approve-outline`); // 202
  return await pollJobUntilDone(sessionId);
}

/**
 * Retry failed bridge frame image generation
 */
export async function retryBridgeFrames(sessionId, orderIndices) {
  const payload = orderIndices ? { orderIndices } : {};
  await axios.post(`${API_BASE}/${sessionId}/retry-bridge-frames`, payload); // 202
  return await pollJobUntilDone(sessionId);
}

/**
 * Upload a user image for a bridge frame
 */
export async function uploadBridgeImage(sessionId, orderIndex, file) {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('orderIndex', orderIndex.toString());

  const response = await axios.post(
    `${API_BASE}/${sessionId}/bridge-frame-upload`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
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
export async function startGeneration(sessionId, { videoModel, voiceId, backgroundMusic } = {}) {
  const url = `${API_BASE}/${sessionId}/generate`;
  const payload = { videoModel, voiceId, backgroundMusic };
  
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
 * Mark session as completed
 */
export async function completeSession(sessionId) {
  const response = await axios.post(`${API_BASE}/${sessionId}/complete`);
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
 * Regenerate a single clip. Runs as a background job; pass `onProgress` to
 * receive the job's live stage progress ({ percentage, label }) for a modal.
 */
export async function regenerateClip(sessionId, clipId, { prompt, model, style, imageUrl } = {}, onProgress) {
  const { data } = await axios.post(`${API_BASE}/${sessionId}/clips/${clipId}/regenerate`, {
    prompt,
    model,
    style,
    imageUrl,
  });
  // Another job already owns this video's single slot — don't poll its result.
  if (data && data.jobType && data.jobType !== 'REGENERATE_CLIP') {
    throw new Error('Another operation is still running on this video. Please wait for it to finish, then try again.');
  }
  return await pollJobUntilDone(sessionId, {
    expectedJobType: 'REGENERATE_CLIP',
    onProgress: (status) => {
      if (typeof onProgress === 'function' && status && status.jobProgress) {
        onProgress(status.jobProgress); // { percentage, label }
      }
    },
  });
}

/**
 * Regenerate narration for a single clip
 */
export async function regenerateNarration(sessionId, clipId, { narrationText, voiceId } = {}) {
  const response = await axios.post(`${API_BASE}/${sessionId}/clips/${clipId}/regenerate-narration`, {
    narrationText,
    voiceId,
  });
  return response.data;
}

/**
 * Update a clip's image
 */
export async function updateClipImage(sessionId, clipId, imageUrl) {
  const response = await axios.put(`${API_BASE}/${sessionId}/clips/${clipId}/image`, {
    imageUrl,
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
 * Reassemble video after edits. Runs as a background job; pass `onProgress` to
 * receive the job's live stage progress ({ percentage, label }) for a modal.
 */
export async function reassembleVideo(sessionId, { regenerateAudio, voiceId } = {}, onProgress) {
  const { data } = await axios.post(`${API_BASE}/${sessionId}/reassemble`, {
    regenerateAudio,
    voiceId,
  });
  // Another job already owns this video's single slot — don't poll its result.
  if (data && data.jobType && data.jobType !== 'REASSEMBLE_VIDEO') {
    throw new Error('Another operation is still running on this video. Please wait for it to finish, then try again.');
  }
  return await pollJobUntilDone(sessionId, {
    expectedJobType: 'REASSEMBLE_VIDEO',
    onProgress: (status) => {
      if (typeof onProgress === 'function' && status && status.jobProgress) {
        onProgress(status.jobProgress); // { percentage, label }
      }
    },
  });
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
 * Fetch available video styles
 */
export async function fetchStyles() {
  const response = await axios.get(`${API_BASE}/styles`);
  return response.data;
}

/**
 * Delete session
 */
export async function deleteSession(sessionId) {
  const response = await axios.delete(`${API_BASE}/${sessionId}`);
  return response.data;
}

// ============================================
// Timeline API Functions
// ============================================

/**
 * Get or create timeline for a session
 */
export async function getTimeline(sessionId) {
  const response = await axios.get(`${API_BASE}/${sessionId}/timeline`);
  return response.data;
}

/**
 * Update a timeline item (trim, speed, position, volume)
 */
export async function updateTimelineItem(sessionId, itemId, updates) {
  const response = await axios.put(
    `${API_BASE}/${sessionId}/timeline/items/${itemId}`,
    updates
  );
  return response.data;
}

/**
 * Add a new timeline item
 */
export async function addTimelineItem(sessionId, itemData) {
  const response = await axios.post(
    `${API_BASE}/${sessionId}/timeline/items`,
    itemData
  );
  return response.data;
}

/**
 * Remove a timeline item
 */
export async function removeTimelineItem(sessionId, itemId) {
  const response = await axios.delete(
    `${API_BASE}/${sessionId}/timeline/items/${itemId}`
  );
  return response.data;
}

/**
 * Replace ALL timeline items in one call (used by editor Undo).
 * Returns { items, duration }.
 */
export async function replaceTimelineItems(sessionId, items) {
  const response = await axios.put(
    `${API_BASE}/${sessionId}/timeline/items`,
    { items }
  );
  return response.data;
}

/**
 * Split a timeline item at a specific time
 */
export async function splitTimelineItem(sessionId, itemId, splitTime) {
  const response = await axios.post(
    `${API_BASE}/${sessionId}/timeline/items/${itemId}/split`,
    { splitTime }
  );
  return response.data;
}

/**
 * Update playhead position
 */
export async function updatePlayhead(sessionId, position) {
  const response = await axios.put(
    `${API_BASE}/${sessionId}/timeline/playhead`,
    { position }
  );
  return response.data;
}

/**
 * Update zoom level
 */
export async function updateZoom(sessionId, zoomLevel) {
  const response = await axios.put(
    `${API_BASE}/${sessionId}/timeline/zoom`,
    { zoomLevel }
  );
  return response.data;
}

/**
 * Upload custom audio file
 */
export async function uploadAudio(sessionId, file) {
  const formData = new FormData();
  formData.append("audio", file);

  const response = await axios.post(
    `${API_BASE}/${sessionId}/audio/upload`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return response.data;
}

/**
 * Generate TTS audio
 */
export async function generateTTS(sessionId, { text, voiceId, name }) {
  const response = await axios.post(`${API_BASE}/${sessionId}/audio/tts`, {
    text,
    voiceId,
    name,
  });
  return response.data;
}

/**
 * Get audio waveform data
 */
export async function getAudioWaveform(sessionId, audioId) {
  const response = await axios.get(
    `${API_BASE}/${sessionId}/audio/${audioId}/waveform`
  );
  return response.data;
}

/**
 * Delete audio asset
 */
export async function deleteAudioAsset(sessionId, audioId) {
  const response = await axios.delete(
    `${API_BASE}/${sessionId}/audio/${audioId}`
  );
  return response.data;
}

/**
 * Export timeline to final video. The backend now runs the (potentially long)
 * ffmpeg assembly as a background job and returns 202, so we poll /job-status
 * until it's done. Resolves with the updated Video (same shape as before).
 *
 * @param {string} sessionId
 * @param {(progress: { percentage: number, label: string }) => void} [onProgress]
 *   Called on each poll with the job's live progress snapshot, so the UI can
 *   show a real progress bar + stage label.
 */
export async function exportTimeline(sessionId, onProgress) {
  const { data } = await axios.post(`${API_BASE}/${sessionId}/timeline/export`); // 202 — starts the job
  // If another job already owns this video's single slot, the API hands back
  // that job's type instead of starting ours. Don't poll — say so clearly.
  if (data && data.jobType && data.jobType !== 'EXPORT_TIMELINE') {
    throw new Error('Another operation is still running on this video. Please wait for it to finish, then try again.');
  }
  return await pollJobUntilDone(sessionId, {
    expectedJobType: 'EXPORT_TIMELINE',
    onProgress: (status) => {
      if (typeof onProgress === 'function' && status && status.jobProgress) {
        onProgress(status.jobProgress); // { percentage, label }
      }
    },
  });
}

/**
 * Get export manifest (for debugging)
 */
export async function getExportManifest(sessionId) {
  const response = await axios.get(`${API_BASE}/${sessionId}/timeline/manifest`);
  return response.data;
}
