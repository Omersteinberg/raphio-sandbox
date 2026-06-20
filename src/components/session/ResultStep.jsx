import { motion } from "framer-motion";
import { Download, Edit3, Plus, Check, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/services/api";
import { API_BASE } from "@/config";

export default function ResultStep({
  finalVideoUrl,
  scriptData,
  session,
  enterEditingMode,
  reset,
}) {
  const handleDownload = async () => {
    if (!session?.id) return;
    try {
      const response = await api.get(`${API_BASE}/video/${session.id}/download`, {
        responseType: "blob",
      });
      const blob = response.data;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${scriptData?.title || "video"}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      if (finalVideoUrl) window.open(finalVideoUrl, "_blank");
    }
  };

  const handleShare = async () => {
    if (navigator.share && finalVideoUrl) {
      try {
        await navigator.share({
          title: scriptData?.title || "My Video",
          text: "Check out this video I created!",
          url: finalVideoUrl,
        });
      } catch (err) {
        // User cancelled or share failed
        navigator.clipboard.writeText(finalVideoUrl);
      }
    } else if (finalVideoUrl) {
      navigator.clipboard.writeText(finalVideoUrl);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto flex flex-col items-center justify-start p-8 pb-16">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl"
      >
        {/* Success Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4"
          >
            <Check className="w-10 h-10 text-green-600" />
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Your Video is Ready!
          </h1>
          <p className="text-gray-600">
            {scriptData?.title || "Your video"} has been successfully created
          </p>
        </div>

        {/* Video Player */}
        <div className="bg-black rounded-xl overflow-hidden shadow-2xl mb-8">
          {finalVideoUrl ? (
            <video
              src={finalVideoUrl}
              controls
              className="w-full aspect-video"
              poster=""
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="w-full aspect-video flex items-center justify-center bg-gray-900">
              <div className="text-center text-gray-400">
                <Play className="w-16 h-16 mx-auto mb-2 opacity-50" />
                <p>Video not available</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Button
            onClick={handleDownload}
            disabled={!finalVideoUrl}
            className="text-white border-0 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #F97066, #FB923C)" }}
          >
            <Download className="w-4 h-4" />
            Download
          </Button>

          <Button
            onClick={enterEditingMode}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
          >
            <Edit3 className="w-4 h-4" />
            Edit Clips
          </Button>

          <Button
            onClick={reset}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create New
          </Button>
        </div>

        {/* Video Stats */}
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Video Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Title</p>
              <p className="font-medium text-gray-900">
                {scriptData?.title || "Untitled"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Style</p>
              <p className="font-medium text-gray-900 capitalize">
                {scriptData?.style || session?.style || "Cinematic"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Sections</p>
              <p className="font-medium text-gray-900">
                {scriptData?.sections?.length || session?.video?.sections?.length || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Model</p>
              <p className="font-medium text-gray-900">
                {session?.videoModel || "KLING"}
              </p>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-sm text-purple-800">
            <strong>Tip:</strong> Click "Edit Clips" to regenerate individual sections,
            reorder clips, or make other adjustments to your video.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
