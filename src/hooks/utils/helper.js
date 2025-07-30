export function convertTranscript(data, type) {
  if (type === "transcript") {
    return data.map((msg) => ({
      role: msg.sender === "user" ? "user" : "assistant",
      content: msg.text,
      timestamp: msg?.timestamp || new Date(),
    }));
  } else if (type === "chat") {
    return data.map((msg) => ({
      id: Date.now(),
      text: msg.content,
      sender: msg.role === "user" ? "user" : "assistant",
      timestamp: msg?.timestamp || new Date(),
    }));
  } else {
    // incorrect usage of function
    console.log("Incorrect usage of convertTranscript");
    return [];
  }
}

export function convertGCPImages(data) {
  console.log("check data here", data);
  return data.map((imageObject, idx) => ({
  id: `existing-${idx}`,
  file: imageObject.file,
}));
}
