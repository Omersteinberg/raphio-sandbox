import axios from "./api.js";
import { API_BASE as BASE } from "../config.js";

const API_BASE = `${BASE}/voices`;

// Cache for voices list
let voicesCache = null;
let cacheTimestamp = 0;
let regionDefaultCache = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get all available voices with metadata
 */
export async function getVoices(options = {}) {
  const includeLiveMeta = Boolean(options.includeLiveMeta);

  // Check cache
  if (!includeLiveMeta && voicesCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return voicesCache;
  }

  try {
    const response = await axios.get(API_BASE, {
      params: includeLiveMeta ? { includeLiveMeta: true } : undefined,
    });
    if (response.data.success) {
      const voices = response.data.data;
      if (response.data.regionDefault) {
        regionDefaultCache = response.data.regionDefault;
        const { countryCode, accent, voiceKey } = regionDefaultCache;
        console.log(
          `[voices] region from IP: country=${countryCode || "unresolved"} ` +
            `accent=${accent} defaultVoice=${voiceKey}`,
        );
      }
      if (!includeLiveMeta) {
        voicesCache = voices;
        cacheTimestamp = Date.now();
      }
      return voices;
    }
    throw new Error(response.data.error || "Failed to fetch voices");
  } catch (error) {
    console.error("[voicesService] Error fetching voices:", error.message);
    // Return fallback voices if API fails
    return getFallbackVoices();
  }
}

/**
 * Region-based default voice, derived from the caller's IP by the backend.
 * Returns { countryCode, accent, voiceKey } or null. Triggers a voices fetch
 * if the list hasn't loaded yet.
 */
export async function getRegionDefault() {
  if (regionDefaultCache) return regionDefaultCache;
  try {
    await getVoices();
  } catch {
    /* ignore - falls through to null */
  }
  return regionDefaultCache;
}

/**
 * Region default straight from cache, or null if no voices fetch has populated it
 * yet. Never fetches: for a caller that has just awaited getVoices() this is the
 * same value getRegionDefault() would return, minus a redundant request in the
 * API-down path (where getVoices() serves fallbacks and leaves the cache empty).
 */
export function peekRegionDefault() {
  return regionDefaultCache;
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
 * Fallback voices list if API is unavailable.
 *
 * MUST stay in sync with VOICES in the backend's src/constants/voices.js. Every
 * key here has to exist there: the picker writes the key straight through to
 * WizardSession.voiceId, and TTS silently substitutes the default voice for a key
 * it does not recognize. An invented key means the user hears a voice they never
 * chose, with no error anywhere.
 */
function getFallbackVoices() {
  return [
    { key: "bella", name: "Bella", description: "Professional, Bright, Warm", gender: "female", accent: "American", useCase: "Educational", age: "young", descriptive: "professional", category: "Educational" },
    { key: "roger", name: "Roger", description: "Laid-Back, Casual, Resonant", gender: "male", accent: "American", useCase: "Conversational", age: "middle_aged", descriptive: "classy", category: "Conversational" },
    { key: "sarah", name: "Sarah", description: "Mature, Reassuring, Confident", gender: "female", accent: "American", useCase: "Entertainment", age: "young", descriptive: "professional", category: "Entertainment" },
    { key: "laura", name: "Laura", description: "Enthusiast, Quirky Attitude", gender: "female", accent: "American", useCase: "Social Media", age: "young", descriptive: "sassy", category: "Social Media" },
    { key: "charlie", name: "Charlie", description: "Deep, Confident, Energetic", gender: "male", accent: "Australian", useCase: "Conversational", age: "young", descriptive: "hyped", category: "Conversational" },
    { key: "george", name: "George", description: "Warm, Captivating Storyteller", gender: "male", accent: "British", useCase: "Narration", age: "middle_aged", descriptive: "mature", category: "Narration" },
    { key: "callum", name: "Callum", description: "Husky Trickster", gender: "male", accent: "American", useCase: "Characters", age: "middle_aged", descriptive: null, category: "Characters" },
    { key: "river", name: "River", description: "Relaxed, Neutral, Informative", gender: "neutral", accent: "American", useCase: "Conversational", age: "middle_aged", descriptive: "calm", category: "Conversational" },
    { key: "harry", name: "Harry", description: "Fierce Warrior", gender: "male", accent: "American", useCase: "Characters", age: "young", descriptive: "rough", category: "Characters" },
    { key: "liam", name: "Liam", description: "Energetic, Social Media Creator", gender: "male", accent: "American", useCase: "Social Media", age: "young", descriptive: "confident", category: "Social Media" },
    { key: "alice", name: "Alice", description: "Clear, Engaging Educator", gender: "female", accent: "British", useCase: "Educational", age: "middle_aged", descriptive: "professional", category: "Educational" },
    { key: "matilda", name: "Matilda", description: "Knowledgable, Professional", gender: "female", accent: "American", useCase: "Educational", age: "middle_aged", descriptive: "upbeat", category: "Educational" },
    { key: "will", name: "Will", description: "Relaxed Optimist", gender: "male", accent: "American", useCase: "Conversational", age: "young", descriptive: "chill", category: "Conversational" },
    { key: "jessica", name: "Jessica", description: "Playful, Bright, Warm", gender: "female", accent: "American", useCase: "Conversational", age: "young", descriptive: "cute", category: "Conversational" },
    { key: "eric", name: "Eric", description: "Smooth, Trustworthy", gender: "male", accent: "American", useCase: "Conversational", age: "middle_aged", descriptive: "classy", category: "Conversational" },
    { key: "chris", name: "Chris", description: "Charming, Down-to-Earth", gender: "male", accent: "American", useCase: "Conversational", age: "middle_aged", descriptive: "casual", category: "Conversational" },
    { key: "brian", name: "Brian", description: "Deep, Resonant and Comforting", gender: "male", accent: "American", useCase: "Social Media", age: "middle_aged", descriptive: "classy", category: "Social Media" },
    { key: "daniel", name: "Daniel", description: "Steady Broadcaster", gender: "male", accent: "British", useCase: "Educational", age: "middle_aged", descriptive: "formal", category: "Educational" },
    { key: "lily", name: "Lily", description: "Velvety Actress", gender: "female", accent: "British", useCase: "Educational", age: "middle_aged", descriptive: "confident", category: "Educational" },
    { key: "adam", name: "Adam", description: "Dominant, Firm", gender: "male", accent: "American", useCase: "Social Media", age: "middle_aged", descriptive: null, category: "Social Media" },
    { key: "bill", name: "Bill", description: "Wise, Mature, Balanced", gender: "male", accent: "American", useCase: "Advertisement", age: "old", descriptive: "crisp", category: "Advertisement" },
    { key: "orla", name: "Orla", description: "Calm, Friendly Irish", gender: "female", accent: "Irish", useCase: "Narration", age: "middle_aged", descriptive: "calm", category: "Narration" },
    { key: "cormac", name: "Cormac", description: "Irish Storyteller", gender: "male", accent: "Irish", useCase: "Characters", age: "middle_aged", descriptive: "confident", category: "Characters" },
    { key: "devi", name: "Devi", description: "Polished Ad Narrator", gender: "female", accent: "Indian", useCase: "Advertisement", age: "young", descriptive: "confident", category: "Advertisement" },
    { key: "amit", name: "Amit", description: "Calm, Confident, Engaging", gender: "male", accent: "Indian", useCase: "Narration", age: "middle_aged", descriptive: "calm", category: "Narration" },
    { key: "marie", name: "Marie", description: "Calm Canadian Narrator", gender: "female", accent: "Canadian", useCase: "Narration", age: "middle_aged", descriptive: "calm", category: "Narration" },
    { key: "ken", name: "Ken", description: "Warm, Trustworthy Canadian", gender: "male", accent: "Canadian", useCase: "Narration", age: "middle_aged", descriptive: "calm", category: "Narration" },
    { key: "charlotte", name: "Charlotte", description: "Classy Narrator", gender: "female", accent: "British", useCase: "Narration", age: "middle_aged", descriptive: "classy", category: "Narration" },
    { key: "edmund", name: "Edmund", description: "Podcast Host", gender: "male", accent: "British", useCase: "Conversational", age: "middle_aged", descriptive: "modulated", category: "Conversational" },
    { key: "grace", name: "Grace", description: "Casual, Natural", gender: "female", accent: "British", useCase: "Conversational", age: "young", descriptive: "casual", category: "Conversational" },
    { key: "connor", name: "Connor", description: "Upbeat Promo", gender: "male", accent: "British", useCase: "Advertisement", age: "middle_aged", descriptive: "upbeat", category: "Advertisement" },
    { key: "rachel", name: "Rachel", description: "Confident, Friendly", gender: "female", accent: "British", useCase: "Advertisement", age: "young", descriptive: "confident", category: "Advertisement" },
    { key: "josh", name: "Josh", description: "Casual, Happy", gender: "male", accent: "British", useCase: "Social Media", age: "young", descriptive: "casual", category: "Social Media" },
    { key: "summer", name: "Summer", description: "Confident, Posh", gender: "female", accent: "British", useCase: "Social Media", age: "young", descriptive: "cute", category: "Social Media" },
    { key: "amelia", name: "Amelia", description: "Crisp Narrator", gender: "female", accent: "Australian", useCase: "Narration", age: "young", descriptive: "crisp", category: "Narration" },
    { key: "arabella", name: "Arabella", description: "Raspy, Natural", gender: "female", accent: "Australian", useCase: "Conversational", age: "young", descriptive: "raspy", category: "Conversational" },
    { key: "steven", name: "Steven", description: "Crisp Promo", gender: "male", accent: "Australian", useCase: "Advertisement", age: "middle_aged", descriptive: "crisp", category: "Advertisement" },
    { key: "clara", name: "Clara", description: "Professional, Warm", gender: "female", accent: "Australian", useCase: "Advertisement", age: "young", descriptive: "professional", category: "Advertisement" },
    { key: "patrick", name: "Patrick", description: "Confident Educator", gender: "male", accent: "Australian", useCase: "Educational", age: "middle_aged", descriptive: "confident", category: "Educational" },
    { key: "sophia", name: "Sophia", description: "Crisp Educator", gender: "female", accent: "Australian", useCase: "Educational", age: "young", descriptive: "crisp", category: "Educational" },
    { key: "jacob", name: "Jacob", description: "Upbeat Creator", gender: "male", accent: "Australian", useCase: "Social Media", age: "young", descriptive: "upbeat", category: "Social Media" },
    { key: "anna", name: "Anna", description: "Chill Creator", gender: "female", accent: "Australian", useCase: "Social Media", age: "young", descriptive: "chill", category: "Social Media" },
    { key: "darren", name: "Darren", description: "Calm, Deep", gender: "male", accent: "Irish", useCase: "Narration", age: "middle_aged", descriptive: "calm", category: "Narration" },
    { key: "richie", name: "Richie", description: "Deep, Clear", gender: "male", accent: "Irish", useCase: "Conversational", age: "middle_aged", descriptive: "casual", category: "Conversational" },
    { key: "louisamay", name: "Louisamay", description: "Warm, Engaging", gender: "female", accent: "Irish", useCase: "Conversational", age: "young", descriptive: "gentle", category: "Conversational" },
    { key: "keanan", name: "Keanan", description: "Natural Teacher", gender: "male", accent: "Irish", useCase: "Educational", age: "middle_aged", descriptive: "professional", category: "Educational" },
    { key: "niamh", name: "Niamh", description: "Soft, Friendly", gender: "female", accent: "Irish", useCase: "Educational", age: "young", descriptive: "pleasant", category: "Educational" },
    { key: "john", name: "John", description: "Engaging, Clear", gender: "male", accent: "Irish", useCase: "Social Media", age: "middle_aged", descriptive: "neutral", category: "Social Media" },
    { key: "emily", name: "Emily", description: "Engaging, Natural", gender: "female", accent: "Irish", useCase: "Social Media", age: "young", descriptive: "casual", category: "Social Media" },
    { key: "aiden", name: "Aiden", description: "Confident, Direct", gender: "male", accent: "Canadian", useCase: "Conversational", age: "young", descriptive: "confident", category: "Conversational" },
    { key: "jenna", name: "Jenna", description: "Warm, Relatable", gender: "female", accent: "Canadian", useCase: "Conversational", age: "middle_aged", descriptive: "pleasant", category: "Conversational" },
    { key: "taylor", name: "Taylor", description: "Engaging Host", gender: "male", accent: "Canadian", useCase: "Advertisement", age: "young", descriptive: "confident", category: "Advertisement" },
    { key: "kat", name: "Kat", description: "Sharp, Smart", gender: "female", accent: "Canadian", useCase: "Advertisement", age: "young", descriptive: "pleasant", category: "Advertisement" },
    { key: "loyal", name: "Loyal", description: "Engaging, Informative", gender: "male", accent: "Canadian", useCase: "Educational", age: "young", descriptive: "professional", category: "Educational" },
    { key: "stephanie", name: "Stephanie", description: "Confident, Calm", gender: "female", accent: "Canadian", useCase: "Educational", age: "middle_aged", descriptive: "pleasant", category: "Educational" },
    { key: "avery", name: "Avery", description: "Hyped Influencer", gender: "male", accent: "Canadian", useCase: "Social Media", age: "young", descriptive: "hyped", category: "Social Media" },
    { key: "adina", name: "Adina", description: "Neutral, Clear", gender: "female", accent: "Canadian", useCase: "Social Media", age: "young", descriptive: "neutral", category: "Social Media" },
    { key: "krish", name: "Krish", description: "Modern Creator", gender: "male", accent: "Indian", useCase: "Conversational", age: "young", descriptive: "confident", category: "Conversational" },
    { key: "zara", name: "Zara", description: "Confident, Efficient", gender: "female", accent: "Indian", useCase: "Conversational", age: "young", descriptive: "confident", category: "Conversational" },
    { key: "sagar", name: "Sagar", description: "Natural, Casual", gender: "male", accent: "Indian", useCase: "Advertisement", age: "young", descriptive: "casual", category: "Advertisement" },
    { key: "ishaan", name: "Ishaan", description: "Warm E-Learning", gender: "male", accent: "Indian", useCase: "Educational", age: "young", descriptive: "confident", category: "Educational" },
    { key: "anjura", name: "Anjura", description: "Professor Style", gender: "female", accent: "Indian", useCase: "Educational", age: "young", descriptive: "pleasant", category: "Educational" },
    { key: "raunak", name: "Raunak", description: "Trending Reel Narrator", gender: "male", accent: "Indian", useCase: "Social Media", age: "young", descriptive: "confident", category: "Social Media" },
    { key: "tara", name: "Tara", description: "Viral Social Voice", gender: "female", accent: "Indian", useCase: "Social Media", age: "young", descriptive: "upbeat", category: "Social Media" },
  ];
}

/**
 * Clear the voice cache
 */
export function clearVoicesCache() {
  voicesCache = null;
  cacheTimestamp = 0;
  regionDefaultCache = null;
}
