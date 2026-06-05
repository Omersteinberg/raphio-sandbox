import { motion } from "framer-motion";
import { Play, Clock } from "lucide-react";
import { STYLE_OPTIONS } from "@/constants/styles";

const C = {
  dark:    '#2D2235',
  terra:   '#C1440E',
  muted:   '#6B5E7B',
  border:  'rgba(45,34,53,0.09)',
};

// Formatting helper for the dynamic operational timestamp
function getRelativeTime(dateString) {
  if (!dateString) return '';
  const now  = new Date();
  const date = new Date(dateString);
  const diffMs   = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1)  return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffH = Math.floor(diffMins / 60);
  if (diffH < 24)    return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30)    return `${diffD}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function VideoCard({ session, onClick }) {
  const thumbnail = session.images?.[0]?.imageUrl;
  const title = session.video?.title || session.scriptData?.title || "Untitled Video";
  
  // Dynamic duration format tracker
  const durationStr = session.video?.duration 
    ? `${Math.floor(session.video.duration / 60)}:${String(session.video.duration % 60).padStart(2, '0')}` 
    : "0:16";

  // Use updatedAt if it differs from creation, otherwise fall back to createdAt
  const displayDate = session.updatedAt || session.createdAt;

  // Retrieve isolated clean style name (e.g., "Realistic", "Animated")
  const activeStyleObject = STYLE_OPTIONS.find(s => s.id === session.style);
  const styleLabel = activeStyleObject ? activeStyleObject.name : session.style;

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ 
        y: -5,
        scale: 1.01,
        transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] }
      }}
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        background: '#FFFFFF',
        border: `1px solid ${C.border}`,
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(45,34,53,0.02)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 12px 24px rgba(45,34,53,0.06)';
        e.currentTarget.style.borderColor = 'rgba(193,68,14,0.15)';
        const overlay = e.currentTarget.querySelector('.play-overlay');
        if (overlay) overlay.style.opacity = '1';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(45,34,53,0.02)';
        e.currentTarget.style.borderColor = C.border;
        const overlay = e.currentTarget.querySelector('.play-overlay');
        if (overlay) overlay.style.opacity = '0';
      }}
    >
      {/* ── VISUAL THUMBNAIL FRAME (Standard 16:9) ── */}
      <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden', position: 'relative', background: '#F5EFE9' }}>
        {thumbnail ? (
          <img 
            src={thumbnail} 
            alt={title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #EDE8E2, #F5EFE9)' }} />
        )}

        {/* Play Icon hover mask layer */}
        <div 
          className="play-overlay"
          style={{ 
            position: 'absolute', inset: 0, background: 'rgba(45,34,53,0.12)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            opacity: 0, transition: 'opacity 0.2s ease', zIndex: 2 
          }}
        >
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(45,34,53,0.15)' }}>
            <Play style={{ width: 12, height: 12, color: C.terra, fill: C.terra, marginLeft: 2 }} />
          </div>
        </div>

        {/* ── TIMESTAMPS OVERLAY PILL (Bottom Right) ── */}
        <div style={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          background: 'rgba(45, 34, 53, 0.72)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          borderRadius: 6,
          padding: '2px 6px',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          zIndex: 3,
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          <Clock style={{ width: 11, height: 11, color: '#FFFFFF' }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}>
            {durationStr}
          </span>
        </div>
      </div>

      {/* ── METADATA INFO BLOCK ── */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '6px', flexGrow: 1, justifyContent: 'center' }}>
        
        <h4 style={{ fontSize: 14, fontWeight: 700, color: C.dark, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0, letterSpacing: '-0.01em' }}>
          {title}
        </h4>
        
        {/* Unified Inline Subtext Metadata Meta Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {styleLabel && (
            <span style={{ fontSize: 12, fontWeight: 700, color: C.terra, textTransform: 'capitalize' }}>
              {styleLabel}
            </span>
          )}
          
          {styleLabel && displayDate && (
            <span style={{ fontSize: 12, color: 'rgba(45,34,53,0.25)', fontWeight: 500 }}>·</span>
          )}

          {displayDate && (
            <span style={{ fontSize: 12, fontWeight: 500, color: C.muted }}>
              Updated {getRelativeTime(displayDate)}
            </span>
          )}
        </div>

      </div>
    </motion.div>
  );
}