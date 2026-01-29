import { motion } from "framer-motion";
import { Check, Mic2, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VoiceSelector({
  voices,
  filteredVoices,
  selectedVoice,
  setSelectedVoice,
  loading,
  error,
  filter,
  setFilter,
}) {
  const filters = [
    { key: "all", label: "All Voices" },
    { key: "male", label: "Male" },
    { key: "female", label: "Female" },
  ];

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto px-6 py-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading voices...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-5xl mx-auto px-6 py-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="border-white/20 text-white"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Choose a Voice</h1>
        <p className="text-gray-400">
          Select a voice for your video narration. Click on a voice to select
          it.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.key)}
            className={
              filter === f.key
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "border-white/20 text-gray-300 hover:bg-white/10"
            }
          >
            {f.label}
          </Button>
        ))}
        <span className="text-gray-500 text-sm self-center ml-2">
          Showing {filteredVoices.length} voices
        </span>
      </div>

      {/* Voice Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredVoices.map((voice, index) => {
          const isSelected = selectedVoice === voice.key;
          return (
            <motion.div
              key={voice.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              onClick={() => setSelectedVoice(voice.key)}
              className={`
                relative cursor-pointer rounded-xl border p-4 transition-all
                ${
                  isSelected
                    ? "bg-purple-600/20 border-purple-500"
                    : "bg-white/5 border-white/10 hover:border-purple-500/50 hover:bg-white/10"
                }
              `}
            >
              {/* Selected Indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}

              {/* Voice Avatar */}
              <div
                className={`
                w-12 h-12 rounded-full flex items-center justify-center mb-3
                ${
                  voice.gender === "female"
                    ? "bg-pink-500/20 text-pink-400"
                    : "bg-blue-500/20 text-blue-400"
                }
              `}
              >
                {voice.gender === "female" ? (
                  <User className="w-6 h-6" />
                ) : (
                  <Mic2 className="w-6 h-6" />
                )}
              </div>

              {/* Voice Info */}
              <h3 className="text-white font-medium mb-1">{voice.name}</h3>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    voice.gender === "female"
                      ? "bg-pink-500/20 text-pink-300"
                      : "bg-blue-500/20 text-blue-300"
                  }`}
                >
                  {voice.gender === "female" ? "Female" : "Male"}
                </span>
                {voice.key === "adam" && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-300">
                    Default
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-sm line-clamp-2">
                {voice.description}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Selected Voice Summary */}
      {selectedVoice && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 border border-purple-500/30 rounded-xl px-6 py-4 flex items-center gap-4 shadow-xl z-50"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600/20 rounded-full flex items-center justify-center">
              <Mic2 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-white font-medium">
                {voices.find((v) => v.key === selectedVoice)?.name}
              </p>
              <p className="text-gray-400 text-sm">Selected Voice</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
