import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSession } from "@/services/session";
import { describeError } from "@/lib/errorDetail";
import { isGenerationFailed } from "@/lib/progressTasks";
import VideoResult from "@/components/video/VideoResult";

const POLL_INTERVAL_MS = 5000;

export default function VideoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const video = session?.video;
  const title = video?.title || session?.scriptData?.title || session?.userPrompt || "Untitled Video";
  const finalVideoUrl = video?.finalVideoUrl;

  // Real length = sum of the generated section clip durations (ffmpeg-probed
  // during generation), same as VideoCard - the Video row has no duration column.
  const totalSecs = Math.round(
    (video?.sections || []).reduce((sum, s) => sum + (Number(s.clipDuration) || 0), 0)
  );
  const durationLabel =
    totalSecs > 0 ? `${Math.floor(totalSecs / 60)}:${String(totalSecs % 60).padStart(2, "0")}` : null;

  useEffect(() => {
    const fetchSession = async () => {
      try {
        setLoading(true);
        setError(null);
        setNotFound(false);
        const data = await getSession(id);
        if (data) {
          setSession(data);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        // Only a 404 means the video is really gone. A 5xx or a dropped
        // connection must not be reported as "deleted".
        if (err?.response?.status === 404) {
          setNotFound(true);
        } else {
          setError(describeError(err, "We couldn't load this video. Please try again.").userMessage);
        }
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchSession();
    }
  }, [id]);

  const failedNoResult = isGenerationFailed(session) && !finalVideoUrl;
  const isGenerating = session?.stage === "GENERATING" && !failedNoResult;

  // Polls the session every 5s while generating; stops on terminal state, 403/404 or unmount, and never overlaps requests.
  useEffect(() => {
    if (!id || !isGenerating) return undefined;
    let cancelled = false;
    let inFlight = false;
    const interval = setInterval(async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const data = await getSession(id);
        if (!cancelled && data) setSession(data);
      } catch (err) {
        const code = err?.response?.status;
        if (code === 403 || code === 404) {
          clearInterval(interval);
          if (!cancelled) setNotFound(true);
        }
      } finally {
        inFlight = false;
      }
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id, isGenerating]);

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

  if (error) {
    return (
      <div className="min-h-full font-figtree flex items-center justify-center" style={{ background: "var(--gradient-app)" }}>
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Couldn't Load Video</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (notFound || !session) {
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

  if (failedNoResult) {
    return (
      <div className="min-h-full font-figtree flex items-center justify-center" style={{ background: "var(--gradient-app)" }}>
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Video Generation Failed</h1>
          <p className="text-muted-foreground mb-6">
            {video?.progressData?.error || "Something went wrong while creating this video."}
          </p>
          <Button onClick={handleCreateOwn} className="bg-primary hover:bg-primary/90 text-white">
            Create a New Video
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="min-h-full font-figtree flex items-center justify-center" style={{ background: "var(--gradient-app)" }}>
        <div className="text-center max-w-md">
          <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Video Still Processing
          </h1>
          <p className="text-muted-foreground">
            This video is still being created. This page updates on its own when it is ready.
          </p>
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
            duration={durationLabel}
            aspectRatio={session?.video?.aspectRatio || session?.aspectRatio}
            prompt={session?.userPrompt}
            createdAt={video?.createdAt || session?.createdAt}
            posterUrl={video?.posterUrl || video?.sections?.find((s) => s.imageUrl)?.imageUrl}
            onEdit={handleEditVideo}
            onCreateNew={handleCreateOwn}
          />
        </div>
      </main>
    </div>
  );
}
