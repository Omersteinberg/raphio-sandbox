import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Video, ArrowRight, LayoutGrid,
  List, ChevronRight, SlidersHorizontal, Clock
} from "lucide-react";
import { toast } from "@/lib/toast";
import { listSessions } from "@/services/session";
import { useAuth } from "@/hooks/useAuth.jsx";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { STYLE_OPTIONS } from "@/constants/styles";
import VideoCard from "@/components/videos/VideoCard";
import { startMyVideosTour } from "@/lib/myVideosTour";
import { TOUR_KEYS } from "@/lib/tourState";
import { useStepTour } from "@/lib/useStepTour";
import HelpFab from "@/components/ui/HelpFab";

// ── Design tokens ─────────────────────────────────────────────────
const C = {
  bg:      'linear-gradient(160deg, #FDF6F0 0%, #FDFAF8 50%, #F7F4FB 100%)',
  dark:    '#2D2235',
  terra:   '#C1440E',
  terraLt: '#E8632A',
  terraDk: '#5C1000',
  muted:   '#6B5E7B',
  peach:   '#F0A070',
  blush:   '#FDDCC8',
  faint:   'rgba(45,34,53,0.08)',
  border:  'rgba(45,34,53,0.09)',
};

const PAGE_SIZE = 12;
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
];

// ── Helpers ───────────────────────────────────────────────────────
function getTitle(session) {
  return (
    session.video?.title ||
    session.scriptData?.title ||
    (session.userPrompt?.length > 60
      ? session.userPrompt.slice(0, 60) + '…'
      : session.userPrompt) ||
    'Untitled Video'
  );
}

function getThumbnail(session) {
  return (
    session.video?.posterUrl ||
    session.video?.sections?.find((s) => s.imageUrl)?.imageUrl ||
    session.images?.[0]?.imageUrl ||
    null
  );
}

function getRelativeTime(dateString) {
  const now      = new Date();
  const date     = new Date(dateString);
  const diffMins = Math.floor((now - date) / 60000);
  if (diffMins < 1)  return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffH = Math.floor(diffMins / 60);
  if (diffH < 24)    return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30)    return `${diffD}d ago`;
  return date.toLocaleDateString();
}

// Real length = sum of generated section clip durations. Returns null when
// unknown (e.g. still generating) so callers can hide the field.
function getDurationStr(session) {
  const totalSecs = Math.round(
    (session.video?.sections || []).reduce((sum, s) => sum + (Number(s.clipDuration) || 0), 0)
  );
  return totalSecs > 0
    ? `${Math.floor(totalSecs / 60)}:${String(totalSecs % 60).padStart(2, '0')}`
    : null;
}

function sortAndFilter(sessions, sort, styleFilter) {
  let result = styleFilter
    ? sessions.filter(s => s.style === styleFilter)
    : [...sessions];
  return result.sort((a, b) =>
    sort === 'oldest'
      ? new Date(a.createdAt) - new Date(b.createdAt)
      : new Date(b.createdAt) - new Date(a.createdAt)
  );
}

function getStageBadge(session) {
  const stage = session.stage;
  // COMPLETED and EDITING both live on the Completed tab - neither needs a
  // status badge (EDITING previously showed a "Ready to Edit" pill).
  if (!stage || stage === 'COMPLETED' || stage === 'EDITING') return null;
  if (['PROMPT_ENTERED','IMAGES_UPLOADED','IMAGES_ANALYZED','SCRIPT_GENERATED'].includes(stage))
    return { label: 'Writing Script', bg: 'rgba(107,94,123,0.10)', color: '#6B5E7B', pulse: false };
  if (['SCRIPT_APPROVED','FRAMES_CONFIGURED'].includes(stage))
    return { label: 'Script Ready', bg: 'rgba(193,68,14,0.08)', color: C.terra, pulse: false };
  if (stage === 'GENERATING') {
    const sections  = session.video?.sections || [];
    const completed = sections.filter(s => s.status === 'COMPLETED').length;
    const total     = sections.length;
    const progress  = total > 0 ? `${completed}/${total} clips` : null;
    return { label: progress ? `Generating · ${progress}` : 'Generating', bg: 'rgba(232,99,42,0.10)', color: C.terraLt, pulse: true };
  }
  if (['FAILED','ERROR'].includes(stage))
    return { label: 'Failed', bg: 'rgba(220,38,38,0.08)', color: '#DC2626', pulse: false };
  return { label: stage.replace(/_/g, ' ').toLowerCase(), bg: C.faint, color: C.muted, pulse: false };
}

// ── Shimmer skeleton ──────────────────────────────────────────────
function SkeletonCard({ list = false }) {
  return (
    <div style={{
      borderRadius: list ? 12 : 16, overflow: 'hidden',
      background: '#fff', border: `1px solid ${C.border}`,
      display: list ? 'flex' : 'block', alignItems: list ? 'center' : undefined,
    }}>
      <style>{`
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .skel{background:linear-gradient(90deg,#F5EFE9 0%,#EDE8E2 50%,#F5EFE9 100%);background-size:200% 100%;animation:shimmer 1.6s ease-in-out infinite}
      `}</style>
      <div className="skel" style={{ aspectRatio: list?undefined:'16/9', width:list?112:'100%', height:list?63:undefined, flexShrink:0 }} />
      <div style={{ padding: list?'0 16px':'14px 16px', flex:1 }}>
        <div className="skel" style={{ height:13, borderRadius:6, width:'65%', marginBottom:8 }} />
        <div className="skel" style={{ height:11, borderRadius:6, width:'40%' }} />
      </div>
    </div>
  );
}

// ── Resume banner ─────────────────────────────────────────────────
// Always renders to hold vertical space, prevents tab baseline shift.
// For new users: shows a faint "first video in progress" hint instead
// of being completely invisible, filling the space meaningfully.
function ResumeBanner({ session, onClick, visible, isNewUser }) {
  const title = session ? getTitle(session) : null;

  // New user variant: subtle hint that fills the reserved space
  if (isNewUser) {
    return (
      <div style={{
        marginBottom: 20, height: 60,
        display: 'flex', alignItems: 'center',
      }}>
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center',
          padding: '0 18px', borderRadius: 14,
          background: 'rgba(45,34,53,0.03)',
          border: '1px dashed rgba(45,34,53,0.12)',
        }}>
          <p style={{
            fontSize: 12, color: 'rgba(107,94,123,0.55)',
            fontStyle: 'italic', margin: 0,
          }}>
           Start a video and you'll be able to resume it right here
          </p>
        </div>
      </div>
    );
  }

  // Returning user variant: invisible space holder when no session
  return (
    <div style={{
      marginBottom: 20,
      visibility: visible && session ? 'visible' : 'hidden',
      pointerEvents: visible && session ? 'auto' : 'none',
      height: 60, display: 'flex', alignItems: 'center',
    }}>
      {session && (
        <div onClick={onClick} style={{
          width:'100%', display:'flex', alignItems:'center',
          justifyContent:'space-between', padding:'0 18px',
          borderRadius:14, background:'rgba(193,68,14,0.05)',
          border:'1.5px solid rgba(193,68,14,0.18)',
          cursor:'pointer', height:'100%',
          transition:'background 0.15s ease, border-color 0.15s ease',
        }}
          onMouseEnter={e=>{e.currentTarget.style.background='rgba(193,68,14,0.09)';e.currentTarget.style.borderColor='rgba(193,68,14,0.30)';}}
          onMouseLeave={e=>{e.currentTarget.style.background='rgba(193,68,14,0.05)';e.currentTarget.style.borderColor='rgba(193,68,14,0.18)';}}
        >
          <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0 }}>
            <div style={{ position:'relative', flexShrink:0, width:8, height:8 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:C.terra }} />
              <div style={{ position:'absolute', inset:-3, borderRadius:'50%', background:'rgba(193,68,14,0.25)', animation:'pulse-ring 1.8s ease-out infinite' }} />
              <style>{`@keyframes pulse-ring{0%{transform:scale(0.8);opacity:1}100%{transform:scale(2.2);opacity:0}}`}</style>
            </div>
            <div style={{ minWidth:0 }}>
              <p style={{ fontSize:10, fontWeight:700, color:C.terra, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:2 }}>
                Continue where you left off
              </p>
              <p style={{ fontSize:13, fontWeight:600, color:C.dark, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {title}
              </p>
            </div>
          </div>
          <ChevronRight style={{ width:15, height:15, color:C.terra, flexShrink:0 }} />
        </div>
      )}
    </div>
  );
}

// ── Style filter chips ────────────────────────────────────────────
function StyleFilterChips({ sessions, activeStyle, onChange }) {
  const presentStyles = STYLE_OPTIONS.filter(opt => sessions.some(s => s.style === opt.id));
  if (presentStyles.length < 2) return null;
  const chips = [{ id: null, name: 'All' }, ...presentStyles];
  return (
    <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
      {chips.map(({ id, name }) => {
        const isActive = activeStyle === id;
        return (
          <button key={id??'all'} onClick={() => onChange(id)} style={{
            height:32, paddingLeft:14, paddingRight:14,
            borderRadius:9999,
            border: isActive ? `1.5px solid rgba(193,68,14,0.35)` : `1px solid ${C.border}`,
            background: isActive ? 'rgba(193,68,14,0.08)' : '#fff',
            fontSize:12, fontWeight: isActive?700:500,
            color: isActive?C.terra:C.muted,
            fontFamily:'inherit', cursor:'pointer',
            transition:'all 0.15s ease',
          }}
            onMouseEnter={e=>{ if(!isActive){e.currentTarget.style.borderColor='rgba(193,68,14,0.20)';e.currentTarget.style.color=C.dark;} }}
            onMouseLeave={e=>{ if(!isActive){e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;} }}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}

// ── Sort dropdown ─────────────────────────────────────────────────
function SortDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const current = SORT_OPTIONS.find(o => o.value === value);
  useEffect(() => {
    const close = e => { if (!e.target.closest('#sort-dd')) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return (
    <div id="sort-dd" style={{ position:'relative' }}>
      <button onClick={() => setOpen(v=>!v)} style={{
        display:'flex', alignItems:'center', gap:6,
        height:34, paddingLeft:14, paddingRight:14,
        borderRadius:9999, border:`1px solid ${C.border}`,
        background: open?'rgba(193,68,14,0.05)':'#fff',
        fontSize:13, fontWeight:600, color:C.dark,
        fontFamily:'inherit', cursor:'pointer', transition:'background 0.15s ease',
      }}>
        <SlidersHorizontal style={{ width:13, height:13, color:C.muted }} />
        {current?.label}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }}
            exit={{ opacity:0, y:-4 }} transition={{ duration:0.14 }}
            style={{
              position:'absolute', top:40, zIndex:20,
              ...(isMobile ? { left:0 } : { right:0 }),
              background:'#fff', borderRadius:12,
              border:`1px solid ${C.border}`,
              boxShadow:'0 8px 24px rgba(45,34,53,0.10)',
              overflow:'hidden', minWidth:155,
            }}
          >
            {SORT_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }} style={{
                display:'block', width:'100%', padding:'10px 16px',
                textAlign:'left', fontSize:13,
                fontWeight: value===opt.value?700:500,
                color: value===opt.value?C.terra:C.dark,
                background: value===opt.value?'rgba(193,68,14,0.06)':'transparent',
                border:'none', fontFamily:'inherit', cursor:'pointer',
                transition:'background 0.1s ease',
              }}
                onMouseEnter={e=>{ if(value!==opt.value) e.currentTarget.style.background='rgba(45,34,53,0.04)'; }}
                onMouseLeave={e=>{ if(value!==opt.value) e.currentTarget.style.background='transparent'; }}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── List row ──────────────────────────────────────────────────────
function VideoListRow({ session, onClick }) {
  const thumbnail   = getThumbnail(session);
  const title       = getTitle(session);
  const badge       = getStageBadge(session);
  const durationStr = getDurationStr(session);
  return (
    <motion.div whileHover={{ x:3 }} transition={{ duration:0.15 }} onClick={onClick}
      style={{
        display:'flex', alignItems:'center', gap:16,
        padding:'12px 16px', borderRadius:12,
        background:'#fff', border:`1px solid ${C.border}`,
        cursor:'pointer', transition:'border-color 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(193,68,14,0.22)';e.currentTarget.style.boxShadow='0 2px 12px rgba(193,68,14,0.08)';}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow='none';}}
    >
      <div style={{ width:112, height:63, borderRadius:8, overflow:'hidden', flexShrink:0, background:'linear-gradient(135deg,#F5EFE9,#EDE8E2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        {thumbnail
          ? <img src={thumbnail} alt={title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          : <Video style={{ width:20, height:20, color:'rgba(193,68,14,0.35)' }} />}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:14, fontWeight:700, color:C.dark, marginBottom:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{title}</p>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:12, color:C.muted }}>{getRelativeTime(session.createdAt)}</span>
          {session.style && (<>
            <span style={{ fontSize:12, color:'rgba(45,34,53,0.2)' }}>·</span>
            <span style={{ fontSize:12, fontWeight:600, color:C.muted, textTransform:'capitalize' }}>
              {STYLE_OPTIONS.find(s=>s.id===session.style)?.name||session.style}
            </span>
          </>)}
          {durationStr && (<>
            <span style={{ fontSize:12, color:'rgba(45,34,53,0.2)' }}>·</span>
            <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, fontWeight:600, color:C.muted, fontVariantNumeric:'tabular-nums' }}>
              <Clock style={{ width:11, height:11 }} />
              {durationStr}
            </span>
          </>)}
        </div>
      </div>
      {badge && (
        <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:20, background:badge.bg, flexShrink:0 }}>
          <div style={{ width:5, height:5, borderRadius:'50%', background:badge.color, animation:badge.pulse?'dot-pulse 1.4s ease-in-out infinite':'none' }} />
          <span style={{ fontSize:11, fontWeight:700, color:badge.color, whiteSpace:'nowrap' }}>{badge.label}</span>
        </div>
      )}
      <ChevronRight style={{ width:15, height:15, color:'rgba(45,34,53,0.25)', flexShrink:0 }} />
      <style>{`@keyframes dot-pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </motion.div>
  );
}

// ── Pagination ────────────────────────────────────────────────────
function Pagination({ page, totalPages, onPrev, onNext }) {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginTop:40 }}>
      {[{label:'Previous',action:onPrev,disabled:page===1},{label:'Next',action:onNext,disabled:page===totalPages}].map(({label,action,disabled})=>(
        <button key={label} onClick={action} disabled={disabled} style={{
          height:36, paddingLeft:20, paddingRight:20,
          borderRadius:9999, border:`1px solid ${C.border}`,
          background:disabled?'transparent':'#fff',
          color:disabled?C.muted:C.dark,
          fontSize:13, fontWeight:600, fontFamily:'inherit',
          cursor:disabled?'not-allowed':'pointer', opacity:disabled?0.4:1,
        }}>{label}</button>
      ))}
      <span style={{ fontSize:13, color:C.muted, fontWeight:500 }}>{page} of {totalPages}</span>
    </div>
  );
}

// ── Stream tiles ──────────────────────────────────────────────────
const STREAM_TILES_A = [
  { ratio:'16/9', grad:`linear-gradient(135deg,${C.terraLt},${C.terra})`,   opacity:0.32 },
  { ratio:'9/16', grad:`linear-gradient(145deg,${C.terra},${C.blush})`,     opacity:0.28 },
  { ratio:'4/3',  grad:`linear-gradient(120deg,${C.peach},${C.terra})`,     opacity:0.34 },
  { ratio:'1/1',  grad:`linear-gradient(150deg,#7A1A00,${C.terra})`,        opacity:0.30 },
  { ratio:'3/4',  grad:`linear-gradient(135deg,${C.terra},${C.blush})`,     opacity:0.26 },
  { ratio:'16/9', grad:`linear-gradient(160deg,${C.terraDk},${C.terraLt})`, opacity:0.36 },
];
const STREAM_TILES_B = [
  { ratio:'3/4',  grad:`linear-gradient(130deg,${C.blush},${C.terraLt})`,   opacity:0.27 },
  { ratio:'16/9', grad:`linear-gradient(140deg,${C.terraDk},${C.terraLt})`, opacity:0.36 },
  { ratio:'1/1',  grad:`linear-gradient(155deg,${C.terra},${C.blush})`,     opacity:0.30 },
  { ratio:'4/3',  grad:`linear-gradient(125deg,#7A1A00,${C.blush})`,        opacity:0.28 },
  { ratio:'9/16', grad:`linear-gradient(145deg,${C.terraLt},${C.terra})`,   opacity:0.32 },
  { ratio:'16/9', grad:`linear-gradient(135deg,${C.peach},#7A1A00)`,        opacity:0.29 },
];

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" stroke="rgba(255,255,255,0.45)" strokeWidth="1"/>
      <path d="M10 8.5l6 3.5-6 3.5V8.5z" fill="rgba(255,255,255,0.65)"/>
    </svg>
  );
}

function StreamTile({ item }) {
  return (
    <div style={{
      width:'100%', aspectRatio:item.ratio,
      borderRadius:8, background:item.grad,
      border:'1px solid rgba(255,255,255,0.14)',
      opacity:item.opacity, flexShrink:0,
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      <PlayIcon />
    </div>
  );
}

function StreamCol({ tiles, reverse=false, speed=30, marginTop=0 }) {
  const tripled  = [...tiles, ...tiles, ...tiles];
  const animName = `sc-${reverse?'dn':'up'}-${speed}`;
  return (
    <div style={{ flex:1, minWidth:0, marginTop, overflow:'hidden' }}>
      <style>{`
        @keyframes ${animName}{
          0%{transform:translateY(${reverse?'-33.33%':'0%'})}
          100%{transform:translateY(${reverse?'0%':'-33.33%'})}
        }
      `}</style>
      <div style={{
        display:'flex', flexDirection:'column', gap:10,
        animation:`${animName} ${speed}s linear infinite`,
        willChange:'transform',
      }}>
        {tripled.map((tile,i) => <StreamTile key={i} item={tile} />)}
      </div>
    </div>
  );
}

// ── Welcome empty state ───────────────────────────────────────────
function WelcomeEmptyState({ username, onCreateClick }) {
  const firstName = username?.split(' ')[0] || username || 'there';
  return (
    <>
      <style>{`
        .wes-card { background:#fff; border-radius:20px; border:1px solid ${C.border}; box-shadow:0 2px 16px rgba(45,34,53,0.06); overflow:hidden; min-height:calc(100vh - 320px); display:flex; position:relative; }
        .wes-text { width:52%; flex-shrink:0; padding:52px 48px; display:flex; flex-direction:column; justify-content:center; position:relative; z-index:2; }
        .wes-stream { flex:1; position:relative; overflow:hidden; min-width:0; }
        @media (max-width:680px) {
          .wes-card { min-height:calc(100vh - 280px); }
          .wes-text { width:100%; padding:40px 28px; }
          .wes-stream { display:none; }
        }
        @media (min-width:681px) and (max-width:900px) {
          .wes-text { width:58%; padding:40px 32px; }
          .wes-col-b { display:none; }
        }
      `}</style>
      <div className="wes-card">
        <div className="wes-text">
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'3px 12px', borderRadius:20, background:'rgba(193,68,14,0.07)', border:'1px solid rgba(193,68,14,0.14)', fontSize:10, fontWeight:700, color:C.terra, letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:18, width:'fit-content' }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background:C.terra, display:'inline-block' }} />
            Welcome to Raphio
          </div>
          <h2 style={{ fontSize:'clamp(22px, 3.5vw, 40px)', fontWeight:800, color:C.dark, letterSpacing:'-0.025em', lineHeight:1.1, marginBottom:14 }}>
            Hey {firstName},<br/><span style={{ color:C.terra }}>start creating.</span>
          </h2>
          <p style={{ fontSize:14, color:C.muted, lineHeight:1.65, marginBottom:28, maxWidth:320 }}>
            Upload your images, describe the moment, and Raphio builds the rest. Your first video is one click away.
          </p>
          <button onClick={onCreateClick}
            style={{ display:'inline-flex', alignItems:'center', gap:8, height:46, paddingLeft:26, paddingRight:26, borderRadius:9999, border:'none', background:`linear-gradient(135deg, ${C.terra}, ${C.terraLt})`, color:'#fff', fontSize:14, fontWeight:700, fontFamily:'inherit', cursor:'pointer', boxShadow:'0 4px 20px rgba(193,68,14,0.28)', transition:'box-shadow 0.2s ease, transform 0.15s ease', width:'fit-content' }}
            onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 8px 28px rgba(193,68,14,0.42)';e.currentTarget.style.transform='translateY(-1px)';}}
            onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 4px 20px rgba(193,68,14,0.28)';e.currentTarget.style.transform='translateY(0)';}}
          >
            Create your first video
            <ArrowRight style={{ width:16, height:16 }} />
          </button>
          <p style={{ fontSize:11, color:C.muted, marginTop:12, opacity:0.65 }}>
            No editing skills needed · Ready in minutes
          </p>
        </div>

        <div className="wes-stream">
          <div style={{ position:'absolute', top:-40, bottom:-40, left:0, right:0, display:'flex', gap:12, padding:'0 14px', alignItems:'flex-start' }}>
            <div style={{ flex:1, minWidth:0 }}>
              <StreamCol tiles={STREAM_TILES_A} reverse={false} speed={28} marginTop={0} />
            </div>
            <div className="wes-col-b" style={{ flex:1, minWidth:0 }}>
              <StreamCol tiles={STREAM_TILES_B} reverse={true} speed={36} marginTop={50} />
            </div>
          </div>
          <div style={{ position:'absolute', inset:0, zIndex:2, pointerEvents:'none', background:`linear-gradient(to right, #fff 0%, rgba(255,255,255,0.90) 10%, rgba(255,255,255,0.18) 36%, transparent 100%)` }} />
          <div style={{ position:'absolute', inset:0, zIndex:2, pointerEvents:'none', background:`linear-gradient(to bottom, #fff 0%, transparent 8%, transparent 92%, #fff 100%)` }} />
        </div>
      </div>
    </>
  );
}

// ── Tab empty state ───────────────────────────────────────────────
function TabEmptyState({ tab, styleFilter, onCreateClick, onClearFilter }) {
  const isFiltered = !!styleFilter;
  const styleName  = isFiltered ? STYLE_OPTIONS.find(s=>s.id===styleFilter)?.name : null;
  return (
    <motion.div
      initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
      transition={{ duration:0.35, ease:'easeOut' }}
      style={{ textAlign:'center', padding:'80px 24px', display:'flex', flexDirection:'column', alignItems:'center' }}
    >
      <div style={{ width:60, height:60, borderRadius:16, marginBottom:18, background:'rgba(193,68,14,0.07)', border:'1px solid rgba(193,68,14,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Video style={{ width:24, height:24, color:C.terra, opacity:0.65 }} />
      </div>
      <h3 style={{ fontSize:16, fontWeight:700, color:C.dark, marginBottom:8, letterSpacing:'-0.01em' }}>
        {isFiltered ? `No ${styleName} videos` : tab==='completed' ? 'No finished videos yet' : 'Nothing in progress'}
      </h3>
      <p style={{ fontSize:14, color:C.muted, marginBottom:28, maxWidth:280, lineHeight:1.65 }}>
        {isFiltered
          ? `You haven't made any ${styleName} videos yet.`
          : tab==='completed'
            ? 'Completed videos will appear here once you finish creating.'
            : 'Ready to start something new?'}
      </p>
      {isFiltered ? (
        <button onClick={onClearFilter} style={{
          height:42, paddingLeft:22, paddingRight:22,
          borderRadius:9999, border:`1px solid ${C.border}`,
          background:'#fff', fontSize:13, fontWeight:600,
          color:C.dark, fontFamily:'inherit', cursor:'pointer',
        }}>Clear filter</button>
      ) : (
        <button onClick={onCreateClick} style={{
          display:'flex', alignItems:'center', gap:6,
          height:42, paddingLeft:22, paddingRight:22,
          borderRadius:9999, border:'none',
          background:`linear-gradient(135deg, ${C.terra}, ${C.terraLt})`,
          color:'#fff', fontSize:13, fontWeight:700, fontFamily:'inherit',
          cursor:'pointer', boxShadow:'0 4px 16px rgba(193,68,14,0.28)',
          transition:'box-shadow 0.2s ease, transform 0.15s ease',
        }}
          onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 6px 22px rgba(193,68,14,0.38)';e.currentTarget.style.transform='translateY(-1px)';}}
          onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 4px 16px rgba(193,68,14,0.28)';e.currentTarget.style.transform='translateY(0)';}}
        >
          <Plus style={{ width:15, height:15 }} />
          {tab==='completed' ? 'Create your first video' : 'Start a new video'}
        </button>
      )}
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function MyVideosPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [activeTab,       setActiveTab]       = useState("completed");
  const [sessions,        setSessions]        = useState([]);
  const [completedTotal,  setCompletedTotal]  = useState(0);
  const [inProgressTotal, setInProgressTotal] = useState(0);
  const [page,            setPage]            = useState(1);
  const [loading,         setLoading]         = useState(true);
  const [isNewUser,       setIsNewUser]       = useState(false);
  const [checkedNew,      setCheckedNew]      = useState(false);
  const [resumeSession,   setResumeSession]   = useState(null);
  const [viewMode,        setViewMode]        = useState("grid");
  const [sort,            setSort]            = useState("newest");
  const [styleFilter,     setStyleFilter]     = useState(null);

  const total      = activeTab==='completed' ? completedTotal : inProgressTotal;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const processed  = sortAndFilter(sessions, sort, styleFilter);
  const hasVideos  = !loading && processed.length > 0;

  useEffect(() => {
    async function bootstrap() {
      try {
        const [comp, inProg] = await Promise.all([
          listSessions({ status:'completed',   limit:1, offset:0 }),
          listSessions({ status:'in-progress', limit:1, offset:0 }),
        ]);
        setCompletedTotal(comp.total);
        setInProgressTotal(inProg.total);
        setIsNewUser(comp.total===0 && inProg.total===0);
        if (inProg.data?.[0]) setResumeSession(inProg.data[0]);
      } catch { /* silent */ } finally {
        setCheckedNew(true);
      }
    }
    bootstrap();
  }, []);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listSessions({
        status: activeTab, limit: PAGE_SIZE, offset: (page-1) * PAGE_SIZE,
      });
      setSessions(result.data);
      if (activeTab==='completed')   setCompletedTotal(result.total);
      if (activeTab==='in-progress') setInProgressTotal(result.total);
    } catch {
      toast.error("Failed to load videos");
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    if (checkedNew && !isNewUser) fetchSessions();
  }, [fetchSessions, checkedNew, isNewUser]);

  // First-run onboarding tour for users who just signed up (no videos yet).
  // Runs once (persisted), after the welcome state + header have settled. On
  // mobile the tour opens/closes the nav drawer itself (see myVideosTour.js).
  const myVideosTour = useStepTour(TOUR_KEYS.myVideos, startMyVideosTour, {
    enabled: checkedNew && isNewUser,
    delay: 650,
    isMobile,
  });

  const handleTabChange = tab => { setActiveTab(tab); setPage(1); setStyleFilter(null); };
  const handleCardClick = session => {
    if (["COMPLETED","EDITING"].includes(session.stage)) navigate(`/video/${session.id}`);
    // Resume by the session's OWN pipeline mode, Creator otherwise picks the
    // last-selected (localStorage) mode and renders the wrong pipeline.
    else navigate(`/create?session=${session.id}&mode=${session.pipelineMode || 'image'}`);
  };

  return (
    <div className="font-figtree min-h-full" style={{ background:C.bg }}>
      <style>{`
        .mvp-wrap { max-width:1100px; margin:0 auto; padding:36px 24px; }
        .mvp-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:16px; gap:12px; flex-wrap:wrap; }
        .mvp-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:20px; }
        @media (max-width:520px) { .mvp-wrap { padding:20px 16px; } .mvp-header { margin-bottom:12px; } .mvp-controls { width:100%; } .mvp-grid { grid-template-columns:repeat(2, 1fr); gap:12px; } }
      `}</style>
      <div className="mvp-wrap">

        {/* ── Header ── */}
        <div className="mvp-header">
          <h1 style={{ fontSize:24, fontWeight:800, color:C.dark, letterSpacing:'-0.02em' }}>
            My Videos
          </h1>
          <div className="mvp-controls" style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            {/* Sort + view toggle only shown when user has videos */}
            {!isNewUser && checkedNew && (<>
              <SortDropdown value={sort} onChange={setSort} />
              <div style={{ display:'flex', borderRadius:9999, border:`1px solid ${C.border}`, overflow:'hidden', background:'#fff' }}>
                {[{mode:'grid',Icon:LayoutGrid},{mode:'list',Icon:List}].map(({mode,Icon})=>(
                  <button key={mode} onClick={()=>setViewMode(mode)} style={{ width:34, height:34, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', background:viewMode===mode?'rgba(193,68,14,0.08)':'transparent', transition:'background 0.15s ease' }}>
                    <Icon style={{ width:15, height:15, color:viewMode===mode?C.terra:C.muted }} />
                  </button>
                ))}
              </div>
            </>)}
            <button data-tour="mv-new" onClick={()=>navigate('/create')} style={{
              display:'flex', alignItems:'center', gap:6, marginLeft:'auto',
              height:38, paddingLeft:18, paddingRight:18,
              borderRadius:9999, border:'none',
              background:`linear-gradient(135deg, ${C.terra}, ${C.terraLt})`,
              color:'#fff', fontSize:13, fontWeight:700, fontFamily:'inherit',
              cursor:'pointer', boxShadow:'0 4px 14px rgba(193,68,14,0.26)',
              transition:'box-shadow 0.2s ease, transform 0.15s ease',
            }}
              onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 6px 20px rgba(193,68,14,0.38)';e.currentTarget.style.transform='translateY(-1px)';}}
              onMouseLeave={e=>{e.currentTarget.style.boxShadow='0 4px 14px rgba(193,68,14,0.26)';e.currentTarget.style.transform='translateY(0)';}}
            >
              <Plus style={{ width:15, height:15 }} />
              New video
            </button>
          </div>
        </div>

        {/* ── Resume banner, always reserves 60px of space ── */}
        {checkedNew && (
          <ResumeBanner
            session={resumeSession}
            onClick={() => resumeSession && handleCardClick(resumeSession)}
            visible={!isNewUser && activeTab==='completed'}
            isNewUser={isNewUser}
          />
        )}

        {/* ── Tabs with counts ── */}
        <div data-tour="mv-tabs" style={{ display:'flex', borderBottom:'1.5px solid rgba(45,34,53,0.10)', marginBottom:20 }}>
          {[
            { key:'completed',   label:'Completed',   count:completedTotal   },
            { key:'in-progress', label:'In Progress',  count:inProgressTotal  },
          ].map(({ key, label, count }) => (
            <button key={key} onClick={()=>handleTabChange(key)} style={{
              display:'flex', alignItems:'center', gap:7,
              paddingBottom:12, paddingLeft:4, paddingRight:4, marginRight:20,
              fontSize:14, fontWeight:700, fontFamily:'inherit',
              background:'transparent', border:'none',
              borderBottom: activeTab===key?`2px solid ${C.terra}`:'2px solid transparent',
              marginBottom:-1.5,
              color: activeTab===key?C.dark:C.muted,
              cursor:'pointer', transition:'color 0.15s ease, border-color 0.15s ease',
            }}>
              {label}
              <span style={{
                fontSize:11, fontWeight:700,
                padding:'2px 7px', borderRadius:20,
                background: activeTab===key?'rgba(193,68,14,0.10)':'rgba(45,34,53,0.06)',
                color: activeTab===key?C.terra:C.muted,
                transition:'background 0.15s ease, color 0.15s ease',
              }}>
                {checkedNew ? count : '-'}
              </span>
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <AnimatePresence mode="wait">

          {/* Case 1: New user */}
          {checkedNew && isNewUser && (
            <motion.div key="welcome" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:0.35, ease:'easeOut' }}>
              <WelcomeEmptyState
                username={user?.username || user?.email}
                onCreateClick={() => navigate('/create')}
              />
            </motion.div>
          )}

          {/* Case 2: Loading */}
          {checkedNew && !isNewUser && loading && (
            <motion.div key="skeleton" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
              {viewMode==='grid' ? (
                <div className="mvp-grid">
                  {Array.from({ length:6 }).map((_,i)=><SkeletonCard key={i} />)}
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {Array.from({ length:6 }).map((_,i)=><SkeletonCard key={i} list />)}
                </div>
              )}
            </motion.div>
          )}

          {/* Case 3: Returning user, empty tab */}
          {checkedNew && !isNewUser && !loading && !hasVideos && (
            <TabEmptyState
              tab={activeTab}
              styleFilter={styleFilter}
              onCreateClick={() => navigate('/create')}
              onClearFilter={() => setStyleFilter(null)}
            />
          )}

          {/* Case 4: Has videos */}
          {checkedNew && !isNewUser && !loading && hasVideos && (
            <motion.div
              key={`${activeTab}-${page}-${viewMode}-${sort}-${styleFilter}`}
              initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
              exit={{ opacity:0 }} transition={{ duration:0.22, ease:'easeOut' }}
            >
              {sessions.length > 0 && (
                <StyleFilterChips sessions={sessions} activeStyle={styleFilter} onChange={setStyleFilter} />
              )}
              {viewMode==='grid' ? (
                <div className="mvp-grid">
                  {processed.map(session => (
                    <VideoCard key={session.id} session={session} onClick={()=>handleCardClick(session)} />
                  ))}
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {processed.map(session => (
                    <VideoListRow key={session.id} session={session} onClick={()=>handleCardClick(session)} />
                  ))}
                </div>
              )}
              <Pagination page={page} totalPages={totalPages} onPrev={()=>setPage(p=>p-1)} onNext={()=>setPage(p=>p+1)} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Help FAB: replays the tour on demand (shared HelpFab component). */}
      <HelpFab onClick={myVideosTour.replay} />
    </div>
  );
}
