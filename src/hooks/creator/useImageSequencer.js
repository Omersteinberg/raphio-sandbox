import { useState } from "react";

export function useImageSequencer() {
  const [images, setImages] = useState([]);

  const handleRemove = (id) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleReorder = (newFiles) => {
    setImages(newFiles);
  };

  const handleImageClick = (id) => {
    return id;
  };

  return {
    images,
    setImages,
    handleRemove,
    handleReorder,
    handleImageClick,
  };
}
