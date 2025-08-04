import React, { useRef, useState } from "react";
import { toast } from "react-toastify";

export default function MergeDropbox({ files = [], onFilesChange }) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = (fileList) => {
    const imageFiles = Array.from(fileList).filter((file) =>
      file.type.startsWith("image/")
    );

    const wrappedFiles = imageFiles.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      description: "",
      video: "",
    }));

    // Limit total files to 5
    const currentCount = files.length;
    const availableSlots = Math.max(0, 10 - currentCount);
    const filesToAdd = wrappedFiles.slice(0, availableSlots);

    if (filesToAdd.length > 0) {
      const updatedFiles = [...files, ...filesToAdd];
      onFilesChange?.(updatedFiles);
    } else {
      toast.error("You can only add up to 10 images.");
    }
  };

  const handleDrag = (e, isActive) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(isActive);
  };

  const handleDrop = (e) => {
    handleDrag(e, false);
    if (e.dataTransfer.files?.length > 0) {
      handleFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const handleChange = (e) => {
    if (e.target.files?.length > 0) {
      handleFiles(e.target.files);
      e.target.value = "";
    }
  };

  const openFileDialog = () => inputRef.current?.click();

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors
        ${
          dragActive
            ? "border-primary bg-muted"
            : "border-foreground bg-transparent"
        }
        flex flex-col items-center justify-center text-center
        min-h-[200px] min-w-[528px]
      `}
      onClick={openFileDialog}
      onDragEnter={(e) => handleDrag(e, true)}
      onDragOver={(e) => handleDrag(e, true)}
      onDragLeave={(e) => handleDrag(e, false)}
      onDrop={handleDrop}
    >
      <input
        type="file"
        multiple
        accept="image/*"
        ref={inputRef}
        onChange={handleChange}
        className="hidden"
      />
      <p className="text-muted-foreground select-none">
        Drag & drop images here or click to browse
      </p>

      {dragActive && (
        <div className="absolute inset-0 bg-foreground opacity-3 rounded-lg pointer-events-none" />
      )}
    </div>
  );
}
