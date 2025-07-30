import axios from "axios";

const API_BASE = "http://localhost:5000/api/storyline";

export const sendMessage = async (message, history = []) => {
  console.log("Sending message:", history);
  const response = await axios.post(`${API_BASE}/chat`, { message, history });
  return response.data;
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


