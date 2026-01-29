import axios from "axios";

const API_BASE = "http://localhost:3000/api/storyline";

console.log("[CHAT SERVICE] API_BASE:", API_BASE);

export const sendMessage = async (message, history = []) => {
  console.log("[CHAT SERVICE] sendMessage called");
  console.log("[CHAT SERVICE] Message:", message);
  console.log("[CHAT SERVICE] History:", history);
  console.log("[CHAT SERVICE] Sending to:", `${API_BASE}/chat`);

  try {
    const response = await axios.post(`${API_BASE}/chat`, { message, history });
    console.log("[CHAT SERVICE] Response status:", response.status);
    console.log("[CHAT SERVICE] Response data:", response.data);
    return response.data;
  } catch (error) {
    console.error("[CHAT SERVICE] ERROR:", error);
    console.error("[CHAT SERVICE] Error response:", error.response?.data);
    console.error("[CHAT SERVICE] Error status:", error.response?.status);
    throw error;
  }
};

export const getSession = async (sessionId) => {
  const response = await axios.get(`${API_BASE}/session/${sessionId}`);
  return response.data;
};

export const createSession = async() => {
  const response = await axios.post(`${API_BASE}/session`);
  return response.data;
}

export const saveTranscript = async (history) => {
  try {
    const sessionId = sessionStorage.getItem("sessionId");

    console.log("saving transcript");

    const response = await axios.post(`${API_BASE}/transcript`, {
      history: JSON.stringify(history),
      sessionId,
    });

    const { sessionId: newSessionId } = response.data;

    if (newSessionId) {
      sessionStorage.setItem("sessionId", newSessionId);
    }

    return { status: response.status, success: response.data.success };
  } catch (error) {
    console.error("Failed to save transcript:", error);
    return { status: 500, success: false };
  }
};


