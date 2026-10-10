import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Clock, Film, MoreVertical, Trash2 } from "lucide-react";
import { getSessionTitle, getSessionThumbnail, getSessionBadge, getSessionTag } from "@/lib/sessionDisplay";

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

// Kebab menu with a single Delete action, hands the session to the parent's confirm flow.
export function SessionMenu({ onDelete, dark = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label="Video actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        style={{
          width: 32, height: 32, borderRadius: 9999, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: dark ? 'transparent' : 'rgba(255,255,255,0.92)',
          boxShadow: dark ? 'none' : '0 1px 4px rgba(45,34,53,0.18)',
        }}
      >
        <MoreVertical style={{ width: 16, height: 16, color: C.dark }} />
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute', top: 36, right: 0, zIndex: 20, minWidth: 110,
            background: '#fff', borderRadius: 10, border: `1px solid ${C.border}`,
            boxShadow: '0 8px 24px rgba(45,34,53,0.12)', overflow: 'hidden',
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px',
              border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 13, fontWeight: 600, color: '#B91C1C', textAlign: 'left',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(185,28,28,0.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Trash2 style={{ width: 14, height: 14 }} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function VideoCard({ session, onClick, onDelete }) {
  const thumbnail = getSessionThumbnail(session);
  const title = getSessionTitle(session);
  const badge = getSessionBadge(session);

  // Real length = sum of the generated section clip durations (ffmpeg-probed
  // during generation). The Video row has no duration column, so relying on
  // session.video.duration always fell back to a hardcoded placeholder.
  const totalSecs = Math.round(
    (session.video?.sections || []).reduce((sum, s) => sum + (Number(s.clipDuration) || 0), 0)
  );
  const durationStr = totalSecs > 0
    ? `${Math.floor(totalSecs / 60)}:${String(totalSecs % 60).padStart(2, '0')}`
    : null;

  // Use updatedAt if it differs from creation, otherwise fall back to createdAt
  const displayDate = session.updatedAt || session.createdAt;

  const styleLabel = getSessionTag(session);

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
          <div className="bg-muted" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Film style={{ width: 28, height: 28, color: 'rgba(193,68,14,0.35)' }} />
          </div>
        )}

        {badge && (
          <div style={{
            position: 'absolute', top: 10, left: 10, zIndex: 3,
            display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20,
            background: 'rgba(255,255,255,0.94)', boxShadow: '0 1px 4px rgba(45,34,53,0.15)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: badge.color, animation: badge.pulse ? 'dot-pulse 1.4s ease-in-out infinite' : 'none' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: badge.color, whiteSpace: 'nowrap' }}>{badge.label}</span>
            <style>{`@keyframes dot-pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
          </div>
        )}

        {onDelete && (
          <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 4 }}>
            <SessionMenu onDelete={() => onDelete(session)} />
          </div>
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
        {durationStr && (
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
        )}
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
