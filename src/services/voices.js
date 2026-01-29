import axios from "axios";

const API_BASE = "http://localhost:3000/api";

// Voice list - matches backend constants
// Until a /api/voices endpoint is added, we use this local list
const VOICE_LIST = [
  { key: "rachel", name: "Rachel", gender: "female", description: "Warm and conversational female voice" },
  { key: "drew", name: "Drew", gender: "male", description: "Professional male voice" },
  { key: "clyde", name: "Clyde", gender: "male", description: "Friendly male voice" },
  { key: "paul", name: "Paul", gender: "male", description: "Clear and articulate male voice" },
  { key: "domi", name: "Domi", gender: "female", description: "Energetic female voice" },
  { key: "dave", name: "Dave", gender: "male", description: "Natural male voice" },
  { key: "fin", name: "Fin", gender: "male", description: "Young male voice" },
  { key: "sarah", name: "Sarah", gender: "female", description: "Professional female voice" },
  { key: "antoni", name: "Antoni", gender: "male", description: "Smooth male voice" },
  { key: "thomas", name: "Thomas", gender: "male", description: "Deep male voice" },
  { key: "charlie", name: "Charlie", gender: "male", description: "Casual male voice" },
  { key: "george", name: "George", gender: "male", description: "British male voice" },
  { key: "emily", name: "Emily", gender: "female", description: "Youthful female voice" },
  { key: "elli", name: "Elli", gender: "female", description: "Expressive female voice" },
  { key: "callum", name: "Callum", gender: "male", description: "Scottish male voice" },
  { key: "patrick", name: "Patrick", gender: "male", description: "Irish male voice" },
  { key: "harry", name: "Harry", gender: "male", description: "British male voice" },
  { key: "liam", name: "Liam", gender: "male", description: "American male voice" },
  { key: "dorothy", name: "Dorothy", gender: "female", description: "Mature female voice" },
  { key: "josh", name: "Josh", gender: "male", description: "Casual male voice" },
  { key: "arnold", name: "Arnold", gender: "male", description: "Strong male voice" },
  { key: "charlotte", name: "Charlotte", gender: "female", description: "Elegant female voice" },
  { key: "matilda", name: "Matilda", gender: "female", description: "Warm female voice" },
  { key: "matthew", name: "Matthew", gender: "male", description: "Friendly male voice" },
  { key: "james", name: "James", gender: "male", description: "Professional male voice" },
  { key: "joseph", name: "Joseph", gender: "male", description: "Calm male voice" },
  { key: "jeremy", name: "Jeremy", gender: "male", description: "Energetic male voice" },
  { key: "michael", name: "Michael", gender: "male", description: "Authoritative male voice" },
  { key: "ethan", name: "Ethan", gender: "male", description: "Youthful male voice" },
  { key: "gigi", name: "Gigi", gender: "female", description: "Playful female voice" },
  { key: "freya", name: "Freya", gender: "female", description: "Nordic female voice" },
  { key: "brian", name: "Brian", gender: "male", description: "Narrator male voice" },
  { key: "grace", name: "Grace", gender: "female", description: "Gentle female voice" },
  { key: "daniel", name: "Daniel", gender: "male", description: "British male voice" },
  { key: "lily", name: "Lily", gender: "female", description: "Sweet female voice" },
  { key: "serena", name: "Serena", gender: "female", description: "Calm female voice" },
  { key: "adam", name: "Adam", gender: "male", description: "Deep conversational male voice (default)" },
  { key: "nicole", name: "Nicole", gender: "female", description: "American female voice" },
  { key: "bill", name: "Bill", gender: "male", description: "Mature male voice" },
  { key: "jessie", name: "Jessie", gender: "female", description: "Upbeat female voice" },
  { key: "sam", name: "Sam", gender: "male", description: "Casual male voice" },
  { key: "glinda", name: "Glinda", gender: "female", description: "Whimsical female voice" },
  { key: "giovanni", name: "Giovanni", gender: "male", description: "Italian male voice" },
  { key: "mimi", name: "Mimi", gender: "female", description: "Sweet female voice" },
];

export async function getVoices() {
  try {
    // Try to fetch from API first
    const response = await axios.get(`${API_BASE}/voices`);
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    // Fallback to local list
    return VOICE_LIST;
  } catch (error) {
    // If API not available, use local list
    console.log("Using local voice list");
    return VOICE_LIST;
  }
}

export function isValidVoice(voiceId) {
  return VOICE_LIST.some((v) => v.key === voiceId);
}

export function getVoiceById(voiceId) {
  return VOICE_LIST.find((v) => v.key === voiceId);
}
