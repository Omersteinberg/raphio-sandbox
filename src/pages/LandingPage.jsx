import { useState, useEffect, useLayoutEffect, useRef, useMemo, Fragment } from 'react';
import { motion, useScroll, useTransform, useInView, useAnimationFrame, useMotionValue, AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, Play, Sparkles, Plus, Mail, X, MapPin, Film, Palette, Mic2, Crop } from "lucide-react";
import { Infinity as InfinityIcon, ShieldCheck, Clock, CheckCircle, XCircle, Zap, Layers, Crown } from 'lucide-react';
import { useAuth } from "@/hooks/useAuth.jsx";
import scene5Img from "@/assets/scene-5.png";
import scene1Img from "@/assets/scene-1.png";
import scene2Img from "@/assets/scene-2.png";
import scene4Img from "@/assets/scene-4.png";
import perfume1Img from "@/assets/perfume1.png";
import perfume2Img from "@/assets/perfume2.png";

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

// ── How it works: convergence into one node ─────────────────────────────
// Three entrances, one machine. Step 1 is the only interactive part of this
// section: clicking a card sends that card's own content on a curved path
// into a single glowing node, which pulses once on arrival. Steps 2 and 3
// are rendered by entirely separate components below with zero shared
// state - clicking Step 1 structurally cannot touch them, not just "won't
// by convention." That isolation is the whole argument: different start,
// identical finish, proven by what does (and does not) react to the click.
const STEP1_CARDS = [
  {
    id: 'prompt',
    label: 'Start with a prompt',
    support: 'Write a few sentences. Raphio turns them into a video script.',
    Illustration: PromptCardArt,
    Token: PromptToken,
  },
  {
    id: 'image',
    label: 'Start with your photos',
    support: 'Use the photos you already have. Raphio builds scenes around them.',
    Illustration: PhotosCardArt,
    Token: PhotosToken,
  },
  {
    id: 'references',
    label: 'Start with a Reference',
    support: 'Upload a reference image, or let Raphio create a style for you.',
    Illustration: ReferenceCardArt,
    Token: ReferenceToken,
  },
];

// Step 2's build sequence: one shared timeline (point 7) drives the status
// text, the dot row, and Step 3's video progress bar together. Segment
// durations are intentionally non-uniform - some stages just take longer to
// read/explain than others.
const BUILD_STAGES = [
  { id: 'story', label: 'Understanding your story', duration: 1.6, icon: Film },
  { id: 'style', label: 'Choosing your style', duration: 1.8, icon: Palette },
  { id: 'voice', label: 'Adding voice', duration: 2.4, icon: Mic2, waveform: true },
  { id: 'pace', label: 'Setting the pace', duration: 1.6, icon: Clock },
  { id: 'final', label: 'Optimizing your format', duration: 2.0, icon: Crop },
];
// The closing beat: once dot 5 holds solid, the label crossfades to this one
// more line before the whole row fades out and the loop restarts.
const BUILD_CLOSING_LABEL = 'Bringing it together';
const BUILD_STAGE_TOTAL = BUILD_STAGES.reduce((sum, s) => sum + s.duration, 0);
const BUILD_HOLD_S = 0.4;   // all dots solid, per the brief
const BUILD_FADE_S = 0.4;   // status + dots row fades out
const BUILD_PAUSE_S = 0.5;  // blank beat before the next loop
const BUILD_CYCLE_S = BUILD_STAGE_TOTAL + BUILD_HOLD_S + BUILD_FADE_S + BUILD_PAUSE_S;
const BUILD_REDUCED_STAGE_INDEX = 1; // static mid-state: "Choosing your style"

// Pure function of absolute elapsed seconds - BuildAssemblyCard and
// VideoShowcase each call this from their own useAnimationFrame off the
// same document timeline, so their output is identical every frame without
// either needing to know the other exists (no shared store, no prop
// drilling into either component's call site).
function getBuildTimelineState(elapsedS) {
  const t = elapsedS % BUILD_CYCLE_S;
  if (t < BUILD_STAGE_TOTAL) {
    let acc = 0;
    for (let i = 0; i < BUILD_STAGES.length; i++) {
      const dur = BUILD_STAGES[i].duration;
      if (t < acc + dur) {
        return { phase: 'running', stageIndex: i, stageProgress: (t - acc) / dur, overallProgress: t / BUILD_STAGE_TOTAL, rowOpacity: 1 };
      }
      acc += dur;
    }
  }
  const afterStages = t - BUILD_STAGE_TOTAL;
  if (afterStages < BUILD_HOLD_S) {
    return { phase: 'holding', stageIndex: BUILD_STAGES.length - 1, stageProgress: 1, overallProgress: 1, rowOpacity: 1 };
  }
  const afterHold = afterStages - BUILD_HOLD_S;
  if (afterHold < BUILD_FADE_S) {
    return { phase: 'fading', stageIndex: BUILD_STAGES.length - 1, stageProgress: 1, overallProgress: 1, rowOpacity: 1 - afterHold / BUILD_FADE_S };
  }
  return { phase: 'paused', stageIndex: 0, stageProgress: 0, overallProgress: 0, rowOpacity: 0 };
}

// Drives the shared clock. Discrete values (stageIndex/phase) only trigger a
// re-render when they actually change; continuous values (progress/opacity)
// are plain motion values so 60fps updates never touch React. Pauses (skips
// the clock update) while its own element is out of view, per the brief.
function useBuildTimeline(containerRef, reducedMotion) {
  const inView = useInView(containerRef, { amount: 0.4 });
  const elapsed = useMotionValue(0);
  const [discrete, setDiscrete] = useState({ stageIndex: BUILD_REDUCED_STAGE_INDEX, phase: 'running' });
  const prevRef = useRef(discrete);

  useAnimationFrame((time) => {
    if (reducedMotion || !inView) return;
    const seconds = time / 1000;
    elapsed.set(seconds);
    const s = getBuildTimelineState(seconds);
    if (s.stageIndex !== prevRef.current.stageIndex || s.phase !== prevRef.current.phase) {
      prevRef.current = { stageIndex: s.stageIndex, phase: s.phase };
      setDiscrete(prevRef.current);
    }
  });

  const reducedState = getBuildTimelineState(
    BUILD_STAGES.slice(0, BUILD_REDUCED_STAGE_INDEX).reduce((sum, s) => sum + s.duration, 0) + BUILD_STAGES[BUILD_REDUCED_STAGE_INDEX].duration * 0.5
  );
  const overallProgress = useTransform(elapsed, (v) => (reducedMotion ? reducedState.overallProgress : getBuildTimelineState(v).overallProgress));
  const rowOpacity = useTransform(elapsed, (v) => (reducedMotion ? 1 : getBuildTimelineState(v).rowOpacity));

  return {
    stageIndex: reducedMotion ? BUILD_REDUCED_STAGE_INDEX : discrete.stageIndex,
    phase: reducedMotion ? 'running' : discrete.phase,
    overallProgress,
    rowOpacity,
  };
}

function BuildWaveform({ reducedMotion }) {
  const bars = [4, 9, 6, 11, 5];
  return (
    <span className="flex items-end gap-[2px]" style={{ height: 12 }} aria-hidden="true">
      {bars.map((h, i) => (
        <motion.span
          key={i}
          className="rounded-full"
          style={{ width: 2, background: C.terra, height: reducedMotion ? h : undefined }}
          animate={reducedMotion ? undefined : { height: [h * 0.4, h, h * 0.4] }}
          transition={reducedMotion ? undefined : { duration: 0.7, repeat: Infinity, ease: 'easeInOut', delay: i * 0.09 }}
        />
      ))}
    </span>
  );
}

function BuildStatusText({ stageIndex, phase, reducedMotion }) {
  const stage = BUILD_STAGES[stageIndex];
  // Closing beat: once the hold starts, the label swaps to the closing line
  // and stays through the fade - it never reverts to the stage-5 label.
  const closing = phase === 'holding' || phase === 'fading';
  const label = closing ? BUILD_CLOSING_LABEL : stage.label;
  return (
    <div className="flex items-center justify-center" style={{ minHeight: 24, marginBottom: 20 }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={closing ? 'closing' : stage.id}
          initial={reducedMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-2.5"
        >
          <span className="text-sm font-bold" style={{ color: C.dark }}>{label}</span>
          {!closing && stage.waveform && <BuildWaveform reducedMotion={reducedMotion} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function BuildDotRow({ stageIndex, phase }) {
  const allSolid = phase === 'holding' || phase === 'fading';
  return (
    <div className="flex items-center justify-center" aria-hidden="true">
      {BUILD_STAGES.map((stage, i) => {
        const completed = allSolid || i < stageIndex;
        const current = !allSolid && i === stageIndex;
        const lit = completed || current;
        const Icon = stage.icon;
        // The connector segment sits BEFORE this dot, living entirely in
        // the gap between dot i-1 and dot i - it never crosses into either
        // dot's circle, so there's no stacking/paint-order to get right.
        const segmentLit = i > 0 && (allSolid || i <= stageIndex);
        return (
          <Fragment key={stage.id}>
            {i > 0 && (
              <span
                className="block w-3 sm:w-4 flex-shrink-0"
                style={{
                  height: 2,
                  borderRadius: 999,
                  background: segmentLit ? 'linear-gradient(90deg,#F97066,#FB923C)' : 'rgba(193,68,14,0.14)',
                  transition: 'background 0.3s ease',
                }}
              />
            )}
            <span className="relative flex items-center justify-center" style={{ width: 32, height: 32 }}>
              {current && (
                <motion.span
                  className="absolute rounded-full"
                  style={{ inset: -5, background: 'rgba(249,112,102,0.35)' }}
                  animate={{ opacity: [0.85, 1, 0.85], scale: [1, 1.08, 1] }}
                  transition={BREATH_PULSE}
                />
              )}
              <span
                className="relative rounded-full flex items-center justify-center"
                style={{
                  width: current ? 30 : 26,
                  height: current ? 30 : 26,
                  background: lit ? 'linear-gradient(135deg,#F97066,#FB923C)' : 'rgba(193,68,14,0.1)',
                  border: current ? '2px solid #FFFAF7' : 'none',
                  boxShadow: current ? '0 0 0 2px rgba(249,112,102,0.6)' : lit ? '0 2px 6px rgba(193,68,14,0.3)' : 'none',
                  transition: 'background 0.3s ease, box-shadow 0.3s ease, width 0.2s ease, height 0.2s ease',
                }}
              >
                <Icon style={{ width: 14, height: 14, color: lit ? '#fff' : 'rgba(193,68,14,0.4)' }} strokeWidth={2.25} />
              </span>
            </span>
          </Fragment>
        );
      })}
    </div>
  );
}

const VIDEO_FEATURES = ['Scene transitions', 'Voice narration', 'Music', 'Ready to publish'];

const FINAL_SCENE = {
  src: scene5Img,
  fallback: '#16241f',
  alt: 'The finished video: aurora borealis over snow-capped mountains',
};

// userSpaceOnUse (not the default objectBoundingBox) - a perfectly
// horizontal or vertical stroke has a zero-height/width bounding box, which
// makes an objectBoundingBox gradient degenerate and invisible in Chromium.
// Learned the hard way on this same section's previous build.
function CardGradient({ id }) {
  return (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="160" y2="120">
      <stop offset="0%" stopColor="#F97066" />
      <stop offset="100%" stopColor="#FB923C" />
    </linearGradient>
  );
}

// One soft lift shadow, reused by each icon's single gradient-filled anchor
// shape only - elevation declared once per icon (impeccable craft-floor:
// "declare elevation once, border or shadow"), never stacked with a border.
function CardShadow({ id }) {
  return (
    <filter id={id} x="-60%" y="-60%" width="220%" height="220%">
      <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="#C1440E" floodOpacity="0.3" />
    </filter>
  );
}

// Card art is literal now (real photos, real bubble text, real before/after
// swatches), matching the approved reference mockups - the old abstract
// bar/line/diamond icons are gone. Each still owns exactly one continuous
// loop while in view (impeccable craft-floor: "one authored moment"), just
// expressed through real content instead of geometric placeholders.
const PROMPT_EXAMPLES = [
  'A small boy in a cabin during winter…',
  'A cozy coffee shop at sunrise…',
  'A sneaker launch, bold and cinematic…',
  'A road trip through autumn hills…',
];

// Plain setTimeout chain, not framer - this drives text content, not
// transforms, so there is nothing here for framer to animate.
function useTypewriterLoop(phrases, { typeMs = 40, holdMs = 1200, deleteMs = 25, pauseMs = 300, reduced = false } = {}) {
  const [text, setText] = useState(reduced ? phrases[0] : '');
  useEffect(() => {
    if (reduced) { setText(phrases[0]); return; }
    let cancelled = false;
    let timeoutId;
    let phraseIndex = 0;

    const scheduleDelete = (phrase, charIndex) => {
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        const next = charIndex - 1;
        setText(phrase.slice(0, Math.max(next, 0)));
        if (next > 0) scheduleDelete(phrase, next);
        else { phraseIndex++; timeoutId = setTimeout(typePhrase, pauseMs); }
      }, deleteMs);
    };
    const scheduleType = (phrase, charIndex) => {
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        const next = charIndex + 1;
        setText(phrase.slice(0, next));
        if (next < phrase.length) scheduleType(phrase, next);
        else timeoutId = setTimeout(() => scheduleDelete(phrase, phrase.length), holdMs);
      }, typeMs);
    };
    const typePhrase = () => scheduleType(phrases[phraseIndex % phrases.length], 0);

    typePhrase();
    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [phrases, typeMs, holdMs, deleteMs, pauseMs, reduced]);
  return text;
}

function PromptCardArt() {
  const reducedMotion = usePrefersReducedMotion();
  const text = useTypewriterLoop(PROMPT_EXAMPLES, { reduced: reducedMotion });
  return (
    <div className="relative w-full h-full flex items-center justify-center px-5">
      <div
        className="relative w-full max-w-[240px] px-5 py-4"
        style={{ background: C.white, borderRadius: '20px 20px 20px 6px', boxShadow: '0 6px 20px rgba(28,25,23,0.16)' }}
      >
        <p className="text-[15px] font-semibold" style={{ color: C.dark, lineHeight: 1.5, minHeight: '3em' }}>
          {text}
          <span
            aria-hidden="true"
            className="inline-block"
            style={{
              width: 2, height: '0.95em', marginLeft: 2, verticalAlign: '-0.12em',
              background: C.terra,
              animation: reducedMotion ? 'none' : 'raphio-caret-blink 0.9s step-end infinite',
            }}
          />
        </p>
      </div>
    </div>
  );
}

// Fanned real photos "arriving" one after another, plus its own separate
// pulse on the add button - two distinct rhythms so they read as two
// things (content being added vs. an affordance to add more), per the brief.
// Percentage-based (not fixed px) so the fan scales with the card instead
// of floating small inside a now much bigger illustration area.
const PHOTOS_STACK = [
  { src: scene2Img, rotate: -12, left: '0%',  top: '22%', width: '42%', height: '50%' },
  { src: scene4Img, rotate: 12,  left: '56%', top: '22%', width: '42%', height: '50%' },
  { src: scene1Img, rotate: 0,   left: '29%', top: '18%',  width: '44%', height: '52%' },
];

function PhotosCardArt() {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <div className="relative w-full h-full" aria-hidden="true">
      {PHOTOS_STACK.map((p, i) => (
        <motion.div
          key={p.src}
          className="absolute rounded-lg overflow-hidden"
          style={{
            left: p.left, top: p.top, width: p.width, height: p.height,
            rotate: p.rotate,
            zIndex: i + 1,
            border: '3px solid #FFFAF7',
            boxShadow: '0 4px 12px rgba(28,25,23,0.24)',
          }}
          animate={reducedMotion ? undefined : { scale: [1, 1.08, 1] }}
          transition={reducedMotion ? undefined : { duration: 1.6, repeat: Infinity, repeatDelay: 1.4, ease: [0.16, 1, 0.3, 1], delay: i * 0.35 }}
        >
          <img src={p.src} alt="" className="w-full h-full object-cover" />
        </motion.div>
      ))}
      <motion.div
        className="absolute rounded-full flex items-center justify-center"
        style={{
          width: 30, height: 30, right: '6%', bottom: '10%', zIndex: 5,
          background: 'linear-gradient(135deg,#F97066,#FB923C)',
          boxShadow: '0 3px 10px rgba(193,68,14,0.45)',
        }}
        animate={reducedMotion ? undefined : { scale: [1, 1.18, 1] }}
        transition={reducedMotion ? undefined : { duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Plus style={{ width: 16, height: 16, color: '#fff' }} strokeWidth={3} />
      </motion.div>
    </div>
  );
}

function ReferenceCardArt() {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <div className="relative w-full h-full flex items-center justify-center gap-2.5 px-3" aria-hidden="true">
      <div className="rounded-xl overflow-hidden flex-1 aspect-square" style={{ border: '1.5px solid rgba(193,68,14,0.25)', boxShadow: '0 3px 10px rgba(28,25,23,0.12)' }}>
        <img src={perfume1Img} alt="" className="w-full h-full object-cover" />
      </div>
      <svg viewBox="0 0 34 14" className="flex-shrink-0" style={{ width: 26, height: 14, overflow: 'visible' }} fill="none">
        <path d="M1 7 H27" stroke="#C1440E" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round" />
        <path d="M22 2 L29 7 L22 12" stroke="#C1440E" strokeOpacity="0.3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {!reducedMotion && (
          <motion.circle
            r="2.6"
            cy="7"
            fill="#FB923C"
            style={{ filter: 'drop-shadow(0 0 3px rgba(251,146,60,0.8))' }}
            initial={{ cx: 3, opacity: 0 }}
            animate={{ cx: [3, 26], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', times: [0, 0.15, 0.82, 1] }}
          />
        )}
      </svg>
      <div className="rounded-xl overflow-hidden flex-1 aspect-square" style={{ boxShadow: '0 4px 14px rgba(193,68,14,0.32)' }}>
        <img src={perfume2Img} alt="" className="w-full h-full object-cover" />
      </div>
    </div>
  );
}

// What travels down the curved path for each mode - small enough to read
// as "content," not so detailed it competes with the node it's feeding.
function PromptToken() {
  return (
    <div
      className="whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold"
      style={{ background: C.white, color: C.dark, boxShadow: '0 4px 14px rgba(28,25,23,0.18)' }}
    >
      “A luxury watch commercial…”
    </div>
  );
}
function PhotosToken() {
  return (
    <div style={{ position: 'relative', width: 46, height: 34 }}>
      <div className="absolute rounded-md" style={{ width: 26, height: 26, top: 6, left: 0, background: 'linear-gradient(135deg,#F97066,#FB923C)', transform: 'rotate(-8deg)', boxShadow: '0 4px 12px rgba(193,68,14,0.28)' }} />
      <div className="absolute rounded-md" style={{ width: 26, height: 26, top: 0, left: 18, background: 'linear-gradient(135deg,#FB923C,#F97066)', transform: 'rotate(6deg)', boxShadow: '0 4px 12px rgba(193,68,14,0.28)' }} />
    </div>
  );
}
function ReferenceToken() {
  return (
    <div
      className="rounded-lg"
      style={{ width: 34, height: 34, background: 'linear-gradient(135deg,#F97066,#FB923C)', boxShadow: '0 4px 12px rgba(193,68,14,0.28)' }}
    />
  );
}

// One of the three entrances. Illustration + two-tier text, nothing else -
// no separate icon badge duplicating what the illustration already shows,
// no tab styling. Selection is understated: a soft lift, not a border. The
// icon sits in its own gradient-wash panel (same radial technique as the
// node's glow, so the cards read as the same visual world it belongs to)
// rather than floating on flat cream - design-taste-frontend's "cream on
// cream with only typography reads as a boring default" rule, named and
// fixed.
function StartCard({ card, active, cardRef, onSelect }) {
  const Illustration = card.Illustration;
  return (
    <motion.button
      ref={cardRef}
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
      className="relative flex flex-col items-center text-center rounded-2xl px-6 py-7 sm:px-7 sm:py-8 cursor-pointer min-h-[44px]"
      style={{
        background: active ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.42)',
        boxShadow: active ? '0 14px 34px rgba(193,68,14,0.16)' : '0 2px 10px rgba(28,25,23,0.05)',
        transition: 'background 0.3s ease, box-shadow 0.3s ease',
      }}
    >
      <div className="w-full aspect-[4/3] mb-5 rounded-2xl overflow-hidden" style={{ background: '#FBF6F1' }}>
        <Illustration />
      </div>
      <p className="text-[15px] sm:text-base font-bold" style={{ color: C.dark, lineHeight: 1.35 }}>
        {card.label}
      </p>
      <p className="text-[13px] mt-1" style={{ color: C.muted, lineHeight: 1.5 }}>
        {card.support}
      </p>
    </motion.button>
  );
}

// Shared idle-breathing rhythm for the build-sequence's "current stage" dot
// ring (see BuildDotRow) - unrelated to GlowNode's own breathing below,
// which runs its own 4.5s cycle per spec.
const BREATH_PULSE = { duration: 5, repeat: Infinity, ease: 'easeInOut' };

// Three solid-color pulse rings, not blurred gradients - each one starts
// exactly the disc's size (fully hidden behind it) and scales up while
// fading out, so only the portion that has grown past the disc's edge is
// ever visible. Staggered by 1s each against a 3s cycle, so at any instant
// two or three rings are mid-expansion at once.
const PULSE_RINGS = [
  { color: '#E8603C', delay: 0 },
  { color: '#F97066', delay: 1 },
  { color: '#FBAA6F', delay: 2 },
];
const PULSE_CYCLE_S = 3;
// Reduced-motion fallback: freeze each ring at a fixed intermediate
// scale/opacity instead of animating, so the layered look still reads.
const PULSE_RINGS_STATIC = [
  { scale: 1.2, opacity: 0.4 },
  { scale: 1.4, opacity: 0.3 },
  { scale: 1.6, opacity: 0.2 },
];
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

// Driven by absolute elapsed time through a phase-shift modulo, not
// framer's delay+repeat - a `delay` only applies once, so for the first
// cycle the later rings would sit invisible-behind-the-disc before ever
// starting, then join in: a visible "ramp up," and the one obvious reset
// the brief flagged. Computing each ring's phase directly from time means
// it renders mid-cycle on the very first frame, exactly as if it had
// already been pulsing forever - no startup transient, no seam, ever.
function PulseRing({ color, delaySec, reducedMotion, staticScale, staticOpacity }) {
  const scale = useMotionValue(reducedMotion ? staticScale : 1);
  const opacity = useMotionValue(reducedMotion ? staticOpacity : 0.5);
  useAnimationFrame((time) => {
    if (reducedMotion) return;
    const t = time / 1000;
    const cyclePos = (((t - delaySec) % PULSE_CYCLE_S) + PULSE_CYCLE_S) % PULSE_CYCLE_S;
    const progress = cyclePos / PULSE_CYCLE_S;
    const eased = easeOutCubic(progress);
    scale.set(1 + eased * 0.8);
    opacity.set(0.5 * (1 - progress));
  });
  return (
    <motion.div
      className="absolute rounded-full"
      style={{ inset: 0, width: 76, height: 76, background: color, zIndex: 0, scale, opacity }}
    />
  );
}

// The signature moment - not a button, the engine. Three solid pulse rings
// expand and fade behind a disc that never moves at all - no border, no
// inset highlight, completely flat. All the motion lives in the rings,
// none of it on the icon surface. A click still sends a token in and the
// node answers with a one-shot ring, same mechanism as the idle pulses.
function GlowNode({ containerRef, pulseKey, reducedMotion }) {
  return (
    <div ref={containerRef} className="relative" style={{ width: 76, height: 76 }} aria-hidden="true">
      {PULSE_RINGS.map((ring, i) => (
        <PulseRing
          key={i}
          color={ring.color}
          delaySec={ring.delay}
          reducedMotion={reducedMotion}
          staticScale={PULSE_RINGS_STATIC[i].scale}
          staticOpacity={PULSE_RINGS_STATIC[i].opacity}
        />
      ))}

      {/* The disc: flat, static, never animated. No border, no inset
          highlight - the housing doesn't move, only the rings behind it do. */}
      <div
        className="absolute inset-0 rounded-full flex items-center justify-center"
        style={{
          zIndex: 1,
          background: 'linear-gradient(135deg, #E8603C, #C1440E)',
          boxShadow: '0 4px 14px rgba(193,68,14,0.25)',
        }}
      >
        <img
          src="/Raphio.png"
          alt=""
          style={{ width: '44%', height: '44%', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
        />
      </div>

      {/* Arrival: a one-shot ring fired when a token lands - the node
          acknowledging an input, independent of the idle breathing above. */}
      {pulseKey > 0 && (
        <motion.div
          key={pulseKey}
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ zIndex: 2, border: '1.5px solid rgba(232,96,60,0.65)' }}
          initial={{ opacity: 0.75, scale: reducedMotion ? 1 : 0.96 }}
          animate={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.65 }}
          transition={{ duration: reducedMotion ? 0.2 : 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      )}
    </div>
  );
}

// One traveling token: starts at its card's measured center, arcs toward
// the node's measured center (bowing out from the straight line before
// curving in, so it reads as a path, not a straight slide), fades and
// shrinks into the node, then reports arrival so the node can pulse.
function TravelToken({ token, onArrive }) {
  const { from, to, Token } = token;
  const midX = to.x + (from.x - to.x) * 0.55;
  const midY = from.y + (to.y - from.y) * 0.6;
  return (
    <motion.div
      className="absolute top-0 left-0"
      initial={{ x: from.x, y: from.y, opacity: 1, scale: 1 }}
      animate={{
        x: [from.x, midX, to.x],
        y: [from.y, midY, to.y],
        opacity: [1, 1, 0],
        scale: [1, 0.85, 0.25],
      }}
      transition={{ duration: 0.65, ease: [0.45, 0, 0.2, 1], times: [0, 0.55, 1] }}
      onAnimationComplete={onArrive}
    >
      <div style={{ transform: 'translate(-50%, -50%)' }}>
        <Token />
      </div>
    </motion.div>
  );
}

// Sequential line story: draw, hold the flow visible, hand off to the next
// line - one thing happening at a time, not three at once competing for
// attention. Non-uniform stage math kept deliberately simple (pure
// function of elapsed seconds, same shape as getBuildTimelineState) so
// three separate components (the lines here, nothing else needs it) can't
// drift out of sync with each other.
const LINE_DRAW_S = 0.7;
const LINE_HOLD_S = 1.0;
const LINE_STAGE_S = LINE_DRAW_S + LINE_HOLD_S;
const LINE_PAUSE_S = 0.7;
const LINE_CYCLE_S = LINE_STAGE_S * 3 + LINE_PAUSE_S;

function getLineState(elapsedS, index) {
  const t = elapsedS % LINE_CYCLE_S;
  const lineStart = index * LINE_STAGE_S;
  if (t < lineStart) return { drawProgress: 0, flowActive: false };
  const local = t - lineStart;
  if (local < LINE_DRAW_S) return { drawProgress: local / LINE_DRAW_S, flowActive: false };
  if (local < LINE_STAGE_S) return { drawProgress: 1, flowActive: true };
  return { drawProgress: 1, flowActive: false };
}

// The node -> Step 2 connector shares this same clock (not its own scroll
// trigger) so it only starts once line 0 (Prompt -> node) has actually
// finished drawing - "this is what happens next," not a parallel animation.
const CONNECTOR_START_S = LINE_DRAW_S;
const CONNECTOR_DRAW_S = 0.4;
function getConnectorProgress(elapsedS) {
  const t = elapsedS % LINE_CYCLE_S;
  const local = t - CONNECTOR_START_S;
  if (local <= 0) return 0;
  return Math.min(local / CONNECTOR_DRAW_S, 1);
}

// Step 1: measures each card's and the node's real position once mounted
// (and on resize), then drives everything in plain pixel transforms - no
// scroll involvement at all here, this mechanic is purely click-driven.
// activeId/tokens/pulseKey are local to this component on purpose: Step 2
// and Step 3 are separate components below that never receive them, so
// there is no path - not even an accidental one - for a Step 1 click to
// reach them.
function ConvergenceStage() {
  const reducedMotion = usePrefersReducedMotion();
  const stageRef = useRef(null);
  const cardRefs = useRef([]);
  const nodeRef = useRef(null);
  const tokenIdRef = useRef(0);
  const [geo, setGeo] = useState({ cards: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }], node: { x: 0, y: 0 } });
  const [activeId, setActiveId] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [pulseKey, setPulseKey] = useState(0);

  // One line teaches at a time: draws in, holds its flow visible, then the
  // next line takes over. Gated on the section actually being in view (not
  // raw scroll position) so the story only plays while someone can see it.
  const stageInView = useInView(stageRef, { amount: 0.4 });
  const pathRefs = useRef([]);
  const outerPathRefs = useRef([]);
  const flowRefs = useRef([]);
  const pathLengthsRef = useRef([0, 0, 0]);
  const elapsedRef = useRef(0);
  const lastFrameRef = useRef(null);
  const connectorPathRef = useRef(null);
  const connectorOuterRef = useRef(null);
  const connectorFlowRef = useRef(null);
  const connectorArrowRef = useRef(null);
  const connectorLengthRef = useRef(0);

  const applyLineFrame = (elapsedS) => {
    pathRefs.current.forEach((el, i) => {
      if (!el) return;
      const { drawProgress, flowActive } = reducedMotion
        ? { drawProgress: 1, flowActive: false }
        : getLineState(elapsedS, i);
      const length = pathLengthsRef.current[i] || 0;
      const offset = `${length * (1 - drawProgress)}`;
      el.style.strokeDashoffset = offset;
      const outerEl = outerPathRefs.current[i];
      if (outerEl) outerEl.style.strokeDashoffset = offset;
      const flowEl = flowRefs.current[i];
      if (flowEl) flowEl.style.opacity = flowActive ? '1' : '0';
    });

    const connectorProgress = reducedMotion ? 1 : getConnectorProgress(elapsedS);
    const cLen = connectorLengthRef.current || 0;
    const cOffset = `${cLen * (1 - connectorProgress)}`;
    if (connectorPathRef.current) connectorPathRef.current.style.strokeDashoffset = cOffset;
    if (connectorOuterRef.current) connectorOuterRef.current.style.strokeDashoffset = cOffset;
    if (connectorFlowRef.current) connectorFlowRef.current.style.opacity = !reducedMotion && connectorProgress >= 1 ? '1' : '0';
    if (connectorArrowRef.current) connectorArrowRef.current.style.opacity = connectorProgress >= 1 ? '1' : '0';
  };

  useAnimationFrame((time) => {
    if (reducedMotion) return;
    if (!stageInView) { lastFrameRef.current = null; return; }
    if (lastFrameRef.current == null) lastFrameRef.current = time;
    elapsedRef.current += (time - lastFrameRef.current) / 1000;
    lastFrameRef.current = time;
    applyLineFrame(elapsedRef.current);
  });

  useLayoutEffect(() => {
    const measure = () => {
      const stage = stageRef.current;
      const node = nodeRef.current;
      if (!stage || !node) return;
      const stageRect = stage.getBoundingClientRect();
      // Bottom-center of each card, not its center - a line should leave
      // from where the card actually ends, not float out of its middle.
      const cards = cardRefs.current.map((el) => {
        if (!el) return { x: 0, y: 0 };
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2 - stageRect.left, y: r.bottom - stageRect.top };
      });
      const nr = node.getBoundingClientRect();
      setGeo({ cards, node: { x: nr.left + nr.width / 2 - stageRect.left, y: nr.top + nr.height / 2 - stageRect.top } });
    };
    measure();
    const t = setTimeout(measure, 300);
    window.addEventListener('resize', measure);
    return () => { window.removeEventListener('resize', measure); clearTimeout(t); };
  }, []);

  // Re-measure each path's REAL rendered length (getTotalLength) whenever
  // the geometry actually changes, set the dasharray once, then hand off
  // to the per-frame sequential timeline above to drive the offset.
  useLayoutEffect(() => {
    pathRefs.current.forEach((el) => {
      if (!el) return;
      const i = Number(el.dataset.lineIndex);
      const length = el.getTotalLength();
      pathLengthsRef.current[i] = length;
      const dashArray = `${length}`;
      el.style.strokeDasharray = dashArray;
      const outerEl = outerPathRefs.current[i];
      if (outerEl) outerEl.style.strokeDasharray = dashArray;
    });
    if (connectorPathRef.current) {
      const cLen = connectorPathRef.current.getTotalLength();
      connectorLengthRef.current = cLen;
      const cDash = `${cLen}`;
      connectorPathRef.current.style.strokeDasharray = cDash;
      if (connectorOuterRef.current) connectorOuterRef.current.style.strokeDasharray = cDash;
    }
    applyLineFrame(elapsedRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo, reducedMotion]);

  const handleSelect = (card, index) => {
    setActiveId(card.id);
    if (reducedMotion) {
      // Static equivalent: skip the traveling motion entirely and cut
      // straight to the node's lit state, per the brief - not just a
      // faster version of the same animation.
      setPulseKey((k) => k + 1);
      return;
    }
    const id = ++tokenIdRef.current;
    setTokens((prev) => [...prev, { id, from: geo.cards[index], to: geo.node, Token: card.Token }]);
  };

  const handleArrive = (id) => {
    setTokens((prev) => prev.filter((t) => t.id !== id));
    setPulseKey((k) => k + 1);
  };

  return (
    <div ref={stageRef} className="relative">
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }} aria-hidden="true">
        <defs>
          {geo.cards.map((c, i) => (
            // Fades toward the node - by the time the line reaches the
            // pulsing circle it should be dissolving into it, not stopping
            // at a hard edge. userSpaceOnUse so the gradient axis is the
            // real card->node line, not the path's own bounding box.
            <linearGradient key={i} id={`line-fade-${i}`} gradientUnits="userSpaceOnUse" x1={c.x} y1={c.y} x2={geo.node.x} y2={geo.node.y}>
              <stop offset="0%" stopColor="#E8603C" stopOpacity="1" />
              <stop offset="100%" stopColor="#E8603C" stopOpacity="0.12" />
            </linearGradient>
          ))}
        </defs>
        {geo.cards.map((c, i) => {
          // Deliberately extreme control-point ratios, not a "safe" curve:
          // the control point sits close to the card's own x (0.15 of the
          // way toward the node) and well below the midpoint on y (0.65 of
          // the way down) - that's what produces a real sag/swoop instead
          // of a gentle lean.
          const controlX = c.x + (geo.node.x - c.x) * 0.15;
          const controlY = c.y + (geo.node.y - c.y) * 0.65;
          const d = `M${c.x} ${c.y} Q${controlX} ${controlY} ${geo.node.x} ${geo.node.y}`;
          return (
            <g key={i}>
              {/* Outer: soft glow halo behind the line - blurred, no dash. */}
              <path
                ref={(el) => { outerPathRefs.current[i] = el; }}
                d={d}
                stroke="rgba(232,96,60,0.22)"
                strokeWidth="9"
                fill="none"
                style={{ filter: 'blur(3px)' }}
              />
              {/* Inner: crisp solid base line, fading toward the node - this
                  is what establishes the path is always there, before any
                  motion happens on top. */}
              <path
                ref={(el) => { pathRefs.current[i] = el; }}
                data-line-index={i}
                d={d}
                stroke={`url(#line-fade-${i})`}
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
              {/* Flowing overlay: same path, short dash + long gap, driven
                  by the sequential timeline above (opacity toggled
                  imperatively; only the current line's flow is ever
                  visible) - CSS animation for the actual dash motion since
                  it's continuous/linear and belongs off the main thread.
                  Path is authored card-first, so a decreasing dashoffset
                  moves the dash in the card->node direction. */}
              {!reducedMotion && (
                <path
                  ref={(el) => { flowRefs.current[i] = el; }}
                  d={d}
                  stroke="#FFD9C7"
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray="8 24"
                  style={{ opacity: 0, animation: 'raphio-flow 1.8s linear infinite' }}
                />
              )}
            </g>
          );
        })}
      </svg>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 relative z-10">
        {STEP1_CARDS.map((card, i) => (
          <StartCard
            key={card.id}
            card={card}
            active={activeId === card.id}
            cardRef={(el) => { cardRefs.current[i] = el; }}
            onSelect={() => handleSelect(card, i)}
          />
        ))}
      </div>

      {/* Top margin, bumped again (previously mt-20/mt-28) - the node needs
          real distance below the cards for the bowed lines to have room to
          sag and for the flowing light to have visible distance to travel.
          Bottom margin is deliberately tiny now - the distance down to
          Step 2 lives in the connector's own path length just below, not
          in empty margin, so the line reads as coming out of the node
          instead of starting from a gap floating below it. */}
      <div className="flex justify-center mt-36 sm:mt-48 mb-2 sm:mb-3 relative z-10">
        <GlowNode containerRef={nodeRef} pulseKey={pulseKey} reducedMotion={reducedMotion} />
      </div>

      {/* Node -> Step 2: same beam language as the card lines (glow + solid
          fading-from-node + flowing overlay), sharing the identical clock -
          only starts once line 0 has finished drawing (see
          CONNECTOR_START_S), so it reads as "this is what happens next,"
          not something running in parallel on its own timer. */}
      <div className="flex justify-center relative z-10" aria-hidden="true">
        <svg width="24" height="150" viewBox="0 0 24 150" fill="none">
          <defs>
            <linearGradient id="connector-fade" gradientUnits="userSpaceOnUse" x1="12" y1="4" x2="12" y2="120">
              <stop offset="0%" stopColor="#E8603C" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#E8603C" stopOpacity="1" />
            </linearGradient>
          </defs>
          <path ref={connectorOuterRef} d="M12 4 V120" stroke="rgba(232,96,60,0.22)" strokeWidth="9" fill="none" style={{ filter: 'blur(3px)' }} />
          <path ref={connectorPathRef} d="M12 4 V120" stroke="url(#connector-fade)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          {!reducedMotion && (
            <path
              ref={connectorFlowRef}
              d="M12 4 V120"
              stroke="#FFD9C7"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
              strokeDasharray="8 24"
              style={{ opacity: 0, animation: 'raphio-flow 1.8s linear infinite', transition: 'opacity 0.3s ease' }}
            />
          )}
          <path
            ref={connectorArrowRef}
            d="M4 114 L12 128 L20 114"
            stroke="#C1440E"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            style={{ opacity: reducedMotion ? 1 : 0, transition: 'opacity 0.3s ease' }}
          />
        </svg>
      </div>

      {!reducedMotion && (
        <div className="absolute inset-0 pointer-events-none z-20">
          <AnimatePresence>
            {tokens.map((t) => (
              <TravelToken key={t.id} token={t} onArrive={() => handleArrive(t.id)} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}


// Step 2: one card, one settle-into-place reveal the first time it scrolls
// into view. No props, no state shared with Step 1 - it has nothing to
// react to even if it wanted to.
function BuildAssemblyCard() {
  const reducedMotion = usePrefersReducedMotion();
  const containerRef = useRef(null);
  const { stageIndex, phase, rowOpacity } = useBuildTimeline(containerRef, reducedMotion);

  return (
    <div ref={containerRef} className="rounded-3xl px-6 py-10 sm:px-10 sm:py-12 flex flex-col items-center" style={{ background: C.bgAlt }}>
      <motion.div style={{ opacity: rowOpacity }} className="flex flex-col items-center">
        <BuildStatusText stageIndex={stageIndex} phase={phase} reducedMotion={reducedMotion} />
        <BuildDotRow stageIndex={stageIndex} phase={phase} />
      </motion.div>
    </div>
  );
}

// Step 3: the visual high point. Landscape, not phone-framed - the only
// asset available is a wide cinematic shot and it earns the space. Its own
// once-only reveal, independent of everything above it.
function VideoShowcase() {
  const reducedMotion = usePrefersReducedMotion();
  const containerRef = useRef(null);
  const { overallProgress } = useBuildTimeline(containerRef, reducedMotion);
  const barWidth = useTransform(overallProgress, (v) => `${v * 100}%`);

  return (
    <div ref={containerRef} className="flex flex-col items-center">
      <motion.div
        className="relative w-full max-w-2xl"
        initial={reducedMotion ? false : { opacity: 0, scale: 0.94 }}
        whileInView={reducedMotion ? undefined : { opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          className="absolute -inset-6 sm:-inset-10 rounded-[40px] pointer-events-none"
          style={{ background: 'radial-gradient(60% 60% at 50% 40%, rgba(251,146,60,0.22), rgba(249,112,102,0) 72%)', filter: 'blur(28px)' }}
          aria-hidden="true"
        />
        <div
          className="relative rounded-[28px] overflow-hidden"
          style={{ aspectRatio: '16 / 9', background: FINAL_SCENE.fallback, boxShadow: '0 30px 80px rgba(28,25,23,0.32)' }}
        >
          <img
            src={FINAL_SCENE.src}
            alt={FINAL_SCENE.alt}
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(10,9,8,0.5) 100%)' }} />
          <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <span
              className="rounded-full flex items-center justify-center"
              style={{ width: 64, height: 64, background: 'rgba(255,255,255,0.95)', boxShadow: '0 8px 28px rgba(0,0,0,0.28)' }}
            >
              <Play style={{ width: 24, height: 24, color: C.terra, marginLeft: 3 }} fill={C.terra} />
            </span>
          </div>
          {/* Bottom progress bar - advances off the same shared timeline as
              Step 2's status text/dots (point 7), so both visibly move together */}
          <div className="absolute left-0 right-0 bottom-0 px-5 sm:px-6 pb-4 pt-10 pointer-events-none" aria-hidden="true">
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-semibold" style={{ color: 'rgba(255,250,247,0.92)' }}>0:00</span>
              <div className="relative flex-1 rounded-full" style={{ height: 3, background: 'rgba(255,255,255,0.28)' }}>
                <motion.div
                  className="absolute left-0 top-0 h-full rounded-full"
                  style={{ width: barWidth, background: 'linear-gradient(90deg,#F97066,#FB923C)' }}
                />
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    top: '50%', left: barWidth, width: 9, height: 9,
                    background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              </div>
              <span className="text-[11px] font-semibold" style={{ color: 'rgba(255,250,247,0.92)' }}>0:30</span>
            </div>
          </div>
        </div>
      </motion.div>

      <p className="display mt-6 text-lg sm:text-xl" style={{ color: C.dark }}>Your complete video.</p>

      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 mt-3">
        {VIDEO_FEATURES.map((f, i) => (
          <span key={f} className="flex items-center gap-3 text-xs font-semibold" style={{ color: C.muted }}>
            {i > 0 && <span aria-hidden="true" style={{ width: 3, height: 3, borderRadius: '50%', background: C.faint, flexShrink: 0 }} />}
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

function HowItWorks() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const goTo = (modeId) => navigate(user ? `/create?mode=${modeId}` : '/login');

  return (
    <section id="how-it-works" className="py-28 sm:py-32 px-6 font-figtree" style={{ background: C.bg, scrollMarginTop: 72 }}>
      <div className="max-w-5xl w-full mx-auto">

        {/* Header: the subhead states the one differentiator that actually
            matters to this audience - plainly, once, not implied by motion */}
        <div className="text-center mb-14 sm:mb-16">
          <h2 className="display mb-4" style={{ fontSize: 'clamp(34px,4.4vw,56px)', color: C.dark, letterSpacing: '-0.02em', lineHeight: 1.08 }}>
            Create a complete video<br className="hidden sm:block" /> in 3 simple steps
          </h2>
          <p className="text-base max-w-lg mx-auto" style={{ color: C.muted, lineHeight: 1.6, fontSize: '18px' }}>
            Start with a prompt, your own photos, or a reference image.
            However you begin, Raphio creates one finished video ready to share.
          </p>
        </div>

        <ConvergenceStage />

        <div className="mt-4 sm:mt-6">
          <BuildAssemblyCard />
          <p className="text-center text-sm font-semibold mt-4" style={{ color: C.muted }}>
            Raphio builds your storyboard automatically.
          </p>
        </div>

        <div className="mt-16 sm:mt-20">
          <VideoShowcase />
        </div>

        {/* Closing beat: the one ask */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center mt-14 sm:mt-16"
        >
          <button
            onClick={() => goTo('prompt')}
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
        @keyframes raphio-caret-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes raphio-flow { to { stroke-dashoffset: -32; } }
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
            Raphio doesn't stop at a few seconds. It carries your idea all the way through to a finished story worth sharing.
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