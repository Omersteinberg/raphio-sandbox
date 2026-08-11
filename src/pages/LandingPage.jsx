import { useState, useEffect, useLayoutEffect, useRef, useMemo, Fragment } from 'react';
import { motion, useScroll, useTransform, useInView, useAnimationFrame, useMotionValue, AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, Play, ChevronLeft, ChevronRight, Sparkles, Plus, Mail, X, MapPin, Film, Palette, Mic2, Crop, Workflow, Tag } from "lucide-react";
import { Infinity as InfinityIcon, ShieldCheck, Clock, CheckCircle, XCircle, Zap, Layers, Crown, Clock3} from 'lucide-react';
import { useAuth } from "@/hooks/useAuth.jsx";
import { useIsMobile } from "@/hooks/useMediaQuery";
import scene5Img from "@/assets/scene-5.png";
import scene1Img from "@/assets/scene-1.png";
import scene2Img from "@/assets/scene-2.png";
import scene4Img from "@/assets/scene-4.png";
import perfume1Img from "@/assets/perfume1.png";
import perfume2Img from "@/assets/perfume2.png";

const C = {
  bg:      '#F5F0EB',
  bgAlt:   '#EDE8E2',
  dark:    'var(--ink-warm)',
  terra:   '#C1440E',
  terraLt: '#E8603C',
  muted:   'var(--muted-warm)',
  faint:   '#DDD6CC',
  white:   '#FFFAF7',
};

// ── Hero video ──────────────────────────────────────────────────────
const HERO_VIDEO_URL = 'https://pub-130d5201a986450fa0c5297fa3bc461f.r2.dev/202606181832.mp4';

function PricingButton({ tier, onClick }) {
  const [hovered, setHovered] = useState(false);

  // Three registers, not one shared shape: the popular tier is the section's
  // one pill-gradient CTA (DESIGN.md's CTA/hero register); Starter/Studio are
  // in-flow purchase actions and belong in the flat functional register;
  // Free stays outline so it deliberately reads as lower emphasis next to
  // three paid CTAs on the same screen.
  let radius, visual;
  if (tier.popular) {
    radius = 'rounded-full';
    visual = {
      background: hovered
        ? 'linear-gradient(135deg, #5C1000, #E8603C)'
        : 'linear-gradient(135deg, #C1440E, #E8603C)',
      color: '#fff',
      border: 'none',
      boxShadow: hovered ? '0 8px 40px rgba(193,68,14,0.55)' : '0 4px 16px rgba(193,68,14,0.18)',
      transform: hovered ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)',
    };
  } else if (tier.price === 0) {
    radius = 'rounded-md';
    visual = hovered
      ? {
          background: 'linear-gradient(135deg, #C1440E, #E8603C)',
          color: '#fff',
          border: '1.5px solid transparent',
          boxShadow: '0 4px 16px rgba(193,68,14,0.30)',
        }
      : {
          background: 'transparent',
          color: '#C1440E',
          border: '1.5px solid rgba(193,68,14,0.35)',
          boxShadow: 'none',
        };
  } else {
    radius = 'rounded-md';
    visual = {
      background: hovered ? '#5C1000' : '#C1440E',
      color: '#fff',
      border: 'none',
      boxShadow: 'none',
    };
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`w-full ${radius} py-3 text-sm font-bold`}
      style={{
        transition: 'background 0.15s ease, box-shadow 0.2s ease, border-color 0.15s ease, transform 0.2s ease',
        ...visual,
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
    tabLabel: 'Prompt',
    support: 'Write a few sentences. Raphio turns them into a video script.',
    Illustration: PromptCardArt,
    Token: PromptToken,
  },
  {
    id: 'image',
    label: 'Start with your photos',
    tabLabel: 'Photos',
    support: 'Use the photos you already have. Raphio builds scenes around them.',
    Illustration: PhotosCardArt,
    Token: PhotosToken,
  },
  {
    id: 'references',
    label: 'Start with a Reference',
    tabLabel: 'Reference',
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

function BuildDotRow({ stageIndex, phase, reducedMotion }) {
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
                  background: segmentLit ? 'linear-gradient(90deg,#C1440E,#E8603C)' : 'rgba(193,68,14,0.14)',
                  transition: 'background 0.3s ease',
                }}
              />
            )}
            <span className="relative flex items-center justify-center" style={{ width: 32, height: 32 }}>
              {current && (
                <motion.span
                  className="absolute rounded-full"
                  style={{ inset: -5, background: 'rgba(193,68,14,0.35)' }}
                  animate={reducedMotion ? { opacity: 0.85, scale: 1 } : { opacity: [0.85, 1, 0.85], scale: [1, 1.08, 1] }}
                  transition={reducedMotion ? undefined : BREATH_PULSE}
                />
              )}
              <span
                className="relative rounded-full flex items-center justify-center"
                style={{
                  width: current ? 30 : 26,
                  height: current ? 30 : 26,
                  background: lit ? 'linear-gradient(135deg,#C1440E,#E8603C)' : 'rgba(193,68,14,0.1)',
                  border: current ? '2px solid #FFFAF7' : 'none',
                  boxShadow: current ? '0 0 0 2px rgba(193,68,14,0.6)' : lit ? '0 2px 6px rgba(193,68,14,0.3)' : 'none',
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
      <stop offset="0%" stopColor="#C1440E" />
      <stop offset="100%" stopColor="#E8603C" />
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
    <div className="relative w-full h-full flex items-center justify-center px-2">
      {/* No max-width cap - the bubble fills the available card width (the
          card's own padding is the only constraint), so the example
          phrases sit on two lines instead of three. The extra width reads
          fine against the surrounding empty space in the card. */}
      <div
        className="relative w-full px-5 py-4"
        style={{ background: C.white, borderRadius: '16px 16px 16px 6px', boxShadow: '0 6px 20px rgba(28,25,23,0.16)' }}
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
      {/* Overlaps the stack's bottom-right corner on purpose - this is
          the same PhotosCardArt desktop's StartCard renders, so the
          badge's position/size is shared rather than mobile-specific. */}
      <motion.div
        className="absolute rounded-full flex items-center justify-center"
        style={{
          width: 30, height: 30, right: '6%', bottom: '10%', zIndex: 5,
          background: 'linear-gradient(135deg,#C1440E,#E8603C)',
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
            fill="#E8603C"
            style={{ filter: 'drop-shadow(0 0 3px rgba(232,96,60,0.8))' }}
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
      <div className="absolute rounded-md" style={{ width: 26, height: 26, top: 6, left: 0, background: 'linear-gradient(135deg,#C1440E,#E8603C)', transform: 'rotate(-8deg)', boxShadow: '0 4px 12px rgba(193,68,14,0.28)' }} />
      <div className="absolute rounded-md" style={{ width: 26, height: 26, top: 0, left: 18, background: 'linear-gradient(135deg,#E8603C,#C1440E)', transform: 'rotate(6deg)', boxShadow: '0 4px 12px rgba(193,68,14,0.28)' }} />
    </div>
  );
}
function ReferenceToken() {
  return (
    <div
      className="rounded-lg"
      style={{ width: 34, height: 34, background: 'linear-gradient(135deg,#C1440E,#E8603C)', boxShadow: '0 4px 12px rgba(193,68,14,0.28)' }}
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
// Desktop only now - StartCard is rendered exclusively inside
// ConvergenceStage's `hidden sm:block` desktop device. Mobile has its own
// segmented picker + stage below (MobileInputStage), built directly from
// STEP1_CARDS' Illustration/label/support fields rather than through this
// component. Previously carried a parallel mobile branch (MobileArt in
// place of Illustration, support copy hidden); that branch was dead code
// once the mobile grid stopped rendering this component at all, so it's
// been removed rather than left inert.
function StartCard({ card, active, cardRef, onSelect }) {
  const Illustration = card.Illustration;
  return (
    <motion.button
      ref={cardRef}
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
      className="relative flex flex-col items-center text-center rounded-2xl px-7 py-8 cursor-pointer min-h-[44px]"
      style={{
        // Resting state was rgba(255,255,255,0.42) with a near-invisible
        // neutral shadow - once the convergence lines were quieted, cards
        // needed to become the section's actual focal point instead of
        // staying quiet themselves. Warm Paper at near-full opacity plus
        // DESIGN.md's terracotta-tinted "Emphasis, warm" shadow tier, at
        // rest, not just on the active card.
        background: active ? 'rgba(255,250,247,0.98)' : 'rgba(255,250,247,0.9)',
        boxShadow: active ? '0 16px 40px rgba(193,68,14,0.22)' : '0 6px 20px rgba(193,68,14,0.14)',
        transition: 'background 0.3s ease, box-shadow 0.3s ease',
      }}
    >
      <div className="w-full aspect-[4/3] mb-5 rounded-2xl overflow-hidden" style={{ background: '#FBF6F1' }}>
        <Illustration />
      </div>
      <p className="text-base font-bold" style={{ color: C.dark, lineHeight: 1.35 }}>
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
  { color: '#C1440E', delay: 1 },
  { color: '#d82906', delay: 2 },
];
const PULSE_CYCLE_S = 2;
// Reduced-motion fallback: freeze each ring at a fixed intermediate
// scale/opacity instead of animating, so the layered look still reads.
const PULSE_RINGS_STATIC = [
  { scale: 1.1, opacity: 0.4 },
  { scale: 1.2, opacity: 0.3 },
  { scale: 1.3, opacity: 0.2 },
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
    scale.set(1 + eased * 0.3);
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

// Play-once intro, not a loop: each line draws in, hands off to the next,
// then the whole composition settles into a quiet static state and stays
// there - critique feedback flagged the old infinite 5.8s loop as
// competing for attention indefinitely regardless of stroke weight.
// getLineState is now a pure function of elapsed time with no modulo -
// once elapsedS passes a line's own stage window it stays at
// drawProgress:1/flowActive:false forever, which IS the has-played gate
// (no separate boolean needed). Durations retuned for the compacted
// card-to-node run (was paced for the old ~192px mt-48 gap; the gap is
// now ~mt-20/80px, see the node wrapper below).
const LINE_DRAW_S = 0.35;
const LINE_HOLD_S = 0.3;
const LINE_STAGE_S = LINE_DRAW_S + LINE_HOLD_S;

function getLineState(elapsedS, index) {
  const lineStart = index * LINE_STAGE_S;
  if (elapsedS < lineStart) return { drawProgress: 0, flowActive: false };
  const local = elapsedS - lineStart;
  if (local < LINE_DRAW_S) return { drawProgress: local / LINE_DRAW_S, flowActive: false };
  if (local < LINE_STAGE_S) return { drawProgress: 1, flowActive: true };
  return { drawProgress: 1, flowActive: false };
}

// The node -> Step 2 connector shares this same clock (not its own scroll
// trigger) so it only starts once line 0 (Prompt -> node) has actually
// finished drawing - "this is what happens next," not a parallel
// animation. Also play-once, same reasoning as getLineState above.
const CONNECTOR_START_S = LINE_DRAW_S;
const CONNECTOR_DRAW_S = 0.2;
function getConnectorProgress(elapsedS) {
  const local = elapsedS - CONNECTOR_START_S;
  if (local <= 0) return 0;
  return Math.min(local / CONNECTOR_DRAW_S, 1);
}

// Step 1, desktop only (sm: and up) - rendered via a hidden sm:block
// wrapper at its call site in HowItWorks. Mobile has its own, much
// simpler MobileHowItWorks below instead of a smaller copy of this
// device: the measured convergence-lines diagram doesn't compress to
// phone width without losing the "three separate paths" message (see the
// critique this session that led to MobileHowItWorks). Measures each
// card's and the node's real position once mounted (and on resize), then
// drives everything in plain pixel transforms - no scroll involvement at
// all here, this mechanic is purely click-driven. activeId/tokens/pulseKey
// are local to this component on purpose: Step 2 and Step 3 are separate
// components below that never receive them, so there is no path - not
// even an accidental one - for a Step 1 click to reach them.
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
  const flowRefs = useRef([]);
  const pathLengthsRef = useRef([0, 0, 0]);
  const elapsedRef = useRef(0);
  const lastFrameRef = useRef(null);
  const connectorPathRef = useRef(null);
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
      const flowEl = flowRefs.current[i];
      // Softened, not full-strength: the flow overlay should read as a
      // quiet accent while it's briefly visible during the one-time draw,
      // never the most saturated moving thing on the page.
      if (flowEl) flowEl.style.opacity = flowActive ? '0.25' : '0';
    });

    const connectorProgress = reducedMotion ? 1 : getConnectorProgress(elapsedS);
    const cLen = connectorLengthRef.current || 0;
    const cOffset = `${cLen * (1 - connectorProgress)}`;
    if (connectorPathRef.current) connectorPathRef.current.style.strokeDashoffset = cOffset;
    if (connectorFlowRef.current) connectorFlowRef.current.style.opacity = !reducedMotion && connectorProgress >= 1 ? '0.35' : '0';
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
      el.style.strokeDasharray = `${length}`;
    });
    if (connectorPathRef.current) {
      const cLen = connectorPathRef.current.getTotalLength();
      connectorLengthRef.current = cLen;
      connectorPathRef.current.style.strokeDasharray = `${cLen}`;
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
          <linearGradient key={i} id={`line-fade-${i}`} gradientUnits="userSpaceOnUse" x1={c.x} y1={c.y} x2={c.x} y2={geo.node.y}>
            <stop offset="0%" stopColor="#E8603C" stopOpacity="1" />
            <stop offset="40%" stopColor="#E8603C" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#E8603C" stopOpacity="0" />
          </linearGradient>
          ))}
        </defs>
        {geo.cards.map((c, i) => {
          // Retuned for the compacted card-to-node run (was 0.15x/0.65y,
          // tuned for a ~200px vertical drop - that ratio reads as pinched
          // over the current ~80px gap). A more moderate control point
          // still produces a real curve, not a straight diagonal, without
          // over-committing to a long sideways drift it no longer has
          // vertical room for.
          const dy = geo.node.y - c.y;
          const d = `
            M ${c.x} ${c.y}
            C ${c.x} ${c.y + dy * 0.6},
              ${geo.node.x} ${geo.node.y - dy * 0.6},
              ${geo.node.x} ${geo.node.y}
          `;
          return (
            <g key={i}>
              {/* Crisp solid base line, fading toward the node - this is
                  what establishes the path is always there, before any
                  motion happens on top. No glow halo (removed - it was the
                  single biggest contributor to the lines outweighing the
                  cards/node they connect) and half the old stroke width. */}
              <path
                ref={(el) => { pathRefs.current[i] = el; }}
                data-line-index={i}
                d={d}
                stroke={`url(#line-fade-${i})`}
                strokeWidth="1.6"
                strokeLinecap="round"
                fill="none"
              />
              {/* Flowing overlay: same path, short dash + long gap, driven
                  by the sequential timeline above (opacity toggled
                  imperatively; only the current line's flow is ever
                  visible) - CSS animation for the actual dash motion since
                  it's continuous/linear and belongs off the main thread.
                  Path is authored card-first, so a decreasing dashoffset
                  moves the dash in the card->node direction. Thinner and
                  capped at 0.35 opacity (was 4px/opacity 1) so it never
                  reads as the most saturated moving element on the page -
                  and it now only ever plays once, during the intro. */}
              {!reducedMotion && (
                <path
                  ref={(el) => { flowRefs.current[i] = el; }}
                  d={d}
                  stroke="#FFD9C7"
                  strokeWidth="2"
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

      <div className="grid grid-cols-3 gap-5 relative z-10">
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

      {/* Compacted from mt-48 (192px) to mt-20 (80px, was measured at
          exactly 192px pre-fix - critique flagged this as ~430px of
          near-empty convergence zone dwarfing the ~352px cards). The node
          now anchors the composition instead of floating in a void below
          it; the shorter bezier retune above assumes this gap. */}
      <div className="flex justify-center mt-20 mb-3 relative z-10">
        <GlowNode containerRef={nodeRef} pulseKey={pulseKey} reducedMotion={reducedMotion} />
      </div>

      {/* Node -> Step 2: same beam language as the card lines (solid
          fading-from-node + flowing overlay - no glow halo, same as
          above), sharing the identical clock - only starts once line 0
          has finished drawing (see CONNECTOR_START_S), so it reads as
          "this is what happens next," not something running in parallel
          on its own timer. Shortened from 150px to 70px alongside the
          card-to-node compaction, so this second instance of the
          card-line "loud connective stroke" problem gets the same fix. */}
      <div className="flex justify-center relative z-10" aria-hidden="true">
        <svg className="w-6 h-[70px]" viewBox="0 0 24 70" fill="none">
          <defs>
            <linearGradient id="connector-fade" gradientUnits="userSpaceOnUse" x1="12" y1="2" x2="12" y2="56">
              <stop offset="0%" stopColor="#E8603C" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#E8603C" stopOpacity="1" />
            </linearGradient>
          </defs>
          <path ref={connectorPathRef} d="M12 2 V56" stroke="url(#connector-fade)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          {!reducedMotion && (
            <path
              ref={connectorFlowRef}
              d="M12 2 V56"
              stroke="#FFD9C7"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              strokeDasharray="8 24"
              style={{ opacity: 0, animation: 'raphio-flow 1.8s linear infinite', transition: 'opacity 0.3s ease' }}
            />
          )}
          <path
            ref={connectorArrowRef}
            d="M4 50 L12 60 L20 50"
            stroke="#C1440E"
            strokeWidth="1.4"
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
        <BuildDotRow stageIndex={stageIndex} phase={phase} reducedMotion={reducedMotion} />
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
          style={{ background: 'radial-gradient(60% 60% at 50% 40%, rgba(232,96,60,0.22), rgba(193,68,14,0) 72%)', filter: 'blur(28px)' }}
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
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgb(var(--ink-warm-rgb) / 0.5) 100%)' }} />
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
                  style={{ width: barWidth, background: 'linear-gradient(90deg,#C1440E,#E8603C)' }}
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
              <span className="text-[11px] font-semibold" style={{ color: 'rgba(255,250,247,0.92)' }}>1:45</span>
            </div>
          </div>
        </div>
      </motion.div>

      <p className="display mt-6 text-lg sm:text-xl" style={{ color: C.dark }}>Your complete video.</p>

      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 mt-3">
        {VIDEO_FEATURES.map((f) => (
          <span key={f} className="text-xs font-semibold" style={{ color: C.muted }}>
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

// Mobile chapter 1: segmented input picker + stage, replacing the old
// three-row list. A pill tablist selects which of the three real inputs
// (STEP1_CARDS) is shown full-size in a fixed-height stage below it, so
// switching inputs never reflows the timeline chapter underneath.
// Auto-cycles on a timer until the visitor interacts (tap a segment or a
// dot) - the same one-way-ratchet + focus-pause pattern SeeItInAction's
// carousel already uses (hasInteracted), reused rather than reinvented.
const INPUT_STAGE_CYCLE_MS = 4000;
// Height is the sum of a fixed budget: the illustration frame below
// (INPUT_STAGE_ART_WIDTH at its authored 4/3 ratio - the same ratio
// StartCard's desktop illustrations use) plus title + two lines of
// support copy plus the stage's own padding. Fixed for all three tabs
// on purpose (point 1 of the brief) - never sized per-stage.
const INPUT_STAGE_ART_WIDTH = 250;
const INPUT_STAGE_ART_HEIGHT = Math.round((INPUT_STAGE_ART_WIDTH * 3) / 4);
// py-7 padding (56) + gap (16) + title line (~22) + gap (6) + two lines
// of support copy (~40), plus a little slack for font-metric variance.
const INPUT_STAGE_HEIGHT = INPUT_STAGE_ART_HEIGHT + 125;

function MobileInputStage() {
  const reducedMotion = usePrefersReducedMotion();
  const n = STEP1_CARDS.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const tabRefs = useRef([]);

  const select = (i) => { setHasInteracted(true); setActiveIndex(i); };

  // Auto-cycle: stops for good on any tap (segment or dot), paused while
  // focus sits inside the control (WCAG 2.2.2), never starts under
  // reduced motion - input 1 just sits there statically.
  useEffect(() => {
    if (reducedMotion || isFocusWithin || hasInteracted) return;
    const id = setInterval(() => setActiveIndex((v) => (v + 1) % n), INPUT_STAGE_CYCLE_MS);
    return () => clearInterval(id);
  }, [reducedMotion, isFocusWithin, hasInteracted, n]);

  const handleKeyDown = (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    let next = activeIndex;
    if (e.key === 'ArrowLeft') next = (activeIndex - 1 + n) % n;
    else if (e.key === 'ArrowRight') next = (activeIndex + 1) % n;
    else if (e.key === 'Home') next = 0;
    else next = n - 1;
    select(next);
    tabRefs.current[next]?.focus();
  };

  const activeCard = STEP1_CARDS[activeIndex];
  const Illustration = activeCard.Illustration;

  return (
    <div
      onFocus={() => setIsFocusWithin(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsFocusWithin(false); }}
    >
      {/* Segmented control: a real tablist, roving tabindex + arrow-key
          navigation. The active fill is one always-mounted pill that
          translates between thirds, not a per-tab conditional element -
          simpler and more reliable than a shared layoutId here. */}
      <div
        role="tablist"
        aria-label="Choose how you start"
        onKeyDown={handleKeyDown}
        className="relative flex rounded-full mt-5"
        style={{ background: '#F0EAE5', padding: 4 }}
      >
        <motion.div
          aria-hidden="true"
          className="absolute rounded-full"
          style={{
            top: 0, bottom: 0, left: 0, width: `${100 / n}%`,
            background: C.terra,
            // Second border layer (DESIGN.md's warm shadow/border
            // vocabulary, never neutral/black): a white offset ring plus
            // a terracotta outer ring - the same look the button's own
            // focus-visible ring produced, now baked into the pill itself
            // so click and keyboard selection render identically instead
            // of the border only showing up on keyboard focus.
            boxShadow: '0 0 0 2px #FFFAF7, 0 0 0 4px rgba(193,68,14,0.55), 0 4px 14px rgba(193,68,14,0.35)',
          }}
          animate={{ x: `${activeIndex * 100}%` }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        />
        {STEP1_CARDS.map((card, i) => {
          const selected = i === activeIndex;
          return (
            <button
              key={card.id}
              ref={(el) => (tabRefs.current[i] = el)}
              type="button"
              role="tab"
              id={`input-tab-${card.id}`}
              aria-selected={selected}
              aria-controls={`input-panel-${card.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(i)}
              className="relative z-10 flex-1 rounded-full text-[13px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ minHeight: 44, color: selected ? '#fff' : C.muted, '--tw-ring-color': C.terra, transition: 'color 0.2s ease' }}
            >
              {card.tabLabel}
            </button>
          );
        })}
      </div>

      {/* Stage: fixed height so switching inputs never reflows the
          timeline chapter below it - both crossfade layers are absolute
          inside it, sized to the tallest of the three contents. */}
      <div className="relative w-full rounded-3xl mt-5 overflow-hidden" style={{ background: C.white, height: INPUT_STAGE_HEIGHT }}>
        <AnimatePresence initial={false}>
          <motion.div
            key={activeCard.id}
            id={`input-panel-${activeCard.id}`}
            role="tabpanel"
            aria-labelledby={`input-tab-${activeCard.id}`}
            className="absolute inset-0 flex flex-col items-center text-center px-6 py-7"
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: reducedMotion ? { duration: 0 } : { duration: 0.18, ease: [0, 0, 0.2, 1] } }}
            exit={reducedMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -8, transition: { duration: 0.12, ease: [0.4, 0, 1, 1] } }}
          >
            {/* Same 4/3 frame the Illustrations were authored for
                (StartCard's desktop `aspect-[4/3]`) - identical pixel
                size across all three tabs, so switching never resizes
                the card. Illustrations scale down to fit; none are
                stretched off their original ratio. */}
            <div className="mx-auto w-full" style={{ maxWidth: INPUT_STAGE_ART_WIDTH, aspectRatio: '4 / 3' }}>
              <Illustration />
            </div>
            <p className="text-[15px] font-bold mt-2" style={{ color: C.dark }}>{activeCard.label}</p>
            <p className="text-[13px] mt-1.5 max-w-[280px]" style={{ color: C.muted, lineHeight: 1.5 }}>{activeCard.support}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Position indicator: elongated active dot, same visual grammar
          AND the same gap-1.5 (6px) rhythm as SeeItInAction's carousel
          dots - real buttons here (not decorative), so the hit area is
          a modest 24px (WCAG 2.5.8 minimum) rather than the segmented
          control's 44px, which would force the dots visually far apart
          again regardless of gap. */}
      <div className="flex items-center justify-center gap-1.5 mt-4">
        {STEP1_CARDS.map((card, i) => {
          const selected = i === activeIndex;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => select(i)}
              aria-label={`Show ${card.tabLabel}`}
              aria-current={selected ? 'true' : undefined}
              className="flex items-center justify-center"
              style={{ width: 24, height: 24 }}
            >
              <span
                className="rounded-full"
                style={{
                  width: selected ? 16 : 6,
                  height: 6,
                  background: selected ? C.terra : '#EFDCD2',
                  transition: reducedMotion ? 'none' : 'width 0.25s ease, background-color 0.25s ease',
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Mobile chapter 2: vertical build timeline, replacing the old six-icon
// grid. Reuses useBuildTimeline verbatim (adapt the sequencing logic,
// don't duplicate it) - the same shared stageIndex/phase/rowOpacity
// clock desktop's BuildAssemblyCard drives its dot row from, just
// re-labelled for this component's own five steps and rendered as a
// vertical list instead of a horizontal row. Per-step icons and the
// active-step waveform are read directly off BUILD_STAGES by index
// (both arrays describe the same five stages, index-aligned, just with
// mobile-specific label copy) rather than a second icon set - point 4 of
// the brief: reuse desktop's icon set and label logic, don't invent one.
// Reduced motion deliberately diverges from the hook's own reduced-motion
// default (a frozen mid-sequence state): this component's brief calls
// for every step shown done and static instead, so that case is handled
// locally here rather than inside the shared hook.
const MOBILE_TIMELINE_STEPS = [
  { id: 'script', label: 'Script' },
  { id: 'storyboard', label: 'Storyboard' },
  { id: 'voice', label: 'Voice' },
  { id: 'music', label: 'Music' },
  { id: 'transitions', label: 'Transitions' },
];
const TIMELINE_GAP_H = 20;

// Same lit/unlit icon treatment as BuildDotRow's horizontal dots - the
// step's own icon is always present (white when lit, faint terracotta
// when pending), never swapped for a generic checkmark. Active adds
// BuildDotRow's pulse ring + white border on top of the same lit disc.
function TimelineIndicator({ state, icon, reducedMotion }) {
  const lit = state !== 'pending';
  const StepIcon = icon;
  return (
    <span className="relative flex items-center justify-center" style={{ width: 24, height: 24 }}>
      {state === 'active' && (
        <motion.span
          className="absolute rounded-full"
          style={{ inset: -5, background: 'rgba(193,68,14,0.35)' }}
          animate={reducedMotion ? { opacity: 0.85, scale: 1 } : { opacity: [0.85, 1, 0.85], scale: [1, 1.08, 1] }}
          transition={reducedMotion ? undefined : BREATH_PULSE}
        />
      )}
      <span
        className="relative rounded-full flex items-center justify-center"
        style={{
          width: 24,
          height: 24,
          background: lit ? 'linear-gradient(135deg,#C1440E,#E8603C)' : '#EFDCD2',
          border: state === 'active' ? '2px solid #FFFAF7' : 'none',
          boxShadow: state === 'active' ? '0 0 0 2px rgba(193,68,14,0.6)' : lit ? '0 2px 6px rgba(193,68,14,0.3)' : 'none',
        }}
      >
        <StepIcon style={{ width: 13, height: 13, color: lit ? '#fff' : 'rgba(193,68,14,0.4)' }} strokeWidth={2.25} />
      </span>
    </span>
  );
}

function MobileBuildTimeline() {
  const reducedMotion = usePrefersReducedMotion();
  const containerRef = useRef(null);
  const { stageIndex, phase, rowOpacity } = useBuildTimeline(containerRef, reducedMotion);
  const allSolid = phase === 'holding' || phase === 'fading';

  return (
    <div ref={containerRef}>
      <motion.div style={{ opacity: rowOpacity }} className="flex flex-col">
        {MOBILE_TIMELINE_STEPS.map((step, i) => {
          const completed = reducedMotion || allSolid || i < stageIndex;
          const current = !reducedMotion && !allSolid && i === stageIndex;
          const state = completed ? 'done' : current ? 'active' : 'pending';
          const segmentLit = i > 0 && (reducedMotion || allSolid || i <= stageIndex);
          const buildStage = BUILD_STAGES[i];
          return (
            <Fragment key={step.id}>
              {i > 0 && (
                <div className="flex justify-center" style={{ width: 24, height: TIMELINE_GAP_H }}>
                  <span
                    className="block"
                    style={{
                      width: 2,
                      height: TIMELINE_GAP_H,
                      borderRadius: 999,
                      background: segmentLit ? 'linear-gradient(180deg,#C1440E,#E8603C)' : '#EFDCD2',
                      transition: 'background 0.3s ease',
                    }}
                  />
                </div>
              )}
              <div className="flex items-center gap-3" style={{ minHeight: 44 }}>
                <span className="flex-shrink-0 flex items-center justify-center" style={{ width: 24 }}>
                  <TimelineIndicator state={state} icon={buildStage.icon} reducedMotion={reducedMotion} />
                </span>
                <span className="flex items-center gap-2">
                  <span
                    className="text-sm"
                    style={{
                      color: state === 'pending' ? C.muted : C.dark,
                      fontWeight: state === 'active' ? 700 : 600,
                    }}
                  >
                    {step.label}
                  </span>
                  {/* Desktop's active-label treatment: the level-meter
                      bars appear only for the voice stage, only while
                      it's active - reuses BuildWaveform verbatim. */}
                  {state === 'active' && buildStage.waveform && <BuildWaveform reducedMotion={reducedMotion} />}
                </span>
              </div>
            </Fragment>
          );
        })}
      </motion.div>
    </div>
  );
}

// Mobile-only "How it works" - a from-scratch vertical story, not a
// compressed copy of desktop's measured convergence-lines device (which
// stays completely unchanged for sm: and up). Three beats:
//   1. Choose how you start - MobileInputStage, a segmented picker over
//      a single fixed-height stage showing one real input at a time,
//      full-size and legible (auto-cycles until the visitor interacts).
//   2. Raphio builds your video - MobileBuildTimeline, a vertical
//      five-step sequence (script/storyboard/voice/music/transitions)
//      inside its own tinted panel so it reads as a distinct chapter,
//      not more of chapter 1.
//   3. Your complete video - the real finished-video asset, deliberately
//      the largest and most visually dominant moment in the section: the
//      transformation's payoff is the hero here, not the Raphio mark.
// Reuses only what already exists (STEP1_CARDS copy/Illustrations,
// useBuildTimeline, the real FINAL_SCENE video still, VIDEO_FEATURES) -
// no new claims.
function MobileHowItWorks() {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className="sm:hidden">
      {/* Chapter 1: choose how you start. */}
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="text-[15px] font-bold" style={{ color: C.dark }}>Choose how you start</p>
        <MobileInputStage />
      </motion.div>

      {/* Chapter 2: Raphio builds your video - a tinted panel marks this
          as its own beat, not a continuation of chapter 1. */}
      <motion.div
        className="rounded-3xl px-5 py-7 mt-10"
        style={{ background: C.bgAlt }}
        initial={reducedMotion ? false : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="text-[15px] font-bold text-center" style={{ color: C.dark }}>Raphio builds your video</p>
        <div className="mt-6 flex justify-center">
          <div className="w-full max-w-[220px]">
            <MobileBuildTimeline />
          </div>
        </div>
      </motion.div>

      {/* Chapter 3: the finished video - the largest, most visually
          dominant moment in the section on purpose. Same real asset and
          copy desktop's VideoShowcase uses (including its ambient glow
          treatment, copied verbatim), just the hero here instead of one
          of three sections sharing the scroll. */}
      <motion.div
        className="mt-10"
        initial={reducedMotion ? false : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div
          className="relative w-full"
          initial={reducedMotion ? false : { opacity: 0, scale: 0.94 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            className="absolute -inset-6 rounded-[40px] pointer-events-none"
            style={{ background: 'radial-gradient(60% 60% at 50% 40%, rgba(232,96,60,0.22), rgba(193,68,14,0) 72%)', filter: 'blur(28px)' }}
            aria-hidden="true"
          />
          <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '16 / 9', background: FINAL_SCENE.fallback, boxShadow: '0 20px 50px rgba(28,25,23,0.32)' }}>
            <img
              src={FINAL_SCENE.src}
              alt={FINAL_SCENE.alt}
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgb(var(--ink-warm-rgb) / 0.5) 100%)' }} />
            <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
              <span
                className="rounded-full flex items-center justify-center"
                style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.95)', boxShadow: '0 8px 24px rgba(0,0,0,0.28)' }}
              >
                <Play style={{ width: 20, height: 20, color: C.terra, marginLeft: 3 }} fill={C.terra} />
              </span>
            </div>
          </div>
        </motion.div>

        <p className="display mt-5 text-xl text-center" style={{ color: C.dark }}>Your complete video.</p>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 mt-3">
          {VIDEO_FEATURES.map((f) => (
            <span key={f} className="text-xs font-semibold" style={{ color: C.muted }}>
              {f}
            </span>
          ))}
        </div>
      </motion.div>
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

        {/* Desktop: the full three-step device (ConvergenceStage,
            BuildAssemblyCard, VideoShowcase), completely unchanged.
            Mobile: MobileHowItWorks replaces all three with one compact
            block - see its own comment for why. */}
        <div className="hidden sm:block">
          <ConvergenceStage />
          <div className="mt-6 sm:mt-8">
            <BuildAssemblyCard />
            <p className="text-center text-sm font-semibold mt-4" style={{ color: C.muted }}>
              Raphio builds your storyboard automatically.
            </p>
          </div>
          <div className="mt-16 sm:mt-20">
            <VideoShowcase />
          </div>
        </div>
        <MobileHowItWorks />

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
            Try it free
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}

// ── "See it in action": real output reel ────────────────────────
// Captions describe what the customer was trying to achieve, not the ad's
// genre - "Sell a product," not "Product showcase."
const SEE_IT_ITEMS = [
  { label: 'Promote an event', src: 'https://pub-130d5201a986450fa0c5297fa3bc461f.r2.dev/Travel_brand_ad_montage_202606181523.mp4' },
  { label: 'Sell a product', src: 'https://pub-130d5201a986450fa0c5297fa3bc461f.r2.dev/Luxury_watch_ad_Raphio_202606181523.mp4' },
  { label: 'Launch a new brand', src: 'https://pub-130d5201a986450fa0c5297fa3bc461f.r2.dev/Perfume_bottle_rotates_Raphio_br%E2%80%A6_202606181522.mp4' },
  { label: 'Advertise a restaurant', src: 'https://pub-130d5201a986450fa0c5297fa3bc461f.r2.dev/Burger_built_Raphio_brandmark_202606181522.mp4' },
];

// Carousel geometry/timing - one place to tune the fan-out and pace.
const CAROUSEL_DWELL_MS = 4500;
// Slower than a typical UI transition, and deliberately not the file's
// entrance curve ([0.16,1,0.3,1], a strong ease-out for things arriving).
// This is an already-visible element moving/morphing across the screen, so
// it gets ease-in-out instead - eases into the move and eases out of it,
// which reads as a calm glide rather than a snap. transform/filter/opacity
// all share this one duration+ease so the whole card settles as a single
// motion instead of its parts arriving at slightly different times.
const CAROUSEL_TRANSITION_MS = 900;
const CAROUSEL_EASE = 'cubic-bezier(0.65,0,0.35,1)';
// Style per |offset| from the centered card (0 = center). Anything beyond
// this list is hidden entirely (opacity 0, not interactive).
const CAROUSEL_DEPTH = [
  { scale: 1.12, opacity: 1, blur: 0 },
  { scale: 0.82, opacity: 0.65, blur: 1.5 },
  { scale: 0.68, opacity: 0.32, blur: 2.5 },
];

// One card's own job: play when it's the centered one, pause and rewind to
// its first frame (a de facto poster) once it stops being centered - never
// more than one video playing in the reel at a time. The reset is delayed
// until the card has actually finished shrinking/fading away instead of
// firing the instant it loses center: snapping a still-large, still-sharp
// video back to frame 0 mid-transition is exactly the "hard cut" this was
// built to avoid - by the time it resets, it's already small and blurred.
function CarouselCard({ item, isCenter, offset, cardWidth, positioned = true, instant = false, paused = false, onOpen }) {
  const videoRef = useRef(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isCenter && paused) {
      // The video modal is open: hold this frame rather than resetting to
      // frame 0 - it isn't losing center, it should pick back up exactly
      // where it left off once the modal closes.
      video.pause();
      return;
    }
    if (isCenter) {
      video.play().catch(() => {});
      return;
    }
    if (!positioned || instant) {
      video.pause();
      video.currentTime = 0;
      return;
    }
    const t = setTimeout(() => {
      video.pause();
      video.currentTime = 0;
    }, CAROUSEL_TRANSITION_MS);
    return () => clearTimeout(t);
  }, [isCenter, positioned, instant, paused]);

  const depth = positioned ? CAROUSEL_DEPTH[Math.min(Math.abs(offset), CAROUSEL_DEPTH.length)] : { scale: 1, opacity: 1, blur: 0 };
  if (positioned && !depth) return null;
  const scale = depth.scale * (isCenter && hovered ? 1.03 : 1);
  const gap = cardWidth < 260 ? 16 : 28;

  return (
    <div
      className={positioned ? 'absolute top-1/2' : 'flex-shrink-0 w-full sm:w-72'}
      style={positioned ? {
        left: '50%',
        width: cardWidth,
        transform: `translate(calc(-50% + ${offset * (cardWidth + gap)}px), -50%) scale(${scale})`,
        filter: depth.blur ? `blur(${depth.blur}px)` : 'none',
        opacity: depth.opacity,
        zIndex: 10 - Math.abs(offset),
        pointerEvents: Math.abs(offset) <= CAROUSEL_DEPTH.length ? 'auto' : 'none',
        transition: instant ? 'none' : `transform ${CAROUSEL_TRANSITION_MS}ms ${CAROUSEL_EASE}, filter ${CAROUSEL_TRANSITION_MS}ms ${CAROUSEL_EASE}, opacity ${CAROUSEL_TRANSITION_MS}ms ${CAROUSEL_EASE}`,
      } : undefined}
    >
      <button
        onClick={() => onOpen(item)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative w-full aspect-video rounded-2xl overflow-hidden block"
        style={{
          background: C.white,
          border: `1px solid ${C.faint}`,
          boxShadow: isCenter ? '0 24px 60px rgba(28,25,23,0.28)' : '0 4px 18px rgba(28,25,23,0.1)',
          transition: 'box-shadow 0.3s ease',
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
          style={{ background: 'rgb(var(--ink-warm-rgb) / 0.28)', opacity: isCenter && hovered ? 1 : 0 }}
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
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  // Scroll lock: restore whatever value body.style.overflow already had
  // (rather than assuming it was empty) so this can't clobber a lock some
  // other feature set. Only runs while this component stays mounted -
  // AnimatePresence keeps it mounted through the exit animation, so the
  // page stays locked until the close transition actually finishes.
  useEffect(() => {
    const { style } = document.body;
    const prevOverflow = style.overflow;
    style.overflow = 'hidden';
    return () => { style.overflow = prevOverflow; };
  }, []);

  // Focus management: remember whatever had focus before opening (the
  // triggering card), move focus into the modal, trap Tab/Shift+Tab within
  // it so keyboard users can't tab out to the dimmed page behind the scrim,
  // and restore focus to the trigger on close.
  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement;
    closeButtonRef.current?.focus();

    const handleTab = (e) => {
      if (e.key !== 'Tab' || !modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll(
        'button, [href], video, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleTab);
    return () => {
      window.removeEventListener('keydown', handleTab);
      previouslyFocusedRef.current?.focus?.();
    };
  }, []);

  return (
    <motion.div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label={item.label}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6"
      style={{ background: 'rgb(var(--ink-warm-rgb) / 0.88)' }}
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
        ref={closeButtonRef}
        onClick={onClose}
        aria-label="Close video"
        className="absolute top-5 right-5 sm:top-8 sm:right-8 flex items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.12)', color: '#fff', '--tw-ring-color': '#fff' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
      >
        <X className="w-5 h-5" />
      </button>
    </motion.div>
  );
}

// Three copies of the reel back to back so the carousel can drift past the
// last item straight into a duplicate first item, then get silently
// snapped back a set (identical content, no visible seam) instead of
// sliding backwards - the standard infinite-marquee trick, sized down to
// four items.
const CAROUSEL_ITEMS_TRIPLED = [0, 1, 2].flatMap((setIndex) =>
  SEE_IT_ITEMS.map((item, i) => ({ ...item, key: `${setIndex}-${i}` }))
);

// Flat Functional register (DESIGN.md), outline-only variant: Clay Mist
// border, no fill at rest, Kiln Terracotta chevron - bounded enough to
// read as a button without ever being the section's highest-contrast
// element (One Warm Voice Rule: solid terracotta means "the thing to act
// on," which manual carousel navigation isn't). Chevron, not a triangle,
// so it never reads as a video-play affordance next to the cards above.
function CarouselArrowButton({ direction, onClick }) {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight;
  const label = direction === 'prev' ? 'Previous video' : 'Next video';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="group flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{ width: 44, height: 44, '--tw-ring-color': C.terra }}
    >
      <span
        className="flex items-center justify-center rounded-full transition-colors group-hover:bg-[#F0EAE5] group-hover:border-[#C1440E] group-focus-visible:bg-[#F0EAE5] group-focus-visible:border-[#C1440E]"
        style={{ width: 36, height: 36, border: '1px solid #EFDCD2', color: C.terra }}
      >
        <Icon style={{ width: 18, height: 18 }} strokeWidth={2.25} />
      </span>
    </button>
  );
}

function SeeItInAction() {
  const [activeItem, setActiveItem] = useState(null);
  const reducedMotion = usePrefersReducedMotion();
  const isMobile = useIsMobile();
  const n = SEE_IT_ITEMS.length;
  const [activeVirtual, setActiveVirtual] = useState(n);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  // One-way ratchet, not a toggle: once the visitor drives the carousel
  // manually, auto-advance stops for good (WCAG 2.2.2 - the user has taken
  // control, so nothing should start moving on its own again).
  const [hasInteracted, setHasInteracted] = useState(false);
  const [skipTransition, setSkipTransition] = useState(false);
  const cardWidth = isMobile ? 220 : 320;
  const currentIndex = ((activeVirtual % n) + n) % n;
  const goPrev = () => { setHasInteracted(true); setActiveVirtual((v) => v - 1); };
  const goNext = () => { setHasInteracted(true); setActiveVirtual((v) => v + 1); };

  // Auto-drift: paused while keyboard focus is inside the carousel (WCAG
  // 2.2.2 - stays regardless of manual interaction, since focus can land on
  // a card directly), permanently stopped once the visitor uses either
  // arrow, while a card's video is expanded in the modal, and never started
  // at all under reduced motion (point 3 of the brief - passive
  // reduced-motion visitors get a static, arrow-only carousel with nothing
  // to opt out of). Deliberately NOT paused on hover: hovering a card
  // surfaces its own play-button overlay (CarouselCard's local hover
  // state), which would otherwise occlude the video the instant the
  // carousel stopped moving.
  useEffect(() => {
    if (reducedMotion || isFocusWithin || hasInteracted || activeItem) return;
    const id = setInterval(() => setActiveVirtual((v) => v + 1), CAROUSEL_DWELL_MS);
    return () => clearInterval(id);
  }, [reducedMotion, isFocusWithin, hasInteracted, activeItem]);

  // Once drifted into the third (duplicate) set, wait for that slide-in to
  // finish, then jump back a set with the transition off for one frame -
  // invisible, since the two sets are literally identical content.
  useEffect(() => {
    if (reducedMotion || activeVirtual < n * 2) return;
    const t = setTimeout(() => {
      setSkipTransition(true);
      setActiveVirtual((v) => v - n);
    }, CAROUSEL_TRANSITION_MS);
    return () => clearTimeout(t);
  }, [activeVirtual, n, reducedMotion]);

  // Mirror of the wrap above, for the "prev" arrow: manual navigation can
  // now walk backward past the first (duplicate) set, so it needs the same
  // invisible snap-forward once that slide-in finishes.
  useEffect(() => {
    if (reducedMotion || activeVirtual >= n) return;
    const t = setTimeout(() => {
      setSkipTransition(true);
      setActiveVirtual((v) => v + n);
    }, CAROUSEL_TRANSITION_MS);
    return () => clearTimeout(t);
  }, [activeVirtual, n, reducedMotion]);

  useEffect(() => {
    if (!skipTransition) return;
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setSkipTransition(false)));
    return () => cancelAnimationFrame(raf);
  }, [skipTransition]);

  return (
    <section className="py-24 px-6" style={{ background: C.bg }}>
      <div className="max-w-6xl mx-auto relative">
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.terra }}>See it in action</p>
          <h2 className="display" style={{ fontSize: 'clamp(28px,4vw,44px)', color: C.dark, letterSpacing: '-0.01em', lineHeight: 1.1 }}>
            Made entirely with Raphio
          </h2>
          <p className="text-base mt-3" style={{ color: C.muted }}>
            Real outputs from real prompts, no editing, no post-production.
          </p>
        </div>

        {reducedMotion ? (
          // Static, arrow-driven only (point 3 of the brief): no drift
          // timer ever runs under reduced motion, so there's nothing to
          // opt out of for a visitor who never touches the arrows. One
          // card at a time, no depth/scale/blur composition - `positioned
          // ={false}` is the same flat rendering CarouselCard already uses
          // for the modal-triggering thumbnail, just single instead of a
          // wrapped row of all four.
          <div className="flex justify-center">
            <CarouselCard
              key={SEE_IT_ITEMS[currentIndex].label}
              item={SEE_IT_ITEMS[currentIndex]}
              isCenter={false}
              offset={0}
              cardWidth={cardWidth}
              positioned={false}
              onOpen={setActiveItem}
            />
          </div>
        ) : (
          <div
            className="relative overflow-hidden"
            style={{ height: cardWidth * 0.5625 * 1.12 + 60 }}
            onFocus={() => setIsFocusWithin(true)}
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsFocusWithin(false); }}
          >
            {CAROUSEL_ITEMS_TRIPLED.map((item, idx) => {
              const offset = idx - activeVirtual;
              if (Math.abs(offset) > CAROUSEL_DEPTH.length) return null;
              return (
                <CarouselCard
                  key={item.key}
                  item={item}
                  isCenter={offset === 0}
                  offset={offset}
                  cardWidth={cardWidth}
                  instant={skipTransition}
                  paused={!!activeItem}
                  onOpen={setActiveItem}
                />
              );
            })}
          </div>
        )}

        {/* Position indicator + prev/next, grouped as one unit directly
            under the carousel they control. A symmetric pair flanking the
            dots balances the row's visual weight on its own - no phantom
            spacer needed here the way the old single autoplay button
            required one. Rendered for both motion preferences: reduced-
            motion visitors get arrows as their only way to move at all. */}
        <div className="flex items-center justify-center gap-3 mt-5">
          <CarouselArrowButton direction="prev" onClick={goPrev} />
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {SEE_IT_ITEMS.map((_, i) => {
              const active = i === currentIndex;
              return (
                <span
                  key={i}
                  className="rounded-full"
                  style={{
                    width: active ? 16 : 6,
                    height: 6,
                    background: active ? C.terra : C.faint,
                    transition: 'width 0.25s ease, background-color 0.25s ease',
                  }}
                />
              );
            })}
          </div>
          <CarouselArrowButton direction="next" onClick={goNext} />
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
function ContactSection() {
  return (
    <section
      id="contact"
      className="py-24 px-6"
      style={{
        background: "rgba(193,68,14,0.03)",
        borderTop: "1px solid rgba(193,68,14,0.08)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.55 }}
        className="max-w-2xl mx-auto text-center"
      >
        {/* Heading */}

        <h2
          className="display"
          style={{
            fontSize: "clamp(32px,4vw,48px)",
            color: C.dark,
            lineHeight: 1.06,
            letterSpacing: "-0.03em",
          }}
        >
          We're based in Melbourne.
          <br />
          We actually reply.
        </h2>

        {/* Supporting copy */}

        <p
          className="mt-6"
          style={{
            color: C.muted,
            fontSize: 17,
            lineHeight: 1.75,
            maxWidth: 560,
            marginInline: "auto",
          }}
        >
          Whether it's pricing, features or your first video, we're happy to help.
        </p>

        {/* Email CTA */}

        <div className="mt-9">
          <a
            href="mailto:contact@raphio.ai"
            className="group inline-flex flex-col items-center gap-2 relative"
            style={{
              textDecoration: "none",
            }}
          >

            <div className="flex items-center gap-2">
              <span
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 34,
                  height: 34,
                  background: "rgba(193,68,14,0.10)",
                  transition: "all .28s ease",
                }}
              >
                <Mail
                  size={16}
                  style={{
                    color: C.terra,
                  }}
                  className="transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-0.5"
                />
              </span>

              <span
                style={{
                  fontSize: "clamp(22px,2.5vw,28px)",
                  fontWeight: 700,
                  letterSpacing: "-0.025em",
                  color: C.dark,
                  transition: "color .25s ease, transform .25s ease",
                }}
                className="group-hover:text-[#C1440E] group-hover:-translate-y-[1px]"
              >
                contact@raphio.ai
              </span>

              <ArrowRight
                size={18}
                style={{
                  color: C.terra,
                  transition: "transform .28s ease",
                }}
                className="group-hover:translate-x-2"
              />
            </div>

            {/* Animated underline */}

            <span
              style={{
                position: "absolute",
                bottom: -7,
                left: "50%",
                width: "100%",
                height: 2,
                background: C.terra,
                transform: "translateX(-50%) scaleX(0)",
                transformOrigin: "center",
                transition: "transform .32s cubic-bezier(.22,1,.36,1)",
              }}
              className="group-hover:translate-x-[-50%] group-hover:scale-x-100"
            />
          </a>
        </div>

        {/* Trust row */}

        <div
          className="mt-11 flex flex-wrap justify-center items-center gap-x-8 gap-y-3"
          style={{
            color: C.muted,
            fontSize: 14,
          }}
        >
          <div className="flex items-center gap-2">
            <MapPin
              size={15}
              style={{
                color: C.terra,
                opacity: 0.9,
              }}
            />

            <span>Based in Melbourne, Australia</span>
          </div>

          <div className="flex items-center gap-2">
            <Clock3
              size={15}
              style={{
                color: C.terra,
                opacity: 0.9,
              }}
            />

            <span>Usually replies within one business day</span>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

// Mobile menu motion: restrained, no bounce/spring/overshoot - a drawer
// opening, not a trick. Open is slower and the scrim trails the panel
// slightly so the two layers read as distinct; close is faster and moves
// as one coordinated unit (see the panel/scrim variants below).
const MENU_EASE_OUT = [0.16, 1, 0.3, 1];
const MENU_EASE_IN = [0.4, 0, 1, 1];

// ── Primary View Component ───────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const reducedMotion = usePrefersReducedMotion();
  const goToAppOrLogin = () => navigate(user ? '/videos' : '/login');
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // The open mobile menu should read as a real state change, not a
  // transparent dropdown floating over untouched chrome - so the header
  // adopts its solid "scrolled" look whenever the menu is open, even at
  // the very top of the page where scrolled is false.
  const headerSolid = scrolled || mobileMenuOpen;

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // Mobile menu: close on Escape (matches the mouse/tap dismiss paths) so
  // keyboard users get the same exit without hunting for a close button.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setMobileMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileMenuOpen]);

  // Scrim + full-bleed panel reads as a real state change (the page is "in
  // menu mode"), so scroll should lock the same way it does for the video
  // modal - restoring whatever value was already there rather than
  // assuming it was empty.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const { style } = document.body;
    const prevOverflow = style.overflow;
    style.overflow = 'hidden';
    return () => { style.overflow = prevOverflow; };
  }, [mobileMenuOpen]);

  const scrollTo = (id) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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

      {/* Navbar. The bar's own background/blur lives on a dedicated
          full-width layer below, not on <header> itself and not on the
          row's own max-w-6xl container - <header> wraps both the row AND
          the open mobile panel, and the panel has its own curved bottom
          edge, so a background painted on <header> itself would be a
          plain rectangle sitting behind that curve (a straight edge
          exposed in the corners the curve cuts away). But the background
          also can't live on the row's own max-w-6xl/mx-auto div: past the
          1152px breakpoint that container centers and stops spanning the
          full viewport, leaving the header's edges transparent past that
          width. So it's a separate absolutely-positioned layer, sized to
          exactly the row's h-14 height (never the panel below it) but
          spanning the full header width regardless of content max-width. */}
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-200">
        <div className="absolute inset-x-0 top-0 h-14" style={{
          background: headerSolid ? 'rgba(245,240,235,0.92)' : 'linear-gradient(180deg, rgb(var(--ink-warm-rgb) / 0.46) 0%, rgb(var(--ink-warm-rgb) / 0.20) 70%, rgb(var(--ink-warm-rgb) / 0) 100%)',
          backdropFilter: headerSolid ? 'blur(14px)' : 'none',
        }} />
        <div className="relative max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-8">
            <button onClick={() => scrollTo('hero')} className="hover:opacity-80 transition-opacity">
              <img src={headerSolid ? '/Logo.svg' : '/Logo-Light.svg'} alt="Raphio" className="h-7" />
            </button>
            <nav className="hidden sm:flex items-center gap-1.5">
              {[['How it works','how-it-works'],['Pricing','pricing'],['Contact','contact']].map(([label, id]) => (
                <button key={id} onClick={() => scrollTo(id)}
                  className="px-3.5 py-2 text-sm font-bold"
                  style={{
                    color: scrolled ? C.dark : 'rgba(255,250,247,0.92)',
                    textShadow: scrolled ? 'none' : '0 1px 6px rgb(var(--ink-warm-rgb) / 0.35)',
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
            {/* Log in / Try it free: desktop only, unchanged. */}
            <button onClick={goToAppOrLogin}
              className="hidden sm:flex items-center px-3.5 py-2 text-sm font-bold min-h-[44px]"
              style={{
                color: scrolled ? C.dark : 'rgba(255,250,247,0.92)',
                textShadow: scrolled ? 'none' : '0 1px 6px rgb(var(--ink-warm-rgb) / 0.35)',
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
              className="hidden sm:flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold transition-all min-h-[44px]"
              style={{
                background: scrolled ? C.white : 'transparent',
                color: scrolled ? C.terra : '#FFFAF7',
                border: `1.5px solid ${scrolled ? C.terra : 'rgba(255,250,247,0.55)'}`,
              }}
              onMouseEnter={e => { e.currentTarget.style.background=`linear-gradient(135deg,${C.terra},${C.terraLt})`; e.currentTarget.style.color='#fff'; e.currentTarget.style.borderColor='transparent'; e.currentTarget.style.boxShadow=`0 4px 16px rgba(193,68,14,0.30)`; }}
              onMouseLeave={e => { e.currentTarget.style.background = scrolled ? C.white : 'transparent'; e.currentTarget.style.color = scrolled ? C.terra : '#FFFAF7'; e.currentTarget.style.borderColor = scrolled ? C.terra : 'rgba(255,250,247,0.55)'; e.currentTarget.style.boxShadow='none'; }}
            >Try it free <ArrowRight className="w-3.5 h-3.5" /></button>
            {/* Mobile: hamburger/X only, far right - opposite the logo, not
                clustered with it. The closed mobile header is just logo +
                toggle; Try it free and Log in live in the open panel below
                instead of crowding this bar. Position never changes between
                icon states - only the glyph swaps. */}
            <button
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-menu"
              className="sm:hidden flex items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ width: 44, height: 44, color: headerSolid ? C.dark : 'rgba(255,250,247,0.92)', '--tw-ring-color': C.terra }}
            >
              {/* Hamburger -> X: the two outer bars rotate to meet at
                  center, the middle bar collapses (scales + fades) rather
                  than cutting instantly. Plain CSS transitions (not Framer
                  Motion) so rapid re-taps retarget smoothly instead of
                  restarting. Open is slower/ease-out, close is
                  faster/ease-in, matching the panel/scrim below. */}
              <span className="relative block" style={{ width: 20, height: 20 }} aria-hidden="true">
                {[-6, 0, 6].map((restY, i) => {
                  const isMiddle = i === 1;
                  const transitionStyle = reducedMotion
                    ? 'none'
                    : mobileMenuOpen
                      ? `transform 300ms cubic-bezier(${MENU_EASE_OUT.join(',')}), opacity 300ms cubic-bezier(${MENU_EASE_OUT.join(',')})`
                      : `transform 240ms cubic-bezier(${MENU_EASE_IN.join(',')}), opacity 240ms cubic-bezier(${MENU_EASE_IN.join(',')})`;
                  const transform = mobileMenuOpen
                    ? isMiddle ? 'translateY(0px) scaleX(0.4)' : `translateY(0px) rotate(${i === 0 ? 45 : -45}deg)`
                    : `translateY(${restY}px) rotate(0deg)`;
                  return (
                    <span
                      key={i}
                      className="absolute left-0 top-1/2 rounded-full"
                      style={{
                        width: 18,
                        height: 2,
                        marginTop: -1,
                        background: 'currentColor',
                        transform,
                        opacity: isMiddle && mobileMenuOpen ? 0 : 1,
                        transition: transitionStyle,
                      }}
                    />
                  );
                })}
              </span>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              id="mobile-nav-menu"
              className="sm:hidden"
              variants={{
                // "Slides down from beneath the header": hidden state sits
                // shifted up by its own height (translateY(-100%), so it
                // scales with content instead of a hardcoded px value),
                // tucked behind the opaque header bar above it.
                hidden: { opacity: 0, transform: reducedMotion ? 'translateY(0%)' : 'translateY(-100%)' },
                visible: {
                  opacity: 1,
                  transform: 'translateY(0%)',
                  transition: {
                    duration: reducedMotion ? 0 : 0.3,
                    ease: MENU_EASE_OUT,
                    staggerChildren: reducedMotion ? 0 : 0.04,
                    delayChildren: reducedMotion ? 0 : 0.09,
                  },
                },
                // Reverse as one unit, not three separate things: no
                // staggerChildren here, so links/CTA/Log in move out
                // together with the panel rather than cascading.
                exit: {
                  opacity: 0,
                  transform: reducedMotion ? 'translateY(0%)' : 'translateY(-100%)',
                  transition: { duration: reducedMotion ? 0 : 0.24, ease: MENU_EASE_IN },
                },
              }}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{ background: C.bg, borderTop: `1px solid ${C.faint}`, borderRadius: '0 0 50% 50% / 0 0 20px 20px', boxShadow: '0 20px 40px rgb(var(--ink-warm-rgb) / 0.22)' }}
            >
              {/* Inner content column, capped at 300px, left-aligned (not
                  centered), and inset ml-6 from the panel edge - the panel
                  background stays full-bleed behind it, so this fixes the
                  "left-aligned links look sparse / CTA reads as a banner"
                  problem at the container level without touching the
                  panel's own shape. Left-aligned rather than centered so
                  it echoes the header's own asymmetric composition above
                  it (logo left, toggle right). The ml-6 inset is on this
                  shared wrapper, not on the links or CTA individually, so
                  the whole column - links and CTA alike - moves together
                  off one reference edge instead of drifting apart. */}
              <div className="max-w-[300px] ml-6">
                {/* Navigation zone: no hairlines between rows - vertical
                    gap + row height do the separating, so this reads as a
                    considered nav panel rather than a settings list.
                    Leading icons are Ink Plum, never terracotta (One Warm
                    Voice Rule - terracotta stays reserved for the CTA). */}
                <div className="flex flex-col gap-2 pt-2">
                  {[['How it works', 'how-it-works', Workflow], ['Pricing', 'pricing', Tag], ['Contact', 'contact', Mail]].map((item) => {
                    const [label, id] = item;
                    const NavIcon = item[2];
                    return (
                      <motion.button
                        key={id}
                        variants={{
                          hidden: { opacity: 0, transform: reducedMotion ? 'translateY(0px)' : 'translateY(4px)' },
                          visible: { opacity: 1, transform: 'translateY(0px)' },
                          exit: { opacity: 1, transform: 'translateY(0px)' },
                        }}
                        onClick={() => scrollTo(id)}
                        className="w-full flex items-center gap-3 text-left px-6 font-bold text-base rounded-lg active:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
                        style={{ height: 52, color: C.dark, '--tw-ring-color': C.terra }}
                      >
                        <NavIcon className="w-[18px] h-[18px] shrink-0" strokeWidth={2} style={{ color: C.dark }} />
                        {label}
                      </motion.button>
                    );
                  })}
                </div>
                {/* The ask zone: separated from navigation above by space
                    alone (no divider line - one more hairline here would
                    undercut the point of removing them above), then closed
                    out with real bottom padding + the panel's own rounded
                    corners so it doesn't just stop mid-air. Both CTA and
                    Log in ride the panel's own exit rather than animating
                    on their own, so close reads as one unit collapsing,
                    not three. */}
                <motion.div
                  variants={{
                    hidden: { opacity: 0, transform: reducedMotion ? 'translateY(0px)' : 'translateY(4px)' },
                    visible: { opacity: 1, transform: 'translateY(0px)' },
                    exit: { opacity: 1, transform: 'translateY(0px)' },
                  }}
                  className="mt-6 px-6 pb-8 flex flex-col gap-2"
                >
                  {/* Flat register inside a panel, not a floating CTA - no
                      warm glow/lift (that language is for elements sitting
                      above open page content; this one sits flat in a
                      surface). Inset via mx-4 on top of the zone's own
                      px-6 and the 300px column above, so it reads as a
                      button, not a banner. Press feedback replaces hover
                      lift since this is a touch-first surface. */}
                  <button
                    onClick={() => { setMobileMenuOpen(false); goToAppOrLogin(); }}
                    className="mx-4 flex items-center justify-center gap-2 rounded-full text-base font-bold text-white transition-transform duration-150"
                    style={{ height: 48, background: `linear-gradient(135deg,${C.terra},${C.terraLt})` }}
                    onMouseEnter={e => { e.currentTarget.style.background = `linear-gradient(135deg, #5C1000, ${C.terra})`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(135deg,${C.terra},${C.terraLt})`; }}
                    onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                    onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    Try it free
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  {/* Plain link register, not a button - terracotta +
                      underline is the sole clickability cue, deliberately
                      lighter than the bounded-ghost alternative so it
                      stays subordinate to the CTA pill above it. Tight
                      gap-2 to the pill (down from gap-3) so it reads as
                      attached to the ask, not floating on its own. */}
                  <button
                    onClick={() => { setMobileMenuOpen(false); goToAppOrLogin(); }}
                    className="w-full text-center text-sm font-semibold rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
                    style={{
                      height: 44,
                      color: C.terra,
                      textDecoration: 'underline',
                      textUnderlineOffset: '3px',
                      textDecorationThickness: '1.5px',
                      textDecorationColor: 'rgba(193,68,14,0.55)',
                      '--tw-ring-color': C.terra,
                    }}
                  >
                    Log in
                  </button>
                </motion.div>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* Scrim: dims the page behind the open mobile menu so it reads as a
          real state change ("the page is in menu mode"), not just a small
          dropdown - tinted per the Warm Shadow Rule (Warm Char, never
          plain black). Sits below the header's z-50 so the header itself
          (logo, hamburger/X) stays reachable while open; a click anywhere
          else closes the menu. The header also switches to its solid
          "scrolled" look while open (see headerSolid) so it visually joins
          the dimmed page instead of floating untouched above it. Fades in
          slightly behind the panel (delayChildren-style stagger via its own
          `delay`) so the two layers read as distinct on open; on close both
          move together with no delay, matching the panel's coordinated
          exit. */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="sm:hidden fixed inset-0 z-40"
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: reducedMotion ? 0 : 0.35, ease: MENU_EASE_OUT, delay: reducedMotion ? 0 : 0.075 } }}
            exit={{ opacity: 0, transition: { duration: reducedMotion ? 0 : 0.24, ease: MENU_EASE_IN } }}
            style={{ background: 'rgb(var(--ink-warm-rgb) / 0.3)' }}
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Hero: fullscreen cinematic video */}
      <section id="hero" className="relative w-full overflow-hidden" style={{ height: '100vh', minHeight: 600, background: C.dark }}>
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
          style={{ background: 'linear-gradient(180deg, rgb(var(--ink-warm-rgb) / 0.55) 0%, rgb(var(--ink-warm-rgb) / 0.42) 45%, rgb(var(--ink-warm-rgb) / 0.62) 100%)' }}
        />

        {/* Extra vignette centered on the text block, so contrast holds even over bright/busy footage */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 62% 58% at 50% 48%, rgb(var(--ink-warm-rgb) / 0.38) 0%, rgb(var(--ink-warm-rgb) / 0.12) 65%, rgb(var(--ink-warm-rgb) / 0) 100%)' }}
        />

        {/* Headline content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <motion.h1
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease: [0.22,1,0.36,1] }}
            className="display leading-none max-w-4xl"
            style={{ fontSize: 'clamp(38px,6vw,72px)', color: '#FFFAF7', letterSpacing: '-0.01em', lineHeight: 1.08, textShadow: '0 1px 3px rgba(0,0,0,0.55), 0 4px 28px rgba(0,0,0,0.45)' }}
          >
            AI videos that tell the{' '}
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
              onClick={() => navigate(user ? '/create' : '/login')}
              className="inline-flex items-center gap-2 px-10 py-4 rounded-full text-base font-bold text-white transition-all duration-300"
              style={{ background: `linear-gradient(135deg,${C.terra},${C.terraLt})`, boxShadow: '0 4px 24px rgba(193,68,14,0.35)' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 40px rgba(193,68,14,0.55)'; e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 24px rgba(193,68,14,0.35)'; e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}
            >
              Try it free
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>

        </div>
      </section>

      {/* Hero footnote: closes out the hero's dark band on its own now that
          the stats strip below it is gone, so it needs enough weight to read
          as a deliberate close rather than a leftover sliver before the
          cream section starts */}
      <div className="py-12 px-6 text-center" style={{ background: C.dark }}>
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
              Pay once.<br />Create when you want.
            </h2>
            <p className="text-base max-w-md mx-auto" style={{ color: C.muted }}>
              No subscriptions, no expiring credits. Buy a pack and create on your own schedule.
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
                id: 'free', label: 'Free', price: 0, credits: 3,
                icon: Sparkles, cta: 'Try it free', popular: false,
                features: [
                  { text: 'e.g. one 15s video', ok: true  },
                ],
              },
              {
                id: 'starter', label: 'Starter', price: 29, credits: 6,
                icon: Zap, cta: 'Get Starter pack', popular: false,
                features: [
                  { text: 'e.g. two 15s videos, or one 30s video', ok: true  },
                ],
              },
              {
                id: 'creator', label: 'Creator', price: 55, credits: 12,
                icon: Layers, cta: 'Get Creator Pack', popular: true,
                features: [
                  { text: 'e.g. two 30s videos, or one 60s video',  ok: true  },
                ],
              },
              {
                id: 'studio', label: 'Studio', price: 99, credits: 24,
                icon: Crown, cta: 'Get Studio Pack', popular: false,
                features: [
                  { text: 'e.g. two 60s videos, or one 2-minute video', ok: true },
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
                              ? <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#0D9669' }} />
                              : <XCircle   className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'rgba(193,68,14,0.35)' }} />
                            }
                            <span className="text-xs leading-snug" style={{ color: '#2C2420' }}>{f.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <PricingButton
                      tier={tier}
                      onClick={() => tier.price === 0 ? navigate(user ? '/create' : '/login') : navigate('/login?redirect=/pricing')}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Credit unit legend */}
          <div className="rounded-2xl p-5 mb-6 mx-auto max-w-md text-center"
            style={{ background: '#FFFAF7', border: '1.5px solid rgba(193,68,14,0.12)' }}>
            <p className="text-sm font-bold" style={{ color: C.terra }}>
              1 credit = 5 seconds of video · assembled video up to 2 min
            </p>
            <p className="text-xs mt-2" style={{ color: C.muted }}>
              Credits never expire. Spend them whenever you're ready.
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
            <p className="text-base mb-10" style={{ color:'rgba(245,240,235,0.68)' }}>Free to start. No credit card required.</p>
            <button onClick={() => navigate(user ? '/create' : '/login')}
              className="inline-flex items-center gap-2 px-10 py-4 rounded-full text-base font-bold text-white transition-all duration-300"
              style={{ background:`linear-gradient(135deg,${C.terra},${C.terraLt})`, boxShadow:`0 4px 24px rgba(193,68,14,0.35)` }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow=`0 8px 40px rgba(193,68,14,0.55)`; e.currentTarget.style.transform='translateY(-2px) scale(1.02)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow=`0 4px 24px rgba(193,68,14,0.35)`; e.currentTarget.style.transform='translateY(0) scale(1)'; }}
            >Try it free <ArrowRight className="w-4 h-4" /></button>
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