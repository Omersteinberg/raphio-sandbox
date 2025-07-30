import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

function smoothHorizontalScroll(container, target) {
  if (!container || !target) return;

  const containerRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();

  const scrollLeft = container.scrollLeft;
  const targetCenter =
    targetRect.left + targetRect.width / 2 - containerRect.left;

  const containerCenter = containerRect.width / 2;
  const targetScrollLeft = scrollLeft + targetCenter - containerCenter;

  let start = null;
  const duration = 400;
  const initialScroll = container.scrollLeft;
  const distance = targetScrollLeft - initialScroll;

  function step(timestamp) {
    if (!start) start = timestamp;
    const elapsed = timestamp - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease =
      progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;

    container.scrollLeft = initialScroll + distance * ease;
    if (elapsed < duration) {
      window.requestAnimationFrame(step);
    }
  }

  window.requestAnimationFrame(step);
}

export default function MergeVideoList({
  videos,
  selectedImageId,
  setSelectedImageId,
  className = "",
}) {
  const containerRef = useRef(null);
  const videoRefs = useRef({});

  useEffect(() => {
    console.log("reload video", videos);
  }, [videos]);

  useEffect(() => {
    if (
      selectedImageId &&
      videoRefs.current[selectedImageId] &&
      containerRef.current
    ) {
      smoothHorizontalScroll(
        containerRef.current,
        videoRefs.current[selectedImageId]
      );
    }
  }, [selectedImageId]);

  return (
    <div
      ref={containerRef}
      className={`scrollbar-hidden scrollbar-hover overflow-x-auto whitespace-nowrap flex gap-4 ${className}`}
    >
      {videos.map((video) => {
        const isSelected = video.id === selectedImageId;
        return (
          <motion.div
            key={video.video}
            ref={(el) => (videoRefs.current[video.id] = el)}
            onClick={() => setSelectedImageId(video.id)}
            className={`shrink-0 w-[1024px] h-[576px] border cursor-pointer`}
            initial={false}
            animate={{
              borderColor: isSelected
                ? "hsl(var(--accent) / 0.5)"
                : "transparent", // move to indexcss. should not use hardcoded colors
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            style={{ borderWidth: 4, borderStyle: "solid", overflow: "hidden" }}
          >
            <video
              src={video.video}
              controls
              preload="auto"
              onError={(e) => {
                console.error("Video failed to load:", video.video, e);
              }}
              className="w-full h-full object-cover"
            />
          </motion.div>
        );
      })}
    </div>
  );
}
