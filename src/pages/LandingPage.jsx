import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, Play, Sparkles, Upload, Wand2, Mail, X, MapPin } from "lucide-react";
import { Infinity as InfinityIcon, ShieldCheck, Clock, CheckCircle, XCircle, Zap, Layers, Crown } from 'lucide-react';
import { useAuth } from "@/hooks/useAuth.jsx";
import { useIsMobile } from "@/hooks/useMediaQuery";
import brainImg from "@/assets/brain.png";
import scene1Img from "@/assets/scene-1.png";
import scene2Img from "@/assets/scene-2.png";
import scene3Img from "@/assets/scene-3.jpg";
import scene4Img from "@/assets/scene-4.png";
import scene5Img from "@/assets/scene-5.png";

const C = {
  bg:      '#F5F0EB',
  bgAlt:   '#EDE8E2',
  dark:    '#1C1917',
  terra:   '#C1440E',
  terraLt: '#E8603C',
  muted:   '#7A6A62',
  faint:   '#DDD6CC',
  white:   '#FFFAF7',
};

// ── Hero video ──────────────────────────────────────────────────────
const HERO_VIDEO_URL = 'https://pub-130d5201a986450fa0c5297fa3bc461f.r2.dev/202606181832.mp4';

function PricingButton({ tier, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full rounded-xl py-3 text-sm font-bold"
      style={{
        transition: 'background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease',
        transform: hovered ? 'scale(1.02)' : 'scale(1)',
        ...(tier.popular
          ? {
              background: hovered
                ? 'linear-gradient(135deg, #CE5520, #E8603C)'
                : `linear-gradient(135deg, #C1440E, #E8603C)`,
              color: '#fff',
              border: 'none',
              boxShadow: '0 4px 16px rgba(193,68,14,0.18)',
            }
          : tier.price === 0
          ? {
              background: hovered ? '#EDE8E2' : '#F0EAE5',
              color: '#2C2420',
              border: '1.5px solid rgba(193,68,14,0.12)',
            }
          : {
              background: hovered ? 'rgba(193,68,14,0.06)' : '#fff',
              color: '#C1440E',
              border: '1.5px solid rgba(193,68,14,0.28)',
            }
        ),
      }}
    >
      {tier.cta}
    </button>
  );
}

// ── Scroll-driven word reveal ─────────────────────────────────────
function ScrollRevealText({ children, className, style, wordStyle, mutedColor = 'rgba(28,25,23,0.18)' }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'start 0.25'] });

  const words = useMemo(() => {
    if (typeof children !== 'string') return null;
    return children.split(' ');
  }, [children]);

  if (!words) return <span className={className} style={style}>{children}</span>;

  return (
    <span ref={ref} className={className} style={{ ...style, display: 'block' }}>
      {words.map((word, i) => {
        const start = i / words.length;
        const end = (i + 1) / words.length;
        return (
          <ScrollWord
            key={i}
            word={word}
            scrollYProgress={scrollYProgress}
            start={start}
            end={end}
            targetColor={wordStyle?.color || style?.color || C.dark}
            mutedColor={mutedColor}
          />
        );
      })}
    </span>
  );
}

function ScrollWord({ word, scrollYProgress, start, end, targetColor, mutedColor }) {
  const color = useTransform(scrollYProgress, [start, end], [mutedColor, targetColor]);
  return (
    <motion.span style={{ color, display: 'inline-block', marginRight: '0.28em' }}>
      {word}
    </motion.span>
  );
}

// ── Start-mode tabs: the three ways to begin a video ────────────────
// `id` matches the pipeline mode keys in src/lib/pipelineMode.js, so a
// tab's "start" action routes straight into the matching Creator wizard.
const START_MODES = [
  {
    id: 'prompt',
    icon: Sparkles,
    title: 'Start with a prompt',
    provide: 'Describe your idea in a sentence or two.',
    result: 'We generate every scene — no photos needed.',
  },
  {
    id: 'image',
    icon: Upload,
    title: 'Start with your photos',
    provide: 'Upload the photos you already have.',
    result: 'We turn them into a narrated, styled video.',
  },
  {
    id: 'references',
    icon: Wand2,
    title: 'Start with a reference',
    provide: 'Share a photo or video whose style you like.',
    result: 'We match that style for your video.',
  },
];

const OUTPUT_DETAILS = ['36+ natural voices', 'Cinematic transitions', 'Done in minutes'];

// Real scene stills (not CSS gradients) - the same five images used across
// every mode's preview so the demo shows actual output quality, not a
// placeholder swatch. Fallback colors below only show if an image 404s.
const SCENES = [
  { src: scene1Img, fallback: '#ffe2c6' },
  { src: scene2Img, fallback: '#fd996a' },
  { src: scene3Img, fallback: '#eed6b7' },
  { src: scene4Img, fallback: '#ffceae' },
  { src: scene5Img, fallback: '#fde2c9' },
];

// The one beat every mode shares: after the mode-specific input, all three
// paths land on the same four choices before rendering starts. Identical
// copy/timing in all three modes is the point - see SettingsBeat below.
const SETTINGS_BEAT = [
  { label: 'Style: Cinematic' },
  { label: '16:9' },
  { label: '30s' },
  { label: 'Voice: Anna' },
];
const SETTINGS_BEAT_COPY = 'Same simple choices, whichever way you start';
const SETTINGS_FIRST_DELAY = 150;
const SETTINGS_STEP = 300;
const SETTINGS_BEAT_MS = 1500;

// Per-mode input-animation length - how long each mode's own visual plays
// before the shared settings beat takes over. Kept as plain constants
// (rather than derived) so the parent's stage timers and each visual's own
// internal timers can't drift apart.
const PROMPT_TEXT = "A rainy morning, the first pour of the day at our little corner café.";
const PROMPT_TYPE_START = 300;
const PROMPT_TYPE_SPEED = 22;
const PROMPT_INPUT_MS = PROMPT_TYPE_START + PROMPT_TEXT.length * PROMPT_TYPE_SPEED + 550;

const PHOTO_START = 260;
const PHOTO_STAGGER = 110;
const PHOTOS_INPUT_MS = PHOTO_START + (SCENES.length - 1) * PHOTO_STAGGER + 900;

const REF_SHOW_AT = 300;
const REF_WASH_START = 850;
const REF_WASH_STAGGER = 260;
const REFERENCE_INPUT_MS = REF_WASH_START + (SCENES.length - 1) * REF_WASH_STAGGER + 700;

// The finale needs to feel like a moment, not a status pill - give it real
// time on screen before the next tab auto-selects.
const PAYOFF_HOLD_MS = 2700;
const AUTO_CYCLE_MS = Math.max(PROMPT_INPUT_MS, PHOTOS_INPUT_MS, REFERENCE_INPUT_MS) + SETTINGS_BEAT_MS + PAYOFF_HOLD_MS;

// Stage-aware status line shown in the panel header - a small nod to the
// legacy section's per-step status text ("Render complete · HD 1080p").
const STAGE_STATUS = {
  prompt: 'Writing your story…',
  image: 'Matching your photos…',
  references: 'Matching color & style…',
};
const SETTINGS_STATUS = 'Choosing your settings…';
const PAYOFF_STATUS = 'Render complete · HD 1080p';

// Each visual sizes to its own content rather than sharing one fixed height -
// a two-row photo grid needs more room than a single timeline row. The
// panel animates (via the `layout` prop below) between these on swap
// instead of jumping or reserving dead space for the tallest one.
const PROMPT_VISUAL_HEIGHT = 300;
const PHOTOS_VISUAL_HEIGHT = 340;
const REFERENCE_VISUAL_HEIGHT = 260;
const PAYOFF_VISUAL_HEIGHT = 320;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

// Selectable tab: a slimmer, quieter control than the old brochure card -
// the live preview now carries the "what happens" detail, so the tab just
// needs to identify the path and let you pick it.
function ModeTab({ mode, active, onClick, tabId, panelId }) {
  const Icon = mode.icon;
  return (
    <button
      type="button"
      id={tabId}
      role="tab"
      aria-selected={active}
      aria-controls={panelId}
      onClick={onClick}
      className="relative w-full sm:flex-1 sm:min-w-0 text-left flex items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#C1440E]"
      style={{
        background: active ? C.white : 'transparent',
        border: `1px solid ${active ? 'rgba(193,68,14,0.35)' : C.faint}`,
        borderRadius: 16, cursor: 'pointer',
        boxShadow: active ? '0 10px 26px rgba(193,68,14,0.14)' : 'none',
        transition: 'background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 11, flexShrink: 0,
        background: active ? `linear-gradient(135deg,${C.terra},${C.terraLt})` : 'rgba(193,68,14,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.2s ease',
      }}>
        <Icon style={{ width: 17, height: 17, color: active ? '#fff' : C.terra }} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: C.dark }}>{mode.title}</p>
        <p className="text-xs mt-0.5 truncate" style={{ color: C.muted, lineHeight: 1.4 }}>{mode.provide}</p>
      </div>
      {active && (
        <motion.div layoutId="modeTabIndicator" className="absolute left-3 right-3 -bottom-px" style={{ height: 2, borderRadius: 99, background: `linear-gradient(90deg,${C.terra},${C.terraLt})` }} />
      )}
    </button>
  );
}

// The settings beat: a bottom sheet that slides up over whichever mode
// visual is currently showing - literally the same component/props in all
// three modes, which is the point (every path lands on the same choices).
function SettingsBeat({ show, selected, animated = true }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="settings-beat"
          initial={animated ? { y: 14, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          exit={animated ? { y: 14, opacity: 0 } : { opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="absolute left-0 right-0 bottom-0 px-4 py-3 sm:px-5 rounded-b-2xl"
          style={{ background: 'rgba(10,9,8,0.94)', borderTop: '1px solid rgba(232,96,60,0.18)', backdropFilter: 'blur(6px)' }}
        >
          <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', marginBottom: 8 }}>
            {SETTINGS_BEAT_COPY}
          </p>
          <div className="flex flex-wrap gap-1.5" aria-hidden="true">
            {SETTINGS_BEAT.map((chip, i) => {
              const isSelected = selected > i;
              return (
                <motion.div
                  key={chip.label}
                  animate={{
                    background: isSelected ? 'rgba(193,68,14,0.16)' : 'rgba(255,255,255,0.04)',
                    borderColor: isSelected ? 'rgba(232,96,60,0.5)' : 'rgba(255,255,255,0.14)',
                    color: isSelected ? '#fff' : 'rgba(255,255,255,0.4)',
                  }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg"
                  style={{ borderWidth: 1, borderStyle: 'solid' }}
                >
                  <motion.span
                    initial={false}
                    animate={{ scale: isSelected ? 1 : 0, opacity: isSelected ? 1 : 0, width: isSelected ? 11 : 0 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{ display: 'inline-flex', overflow: 'hidden' }}
                  >
                    <CheckCircle style={{ width: 11, height: 11, color: '#4CAF50', flexShrink: 0 }} />
                  </motion.span>
                  {chip.label}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Mode 1: typewriter prompt + orbiting-word brain canvas ──────────
// Adapted from HowItWorksLegacy's DescribeVisual: same brain.png + canvas
// diagram, but the typewriter runs once (not an infinite type/delete loop)
// since this now hands off to the settings beat instead of looping forever.
function PromptVisual({ isMobile }) {
  const twRef = useRef(null);
  const cursorRef = useRef(null);
  const canvasRef = useRef(null);
  const [tagsShown, setTagsShown] = useState(false);

  useEffect(() => {
    let i = 0, timer;
    const tick = () => {
      i++;
      if (twRef.current) twRef.current.textContent = PROMPT_TEXT.slice(0, i);
      if (i < PROMPT_TEXT.length) timer = setTimeout(tick, PROMPT_TYPE_SPEED);
      else setTagsShown(true);
    };
    timer = setTimeout(tick, PROMPT_TYPE_START);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const parent = canvas.parentElement;
    const W = parent.clientWidth, H = parent.clientHeight;
    canvas.width = W; canvas.height = H;

    // On mobile the card is full-width, so centre the brain (0.5) and shrink
    // it + the word orbit so it doesn't overflow the narrower canvas.
    const cx = W * (isMobile ? 0.5 : 0.62), cy = H * (isMobile ? 0.5 : 0.46);
    const lineEndX = W * 0.04, lineEndY = cy;
    const WORD_R = isMobile ? 68 : 100;

    const img = new Image();
    img.src = brainImg;

    const WORDS = ['adventure', 'cinematic', 'emotional core', 'character arc', 'visual tone', 'story', 'journey', 'memories'];
    const wordAngles = WORDS.map((_, i) => (i / WORDS.length) * Math.PI * 2);

    const drawBrain = (frame) => {
      if (!img.complete || !img.naturalWidth) return;
      const pulse = Math.sin(frame * 0.04) * 3;
      const size = (isMobile ? 90 : 128) + pulse;
      ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
    };

    const getPos = (lineIdx, t) => {
      const arcH = 36;
      if (lineIdx === 0) return { x: cx + (lineEndX - cx) * t, y: cy + (lineEndY - cy) * t };
      const sign = lineIdx === 1 ? -1 : 1;
      const midX = (cx + lineEndX) / 2;
      const mt = 1 - t;
      return {
        x: mt * mt * cx + 2 * mt * t * midX + t * t * lineEndX,
        y: mt * mt * cy + 2 * mt * t * (cy + sign * arcH) + t * t * lineEndY,
      };
    };

    const drawLines = () => {
      [0, 1, 2].forEach((i) => {
        ctx.beginPath();
        if (i === 0) { ctx.moveTo(cx, cy); ctx.lineTo(lineEndX, lineEndY); }
        else {
          const sign = i === 1 ? -1 : 1;
          const midX = (cx + lineEndX) / 2;
          ctx.moveTo(cx, cy);
          ctx.quadraticCurveTo(midX, cy + sign * 36, lineEndX, lineEndY);
        }
        ctx.strokeStyle = 'rgba(193,68,14,0.55)'; ctx.lineWidth = 1.4; ctx.stroke();
      });
    };

    const particles = [{ line: 0, t: 0.0, speed: 0.006 }, { line: 1, t: 0.33, speed: 0.006 }, { line: 2, t: 0.66, speed: 0.006 }];

    let frame = 0, animId;
    const draw = () => {
      animId = requestAnimationFrame(draw);
      frame++;
      ctx.clearRect(0, 0, W, H);
      drawBrain(frame);

      WORDS.forEach((word, i) => {
        const angle = wordAngles[i] + frame * 0.002;
        const wx = cx + Math.cos(angle) * WORD_R;
        const wy = cy + Math.sin(angle) * WORD_R * 0.82;
        const dx = wx - cx, dy = wy - cy, dist = Math.sqrt(dx * dx + dy * dy);
        const ex = cx + (dx / dist) * 40, ey = cy + (dy / dist) * 32;
        const endX = wx - (dx / dist) * 28, endY = wy - (dy / dist) * 28;
        ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(endX, endY);
        ctx.strokeStyle = 'rgba(193,68,14,0.55)'; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.beginPath(); ctx.arc(wx, wy, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(193,68,14,0.45)'; ctx.fill();
        const alpha = 0.55 + Math.sin(frame * 0.03 + i) * 0.2;
        ctx.font = '500 11px sans-serif';
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(word, wx, wy);
      });

      drawLines();

      particles.forEach((p) => {
        p.t += p.speed;
        if (p.t > 1) p.t = 0;
        const pos = getPos(p.line, p.t);
        const tail = getPos(p.line, Math.max(0, p.t - 0.06));
        const alpha = 0.4 + Math.sin(p.t * Math.PI) * 0.6;
        ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = `rgba(232,96,60,${alpha * 0.6})`; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.beginPath(); ctx.arc(pos.x, pos.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(232,96,60,${alpha})`; ctx.fill();
        ctx.beginPath(); ctx.arc(pos.x, pos.y, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(193,68,14,${alpha * 0.22})`; ctx.fill();
      });

      const aa = 0.4 + Math.sin(frame * 0.07) * 0.2;
      ctx.beginPath();
      ctx.moveTo(lineEndX + 20, lineEndY - 4); ctx.lineTo(lineEndX + 30, lineEndY); ctx.lineTo(lineEndX + 20, lineEndY + 4);
      ctx.strokeStyle = `rgba(193,68,14,${aa})`; ctx.lineWidth = 1.4;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    };
    // Canvas only starts once brain.png is actually decoded - if it 404s,
    // onload never fires and the canvas simply stays blank (no broken-image
    // icon), matching the legacy component's existing fallback behavior.
    img.onload = () => { draw(); };
    if (img.complete && img.naturalWidth) draw();
    return () => cancelAnimationFrame(animId);
  }, [isMobile]);

  return (
    <div className="grid" style={{ height: isMobile ? 'auto' : PROMPT_VISUAL_HEIGHT, gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
      <div style={{ display: 'flex', flexDirection: 'column', padding: isMobile ? '14px 14px 0' : 14, height: isMobile ? 'auto' : PROMPT_VISUAL_HEIGHT, minHeight: isMobile ? 150 : undefined }}>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '9px 13px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.terra, flexShrink: 0 }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.36)', letterSpacing: '0.06em' }}>DESCRIBE YOUR IDEA</span>
          </div>
          <div style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 0 }}>
            <p style={{ fontSize: 12.5, lineHeight: 1.68, color: 'rgba(255,255,255,0.76)', fontStyle: 'italic', flex: 1 }}>
              <span ref={twRef} />
              <motion.span ref={cursorRef} animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1, times: [0, 0.5, 1] }}
                style={{ display: 'inline-block', width: 2, height: 13, background: C.terra, borderRadius: 1, verticalAlign: 'middle', marginLeft: 2 }} />
            </p>
            <motion.div
              initial={false}
              animate={{ opacity: tagsShown ? 1 : 0, y: tagsShown ? 0 : 4 }}
              transition={{ duration: 0.3 }}
              style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}
            >
              {['Heartwarming', 'Family', 'Cinematic'].map((t) => (
                <span key={t} style={{ padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 600, border: '1px solid rgba(193,68,14,0.45)', background: 'rgba(193,68,14,0.12)', color: 'rgba(255,255,255,0.85)' }}>
                  {t}
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
      <div style={{ position: 'relative', overflow: 'hidden', height: isMobile ? 200 : PROMPT_VISUAL_HEIGHT }}>
        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}

// ── Mode 2: real photos scattering into a matched grid ──────────────
// Adapted from HowItWorksLegacy's PhotoGridVisual: same drop-zone + 3x2
// scattered grid of real scene stills, but driven by a timer (not
// whileInView) so it restarts reliably every time this mode is selected.
function PhotosVisual({ isMobile }) {
  const [shown, setShown] = useState(0);
  const rotations = [-2, 2.5, -1.5, 1.5, -2];

  useEffect(() => {
    const timers = [];
    for (let i = 0; i < SCENES.length; i++) {
      timers.push(setTimeout(() => setShown(i + 1), PHOTO_START + i * PHOTO_STAGGER));
    }
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="grid" style={{ height: isMobile ? 'auto' : PHOTOS_VISUAL_HEIGHT, gridTemplateColumns: isMobile ? '1fr' : '150px 1fr' }}>
      {/* Drop zone */}
      <div style={{
        borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.07)',
        borderBottom: isMobile ? '1px solid rgba(255,255,255,0.07)' : 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 9, padding: isMobile ? '18px 16px' : 16, height: isMobile ? 'auto' : PHOTOS_VISUAL_HEIGHT, position: 'relative',
      }}>
        <div style={{ position: 'absolute', inset: 10, border: '1.5px dashed rgba(193,68,14,0.35)', borderRadius: 12, pointerEvents: 'none' }} />
        <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(193,68,14,0.10)', border: '1px solid rgba(193,68,14,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Upload style={{ width: 20, height: 20, color: C.terra }} />
        </div>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 1.4 }}>
          Drag &amp; drop<br />your photos
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2, padding: '5px 12px', borderRadius: 999, background: 'rgba(193,68,14,0.10)', border: '1px solid rgba(193,68,14,0.25)' }}>
          <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
            style={{ width: 5, height: 5, borderRadius: '50%', background: '#4CAF50' }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>{shown} uploaded</span>
        </div>
      </div>

      {/* 3x2 scattered grid */}
      <div style={{ padding: isMobile ? '16px 14px 34px' : '16px 16px 34px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(2, 1fr)', gap: 11, position: 'relative', height: isMobile ? 210 : PHOTOS_VISUAL_HEIGHT }}>
        {SCENES.map((scene, i) => {
          const rot = rotations[i];
          const visible = i < shown;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.82, rotate: rot - 5 }}
              animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.82, rotate: visible ? rot : rot - 5 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              style={{ borderRadius: 12, overflow: 'hidden', border: '1.5px solid rgba(255,255,255,0.10)', position: 'relative', width: '100%', height: '100%' }}
            >
              <div style={{ position: 'absolute', inset: 0, background: scene.fallback }} />
              <img
                src={scene.src}
                alt={`Scene ${i + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', position: 'relative' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.62)', color: 'rgba(255,255,255,0.88)', fontSize: 9, fontWeight: 600, padding: '5px 8px', textAlign: 'center', letterSpacing: '0.04em' }}>
                Scene {i + 1}
              </div>
              {visible && (
                <div style={{ position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: '50%', background: '#5CB85C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fff', fontSize: 9, fontWeight: 700, lineHeight: 1 }}>✓</span>
                </div>
              )}
            </motion.div>
          );
        })}

        {/* + Add more cell */}
        <div style={{ borderRadius: 12, border: '2px dashed rgba(193,68,14,0.65)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, background: 'rgba(193,68,14,0.07)' }}>
          <span style={{ fontSize: 26, fontWeight: 700, color: 'rgba(193,68,14,0.88)', lineHeight: 1 }}>+</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(193,68,14,0.60)', letterSpacing: '0.08em' }}>ADD MORE</span>
        </div>

        {/* Progress bar - fills live as photos are matched */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden' }}>
            <motion.div animate={{ width: `${(shown / (SCENES.length * 2)) * 100}%` }} transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{ height: '100%', background: C.terra, borderRadius: 99 }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.40)', whiteSpace: 'nowrap' }}>{shown} / {SCENES.length * 2} scenes matched</span>
        </div>
      </div>
    </div>
  );
}

// ── Mode 3: reference frame + color-grade wash onto a timeline ──────
// New composition (no direct legacy equivalent): one scene is framed as
// "the reference," then the rest render into a timeline row, each washed
// briefly in the reference's tint to dramatize "we're matching this style."
function ReferenceVisual({ isMobile }) {
  const [refShown, setRefShown] = useState(false);
  const [shown, setShown] = useState(0);
  const timeline = SCENES.slice(1);

  useEffect(() => {
    const timers = [setTimeout(() => setRefShown(true), REF_SHOW_AT)];
    for (let i = 0; i < SCENES.length - 1; i++) {
      timers.push(setTimeout(() => setShown(i + 1), REF_WASH_START + i * REF_WASH_STAGGER));
    }
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="grid" style={{ height: isMobile ? 'auto' : REFERENCE_VISUAL_HEIGHT, gridTemplateColumns: isMobile ? '1fr' : '150px 1fr' }}>
      {/* Reference frame */}
      <div style={{
        borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.07)',
        borderBottom: isMobile ? '1px solid rgba(255,255,255,0.07)' : 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 10, padding: isMobile ? '18px 16px' : 16, height: isMobile ? 'auto' : REFERENCE_VISUAL_HEIGHT,
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: refShown ? 1 : 0, scale: refShown ? 1 : 0.85 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: 'relative', width: isMobile ? 92 : 104, aspectRatio: '1', borderRadius: 12, overflow: 'hidden', border: `2px solid ${C.terraLt}`, boxShadow: '0 8px 24px rgba(193,68,14,0.25)' }}
        >
          <div style={{ position: 'absolute', inset: 0, background: SCENES[0].fallback }} />
          <img
            src={SCENES[0].src}
            alt="Reference photo"
            style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative' }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div style={{ position: 'absolute', top: 5, left: 5, padding: '2px 7px', borderRadius: 999, background: 'rgba(193,68,14,0.92)', fontSize: 8, fontWeight: 700, letterSpacing: '0.06em', color: '#fff' }}>
            REFERENCE
          </div>
        </motion.div>
        <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1.5, maxWidth: 140 }}>
          Matching its color grade &amp; mood across new scenes…
        </p>
      </div>

      {/* Timeline row - each frame washed briefly in the reference's tint */}
      <div style={{ padding: isMobile ? '16px 14px 20px' : '16px 16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, height: isMobile ? 'auto' : REFERENCE_VISUAL_HEIGHT, minHeight: isMobile ? 160 : undefined }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.06em' }}>YOUR TIMELINE</span>
        <div className="flex flex-wrap gap-2" aria-hidden="true">
          {timeline.map((scene, i) => {
            const visible = i < shown;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 8 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="w-[72px] sm:w-[120px] aspect-video rounded-lg overflow-hidden relative shrink-0"
                style={{ border: '1px solid rgba(255,255,255,0.14)' }}
              >
                <div style={{ position: 'absolute', inset: 0, background: scene.fallback }} />
                <img
                  src={scene.src}
                  alt={`Scene ${i + 2}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                {/* Color-grade wash: a terracotta tint that flashes in then
                    settles out right as each frame lands, standing in for
                    "the reference's grade being applied." */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={visible ? { opacity: [0, 0.85, 0] } : { opacity: 0 }}
                  transition={{ duration: 0.6, times: [0, 0.35, 1], ease: 'easeOut' }}
                  style={{ position: 'absolute', inset: 0, background: C.terraLt, mixBlendMode: 'color', pointerEvents: 'none' }}
                />
                {visible && (
                  <div style={{ position: 'absolute', top: 4, right: 4, width: 14, height: 14, borderRadius: '50%', background: 'rgba(20,17,15,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle style={{ width: 11, height: 11, color: '#4CAF50' }} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Shared finale (all modes end here) ───────────────────────────────
// Adapted from HowItWorksLegacy's AvatarExportVisual, right panel only -
// no avatar/voice list, since the point here isn't picking a voice, it's
// the produced video landing. Meant to feel like a moment, not a status pill.
function PayoffVisual({ isMobile }) {
  const progressRef = useRef(null);
  const timeLabelRef = useRef(null);

  useEffect(() => {
    let pct = 0, id;
    const tick = () => {
      pct = Math.min(1, pct + 0.014);
      if (progressRef.current) progressRef.current.style.width = pct * 100 + '%';
      if (timeLabelRef.current) {
        const s = Math.round(pct * 34);
        timeLabelRef.current.textContent = '0:' + (s < 10 ? '0' : '') + s;
      }
      if (pct < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div style={{ height: isMobile ? 'auto' : PAYOFF_VISUAL_HEIGHT, display: 'flex', flexDirection: 'column', gap: 10, padding: isMobile ? 14 : 16 }}>
      {/* Video preview */}
      <div style={{ flex: 1, borderRadius: 12, overflow: 'hidden', border: '0.5px solid rgba(255,255,255,0.1)', position: 'relative', minHeight: isMobile ? 150 : 180, background: '#100C0A' }}>
        <img
          src={SCENES[4].src}
          alt="Video preview"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
            style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(193,68,14,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 8px rgba(193,68,14,0.15)' }}
          >
            <Play style={{ width: 17, height: 17, color: '#fff', marginLeft: 2 }} />
          </motion.div>
        </div>
        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.65)', padding: '3px 8px', borderRadius: 999 }}>
          <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}
            style={{ width: 5, height: 5, borderRadius: '50%', background: '#4CAF50' }} />
          <span style={{ fontSize: 9, fontWeight: 600, color: '#fff', letterSpacing: '0.08em' }}>LIVE OUTPUT</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden' }}>
          <div ref={progressRef} style={{ height: '100%', width: '0%', background: C.terra, borderRadius: 99 }} />
        </div>
        <span ref={timeLabelRef} style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', minWidth: 28 }}>0:00</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>/ 0:34</span>
      </div>

      {/* Download bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(193,68,14,0.08)', border: '0.5px solid rgba(193,68,14,0.3)' }}>
        <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.6 }}
          style={{ width: 6, height: 6, borderRadius: '50%', background: '#4CAF50', flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', flex: 1 }}>Video ready</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.terra }}>Download ↓</span>
      </div>
    </div>
  );
}

// The live preview: each mode's own rich visual plays, the shared settings
// beat slides up once it finishes, then the whole panel crossfades to the
// shared payoff - the finale every path converges on. Keyed by mode id in
// the parent so every tab switch remounts this fresh and restarts the cycle.
function DemoPreview({ modeId, reducedMotion, inView, isMobile }) {
  const [stage, setStage] = useState(reducedMotion ? 'payoff' : 'input');
  const [settingsSelected, setSettingsSelected] = useState(reducedMotion ? SETTINGS_BEAT.length : 0);

  useEffect(() => {
    if (reducedMotion || !inView) return undefined;
    setStage('input');
    setSettingsSelected(0);
    const timers = [];

    const inputMs = modeId === 'prompt' ? PROMPT_INPUT_MS : modeId === 'image' ? PHOTOS_INPUT_MS : REFERENCE_INPUT_MS;

    timers.push(setTimeout(() => setStage('settings'), inputMs));
    for (let s = 0; s < SETTINGS_BEAT.length; s++) {
      timers.push(setTimeout(() => setSettingsSelected(s + 1), inputMs + SETTINGS_FIRST_DELAY + s * SETTINGS_STEP));
    }
    timers.push(setTimeout(() => setStage('payoff'), inputMs + SETTINGS_BEAT_MS));

    return () => timers.forEach(clearTimeout);
  }, [modeId, reducedMotion, inView]);

  const statusText = stage === 'payoff' ? PAYOFF_STATUS : stage === 'settings' ? SETTINGS_STATUS : STAGE_STATUS[modeId];

  return (
    <div>
      <div className="flex items-center gap-2" style={{ marginBottom: 14 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4CAF50', flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>
          LIVE PREVIEW · {statusText.toUpperCase()}
        </span>
      </div>

      {/* Each visual below sizes itself to its own content (a two-row photo
          grid needs more room than a single timeline row) rather than
          sharing one fixed height with dead space in the shorter ones. */}
      <div style={{ position: 'relative' }}>
        <AnimatePresence mode="wait">
          {stage === 'payoff' ? (
            <motion.div
              key="payoff"
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <PayoffVisual isMobile={isMobile} />
            </motion.div>
          ) : (
            <motion.div
              key={`input-${modeId}`}
              initial={false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              {modeId === 'prompt' && <PromptVisual isMobile={isMobile} />}
              {modeId === 'image' && <PhotosVisual isMobile={isMobile} />}
              {modeId === 'references' && <ReferenceVisual isMobile={isMobile} />}
            </motion.div>
          )}
        </AnimatePresence>

        <SettingsBeat show={stage === 'settings' || reducedMotion} selected={settingsSelected} animated={!reducedMotion} />
      </div>
    </div>
  );
}

// ── HowItWorks: three entry points that all animate to the same output ─
function HowItWorks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const reducedMotion = usePrefersReducedMotion();
  const isMobile = useIsMobile();
  const sectionRef = useRef(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.4 });

  const [activeIndex, setActiveIndex] = useState(0);
  const [userSelected, setUserSelected] = useState(false);
  const activeMode = START_MODES[activeIndex];

  // Auto-cycle through modes once the section has entered view, until the
  // visitor picks one themselves - then it stays put.
  useEffect(() => {
    if (userSelected || reducedMotion || !inView) return undefined;
    const t = setTimeout(() => {
      setActiveIndex((i) => (i + 1) % START_MODES.length);
    }, AUTO_CYCLE_MS);
    return () => clearTimeout(t);
  }, [activeIndex, userSelected, reducedMotion, inView]);

  const selectTab = (i) => {
    setUserSelected(true);
    setActiveIndex(i);
  };

  const startAny = () => navigate(user ? `/create?mode=${activeMode.id}` : '/login');

  return (
    <section ref={sectionRef} id="how-it-works" className="py-24 px-6 font-figtree" style={{ background: C.bg }}>
      <div className="max-w-6xl w-full mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.terra }}>How it works</p>
          <h2 className="display mb-3" style={{ fontSize: 'clamp(32px,4vw,52px)', color: C.dark, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            One video. Three ways to start.
          </h2>
          <p className="text-base max-w-md mx-auto" style={{ color: C.muted }}>
            Pick whichever fits what you've got. There's no wrong choice, and nothing to configure first.
          </p>
        </div>

        {/* Mode tabs: select one to drive the preview below */}
        <div role="tablist" aria-label="Ways to start a video" className="flex flex-col gap-2 sm:flex-row sm:gap-3 mb-5">
          {START_MODES.map((mode, i) => (
            <ModeTab
              key={mode.id}
              mode={mode}
              active={i === activeIndex}
              onClick={() => selectTab(i)}
              tabId={`mode-tab-${mode.id}`}
              panelId="mode-preview-panel"
            />
          ))}
        </div>

        {/* One-line, screen-reader-friendly summary of what the active tab demonstrates */}
        <p aria-live="polite" className="text-center text-sm mb-6">
          <ArrowRight style={{ width: 12, height: 12, display: 'inline', verticalAlign: '-1px', color: C.terra, marginRight: 6 }} />
          <span style={{ color: C.muted }}>{activeMode.result}</span>
        </p>

        {/* Live preview panel - the star and closing image of the section;
            everything after it is just the CTA, so nothing competes with it. */}
        <div
          id="mode-preview-panel"
          role="tabpanel"
          aria-labelledby={`mode-tab-${activeMode.id}`}
          className="px-5 py-6 sm:px-8 sm:py-7"
          style={{
            background: 'linear-gradient(165deg, #241F1B 0%, #1C1917 55%, #17120F 100%)',
            borderRadius: 24, overflow: 'hidden',
            border: '1px solid rgba(232,96,60,0.14)',
            boxShadow: '0 30px 70px rgba(28,25,23,0.32)',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeMode.id}
              initial={reducedMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -10 }}
              transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <DemoPreview modeId={activeMode.id} reducedMotion={reducedMotion} inView={inView} isMobile={isMobile} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Closing beat: the preview already proved the output, so this is
            just the small print (what every path includes) and the ask -
            no second dark banner repeating what the panel just showed. */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center mt-10 sm:mt-12"
        >
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 mb-6">
            {OUTPUT_DETAILS.map((d, i) => (
              <span key={d} className="flex items-center gap-3 text-xs font-semibold" style={{ color: C.muted }}>
                {i > 0 && <span aria-hidden="true" style={{ width: 3, height: 3, borderRadius: '50%', background: C.faint, flexShrink: 0 }} />}
                {d}
              </span>
            ))}
          </div>

          <button
            onClick={startAny}
            className="inline-flex items-center gap-2 px-9 py-3.5 rounded-full text-base font-bold text-white transition-all duration-300"
            style={{ background: `linear-gradient(135deg,${C.terra},${C.terraLt})`, boxShadow: '0 4px 24px rgba(193,68,14,0.35)' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 40px rgba(193,68,14,0.55)'; e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 24px rgba(193,68,14,0.35)'; e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}
          >
            Make your first video
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}

// ── "See it in action": real output reel ────────────────────────
const SEE_IT_ITEMS = [
  { label: 'Travel montage', src: 'https://pub-130d5201a986450fa0c5297fa3bc461f.r2.dev/Travel_brand_ad_montage_202606181523.mp4' },
  { label: 'Product showcase', src: 'https://pub-130d5201a986450fa0c5297fa3bc461f.r2.dev/Luxury_watch_ad_Raphio_202606181523.mp4' },
  { label: 'Luxury brand ad', src: 'https://pub-130d5201a986450fa0c5297fa3bc461f.r2.dev/Perfume_bottle_rotates_Raphio_br%E2%80%A6_202606181522.mp4' },
  { label: 'Food commercial', src: 'https://pub-130d5201a986450fa0c5297fa3bc461f.r2.dev/Burger_built_Raphio_brandmark_202606181522.mp4' },
];

function ActionVideoCard({ item, onOpen }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    const video = videoRef.current;
    if (!el || !video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="flex-shrink-0 w-full sm:w-72">
      <button
        onClick={() => onOpen(item)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative w-full aspect-video rounded-2xl overflow-hidden block transition-transform duration-300"
        style={{
          background: C.white,
          border: `1px solid ${C.faint}`,
          boxShadow: '0 4px 18px rgba(28,25,23,0.08)',
          transform: hovered ? 'scale(1.03)' : 'scale(1)',
        }}
      >
        <video
          ref={videoRef}
          src={item.src}
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0 flex items-center justify-center transition-opacity duration-200"
          style={{ background: 'rgba(10,9,8,0.28)', opacity: hovered ? 1 : 0 }}
        >
          <div className="rounded-full flex items-center justify-center" style={{ width: 52, height: 52, background: 'rgba(255,250,247,0.94)' }}>
            <Play style={{ width: 20, height: 20, color: C.terra, marginLeft: 2 }} fill={C.terra} />
          </div>
        </div>
      </button>
      <p className="text-sm font-semibold mt-3 text-center" style={{ color: C.dark }}>{item.label}</p>
    </div>
  );
}

function ActionVideoModal({ item, onClose }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{ background: 'rgba(10,9,8,0.88)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="relative w-full max-w-3xl rounded-2xl overflow-hidden"
        style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <video
          ref={videoRef}
          src={item.src}
          controls
          autoPlay
          playsInline
          className="w-full h-full block"
          style={{ background: '#000' }}
        />
      </motion.div>
      <button
        onClick={onClose}
        aria-label="Close video"
        className="absolute top-5 right-5 sm:top-8 sm:right-8 flex items-center justify-center rounded-full transition-colors"
        style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.12)', color: '#fff' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
      >
        <X className="w-5 h-5" />
      </button>
    </motion.div>
  );
}

function SeeItInAction() {
  const [activeItem, setActiveItem] = useState(null);

  return (
    <section className="py-24 px-6" style={{ background: C.bg }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.terra }}>See it in action</p>
          <h2 className="display" style={{ fontSize: 'clamp(28px,4vw,44px)', color: C.dark, letterSpacing: '-0.01em', lineHeight: 1.1 }}>
            See what Raphio creates
          </h2>
          <p className="text-base mt-3" style={{ color: C.muted }}>
            Real outputs from real prompts, no editing, no post-production.
          </p>
        </div>

        <div className="hide-scrollbar grid grid-cols-1 gap-4 sm:flex sm:overflow-x-auto sm:gap-5 sm:pb-2">
          {SEE_IT_ITEMS.map((item) => (
            <ActionVideoCard key={item.label} item={item} onOpen={setActiveItem} />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {activeItem && (
          <ActionVideoModal item={activeItem} onClose={() => setActiveItem(null)} />
        )}
      </AnimatePresence>
    </section>
  );
}

// ── Contact section: unified direct action layout ───────────────
const CONTACT_ROWS = [
  { icon: Mail, label: 'Email', value: 'Contact@raphio.ai', href: 'mailto:Contact@raphio.ai' },
  { icon: MapPin, label: 'Location', value: 'Melbourne, Victoria, Australia' },
];

function ContactSection() {
  return (
    <section
      id="contact"
      className="py-20 px-6"
      style={{ background: 'rgba(193,68,14,0.03)', borderTop: '1px solid rgba(193,68,14,0.08)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto text-center"
      >
        <h2 className="display" style={{ fontSize: 'clamp(28px,4vw,42px)', color: C.dark, letterSpacing: '-0.01em', lineHeight: 1.12 }}>
          We're based in Melbourne. We actually reply.
        </h2>
        <p className="text-base mt-4" style={{ color: C.muted }}>
          No ticket queues, no chatbots. Just a small team that reads every message.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
          {CONTACT_ROWS.map((item) => {
            const Icon = item.icon;
            const Row = item.href ? 'a' : 'div';
            return (
              <Row
                key={item.label}
                {...(item.href ? { href: item.href } : {})}
                className="flex items-center gap-4"
              >
                <span
                  className="flex items-center justify-center rounded-full flex-shrink-0"
                  style={{ width: 40, height: 40, background: 'rgba(193,68,14,0.10)' }}
                >
                  <Icon style={{ width: 17, height: 17, color: C.terra }} />
                </span>
                <span className="text-left">
                  <span className="block text-[11px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>{item.label}</span>
                  <span className="block text-base font-bold" style={{ color: C.dark }}>
                    {item.value}
                  </span>
                </span>
              </Row>
            );
          })}
        </div>

        <div className="mt-10">
          <a
            href="mailto:Contact@raphio.ai"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-bold text-white transition-all duration-300"
            style={{
              background: `linear-gradient(135deg,${C.terra},${C.terraLt})`,
              boxShadow: '0 4px 16px rgba(193,68,14,0.30)'
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(193,68,14,0.45)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(193,68,14,0.30)'; }}
          >
            Get in touch
          </a>
        </div>
      </motion.div>
    </section>
  );
}

// ── Primary View Component ───────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const goToAppOrLogin = () => navigate(user ? '/videos' : '/login');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="min-h-screen font-figtree" style={{ background: C.bg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,750&display=swap');
        .display { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 750; }
        .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-200" style={{
        background: scrolled ? 'rgba(245,240,235,0.92)' : 'linear-gradient(180deg, rgba(10,9,8,0.46) 0%, rgba(10,9,8,0.20) 70%, rgba(10,9,8,0) 100%)',
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
      }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button onClick={() => scrollTo('hero')} className="hover:opacity-80 transition-opacity">
              <img src={scrolled ? '/Logo.svg' : '/Logo-Light.svg'} alt="Raphio" className="h-7" />
            </button>
            <nav className="hidden sm:flex items-center gap-1.5">
              {[['How it works','how-it-works'],['Pricing','pricing'],['Contact','contact']].map(([label, id]) => (
                <button key={id} onClick={() => scrollTo(id)}
                  className="px-3.5 py-2 text-sm font-bold"
                  style={{
                    color: scrolled ? C.dark : 'rgba(255,250,247,0.92)',
                    textShadow: scrolled ? 'none' : '0 1px 6px rgba(10,9,8,0.35)',
                    backgroundImage: 'linear-gradient(currentColor, currentColor)',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center bottom 7px',
                    backgroundSize: '0% 2px',
                    transition: 'background-size 0.28s cubic-bezier(0.22,1,0.36,1), color 0.2s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = scrolled ? C.terra : '#FFD9C7'; e.currentTarget.style.backgroundSize = '100% 2px'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = scrolled ? C.dark : 'rgba(255,250,247,0.92)'; e.currentTarget.style.backgroundSize = '0% 2px'; }}
                >{label}</button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={goToAppOrLogin}
              className="px-3.5 py-2 text-sm font-bold min-h-[44px] flex items-center"
              style={{
                color: scrolled ? C.dark : 'rgba(255,250,247,0.92)',
                textShadow: scrolled ? 'none' : '0 1px 6px rgba(10,9,8,0.35)',
                backgroundImage: 'linear-gradient(currentColor, currentColor)',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center bottom 11px',
                backgroundSize: '0% 2px',
                transition: 'background-size 0.28s cubic-bezier(0.22,1,0.36,1), color 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = scrolled ? C.terra : '#FFD9C7'; e.currentTarget.style.backgroundSize = '100% 2px'; }}
              onMouseLeave={e => { e.currentTarget.style.color = scrolled ? C.dark : 'rgba(255,250,247,0.92)'; e.currentTarget.style.backgroundSize = '0% 2px'; }}
            >Log in</button>
            <button onClick={goToAppOrLogin}
              className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold transition-all min-h-[44px]"
              style={{
                background: scrolled ? C.white : 'transparent',
                color: scrolled ? C.terra : '#FFFAF7',
                border: `1.5px solid ${scrolled ? C.terra : 'rgba(255,250,247,0.55)'}`,
              }}
              onMouseEnter={e => { e.currentTarget.style.background=`linear-gradient(135deg,${C.terra},${C.terraLt})`; e.currentTarget.style.color='#fff'; e.currentTarget.style.borderColor='transparent'; e.currentTarget.style.boxShadow=`0 4px 16px rgba(193,68,14,0.30)`; }}
              onMouseLeave={e => { e.currentTarget.style.background = scrolled ? C.white : 'transparent'; e.currentTarget.style.color = scrolled ? C.terra : '#FFFAF7'; e.currentTarget.style.borderColor = scrolled ? C.terra : 'rgba(255,250,247,0.55)'; e.currentTarget.style.boxShadow='none'; }}
            >Get started <ArrowRight className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </header>

      {/* Hero: fullscreen cinematic video */}
      <section id="hero" className="relative w-full overflow-hidden" style={{ height: '100vh', minHeight: 600, background: '#0A0908' }}>
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/hero-poster.jpg"
          src={HERO_VIDEO_URL}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Dark overlay for headline legibility, tuned so the footage still reads as vivid underneath */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, rgba(10,9,8,0.55) 0%, rgba(10,9,8,0.42) 45%, rgba(10,9,8,0.62) 100%)' }}
        />

        {/* Extra vignette centered on the text block, so contrast holds even over bright/busy footage */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 62% 58% at 50% 48%, rgba(10,9,8,0.38) 0%, rgba(10,9,8,0.12) 65%, rgba(10,9,8,0) 100%)' }}
        />

        {/* Headline content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <motion.h1
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease: [0.22,1,0.36,1] }}
            className="display leading-none max-w-4xl"
            style={{ fontSize: 'clamp(38px,6vw,72px)', color: '#FFFAF7', letterSpacing: '-0.01em', lineHeight: 1.08, textShadow: '0 1px 3px rgba(0,0,0,0.55), 0 4px 28px rgba(0,0,0,0.45)' }}
          >
            AI videos that tells the{' '}
            <span style={{ color: C.terraLt }}>whole story</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.26 }}
            className="mt-5 max-w-lg text-lg leading-relaxed"
            style={{ color: 'rgba(255,250,247,0.94)', textShadow: '0 1px 3px rgba(0,0,0,0.5), 0 2px 14px rgba(0,0,0,0.4)' }}
          >
            Real narrative videos that are minutes long, not just 8-second clips. Built for business owners and creators with a story to tell.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}
            className="mt-9 flex flex-col items-center gap-3"
          >
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 px-10 py-4 rounded-full text-base font-bold text-white transition-all duration-300"
              style={{ background: `linear-gradient(135deg,${C.terra},${C.terraLt})`, boxShadow: '0 4px 24px rgba(193,68,14,0.35)' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 40px rgba(193,68,14,0.55)'; e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 24px rgba(193,68,14,0.35)'; e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}
            >
              Try it free
              <ArrowRight className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium" style={{ color: 'rgba(255,250,247,0.68)', textShadow: '0 1px 3px rgba(0,0,0,0.5), 0 2px 10px rgba(0,0,0,0.4)' }}>Free to start · No credit card · Ready in minutes</span>
          </motion.div>

        </div>
      </section>

      {/* Hero footnote: closes out the hero's dark band on its own now that
          the stats strip below it is gone, so it needs enough weight to read
          as a deliberate close rather than a leftover sliver before the
          cream section starts */}
      <div className="py-12 px-6 text-center" style={{ background: '#0A0908' }}>
        <p className="text-sm font-semibold" style={{ color: 'rgba(245,240,235,0.55)' }}>
          All videos above were made with Raphio. They are real outputs, with no post-production
        </p>
      </div>

      {/* How It Works Layer Component
          Note: the capability stats formerly shown in the dark strip here
          (36+ voices, multiple input modes) are being moved into this
          section in a follow-up pass — not dropped. */}
      <HowItWorks />

      {/* See it in action */}
      <SeeItInAction />

      {/* Scroll-reveal text section */}
      <section style={{ background: C.bg, padding: '120px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center'}}>
          <ScrollRevealText
            className="display"
            style={{ fontSize: 'clamp(32px,4.5vw,70px)', letterSpacing: '0.01em', lineHeight: 1.15, color: C.dark }}
            mutedColor="rgba(28,25,23,0.15)"
          >
            If you have photos and a story, Raphio does the rest, turning everyday moments into videos worth sharing.
          </ScrollRevealText>
          <div style={{ marginTop: 40, height: 2, width:164, borderRadius: 99, background: C.terra, margin:' 40px auto 0'}}/>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-28 px-6 font-figtree" style={{ background: 'linear-gradient(160deg, #FDF6F0 0%, #FDFAF8 50%, #F7F4FB 100%)' }}>
        <div className="max-w-5xl w-full mx-auto">

          {/* Header */}
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.terra }}>Pricing</p>
            <h2 className="display mb-3" style={{ fontSize: 'clamp(32px,4vw,52px)', color: C.dark, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              Simple, transparent<br />credit packs.
            </h2>
            <p className="text-base max-w-md mx-auto" style={{ color: C.muted }}>
              No subscription hooks. Buy the credits you need, create whenever inspiration strikes.
            </p>
          </div>

          {/* Trust strip */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {[
              { icon: InfinityIcon, text: 'Credits never expire' },
              { icon: Clock,       text: 'No subscription required' },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <div key={t.text} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{ background: '#fff', border: '1px solid rgba(193,68,14,0.12)' }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: C.terra }} />
                  <span className="text-xs font-semibold" style={{ color: '#2C2420' }}>{t.text}</span>
                </div>
              );
            })}
          </div>

          {/* Pricing cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 items-stretch">
            {[
              {
                id: 'free', label: 'Free', price: 0, credits: 3, save: null,
                icon: Sparkles, cta: 'Start Free', popular: false,
                features: [
                  { text: '1 short video (15s)',   ok: true  },
                ],
              },
              {
                id: 'starter', label: 'Starter', price: 29, credits: 6, 
                icon: Zap, cta: 'Get Starter pack', popular: false,
                features: [
                  { text: 'Up to 2 short videos(15s each)', ok: true  },
                ],
              },
              {
                id: 'creator', label: 'Creator', price: 55, credits: 12, save: 'Save 8%',
                icon: Layers, cta: 'Get Creator Pack', popular: true,
                features: [
                  { text: 'Up to 2 medium videos(30s each)',  ok: true  },
                ],
              },
              {
                id: 'studio', label: 'Studio', price: 99, credits: 24, save: 'Save 17%',
                icon: Crown, cta: 'Get Studio Pack', popular: false,
                features: [
                  { text: 'Up to 2 long videos(60s each)', ok: true },
                ],
              },
            ].map((tier, i) => {
              const Icon = tier.icon;
              return (
                <motion.div key={tier.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  className="relative flex flex-col rounded-3xl h-full"
                  style={{
                    background: '#FFFAF7',
                    marginTop: '16px',
                    border: tier.popular ? `2px solid ${C.terra}` : '1.5px solid rgba(193,68,14,0.12)',
                    boxShadow: tier.popular ? '0 8px 32px rgba(193,68,14,0.18)' : '0 4px 16px rgba(193,68,14,0.04)',
                    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                  }}
                  whileHover={{
                    y: -5,
                    boxShadow: tier.popular
                      ? '0 24px 56px rgba(193,68,14,0.22)'
                      : '0 16px 40px rgba(193,68,14,0.10)',
                  }}
                >
                  {tier.popular && (
                    <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2 z-10 whitespace-nowrap">
                      <span className="text-xs font-extrabold px-4 py-1.5 text-white uppercase tracking-wider"
                        style={{ background: `linear-gradient(90deg, ${C.terra}, #E8603C)`, borderRadius: 999, boxShadow: '0 4px 12px rgba(193,68,14,0.18)' }}>
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col flex-1 p-6 pt-4 justify-between">
                    <div>
                      {/* Spacer to align non-badged cards */}
                      <div className="mb-3" style={{ height: 28 }} />

                      {/* Icon + Name */}
                      <div className="flex items-center gap-2 mb-6">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: '#F0EAE5' }}>
                          <Icon className="w-4 h-4" style={{ color: C.terra }} />
                        </div>
                        <h3 className="text-base font-bold" style={{ color: '#2C2420' }}>{tier.label}</h3>
                      </div>

                      {/* Price */}
                      <div className="flex items-end gap-1.5 mb-4">
                        {tier.price === 0
                          ? <span className="text-4xl font-extrabold leading-none" style={{ color: '#2C2420' }}>Free</span>
                          : <>
                              <span className="text-base font-bold self-start mt-1" style={{ color: C.muted }}>$</span>
                              <span className="text-4xl font-extrabold leading-none" style={{ color: '#2C2420' }}>{tier.price}</span>
                              <span className="text-xs font-semibold self-end mb-0.5" style={{ color: C.muted }}>one-time</span>
                              {tier.save && (
                                <span className="self-end mb-0.5 text-xs font-bold px-2 py-0.5 rounded-full"
                                  style={{ background: 'rgba(21,128,61,0.10)', color: '#15803D', border: '1px solid rgba(21,128,61,0.18)' }}>
                                  {tier.save}
                                </span>
                              )}
                            </>
                        }
                      </div>

                      {/* Credits */}
                      <p className="text-sm font-bold mt-3 mb-6" style={{ color: C.terra }}>{tier.credits} credits</p>

                      {/* Features */}
                      <ul className="flex flex-col gap-3 mb-7">
                        {tier.features.map((f) => (
                          <li key={f.text} className="flex items-start gap-2">
                            {f.ok
                              ? <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#15803D' }} />
                              : <XCircle   className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'rgba(193,68,14,0.35)' }} />
                            }
                            <span className="text-xs leading-snug" style={{ color: '#2C2420' }}>{f.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <PricingButton
                      tier={tier}
                      onClick={() => tier.price === 0 ? navigate('/create') : navigate('/login?redirect=/pricing')}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Credits per video reference */}
          <div className="rounded-2xl p-5 mb-6 mx-auto max-w-sm"
            style={{ background: '#FFFAF7', border: '1.5px solid rgba(193,68,14,0.12)' }}>
            <p className="text-xs font-bold text-center mb-3 uppercase tracking-wider" style={{ color: C.muted }}>
              Credits per video
            </p>
            <div className="flex justify-around">
              {[{ label: 'Up to 15s', credits: 3 }, { label: '16s to 30s', credits: 6 }, { label: '31s to 60s', credits: 12 }].map((row) => (
                <div key={row.label} className="text-center">
                  <p className="text-2xl font-extrabold" style={{ color: C.terra }}>{row.credits}</p>
                  <p className="text-xs font-semibold" style={{ color: '#2C2420' }}>credits</p>
                  <p className="text-xs mt-0.5" style={{ color: C.muted }}>{row.label}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-center mt-3" style={{ color: C.muted }}>
              Shorter videos cost fewer credits, so you stay in control.
            </p>
          </div>

          {/* Bottom nudge */}
          <div className="text-center py-4 rounded-2xl"
            style={{ background: '#F0EAE5', border: '1px solid rgba(193,68,14,0.12)' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: '#2C2420' }}>Not sure yet?</p>
            <p className="text-xs mb-3" style={{ color: C.muted }}>Start with your 3 free credits, no card needed.</p>
            <button onClick={() => navigate('/create')}
              className="text-sm font-bold underline underline-offset-2 transition-opacity hover:opacity-60"
              style={{ color: C.terra }}>
              Try it free →
            </button>
          </div>

        </div>
      </section>

      {/* Contact / Support */}
      <ContactSection />

      {/* Final CTA */}
      <section className="py-28 px-6" style={{ background: C.dark }}>
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity:0,y:24 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }} transition={{ duration:0.6 }}>
            <h2 className="display mb-6" style={{ fontSize:'clamp(40px,5vw,72px)', color:C.bg, letterSpacing:'0.01em', lineHeight:1 }}>
              Ready to make<br/>your first video?
            </h2>
            <p className="text-base mb-10" style={{ color:'rgba(245,240,235,0.68)' }}>It's completely free to start. No account needed.</p>
            <button onClick={() => navigate('/create')}
              className="inline-flex items-center gap-2 px-10 py-4 rounded-full text-base font-bold text-white transition-all duration-300"
              style={{ background:`linear-gradient(135deg,${C.terra},${C.terraLt})`, boxShadow:`0 4px 24px rgba(193,68,14,0.35)` }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow=`0 8px 40px rgba(193,68,14,0.55)`; e.currentTarget.style.transform='translateY(-2px) scale(1.02)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow=`0 4px 24px rgba(193,68,14,0.35)`; e.currentTarget.style.transform='translateY(0) scale(1)'; }}
            >Get Started for Free <ArrowRight className="w-4 h-4" /></button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6" style={{ background: C.dark, borderTop:`1px solid rgba(245,240,235,0.07)` }}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 items-center gap-4">
          <div className="flex justify-center sm:justify-start">
            <img src="/Logo-Light.svg" alt="Raphio" className="h-7 opacity-90" />
          </div>
          <p className="text-sm text-center justify-self-center" style={{ color:'rgba(245,240,235,0.68)' }}>Make videos from your ideas, no experience needed.</p>
          <nav className="flex items-center justify-center sm:justify-end gap-5">
            <Link to="/privacy" className="text-sm font-semibold transition-colors"
              style={{ color: 'rgba(245,240,235,0.68)' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#FFD9C7'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(245,240,235,0.68)'; }}
            >Privacy Policy</Link>
            <Link to="/terms" className="text-sm font-semibold transition-colors"
              style={{ color: 'rgba(245,240,235,0.68)' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#FFD9C7'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(245,240,235,0.68)'; }}
            >Terms & Conditions</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}