import axios from "axios";
import { API_BASE as BASE } from "../config.js";

const API_BASE = `${BASE}/voices`;

// Cache for voices list
let voicesCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get all available voices with metadata
 */
export async function getVoices() {
  // Check cache
  if (voicesCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return voicesCache;
  }

  try {
    const response = await axios.get(API_BASE);
    if (response.data.success) {
      voicesCache = response.data.data;
      cacheTimestamp = Date.now();
      return voicesCache;
    }
    throw new Error(response.data.error || "Failed to fetch voices");
  } catch (error) {
    console.error("[voicesService] Error fetching voices:", error.message);
    // Return fallback voices if API fails
    return getFallbackVoices();
  }
}

/**
 * Get voice preview URL for a specific voice
 */
export async function getVoicePreview(voiceKey) {
  try {
    const response = await axios.get(`${API_BASE}/${voiceKey}/preview`);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.error || "Failed to fetch preview");
  } catch (error) {
    console.error("[voicesService] Error fetching voice preview:", error.message);
    return null;
  }
}

/**
 * Get preview URLs for all voices (batch request)
 */
export async function getBatchPreviews() {
  try {
    const response = await axios.get(`${API_BASE}/batch/previews`);
    if (response.data.success) {
      return response.data.data;
    }
    return {};
  } catch (error) {
    console.error("[voicesService] Error fetching batch previews:", error.message);
    return {};
  }
}

/**
 * Fallback voices list if API is unavailable
 */
function getFallbackVoices() {
  return [
    { key: "adam", name: "Adam", description: "American male, deep narrator", gender: "male", accent: "American", category: "Narrator" },
    { key: "rachel", name: "Rachel", description: "American female, calm and warm", gender: "female", accent: "American", category: "Calm" },
    { key: "drew", name: "Drew", description: "American male, well-rounded and confident", gender: "male", accent: "American", category: "General" },
    { key: "sarah", name: "Sarah", description: "American female, soft and news-like", gender: "female", accent: "American", category: "News" },
    { key: "charlie", name: "Charlie", description: "Australian male, casual and natural", gender: "male", accent: "Australian", category: "Conversational" },
    { key: "emily", name: "Emily", description: "American female, calm narrator", gender: "female", accent: "American", category: "Narrator" },
    { key: "james", name: "James", description: "Australian male, calm narrator", gender: "male", accent: "Australian", category: "Narrator" },
    { key: "charlotte", name: "Charlotte", description: "Swedish female, seductive character", gender: "female", accent: "Swedish", category: "Character" },
    { key: "brian", name: "Brian", description: "American male, deep narrator", gender: "male", accent: "American", category: "Narrator" },
    { key: "george", name: "George", description: "British male, warm narrator", gender: "male", accent: "British", category: "Narrator" },
    { key: "lily", name: "Lily", description: "British female, warm narrator", gender: "female", accent: "British", category: "Narrator" },
    { key: "daniel", name: "Daniel", description: "British male, deep news presenter", gender: "male", accent: "British", category: "News" },
    { key: "matilda", name: "Matilda", description: "American female, warm narrator", gender: "female", accent: "American", category: "Narrator" },
    { key: "matthew", name: "Matthew", description: "British male, audiobook narrator", gender: "male", accent: "British", category: "Audiobook" },
    { key: "bill", name: "Bill", description: "American male, documentary narrator", gender: "male", accent: "American", category: "Narrator" },
  ];
}

/**
 * Clear the voice cache
 */
export function clearVoicesCache() {
  voicesCache = null;
  cacheTimestamp = 0;
}
