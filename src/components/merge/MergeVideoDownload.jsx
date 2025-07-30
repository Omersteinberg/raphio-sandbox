import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";

export default function MergeVideoDownload({ open, onClose, videoUrl }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && open) {
      videoRef.current.play().catch(() => {});
    }
  }, [open]);

  const handleDownload = async () => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "merged_video.mp4";
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed", err);
    }
  };

  if (!videoUrl) return null;

  return (
    <Dialog open={open} onOpenChange={onClose} modal={true}>
      <DialogContent className="max-w-5xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Download Merged Video</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <video
            ref={videoRef}
            controls
            loop
            autoPlay
            muted
            className="w-full rounded-lg border shadow"
            src={videoUrl}
          />
        </div>

        <DialogFooter>
          <a href={videoUrl} download className="w-full">
            <Button className="w-full text-black hover:text-primary bg-secondary hover:bg-accent">
              Download Video 
            </Button>
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
