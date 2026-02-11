import axios from "axios";

const API_BASE = "https://api.susi.com.au/api";

console.log("[VIDEOS SERVICE] API_BASE:", API_BASE);

export async function createVideo(title = "") {
  console.log("[VIDEOS SERVICE] createVideo called with title:", title);
  try {
    const response = await axios.post(`${API_BASE}/videos`, { title });
    console.log("[VIDEOS SERVICE] createVideo response:", response.data);
    return response.data;
  } catch (error) {
    console.error("[VIDEOS SERVICE] ERROR createVideo:", error);
    console.error("[VIDEOS SERVICE] Error response:", error.response?.data);
    throw error;
  }
}

export async function getVideo(videoId) {
  try {
    const response = await axios.get(`${API_BASE}/videos/${videoId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching video:", error);
    throw error;
  }
}

export async function listVideos({ status, limit = 20, offset = 0 } = {}) {
  try {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    params.append("limit", limit.toString());
    params.append("offset", offset.toString());

    const response = await axios.get(`${API_BASE}/videos?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error("Error listing videos:", error);
    throw error;
  }
}

export async function deleteVideo(videoId) {
  try {
    const response = await axios.delete(`${API_BASE}/videos/${videoId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting video:", error);
    throw error;
  }
}

export async function attachScript(videoId, scriptData, voiceId = "adam") {
  console.log("[VIDEOS SERVICE] attachScript called");
  console.log("[VIDEOS SERVICE] videoId:", videoId);
  console.log("[VIDEOS SERVICE] scriptData:", scriptData);
  console.log("[VIDEOS SERVICE] voiceId:", voiceId);
  try {
    const response = await axios.post(`${API_BASE}/videos/${videoId}/script`, {
      scriptData,
      voiceId,
    });
    console.log("[VIDEOS SERVICE] attachScript response:", response.data);
    return response.data;
  } catch (error) {
    console.error("[VIDEOS SERVICE] ERROR attachScript:", error);
    console.error("[VIDEOS SERVICE] Error response:", error.response?.data);
    throw error;
  }
}

export async function uploadVideoImages(videoId, images) {
  console.log("[VIDEOS SERVICE] uploadVideoImages called");
  console.log("[VIDEOS SERVICE] videoId:", videoId);
  console.log("[VIDEOS SERVICE] images count:", images?.length);
  console.log("[VIDEOS SERVICE] images:", images);
  try {
    const formData = new FormData();
    images.forEach((image, index) => {
      console.log(`[VIDEOS SERVICE] Appending image ${index}:`, image?.name, image?.size);
      formData.append("images", image);
    });

    const response = await axios.post(
      `${API_BASE}/videos/${videoId}/images`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    console.log("[VIDEOS SERVICE] uploadVideoImages response:", response.data);
    return response.data;
  } catch (error) {
    console.error("[VIDEOS SERVICE] ERROR uploadVideoImages:", error);
    console.error("[VIDEOS SERVICE] Error response:", error.response?.data);
    throw error;
  }
}

export async function startGeneration(videoId, voiceId) {
  console.log("[VIDEOS SERVICE] startGeneration called");
  console.log("[VIDEOS SERVICE] videoId:", videoId);
  console.log("[VIDEOS SERVICE] voiceId:", voiceId);
  try {
    const response = await axios.post(`${API_BASE}/videos/${videoId}/generate`, {
      voiceId,
    });
    console.log("[VIDEOS SERVICE] startGeneration response:", response.data);
    return response.data;
  } catch (error) {
    console.error("[VIDEOS SERVICE] ERROR startGeneration:", error);
    console.error("[VIDEOS SERVICE] Error response:", error.response?.data);
    throw error;
  }
}

export async function getProgress(videoId) {
  try {
    const response = await axios.get(`${API_BASE}/videos/${videoId}/progress`);
    return response.data;
  } catch (error) {
    console.error("Error fetching progress:", error);
    throw error;
  }
}
