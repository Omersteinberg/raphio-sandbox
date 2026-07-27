import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Loader2,
  Check,
  Pencil,
  Share2,
  Plus,
  Copy,
  Facebook,
  Twitter,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/services/api";
import { getShareUrl } from "@/services/session";
import { API_BASE } from "@/config";

/**
 * The single "your video is ready" view - used identically by the wizard's
 * final step (ResultStep) and the standalone /video/:id page. It renders the
 * whole thing: ready header, player, Download, Edit / Share / Create-New
 * actions, and the Video Details grid (incl. Model). The hosts only pass data +
 * the Edit/Create-New handlers (which legitimately differ: the wizard resets /
 * enters editing mode in place; the page navigates).
 *
 * Download strategy (most reliable first): server /video/:id/download proxy
 * (attachment header, no CORS) → fetch the URL as a blob → plain new-tab link.
 * Share always points at the canonical /video/:id link so it's valid from both
 * hosts (the wizard isn't itself at a shareable URL).
 */
export default function VideoResult({
  sessionId,
  finalVideoUrl,
  title,
  style,
  sectionsCount,
  model,
  posterUrl,
  downloadLabel = "Download",
  onEdit,
  editLabel = "Edit",
  onCreateNew,
  createLabel = "Create New",
  showShare = true,
  showTip = true,
  className = "",
}) {
  const [downloading, setDownloading] = useState(false);
  const [publicShareUrl, setPublicShareUrl] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const shareRef = useRef(null);
  const copyTimeoutRef = useRef(null);
  const displayTitle = title || "Untitled";

  const closeSharePopover = useCallback(() => {
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
    setLinkCopied(false);
    setShareOpen(false);
  }, []);

  // Close the desktop share popover on outside click or Escape.
  useEffect(() => {
    if (!shareOpen) return;
    const onPointerDown = (e) => {
      if (shareRef.current && !shareRef.current.contains(e.target)) closeSharePopover();
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeSharePopover();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [shareOpen, closeSharePopover]);

  // Clear any pending "revert the copied checkmark" timer on unmount.
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  // Pre-fetch the public /watch link as soon as the video is ready, so the Share
  // click handler stays synchronous. iOS Safari requires navigator.share to run
  // inside the user gesture, an await before it silently breaks the native sheet.
  useEffect(() => {
    let cancelled = false;
    if (sessionId && finalVideoUrl) {
      getShareUrl(sessionId)
        .then((res) => {
          if (!cancelled && res && res.shareUrl) setPublicShareUrl(res.shareUrl);
        })
        .catch(() => {
          /* leave publicShareUrl null; shareUrl falls back to the /video link */
        });
    }
    return () => {
      cancelled = true;
    };
  }, [sessionId, finalVideoUrl]);

  const handleDownload = async () => {
    if (!finalVideoUrl) {
      toast.info("Your video is still processing. Check back in a moment.");
      return;
    }
    const filename = `${title || "video"}.mp4`;
    const clickLink = (href, isBlob = false) => {
      const link = document.createElement("a");
      link.href = href;
      link.download = filename;
      if (!isBlob) {
        link.target = "_blank";
        link.rel = "noopener";
      }
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    setDownloading(true);
    try {
      let blob = null;
      if (sessionId) {
        try {
          const res = await api.get(`${API_BASE}/video/${sessionId}/download`, {
            responseType: "blob",
          });
          blob = res.data;
        } catch {
          /* fall through */
        }
      }
      if (!blob) {
        const res = await fetch(finalVideoUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        blob = await res.blob();
      }
      const url = URL.createObjectURL(blob);
      clickLink(url, true);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("[VideoResult] download failed, opening directly:", err);
      clickLink(finalVideoUrl);
    } finally {
      setDownloading(false);
    }
  };

  // Prefer the public /watch link (works for logged-out viewers). Fall back to
  // the canonical in-app /video link only if the pre-fetch hasn't landed / failed,
  // so Share is never dead.
  const shareUrl =
    publicShareUrl ||
    (sessionId ? `${window.location.origin}/video/${sessionId}` : finalVideoUrl);

  const handleShare = async () => {
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || "My Video",
          text: "Check out this video I created!",
          url: shareUrl,
        });
        return;
      } catch {
        /* cancelled or unsupported → fall back to the desktop popover */
      }
    }
    if (shareOpen) {
      closeSharePopover();
    } else {
      setShareOpen(true);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!");
      // Show a checkmark on the button itself (the toast alone is easy to miss),
      // then revert and close after the user's had a moment to see it.
      setLinkCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => {
        copyTimeoutRef.current = null;
        closeSharePopover();
      }, 1200);
    } catch {
      toast.error("Couldn't copy the link");
      closeSharePopover();
    }
  };

  const openSocialShare = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
    closeSharePopover();
  };

  return (
    <div className={className}>
      {/* Ready header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          Your Video is Ready!
        </h1>
        <p className="text-muted-foreground">
          {displayTitle} has been successfully created
        </p>
      </div>

      {/* Player */}
      <div className="bg-black rounded-2xl overflow-hidden shadow-2xl">
        {finalVideoUrl ? (
          <video
            src={finalVideoUrl}
            controls
            playsInline
            preload="metadata"
            className="w-full aspect-video"
            poster={posterUrl || undefined}
          >
            Your browser does not support the video tag.
          </video>
        ) : (
          <div className="w-full aspect-video flex items-center justify-center text-white/60 text-sm">
            Your video isn't ready to play yet.
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 mt-6 sm:flex sm:flex-wrap">
        <Button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full sm:w-auto text-white border-0 flex items-center justify-center gap-2 px-6"
          style={{ background: "var(--gradient-brand)" }}
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {downloadLabel}
        </Button>

        {onEdit && (
          <Button
            onClick={onEdit}
            variant="outline"
            className="w-full sm:w-auto border-border text-foreground hover:bg-muted flex items-center justify-center gap-2"
          >
            <Pencil className="w-4 h-4" />
            {editLabel}
          </Button>
        )}

        {showShare && shareUrl && (
          <div className="relative" ref={shareRef}>
            <Button
              onClick={handleShare}
              variant="outline"
              className="w-full sm:w-auto border-border text-foreground hover:bg-muted flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>

            <AnimatePresence>
              {shareOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute left-0 top-full mt-2 z-20 w-72 rounded-xl border border-border bg-card p-3 shadow-lg"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={shareUrl}
                      onFocus={(e) => e.target.select()}
                      className="text-xs h-11"
                    />
                    <Button
                      onClick={handleCopyLink}
                      variant="outline"
                      size="icon"
                      className="shrink-0 border-border"
                      aria-label={linkCopied ? "Link copied" : "Copy link"}
                    >
                      {linkCopied ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() =>
                        openSocialShare(
                          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
                        )
                      }
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      aria-label="Share on Facebook"
                    >
                      <Facebook className="w-4 h-4" />
                      Facebook
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        openSocialShare(
                          `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`,
                        )
                      }
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-border py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      aria-label="Share on X"
                    >
                      <Twitter className="w-4 h-4" />
                      X
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {onCreateNew && (
          <Button
            onClick={onCreateNew}
            variant="outline"
            className="w-full sm:w-auto border-border text-foreground hover:bg-muted flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {createLabel}
          </Button>
        )}
      </div>

      {/* Video details */}
      <div className="bg-muted/40 rounded-lg p-6 border border-border mt-8">
        <h3 className="font-semibold text-foreground mb-4">Video Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Detail label="Title" value={displayTitle} />
          <Detail label="Style" value={style || "-"} capitalize />
          <Detail label="Sections" value={sectionsCount ?? 0} />
          <Detail label="Model" value={model || "-"} />
        </div>
      </div>

      {showTip && (
        <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-sm text-primary">
            <strong>Tip:</strong> Use Edit to regenerate individual sections,
            reorder clips, adjust narration, speed and more.
          </p>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, capitalize = false }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`font-medium text-foreground ${capitalize ? "capitalize" : ""}`}>
        {value}
      </p>
    </div>
  );
}
