import { useState } from "react";

export function useScriptReview() {
  const [script, setScript] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateSection = (index, updates) => {
    setSections((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
  };

  const addSection = (afterIndex) => {
    const newSection = {
      orderIndex: afterIndex + 1,
      narrationText: "",
      visualDescription: "",
      motionPrompt: "",
      duration: 5,
      imageFile: null,
      imagePreview: null,
    };
    setSections((prev) => {
      const updated = [...prev];
      updated.splice(afterIndex + 1, 0, newSection);
      return updated.map((section, idx) => ({
        ...section,
        orderIndex: idx,
      }));
    });
  };

  const removeSection = (index) => {
    if (sections.length <= 1) return;
    // Revoke object URL to prevent memory leaks
    const section = sections[index];
    if (section.imagePreview) {
      URL.revokeObjectURL(section.imagePreview);
    }
    setSections((prev) => {
      const updated = prev.filter((_, idx) => idx !== index);
      return updated.map((section, idx) => ({
        ...section,
        orderIndex: idx,
      }));
    });
  };

  const reorderSections = (fromIndex, toIndex) => {
    setSections((prev) => {
      const updated = [...prev];
      const [removed] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, removed);
      return updated.map((section, idx) => ({
        ...section,
        orderIndex: idx,
      }));
    });
  };

  const getTotalDuration = () => {
    return sections.reduce((sum, section) => sum + (section.duration || 0), 0);
  };

  const getImagesCount = () => {
    return sections.filter((section) => section.imageFile || section.imagePreview).length;
  };

  const getAllImages = () => {
    return sections
      .filter((section) => section.imageFile)
      .map((section) => ({
        file: section.imageFile,
        orderIndex: section.orderIndex,
        motionPrompt: section.motionPrompt,
      }));
  };

  const isComplete = () => {
    return sections.every(
      (section) =>
        section.narrationText?.trim() &&
        (section.imageFile || section.imagePreview)
    );
  };

  const reset = () => {
    // Revoke all object URLs
    sections.forEach((section) => {
      if (section.imagePreview) {
        URL.revokeObjectURL(section.imagePreview);
      }
    });
    setScript(null);
    setSections([]);
    setLoading(false);
    setError(null);
  };

  return {
    script,
    setScript,
    sections,
    setSections,
    loading,
    setLoading,
    error,
    setError,
    updateSection,
    addSection,
    removeSection,
    reorderSections,
    getTotalDuration,
    getImagesCount,
    getAllImages,
    isComplete,
    reset,
  };
}
