import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Search, Check, User, Loader2, Sparkles, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  getVoiceSecondaryLabel,
  getVoiceStyleLabel,
  getVoiceAccent,
  getVoiceUseCase,
  getVoiceGender,
  getVoiceAge,
  getVoiceDescriptive,
  humanizeFacetValue,
  collectVoiceFacet,
  sortVoicesByRegion,
} from "@/lib/voiceMetadata";
import * as voicesService from "@/services/voices";

const ALL = "all";

// ElevenLabs' own voice-library facets, in the order a creator actually reaches for
// them: the accent is the whole point of the recommendation, the style is what the
// video needs, and gender and age are refinements on top. `descriptive` is left out
// as a filter (too many values to narrow anything) but is still matched by search.
const FACETS = [
  { key: "accent", label: "Accent", read: getVoiceAccent },
  { key: "useCase", label: "Style", read: getVoiceUseCase },
  { key: "gender", label: "Gender", read: getVoiceGender },
  { key: "age", label: "Age", read: getVoiceAge },
];

function FacetDropdown({ label, options, value, onChange }) {
  if (options.length < 2) return null;
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border px-2.5 py-2 text-sm bg-white transition-colors ${
          value === ALL ? "border-border text-ink/80" : "border-terra text-ink font-medium"
        }`}
      >
        <option value={ALL}>All</option>
        {options.map(({ value: option }) => (
          <option key={option} value={option}>
            {humanizeFacetValue(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function VoiceSelector({ value, onChange, recommendation = null }) {
  const [voices, setVoices] = useState([]);
  const [regionAccent, setRegionAccent] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  // One entry per ElevenLabs facet, each ALL until the user narrows it.
  const [facetFilters, setFacetFilters] = useState({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [playingVoice, setPlayingVoice] = useState(null);
  const [previewUrls, setPreviewUrls] = useState({});
  const [loadingPreview, setLoadingPreview] = useState(null);
  const audioRef = useRef(null);

  // Load voices on mount. The same response carries the region default (derived
  // from the caller's IP by the backend), so reading it here is free - and reading
  // it *here* rather than from a prop is what makes every host of this picker
  // region-aware, including IntroScriptStep, which passes no recommendation.
  useEffect(() => {
    async function loadVoices() {
      setLoading(true);
      try {
        const voiceList = await voicesService.getVoices();
        setVoices(voiceList);

        const region = voicesService.peekRegionDefault();
        const accent = region?.accent || "";
        setRegionAccent(accent);

        // Logged from the effect, not from render: this is what the boost actually
        // did to the list the user is about to see, and it should be said once.
        const boosted = accent
          ? voiceList.filter(
              (voice) => getVoiceAccent(voice).toLowerCase() === accent.toLowerCase(),
            )
          : [];
        console.log(
          `[VoiceSelector] region country=${region?.countryCode || "unresolved"} ` +
            `accent=${accent || "none"} | boosted ${boosted.length}/${voiceList.length} voices | ` +
            `top: ${sortVoicesByRegion(voiceList, accent)
              .slice(0, 3)
              .map((voice) => voice.name)
              .join(", ")}`,
        );
      } catch (error) {
        console.error("Failed to load voices:", error);
      } finally {
        setLoading(false);
      }
    }
    loadVoices();
  }, []);

  // Facet values come from the voices themselves, so an accent or use case added on
  // the backend shows up as a chip with no frontend change.
  const facetOptions = FACETS.map((facet) => ({
    ...facet,
    options: collectVoiceFacet(voices, facet.read),
  }));

  const setFacet = (key, value) =>
    setFacetFilters((prev) => ({ ...prev, [key]: value }));

  const activeFilterCount = FACETS.filter(
    (facet) => (facetFilters[facet.key] || ALL) !== ALL,
  ).length;

  // Search and every facet compose.
  const filteredVoices = voices.filter((voice) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      [
        voice.name,
        voice.description,
        getVoiceAccent(voice),
        getVoiceUseCase(voice),
        getVoiceDescriptive(voice),
        getVoiceStyleLabel(voice),
      ].some((field) => (field || "").toLowerCase().includes(query));

    const matchesFacets = FACETS.every((facet) => {
      const selected = facetFilters[facet.key] || ALL;
      return selected === ALL || facet.read(voice) === selected;
    });

    return matchesSearch && matchesFacets;
  });

  // The recommendation is a suggestion, not a filter result, so it stays visible
  // in its own section no matter what the filters are set to. Pull it out of the
  // grouped list below so it is not listed twice.
  const recommendedVoice = recommendation?.voiceKey
    ? voices.find((v) => v.key === recommendation.voiceKey)
    : null;

  // Boost the flat list before grouping, not each bucket after: the reduce below
  // preserves order, so one stable partition lifts the caller's own accent to the
  // top of every gender group at once.
  const groupedVoices = sortVoicesByRegion(
    filteredVoices.filter((voice) => voice.key !== recommendedVoice?.key),
    regionAccent,
  ).reduce((acc, voice) => {
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

  const previewIcon = (voiceKey, size) => {
    if (loadingPreview === voiceKey) return <Loader2 className={`${size} animate-spin`} />;
    if (playingVoice === voiceKey) return <Pause className={size} />;
    return <Play className={size} />;
  };

  // The avatar is decorative. If a voice has no image, or the image 404s, fall back
  // to the icon this component used before rather than leaving a broken frame.
  const Avatar = ({ voice, selected, size }) => {
    const [broken, setBroken] = useState(false);
    const box = size === "lg" ? "w-10 h-10" : "w-8 h-8";
    const glyph = size === "lg" ? "w-5 h-5" : "w-4 h-4";

    if (voice.avatarUrl && !broken) {
      return (
        <div className={`${box} rounded-full overflow-hidden shrink-0 bg-surface-alt relative`}>
          <img
            src={voice.avatarUrl}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
            onError={() => setBroken(true)}
          />
          {selected && (
            <div className="absolute inset-0 bg-terra/70 flex items-center justify-center">
              <Check className={`${glyph} text-white`} />
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        className={`${box} rounded-full flex items-center justify-center shrink-0 ${
          selected ? "bg-terra" : "bg-surface-alt"
        }`}
      >
        {selected ? (
          <Check className={`${glyph} text-white`} />
        ) : (
          <User className={`${glyph} text-ink-muted`} />
        )}
      </div>
    );
  };

  const renderVoiceRow = (voice) => (
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
      <Avatar voice={voice} selected={value === voice.key} />
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
        {previewIcon(voice.key, "w-3 h-3")}
      </button>
    </motion.button>
  );

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
              <Avatar voice={selectedVoice} size="lg" />
              <div>
                <p className="font-medium text-terra">{selectedVoice.name}</p>
                <p className="text-xs text-terra">{getVoiceStyleLabel(selectedVoice)}</p>
              </div>
            </div>
            <button
              onClick={() => handlePlayPreview(selectedVoice.key)}
              className="p-2 rounded-full bg-terra text-white hover:bg-terra-dark transition-colors"
            >
              {previewIcon(selectedVoice.key, "w-4 h-4")}
            </button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="space-y-2">
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
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors shrink-0 ${
              filtersOpen || activeFilterCount > 0
                ? "border-terra bg-terra/5 text-terra"
                : "border-border bg-surface-alt text-ink/80"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 min-w-4 h-4 px-1 rounded-full bg-terra text-white text-[10px] leading-4 text-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {filtersOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="rounded-lg border border-border bg-surface-alt/50 p-3">
                {/* One filter per row on mobile: a 2-up grid squeezes the selects too
                    narrow to read a value like "Informative Educational". */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {facetOptions.map((facet) => (
                    <FacetDropdown
                      key={facet.key}
                      label={facet.label}
                      options={facet.options}
                      value={facetFilters[facet.key] || ALL}
                      onChange={(next) => setFacet(facet.key, next)}
                    />
                  ))}
                </div>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFacetFilters({})}
                    className="mt-3 flex items-center gap-1 text-xs font-medium text-terra hover:underline"
                  >
                    <X className="w-3 h-3" />
                    Clear {activeFilterCount === 1 ? "filter" : "all filters"}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Voice List */}
      <div className="max-h-64 overflow-y-auto space-y-1 pr-2">
        {recommendedVoice && (
          <div>
            <div className="flex items-center gap-1.5 py-2">
              <Sparkles className="w-3 h-3 text-terra" />
              <p className="text-xs font-semibold text-terra uppercase tracking-wide">
                Recommended for you
              </p>
            </div>
            {renderVoiceRow(recommendedVoice)}
            {recommendation.reason && (
              <p className="text-xs text-ink-muted px-3 pt-1.5">{recommendation.reason}</p>
            )}
          </div>
        )}

        {Object.entries(groupedVoices).map(([gender, genderVoices]) => (
          <div key={gender}>
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide py-2">
              {gender === "male" ? "Male Voices" : gender === "female" ? "Female Voices" : "Other"}
            </p>
            <div className="space-y-1">{genderVoices.map(renderVoiceRow)}</div>
          </div>
        ))}

        {filteredVoices.length === 0 && !recommendedVoice && (
          <div className="text-center py-8 text-ink-muted">
            <p>No voices found matching your search</p>
          </div>
        )}
      </div>
    </div>
  );
}
