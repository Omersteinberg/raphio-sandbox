import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSession } from "@/services/session";
import VideoResult from "@/components/video/VideoResult";

export default function VideoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const handleCreateOwn = () => navigate("/create");

  const handleEditVideo = () => {
    // Both desktop and mobile use the dedicated editor route, which mounts the
    // responsive timeline editor directly (it calls enterEditingMode itself).
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
      <main className="py-8 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Shared "video ready" view - identical to the wizard's final step. */}
          <VideoResult
            sessionId={id}
            finalVideoUrl={finalVideoUrl}
            title={title}
            style={session?.style}
            sectionsCount={video?.sections?.length}
            model={video?.videoModel || session?.videoModel}
            posterUrl={video?.sections?.[0]?.imageUrl}
            onEdit={handleEditVideo}
            onCreateNew={handleCreateOwn}
          />
        </div>
      </main>
    </div>
  );
}
