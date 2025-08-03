import axios from "axios";

const API_BASE = "http://localhost:5000/api/imageVideo";

export const uploadImages = async (images) => {
  try {
    const formData = new FormData();

    const newImagesMeta = [];
    const existingImagesMeta = [];

    images.forEach((item) => {
      const data = {
        id: item.id,
        description: item.description ?? "",
        video: item.video ?? "",
      };

      if (item.file instanceof File) {
        formData.append("newImagesFile", item.file);
        newImagesMeta.push(data);
      } else {
        data.file = item.file;
        existingImagesMeta.push(data);
      }
    });

    formData.append("newImagesData", JSON.stringify(newImagesMeta));
    formData.append("existingImagesData", JSON.stringify(existingImagesMeta));

    const sessionId = sessionStorage.getItem("sessionId");
    if (sessionId) {
      formData.append("sessionId", sessionId);
    }

    const response = await axios.post(`${API_BASE}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return response.data;
  } catch (error) {
    console.error("Upload failed:", error.response?.data || error.message);
    throw error;
  }
};

export const generatePreviewVideos = async () => {
  try {
    const sessionId = sessionStorage.getItem("sessionId");
    const response = await axios.post(`${API_BASE}/generatePreviewVideos`, {
      sessionId,
    });

    console.log("check response", response.data.result)

    return {videoProviders: response.data.result, success: true };
  } catch (error) {
    console.error(
      "Preview video generation failed:",
      error.response?.data || error.message
    );
    throw error;
  }
}

export const generateVideos = async (images, provider = "kling") => {
  try {
    const sessionId = sessionStorage.getItem("sessionId");
    console.log("check images before video generation", images);
    const response = await axios.post(`${API_BASE}/generateVideos`, {
      images,
      sessionId,
      provider,
    });

    return {result: response.data.result, success: true };
  } catch (error) {
    console.error(
      "Video generation failed:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const reGenerateVideo = async (image) => {
  try {
    const sessionId = sessionStorage.getItem("sessionId");
    const response = await axios.post(`${API_BASE}/reGenerateVideo`, {
      image,
      sessionId,
    });

    return {videos: response.data.result, success: true };
  } catch (error) {
    console.error(
      "Video regeneration failed:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const mergeVideos = async () => {
  try {
    const sessionId = sessionStorage.getItem("sessionId");
    const response = await axios.post(`${API_BASE}/mergeVideos`, {
      sessionId,
    });

    return {video: response.data.result, success: true };
  } catch (error) {
    console.error(
      "Video merging failed:",
      error.response?.data || error.message
    );
    throw error;
  }
};
