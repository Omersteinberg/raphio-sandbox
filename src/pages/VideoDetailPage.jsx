import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Download,
  Share2,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { getVideo } from "@/services/videos";

export default function VideoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        setLoading(true);
        const response = await getVideo(id);
        if (response?.success) {
          setVideo(response.data);
        } else {
          setError("Video not found");
        }
      } catch (err) {
        setError("Failed to load video");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchVideo();
    }
  }, [id]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleDownload = () => {
    if (video?.finalVideoUrl) {
      const link = document.createElement("a");
      link.href = video.finalVideoUrl;
      link.download = `${video.title || "video"}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleCreateOwn = () => {
    navigate("/create");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-gradient font-montserrat flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading video...</p>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-background-gradient font-montserrat flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Video Not Found</h1>
          <p className="text-gray-400 mb-6">
            This video doesn't exist or has been deleted.
          </p>
          <Button
            onClick={handleCreateOwn}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Create Your Own Video
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Video still processing
  if (video.status === "PROCESSING") {
    return (
      <div className="min-h-screen bg-background-gradient font-montserrat flex items-center justify-center">
        <div className="text-center max-w-md">
          <Loader2 className="w-16 h-16 text-purple-400 animate-spin mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">
            Video Still Processing
          </h1>
          <p className="text-gray-400 mb-6">
            This video is still being created. Check back in a few minutes.
          </p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="border-purple-500 text-purple-400 hover:bg-purple-500/20"
          >
            Refresh Status
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-gradient font-montserrat">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background-gradient/80 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <Sparkles className="w-8 h-8 text-purple-400" />
            <span className="text-xl font-semibold text-white">Merge</span>
          </div>
          <Button
            onClick={handleCreateOwn}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6"
          >
            Create Your Own
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Video Player */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black rounded-2xl overflow-hidden shadow-2xl mb-8"
          >
            <video
              src={video.finalVideoUrl}
              controls
              className="w-full aspect-video"
              poster={video.sections?.[0]?.imageUrl}
            />
          </motion.div>

          {/* Video Info */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">
              {video.title || "Untitled Video"}
            </h1>
            <p className="text-gray-400 text-sm">
              Created on {new Date(video.createdAt).toLocaleDateString()}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 mb-12">
            <Button
              onClick={handleDownload}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Video (HD)
            </Button>
            <Button
              onClick={() => setShowShareModal(true)}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>

          {/* CTA Section */}
          <div className="bg-white/5 rounded-2xl p-8 border border-white/10 text-center">
            <h2 className="text-xl font-semibold text-white mb-2">
              Create Your Own Video Like This
            </h2>
            <p className="text-gray-400 mb-6">
              No sign-up required. Start creating in seconds.
            </p>
            <Button
              onClick={handleCreateOwn}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8"
            >
              Create Video
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </main>

      {/* Share Modal */}
      {showShareModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowShareModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-white mb-4">
              Share Video
            </h3>
            <div className="bg-white/5 rounded-lg p-3 flex items-center gap-2 mb-4">
              <input
                type="text"
                value={window.location.href}
                readOnly
                className="flex-1 bg-transparent text-white text-sm outline-none"
              />
              <Button
                onClick={handleCopyLink}
                size="sm"
                variant="ghost"
                className="text-purple-400 hover:text-purple-300"
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <Button
              onClick={() => setShowShareModal(false)}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              Close
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
