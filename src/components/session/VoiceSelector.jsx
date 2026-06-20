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
        <Loader2 className="w-6 h-6 animate-spin text-terra" />
        <span className="ml-2 text-ink-muted">Loading voices...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hidden audio element */}
      <audio ref={audioRef} onEnded={handleAudioEnded} />

      {/* Selected Voice Display */}
      {selectedVoice && (
        <div className="bg-terra/5 border border-terra/30 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-terra rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-terra">{selectedVoice.name}</p>
                <p className="text-xs text-terra">{getVoiceStyleLabel(selectedVoice)}</p>
              </div>
            </div>
            <button
              onClick={() => handlePlayPreview(selectedVoice.key)}
              className="p-2 rounded-full bg-terra text-white hover:bg-terra-dark transition-colors"
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
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
                  ? "bg-terra text-white"
                  : "bg-surface-alt text-ink/80 hover:bg-surface-alt"
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
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide py-2">
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
                      ? "border-terra bg-terra/5"
                      : "border-border bg-white hover:border-border"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      value === voice.key ? "bg-terra" : "bg-surface-alt"
                    }`}
                  >
                    {value === voice.key ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : (
                      <User className="w-4 h-4 text-ink-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-ink block">{voice.name}</span>
                    <span className="text-xs text-ink-muted truncate block">
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
                        ? "bg-terra text-white"
                        : "bg-surface-alt text-ink-muted hover:bg-surface-alt"
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
          <div className="text-center py-8 text-ink-muted">
            <p>No voices found matching your search</p>
          </div>
        )}
      </div>
    </div>
  );
}
