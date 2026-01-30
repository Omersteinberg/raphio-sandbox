import { useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Share2,
  Copy,
  Check,
  ArrowRight,
  PartyPopper,
  Twitter,
  Facebook,
  Linkedin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";

export default function ResultView({
  videoId,
  finalVideoUrl,
  title,
  onCreateAnother,
}) {
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const shareUrl = videoId ? `${window.location.origin}/video/${videoId}` : "";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleDownload = () => {
    if (finalVideoUrl) {
      const link = document.createElement("a");
      link.href = finalVideoUrl;
      link.download = `${title || "video"}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleShare = (platform) => {
    const text = "Check out this video I created with AI!";
    const url = encodeURIComponent(shareUrl);

    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    };

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], "_blank", "width=600,height=400");
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-4xl mx-auto">
        {/* Success Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <PartyPopper className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Your Video is Ready!
          </h1>
          <p className="text-gray-600">
            Download, share, or create another video.
          </p>
        </motion.div>

        {/* Video Player */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-900 rounded-2xl overflow-hidden shadow-xl mb-8"
        >
          <video
            src={finalVideoUrl}
            controls
            autoPlay
            className="w-full aspect-video"
          />
        </motion.div>

        {/* Video Title */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            {title || "Untitled Video"}
          </h2>
          <p className="text-gray-600 text-sm">
            Created just now
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-12">
          <Button
            onClick={handleDownload}
            size="lg"
            className="bg-purple-600 hover:bg-purple-700 text-white px-8"
          >
            <Download className="w-5 h-5 mr-2" />
            Download Video (HD)
          </Button>
          <Button
            onClick={() => setShowShareModal(true)}
            size="lg"
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-100 px-8"
          >
            <Share2 className="w-5 h-5 mr-2" />
            Share
          </Button>
        </div>

        {/* Create Another CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-purple-50 rounded-2xl p-8 border border-purple-200 text-center"
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Create Another Video
          </h3>
          <p className="text-gray-600 mb-6">
            Ready to create something new? Start fresh with a new idea.
          </p>
          <Button
            onClick={onCreateAnother}
            size="lg"
            className="bg-purple-600 text-white hover:bg-purple-700 px-8"
          >
            Start Fresh
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>

        {/* Share Modal */}
        {showShareModal && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Share Your Video
              </h3>

              {/* Shareable Link */}
              <div className="mb-6">
                <label className="text-sm text-gray-600 mb-2 block font-medium">
                  Shareable Link
                </label>
                <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 bg-transparent text-gray-900 text-sm outline-none"
                  />
                  <Button
                    onClick={handleCopyLink}
                    size="sm"
                    variant="ghost"
                    className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                  >
                    {copied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Social Share */}
              <div className="mb-6">
                <label className="text-sm text-gray-600 mb-3 block font-medium">
                  Share on Social Media
                </label>
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleShare("twitter")}
                    variant="outline"
                    className="flex-1 border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600"
                  >
                    <Twitter className="w-4 h-4 mr-2" />
                    Twitter
                  </Button>
                  <Button
                    onClick={() => handleShare("facebook")}
                    variant="outline"
                    className="flex-1 border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700"
                  >
                    <Facebook className="w-4 h-4 mr-2" />
                    Facebook
                  </Button>
                  <Button
                    onClick={() => handleShare("linkedin")}
                    variant="outline"
                    className="flex-1 border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-500 hover:text-blue-800"
                  >
                    <Linkedin className="w-4 h-4 mr-2" />
                    LinkedIn
                  </Button>
                </div>
              </div>

              <Button
                onClick={() => setShowShareModal(false)}
                variant="outline"
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Close
              </Button>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
