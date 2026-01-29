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
      duration: 5,
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

  const reset = () => {
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
    reset,
  };
}
