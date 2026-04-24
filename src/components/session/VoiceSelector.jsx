import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Search, Check, User, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  getVoiceSecondaryLabel,
  getVoiceStyleLabel,
} from "@/lib/voiceMetadata";
import * as voicesService from "@/services/voices";

export default function VoiceSelector({ value, onChange }) {
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [playingVoice, setPlayingVoice] = useState(null);
  const [previewUrls, setPreviewUrls] = useState({});
  const [loadingPreview, setLoadingPreview] = useState(null);
  const audioRef = useRef(null);

  // Load voices on mount
  useEffect(() => {
    async function loadVoices() {
      setLoading(true);
      try {
        const voiceList = await voicesService.getVoices();
        setVoices(voiceList);
      } catch (error) {
        console.error("Failed to load voices:", error);
      } finally {
        setLoading(false);
      }
    }
    loadVoices();
  }, []);

  // Filter voices based on search and gender
  const filteredVoices = voices.filter((voice) => {
    const styleText = getVoiceStyleLabel(voice).toLowerCase();
    const matchesSearch =
      voice.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      voice.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      voice.accent?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      styleText.includes(searchQuery.toLowerCase());
    const matchesGender =
      genderFilter === "all" || voice.gender === genderFilter;
    return matchesSearch && matchesGender;
  });

  // Group by gender for display
  const groupedVoices = filteredVoices.reduce((acc, voice) => {
    const gender = voice.gender || "other";
    if (!acc[gender]) acc[gender] = [];
    acc[gender].push(voice);
    return acc;
  }, {});

  // Play voice preview
  const handlePlayPreview = async (voiceKey) => {
    // If already playing this voice, stop it
    if (playingVoice === voiceKey) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPlayingVoice(null);
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
    }

    // Check if we have the preview URL cached
    if (!previewUrls[voiceKey]) {
      setLoadingPreview(voiceKey);
      try {
        const previewData = await voicesService.getVoicePreview(voiceKey);
        if (previewData?.previewUrl) {
          setPreviewUrls((prev) => ({
            ...prev,
            [voiceKey]: previewData.previewUrl,
          }));
          playAudio(previewData.previewUrl, voiceKey);
        }
      } catch (error) {
        console.error("Failed to load preview:", error);
      } finally {
        setLoadingPreview(null);
      }
    } else {
      playAudio(previewUrls[voiceKey], voiceKey);
    }
  };

  const playAudio = (url, voiceKey) => {
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play();
      setPlayingVoice(voiceKey);
    }
  };

  const handleAudioEnded = () => {
    setPlayingVoice(null);
  };

  const selectedVoice = voices.find((v) => v.key === value);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
        <span className="ml-2 text-gray-600">Loading voices...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hidden audio element */}
      <audio ref={audioRef} onEnded={handleAudioEnded} />

      {/* Selected Voice Display */}
      {selectedVoice && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-purple-900">{selectedVoice.name}</p>
                <p className="text-xs text-purple-700">{getVoiceStyleLabel(selectedVoice)}</p>
              </div>
            </div>
            <button
              onClick={() => handlePlayPreview(selectedVoice.key)}
              className="p-2 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition-colors"
            >
              {loadingPreview === selectedVoice.key ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : playingVoice === selectedVoice.key ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search voices..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {["all", "male", "female"].map((gender) => (
            <button
              key={gender}
              onClick={() => setGenderFilter(gender)}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                genderFilter === gender
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {gender.charAt(0).toUpperCase() + gender.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Voice List */}
      <div className="max-h-64 overflow-y-auto space-y-1 pr-2">
        {Object.entries(groupedVoices).map(([gender, genderVoices]) => (
          <div key={gender}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-2">
              {gender === "male" ? "Male Voices" : gender === "female" ? "Female Voices" : "Other"}
            </p>
            <div className="space-y-1">
              {genderVoices.map((voice) => (
                <motion.button
                  key={voice.key}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => onChange(voice.key)}
                  className={`w-full p-3 rounded-lg border-2 text-left flex items-center gap-3 transition-all ${
                    value === voice.key
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      value === voice.key ? "bg-purple-600" : "bg-gray-200"
                    }`}
                  >
                    {value === voice.key ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : (
                      <User className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-900 block">{voice.name}</span>
                    <span className="text-xs text-gray-500 truncate block">
                      {getVoiceSecondaryLabel(voice)}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayPreview(voice.key);
                    }}
                    className={`p-2 rounded-full transition-colors ${
                      playingVoice === voice.key
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {loadingPreview === voice.key ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : playingVoice === voice.key ? (
                      <Pause className="w-3 h-3" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                  </button>
                </motion.button>
              ))}
            </div>
          </div>
        ))}

        {filteredVoices.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No voices found matching your search</p>
          </div>
        )}
      </div>
    </div>
  );
}
