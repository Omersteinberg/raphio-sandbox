import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Download,
  Share2,
  Copy,
  Check,
  ArrowRight,
  Loader2,
  AlertCircle,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { getSession } from "@/services/session";

export default function VideoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const video = session?.video;
  const title = video?.title || session?.scriptData?.title || session?.userPrompt || "Untitled Video";
  const finalVideoUrl = video?.finalVideoUrl;

  useEffect(() => {
    const fetchSession = async () => {
      try {
        setLoading(true);
        const data = await getSession(id);
        if (data) {
          setSession(data);
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
      fetchSession();
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

  const handleDownload = async () => {
    if (finalVideoUrl) {
      try {
        const response = await fetch(finalVideoUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${title}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch {
        window.open(finalVideoUrl, "_blank");
      }
    }
  };

  const handleCreateOwn = () => {
    navigate("/create");
  };

  const handleEditVideo = () => {
    // Both desktop and mobile use the dedicated editor route, which mounts the
    // responsive timeline editor directly (it calls enterEditingMode itself).
    // This skips the Creator/useSession wizard, whose stage round-trip could land
    // desktop on the result screen instead of the editor.
    navigate(`/video/${id}/edit`);
  };

  if (loading) {
    return (
      <div className="min-h-full font-figtree flex items-center justify-center" style={{ background: "var(--gradient-app)" }}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading video...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-full font-figtree flex items-center justify-center" style={{ background: "var(--gradient-app)" }}>
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Video Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This video doesn't exist or has been deleted.
          </p>
          <Button
            onClick={handleCreateOwn}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            Create Your Own Video
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Video still generating
  if (session.stage === "GENERATING") {
    return (
      <div className="min-h-full font-figtree flex items-center justify-center" style={{ background: "var(--gradient-app)" }}>
        <div className="text-center max-w-md">
          <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Video Still Processing
          </h1>
          <p className="text-muted-foreground mb-6">
            This video is still being created. Check back in a few minutes.
          </p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10"
          >
            Refresh Status
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full font-figtree" style={{ background: "var(--gradient-app)" }}>
      {/* Main Content */}
      <main className="py-8 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Video Player */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black rounded-2xl overflow-hidden shadow-2xl mb-8"
          >
            {finalVideoUrl ? (
              <video
                src={finalVideoUrl}
                controls
                playsInline
                preload="metadata"
                className="w-full aspect-video"
                poster={video?.sections?.[0]?.imageUrl}
              />
            ) : (
              <div className="w-full aspect-video flex items-center justify-center text-white/60 text-sm">
                Your video isn't ready to play yet.
              </div>
            )}
          </motion.div>

          {/* Video Info */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {title}
            </h1>
            <p className="text-muted-foreground text-sm">
              Created on {new Date(session.createdAt).toLocaleDateString()}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 mb-12">
            <Button
              onClick={handleDownload}
              className="bg-primary hover:bg-primary/90 text-white px-6"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Video (HD)
            </Button>
            <Button
              onClick={handleEditVideo}
              variant="outline"
              className="border-border text-foreground hover:bg-muted"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit Video
            </Button>
            <Button
              onClick={() => setShowShareModal(true)}
              variant="outline"
              className="border-border text-foreground hover:bg-muted"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>

          {/* CTA Section */}
          <div className="bg-primary/5 rounded-2xl p-8 border border-primary/20 text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Create Your Own Video Like This
            </h2>
            <p className="text-muted-foreground mb-6">
              Create another video in seconds.
            </p>
            <Button
              onClick={handleCreateOwn}
              className="bg-primary hover:bg-primary/90 text-white px-8"
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
            className="bg-card rounded-2xl p-6 max-w-md w-full border border-border shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Share Video
            </h3>
            <div className="bg-muted rounded-lg p-3 flex items-center gap-2 mb-4">
              <input
                type="text"
                value={window.location.href}
                readOnly
                className="flex-1 bg-transparent text-foreground text-sm outline-none"
              />
              <Button
                onClick={handleCopyLink}
                size="sm"
                variant="ghost"
                className="text-primary hover:text-primary/80"
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
              className="w-full border-border text-foreground hover:bg-muted"
            >
              Close
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
