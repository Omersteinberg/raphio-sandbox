import { useState, useEffect } from "react";
import { getVoices } from "@/services/voices";

export function useVoiceSelector() {
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetchVoices = async () => {
      setLoading(true);
      try {
        const data = await getVoices();
        setVoices(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching voices:", err);
        setError("Failed to load voices");
      } finally {
        setLoading(false);
      }
    };

    fetchVoices();
  }, []);

  const filteredVoices = voices.filter((voice) => {
    if (filter === "all") return true;
    return voice.gender?.toLowerCase() === filter.toLowerCase();
  });

  const selectVoice = (voiceId) => {
    setSelectedVoice(voiceId);
  };

  const reset = () => {
    setSelectedVoice(null);
    setFilter("all");
  };

  return {
    voices,
    filteredVoices,
    selectedVoice,
    setSelectedVoice: selectVoice,
    loading,
    error,
    filter,
    setFilter,
    reset,
  };
}
