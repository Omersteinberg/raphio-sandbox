import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Music, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AudioUploadModal({ onClose, onUpload, onComplete }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type.startsWith("audio/")) {
      setFile(selected);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && dropped.type.startsWith("audio/")) {
      setFile(dropped);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const asset = await onUpload(file);
      if (asset) {
        onComplete(asset);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-card rounded-xl w-full max-w-md p-4 md:p-6 max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Upload Audio</h3>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver
                ? "border-primary bg-primary/10"
                : file
                ? "border-primary bg-primary/5"
                : "border-border hover:border-border"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {file ? (
              <div className="space-y-2">
                <Music className="w-12 h-12 mx-auto text-primary" />
                <p className="text-foreground font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                <p className="text-foreground">
                  Drop an audio file here or click to browse
                </p>
                <p className="text-sm text-muted-foreground">MP3, WAV, or OGG</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={onClose} disabled={uploading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="text-white border-0"
              style={{ background: "var(--gradient-brand)" }}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload"
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
