import { useState, useCallback } from "react";

const MAX_IMAGES = 10;

export function useImagePool() {
  const [images, setImages] = useState([]);

  const addImages = useCallback((files) => {
    const newImages = files.slice(0, MAX_IMAGES - images.length).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...newImages].slice(0, MAX_IMAGES));
  }, [images.length]);

  const removeImage = useCallback((imageId) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === imageId);
      if (img?.preview) {
        URL.revokeObjectURL(img.preview);
      }
      return prev.filter((i) => i.id !== imageId);
    });
  }, []);

  const clearImages = useCallback(() => {
    images.forEach((img) => {
      if (img.preview) {
        URL.revokeObjectURL(img.preview);
      }
    });
    setImages([]);
  }, [images]);

  const reset = useCallback(() => {
    clearImages();
  }, [clearImages]);

  return {
    images,
    addImages,
    removeImage,
    clearImages,
    reset,
    maxImages: MAX_IMAGES,
    canAddMore: images.length < MAX_IMAGES,
  };
}
