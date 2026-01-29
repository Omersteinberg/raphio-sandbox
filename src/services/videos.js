import axios from "axios";

const API_BASE = "http://localhost:3000/api";

export async function createVideo(title = "") {
  try {
    const response = await axios.post(`${API_BASE}/videos`, { title });
    return response.data;
  } catch (error) {
    console.error("Error creating video:", error);
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
  try {
    const response = await axios.post(`${API_BASE}/videos/${videoId}/script`, {
      scriptData,
      voiceId,
    });
    return response.data;
  } catch (error) {
    console.error("Error attaching script:", error);
    throw error;
  }
}

export async function uploadVideoImages(videoId, images) {
  try {
    const formData = new FormData();
    images.forEach((image) => {
      formData.append("images", image);
    });

    const response = await axios.post(
      `${API_BASE}/videos/${videoId}/images`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error uploading images:", error);
    throw error;
  }
}

export async function startGeneration(videoId, voiceId) {
  try {
    const response = await axios.post(`${API_BASE}/videos/${videoId}/generate`, {
      voiceId,
    });
    return response.data;
  } catch (error) {
    console.error("Error starting generation:", error);
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
