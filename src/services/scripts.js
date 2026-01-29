import axios from "axios";

const API_BASE = "http://localhost:3000/api";

export async function generateScript(prompt, targetDuration, style) {
  try {
    const response = await axios.post(`${API_BASE}/scripts/generate`, {
      prompt,
      targetDuration,
      style,
    });
    return response.data;
  } catch (error) {
    console.error("Error generating script:", error);
    throw error;
  }
}

export async function updateSection(sectionId, updates) {
  try {
    const response = await axios.put(
      `${API_BASE}/scripts/sections/${sectionId}`,
      updates
    );
    return response.data;
  } catch (error) {
    console.error("Error updating section:", error);
    throw error;
  }
}
