import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence, useMotionValueEvent } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Play, Mic, Sparkles, Upload, Wand2 } from "lucide-react";

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

// ── Animated counter ──────────────────────────────────────────────
function Counter({ to, suffix = '' }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let cur = 0;
    const step = Math.ceil(to / 40);
    const t = setInterval(() => {
      cur += step;
      if (cur >= to) { setVal(to); clearInterval(t); }
      else setVal(cur);
    }, 28);
    return () => clearInterval(t);
  }, [inView, to]);
  return <span ref={ref}>{val}{suffix}</span>;
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

// ── App mockup UI (With Upgrade 2 Video Simulation) ────────────────
function MockupUI() {
  const scenes = ['Opening shot', 'The craft', 'First customers'];
  const canvasRef = useRef(null);

  // Upgrade 2: Generative canvas rendering engine to simulate real-time rendering logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let frame = 0;
    let animationId;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Render subtle procedural horizontal pan tracking logic
      ctx.fillStyle = 'rgba(193, 68, 14, 0.04)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Procedural scan lines grid
      ctx.strokeStyle = 'rgba(28, 25, 23, 0.02)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.height; i += 8) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }

      // Live cinematic focus reticle math
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = 40 + Math.sin(frame * 0.03) * 3;
      
      ctx.strokeStyle = 'rgba(193, 68, 14, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();

      // UI corner accents
      ctx.strokeStyle = 'rgba(28, 25, 23, 0.2)';
      ctx.lineWidth = 2;
      const len = 10;
      const pad = 12;
      
      // Top Left
      ctx.beginPath(); ctx.moveTo(pad, pad + len); ctx.lineTo(pad, pad); ctx.lineTo(pad + len, pad); ctx.stroke();
      // Bottom Right
      ctx.beginPath(); ctx.moveTo(canvas.width - pad, canvas.height - pad - len); ctx.lineTo(canvas.width - pad, canvas.height - pad); ctx.lineTo(canvas.width - pad - len, canvas.height - pad); ctx.stroke();

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div style={{
      background: C.white, borderRadius: 16, overflow: 'hidden',
      border: `1px solid ${C.faint}`, width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 24px 64px rgba(28,25,23,0.14)',
    }}>
      {/* Title bar */}
      <div style={{ background: C.bgAlt, borderBottom: `1px solid ${C.faint}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['#E8603C','#E8A030','#5CB85C'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
        </div>
        <div style={{ flex: 1, background: C.faint, borderRadius: 6, padding: '3px 10px', fontSize: 11, color: C.muted, textAlign: 'center' }}>
          raphio.ai/create
        </div>
      </div>
      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Scenes */}
        <div style={{ width: '38%', padding: 12, borderRight: `1px solid ${C.faint}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 4 }}>Scenes</p>
          {scenes.map((s, i) => (
            <div key={s} style={{ padding: '7px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
              background: i === 0 ? 'rgba(193,68,14,0.09)' : C.bgAlt,
              color: i === 0 ? C.terra : C.muted,
              border: i === 0 ? '1px solid rgba(193,68,14,0.18)' : '1px solid transparent',
            }}>
              {i === 0 ? <Play style={{ width: 10, height: 10, color: C.terra }} /> : <div style={{ width: 10, height: 10, borderRadius: 3, background: C.faint }} />}
              {s}
            </div>
          ))}
          <div style={{ marginTop: 'auto' }}>
            <div style={{ height: 3, borderRadius: 99, background: C.faint, overflow: 'hidden' }}>
              <motion.div style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${C.terra}, ${C.terraLt})` }}
                initial={{ width: '0%' }} animate={{ width: '38%' }} transition={{ delay: 0.6, duration: 1.2, ease: 'easeOut' }} />
            </div>
            <p style={{ fontSize: 10, marginTop: 4, color: C.muted }}>0:03 / 0:08</p>
          </div>
        </div>
        {/* Preview Container */}
        <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ flex: 1, borderRadius: 10, background: C.bgAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            <canvas ref={canvasRef} width={240} height={180} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15 }}>
              <defs><pattern id="s" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="10" stroke={C.dark} strokeWidth="1.5"/>
              </pattern></defs>
              <rect width="100%" height="100%" fill="url(#s)"/>
            </svg>
            <motion.div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${C.terra}, ${C.terraLt})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 16px rgba(193,68,14,0.35)`, zIndex: 1 }}
              animate={{ scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}>
              <Play style={{ width: 14, height: 14, color: '#fff', marginLeft: 2 }} />
            </motion.div>
          </div>
          <div style={{ padding: '8px 10px', borderRadius: 10, background: C.bgAlt, border: `1px solid ${C.faint}`, fontSize: 10, color: C.muted, fontStyle: 'italic', lineHeight: 1.5 }}>
            "The aroma of freshly baked bread fills the air as warm light floods through the windows..."
          </div>
        </div>
      </div>
      {/* Status bar */}
      <div style={{ background: C.bgAlt, borderTop: `1px solid ${C.faint}`, padding: '7px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <motion.div style={{ width: 6, height: 6, borderRadius: '50%', background: '#5CB85C' }}
            animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.4 }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: C.muted }}>Generating script...</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Mic style={{ width: 10, height: 10, color: C.terra }} />
          <span style={{ fontSize: 10, color: C.muted }}>Adam · EN</span>
        </div>
      </div>
    </div>
  );
}

// ── Steps data ────────────────────────────────────────────────────
const STEPS = [
  {
    num: '01', label: 'Describe', title: 'Tell Raphio your idea',
    icon: Wand2,
    body: 'One sentence or twenty — Raphio writes a structured, scene-by-scene script automatically. No briefs, no templates.',
    preview: (
      <div style={{ marginTop: 24, padding: '14px 16px', borderRadius: 14, background: 'rgba(28,25,23,0.03)', border: `1px solid ${C.faint}`, fontSize: 13, fontStyle: 'italic', color: C.muted, lineHeight: 1.65 }}>
        "A cinematic tracking shot of an ancient library illuminated by soft candlelight, dust motes drifting through golden beams..."
      </div>
    ),
  },
  {
    num: '02', label: 'Add visuals', title: 'Upload your images',
    icon: Upload,
    body: 'Drop in your photos or generate new ones with AI. Each image gets matched to the right scene — automatically.',
    preview: (
      <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[0,1,2].map(i => (
          <motion.div key={i}
            style={{ aspectRatio: '1', borderRadius: 12, background: i===1 ? 'rgba(193,68,14,0.08)' : C.white, border: `1px solid ${i===1 ? 'rgba(193,68,14,0.25)' : C.faint}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            initial={{ opacity: 0, scale: 0.85 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
            {i === 1 && <Play style={{ width: 18, height: 18, color: C.terra }} />}
          </motion.div>
        ))}
      </div>
    ),
  },
  {
    num: '03', label: 'Export', title: 'Choose a voice & go',
    icon: Mic,
    body: 'Pick from 36+ natural-sounding voices. Hit generate — your finished video is ready to download or share in minutes.',
    preview: (
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, background: C.white, border: `1px solid ${C.faint}` }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(193,68,14,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Mic style={{ width: 16, height: 16, color: C.terra }} />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>Adam</p>
            <p style={{ fontSize: 11, color: C.muted }}>English · Natural</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 2.5, alignItems: 'flex-end', height: 22 }}>
            {[3,5,4,6,3,5,4].map((h,i) => (
              <motion.div key={i} style={{ width: 2.5, borderRadius: 99, background: C.terra }}
                animate={{ height: [h*3, (h+2)*3, h*3] }} transition={{ repeat: Infinity, duration: 0.7+i*0.09, ease:'easeInOut' }} />
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 14, background: 'rgba(193,68,14,0.06)', border: `1px solid rgba(193,68,14,0.18)` }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#5CB85C', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>Video ready — 0:34</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: C.terra, fontWeight: 700 }}>Download ↓</span>
        </div>
      </div>
    ),
  },
];

// ── Redesigned Light/Alternating How It Works Section ─────────────────
// ── Final Production Overhaul: High-Velocity Widescreen Studio Engine ──
function HowItWorks() {
  const [active, setActive] = useState(0);
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const [typedPrompt, setTypedPrompt] = useState("");
  
  // High-velocity tracking: reduced height for lightning-fast snap response
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (v < 0.34) setActive(0);
    else if (v < 0.67) setActive(1);
    else setActive(2);
  });

  const currentStepBg = useTransform(
    scrollYProgress,
    [0, 0.33, 0.34, 0.66, 0.67, 1],
    [C.bg, C.bg, C.bgAlt, C.bgAlt, '#FDFBF9', '#FDFBF9']
  );

  // Auto-typing mechanism for Step 1
  useEffect(() => {
    if (active !== 0) { setTypedPrompt(""); return; }
    const fullText = "A cinematic tracking shot of an ancient library illuminated by soft candlelight, dust motes drifting through golden beams...";
    let i = 0;
    const interval = setInterval(() => {
      setTypedPrompt((prev) => prev + fullText.charAt(i));
      i++;
      if (i >= fullText.length) clearInterval(interval);
    }, 20);
    return () => clearInterval(interval);
  }, [active]);

  // High-Fidelity Generative Media Graphics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let frame = 0;
    let animationId;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (active === 0) {
        // STEP 1: Deep Tech Command Workspace Terminal Layer
        ctx.fillStyle = '#1A1614';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Neon Compute Grid
        ctx.strokeStyle = 'rgba(193, 68, 14, 0.05)';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 16) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 16) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }

        // Pulse wave tracking scanning line
        const scanY = (frame * 1.5) % canvas.height;
        ctx.fillStyle = 'rgba(193, 68, 14, 0.03)';
        ctx.fillRect(0, scanY - 4, canvas.width, 8);

      } else if (active === 1) {
        // STEP 2: Multi-Layer Creative Render Landscape View
        ctx.fillStyle = '#FAF7F4';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Render abstract procedural video generation tiles
        const tiles = [
          { x: 30, y: 40, w: 120, h: 90, label: 'Scene_01.mov' },
          { x: 170, y: 25, w: 150, h: 105, label: 'Asset_Mask.png' },
          { x: 340, y: 55, w: 110, h: 80, label: 'Depth_Map.fbx' }
        ];

        tiles.forEach((t, idx) => {
          // Micro floating oscillation mechanics
          const floatOffset = Math.sin(frame * 0.04 + idx * 2) * 4;
          
          ctx.fillStyle = 'rgba(28, 25, 23, 0.02)';
          ctx.fillRect(t.x, t.y + floatOffset, t.w, t.h);
          ctx.strokeStyle = idx === 1 ? C.terra : C.faint;
          ctx.lineWidth = idx === 1 ? 1.5 : 1;
          ctx.strokeRect(t.x, t.y + floatOffset, t.w, t.h);

          // Micro UI typography data inside render boxes
          ctx.fillStyle = idx === 1 ? C.terra : C.muted;
          ctx.font = '600 9px monospace';
          ctx.fillText(t.label, t.x + 8, t.y + 18 + floatOffset);

          // Simulated calculation line vector graphics
          if (idx === 1) {
            ctx.fillStyle = 'rgba(193, 68, 14, 0.1)';
            ctx.fillRect(t.x, t.y + floatOffset + t.h - 4, (frame * 2) % t.w, 4);
          }
        });

      } else {
        // STEP 3: Full-Bleed High-Fidelity Cinematic Studio Master Frame
        // Gradient simulating a premium cinematic shot frame landscape
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#2C221E');
        gradient.addColorStop(1, '#150E0C');
        ctx.fillStyles = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Core cinematic atmospheric tracking overlay lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0); ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.moveTo(0, canvas.height / 2); ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();

        // High-fidelity active render focus border elements
        ctx.strokeStyle = C.terra;
        ctx.lineWidth = 2;
        const pad = 16;
        const size = 12;
        // Top-Left Reticle corner focus marker
        ctx.beginPath(); ctx.moveTo(pad, pad + size); ctx.lineTo(pad, pad); ctx.lineTo(pad + size, pad); ctx.stroke();
        // Bottom-Right Reticle corner focus marker
        ctx.beginPath(); ctx.moveTo(canvas.width - pad, canvas.height - pad - size); ctx.lineTo(canvas.width - pad, canvas.height - pad); ctx.lineTo(canvas.width - pad - size, canvas.height - pad); ctx.stroke();

        // Top right Live Render indicator text node
        ctx.fillStyle = '#5CB85C';
        ctx.beginPath(); ctx.arc(canvas.width - 75, pad + 4, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText("LIVE OUTPUT", canvas.width - 66, pad + 7);
      }

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [active]);

  const Icon = STEPS[active].icon;

  return (
    // Height optimized to 170vh to ensure seamless, snappier scrolling speed curves
    <section ref={sectionRef} id="how-it-works" style={{ height: '170vh', position: 'relative' }}>
      <motion.div style={{ 
        position: 'sticky', 
        top: 0, 
        height: '100vh', 
        overflow: 'hidden', 
        background: currentStepBg,
        display: 'flex', 
        flexDirection: 'column',
        transition: 'background-color 0.4s ease-out'
      }}>

        {/* ── Section Header Row: Fixed spacing layout ceiling ── */}
        <div style={{ padding: '64px 48px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.terra, marginBottom: 4 }}>Workflow Overview</p>
            <h2 className="display" style={{ fontSize: 'clamp(28px,2.5vw,38px)', color: C.dark, letterSpacing: '-0.02em', lineHeight: 1 }}>
              Three steps. One great video.
            </h2>
          </div>

          {/* Expanded Stepper Control Pills */}
          <div style={{ display: 'flex', gap: 10 }}>
            {STEPS.map((s, i) => (
              <button key={s.num} onClick={() => setActive(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 999, cursor: 'pointer',
                  background: active === i ? C.terra : C.white,
                  border: `1px solid ${active === i ? C.terra : C.faint}`,
                  boxShadow: active === i ? '0 6px 16px rgba(193,68,14,0.18)' : 'none',
                  transition: 'all 0.25s ease',
                }}>
                <span className="display" style={{ fontSize: 13, color: active === i ? '#fff' : C.muted, lineHeight: 1 }}>{s.num}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: active === i ? '#fff' : C.dark }}>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ margin: '28px 48px 0', height: 1, background: C.faint, flexShrink: 0 }} />

        {/* ── Main Interactive Split Theater Studio Viewport ── */}
        <div style={{ flex: 1, display: 'flex', gap: 0, overflow: 'hidden', paddingBottom: 24 }}>

          {/* Left Vertical Sub-Navigation Rails */}
          <div style={{ width: 280, padding: '24px 32px 24px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8, flexShrink: 0, borderRight: `1px solid ${C.faint}` }}>
            {STEPS.map((s, i) => (
              <button key={s.num} onClick={() => setActive(i)}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px', borderRadius: 14, cursor: 'pointer', background: active === i ? C.white : 'transparent', border: 'none', textAlign: 'left', boxShadow: active === i ? '0 8px 24px rgba(28,25,23,0.03)' : 'none', transition: 'all 0.3s' }}
              >
                <div style={{ position: 'relative' }}>
                  <span className="display" style={{ fontSize: 32, lineHeight: 1, color: active === i ? C.terra : C.faint, transition: 'color 0.25s' }}>{s.num}</span>
                  {active === i && (
                    <motion.div layoutId="activePip" style={{ position: 'absolute', bottom: -4, left: 0, right: 0, height: 2, borderRadius: 99, background: C.terra }} />
                  )}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: active === i ? C.dark : C.muted, transition: 'color 0.25s', lineHeight: 1.2 }}>{s.label}</p>
                  <p style={{ fontSize: 11, color: C.muted, marginTop: 2, opacity: active === i ? 1 : 0.6 }}>{active === i ? 'Active Engine' : 'Click to jump'}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Right Presentation Panel: The 16:9 Production Screen Dashboard Console */}
          <div style={{ flex: 1, padding: '40px 64px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: 1200 }}>
            <AnimatePresence mode="wait">
              <motion.div 
                key={active}
                className="w-full h-full max-h-[480px] grid lg:grid-cols-12 gap-12 items-center"
                initial={{ opacity: 0, rotateY: 6, rotateX: 1.5, x: 24, scale: 0.98 }} 
                animate={{ opacity: 1, rotateY: 0, rotateX: 0, x: 0, scale: 1 }} 
                exit={{ opacity: 0, rotateY: -6, rotateX: -1.5, x: -24, scale: 0.98 }}
                transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
              >
                
                {/* Step Description Column Block (5 Columns) */}
                <div className="lg:col-span-5 flex flex-col justify-center">
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(193,68,14,0.06)', border: `1px solid rgba(193,68,14,0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                    <Icon style={{ width: 18, height: 18, color: C.terra }} />
                  </div>

                  <h3 className="display" style={{ fontSize: 'clamp(26px,2.8vw,40px)', color: C.dark, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 16 }}>
                    {STEPS[active].title}
                  </h3>
                  <p style={{ fontSize: 14.5, color: C.muted, lineHeight: 1.65, marginBottom: 0 }}>
                    {STEPS[active].body}
                  </p>
                </div>

                {/* Extended Studio Workspace Window (7 Columns) */}
                <motion.div 
                  className="lg:col-span-7 w-full h-full min-h-[320px] flex flex-col"
                  style={{ 
                    position: 'relative',
                    borderRadius: 16,
                    overflow: 'hidden',
                    background: C.white,
                    border: `1px solid ${C.faint}`,
                    boxShadow: '0 32px 64px rgba(28,25,23,0.05)',
                    transformStyle: 'preserve-3d'
                  }}
                  whileHover={{ 
                    rotateY: -2.5, 
                    rotateX: 1, 
                    scale: 1.002,
                    boxShadow: '0 40px 80px rgba(28,25,23,0.08)'
                  }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  
                  {/* Aligned production name branding path bar */}
                  <div style={{ background: C.bgAlt, borderBottom: `1px solid ${C.faint}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {['#E8603C','#E8A030','#5CB85C'].map(c => <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />)}
                    </div>
                    <div style={{ flex: 1, maxW: 160, margin: '0 auto', background: C.faint, borderRadius: 5, padding: '2px 8px', fontSize: 10, fontWeight: 600, color: C.muted, textAlign: 'center', letterSpacing: '0.04em' }}>
                      raphio.ai/studio
                    </div>
                  </div>

                  {/* Core Generative Workspace Area Screen */}
                  <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#FAF7F4' }}>
                    <canvas ref={canvasRef} width={520} height={260} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    
                    {/* Step 1 Typewriter Overlay Viewport layout */}
                    {active === 0 && (
                      <div style={{ position: 'absolute', inset: 0, padding: 24, display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: '100%', padding: '16px 20px', borderRadius: 12, background: 'rgba(28,25,23,0.95)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 12.5, fontStyle: 'italic', color: '#FFF3ED', fontFamily: 'monospace', lineHeight: 1.65, boxShadow: '0 16px 40px rgba(0,0,0,0.25)' }}>
                          <span style={{ color: C.terraLt, marginRight: 6 }}>&gt;</span>
                          "{typedPrompt}<span style={{ animation: 'blink 1s step-end infinite', borderLeft: `2px solid ${C.terraLt}`, marginLeft: 2 }} />"
                        </div>
                        <style>{`@keyframes blink { from, to { border-color: transparent } 50% { border-color: ${C.terraLt} } }`}</style>
                      </div>
                    )}
                  </div>

                  {/* Context Sub-Footer Display Component Control Tray */}
                  <div style={{ padding: '16px 20px', background: C.white, borderTop: `1px solid ${C.faint}`, flexShrink: 0 }}>
                    {STEPS[active].preview}
                  </div>
                </motion.div>

              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

// ── Primary View Component ───────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
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
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&display=swap');
        .display { font-family: 'Syne', sans-serif; font-weight: 800; }
      `}</style>

      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-200" style={{
        background: scrolled ? 'rgba(245,240,235,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        borderBottom: scrolled ? `1px solid rgba(193,68,14,0.10)` : '1px solid transparent',
      }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button onClick={() => scrollTo('hero')} className="hover:opacity-80 transition-opacity">
              <img src="/Logo.svg" alt="Raphio" className="h-7" />
            </button>
            <nav className="hidden sm:flex items-center gap-1">
              {[['How it works','how-it-works'],['Pricing','pricing']].map(([label, id]) => (
                <button key={id} onClick={() => scrollTo(id)}
                  className="px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all"
                  style={{ color: C.muted, background: 'transparent' }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(193,68,14,0.06)'; e.currentTarget.style.color=C.terra; }}
                  onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color=C.muted; }}
                >{label}</button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/login')}
              className="px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all"
              style={{ color: C.dark, background: 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(193,68,14,0.06)'; e.currentTarget.style.color=C.terra; }}
              onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color=C.dark; }}
            >Log in</button>
            <button onClick={() => navigate('/create')}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold transition-all"
              style={{ background: C.white, color: C.terra, border: `1.5px solid ${C.terra}` }}
              onMouseEnter={e => { e.currentTarget.style.background=`linear-gradient(135deg,${C.terra},${C.terraLt})`; e.currentTarget.style.color='#fff'; e.currentTarget.style.borderColor='transparent'; e.currentTarget.style.boxShadow=`0 4px 16px rgba(193,68,14,0.30)`; }}
              onMouseLeave={e => { e.currentTarget.style.background=C.white; e.currentTarget.style.color=C.terra; e.currentTarget.style.borderColor=C.terra; e.currentTarget.style.boxShadow='none'; }}
            >Get started <ArrowRight className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="hero" className="min-h-screen flex items-center pt-14" style={{ background: C.bg }}>
        <div className="max-w-6xl mx-auto px-6 w-full py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left */}
            <div>
              <motion.div initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.4 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8 text-xs font-bold uppercase tracking-widest"
                style={{ background:'rgba(193,68,14,0.08)', color:C.terra, border:`1px solid rgba(193,68,14,0.15)` }}>
                <span style={{ width:6,height:6,borderRadius:'50%',background:C.terra,display:'inline-block' }} />
                AI Video Creator
              </motion.div>

              <motion.h1 initial={{ opacity:0,y:24 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.7,delay:0.1,ease:[0.22,1,0.36,1] }}
                className="display leading-none mb-6"
                style={{ fontSize:'clamp(52px,7vw,88px)', color:C.dark, letterSpacing:'-0.02em' }}>
                Your ideas,<br/>
                <span style={{ color:C.terra }}>on screen.</span>
              </motion.h1>

              <motion.p initial={{ opacity:0,y:14 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.5,delay:0.25 }}
                className="text-lg leading-relaxed mb-10 max-w-sm" style={{ color:C.muted }}>
                Describe what you want. Upload a few images. Raphio writes the script, records a voice, and assembles the video.
              </motion.p>

              <motion.div initial={{ opacity:0,y:14 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.4,delay:0.38 }}
                className="flex items-center gap-4">
                <button onClick={() => navigate('/create')}
                  className="flex items-center gap-2 px-7 py-3.5 rounded-full text-base font-bold text-white transition-all duration-300"
                  style={{ background:`linear-gradient(135deg,${C.terra},${C.terraLt})`, boxShadow:`0 4px 20px rgba(193,68,14,0.30)` }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow=`0 8px 32px rgba(193,68,14,0.48)`; e.currentTarget.style.transform='translateY(-2px) scale(1.02)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow=`0 4px 20px rgba(193,68,14,0.30)`; e.currentTarget.style.transform='translateY(0) scale(1)'; }}
                >Start free →</button>
                <span className="text-sm" style={{ color:C.muted }}>No account needed</span>
              </motion.div>
            </div>

            {/* Right: Mockup Interface + Upgrade 3 Floating Element */}
            <motion.div className="hidden lg:block" style={{ height: 360 }}
              initial={{ opacity:0, y:28 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.8, delay:0.2, ease:[0.22,1,0.36,1] }}>
              <div style={{ position: 'relative', height: '100%' }}>
                <MockupUI />
                
                {/* Upgrade 3: Dynamic Independent Floating Logic */}
                <motion.div 
                  initial={{ opacity:0, y:10 }}
                  animate={{ 
                    opacity: 1, 
                    y: [0, -8, 0],
                  }} 
                  transition={{ 
                    opacity: { delay: 0.8, duration: 0.4 },
                    y: { repeat: Infinity, duration: 4, ease: "easeInOut" }
                  }}
                  style={{ 
                    position:'absolute', 
                    bottom:-16, 
                    left:-24, 
                    display:'flex', 
                    alignItems:'center', 
                    gap:8, 
                    padding:'10px 16px', 
                    borderRadius:12, 
                    background:C.white, 
                    border:`1px solid ${C.faint}`, 
                    boxShadow:'0 12px 32px rgba(28,25,23,0.08)' 
                  }}
                >
                  <Sparkles style={{ width:14, height:14, color:C.terra }} />
                  <span style={{ fontSize:12, fontWeight:700, color:C.dark }}>Script ready in 12s</span>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <div style={{ background: C.dark }}>
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-3 gap-8 text-center">
          {[{value:36,suffix:'+',label:'Natural voices'},{value:10,suffix:'x',label:'Faster than editing'},{value:100,suffix:'%',label:'Free to start'}].map(({value,suffix,label}) => (
            <div key={label}>
              <p className="display text-4xl mb-1" style={{ color:C.terra }}><Counter to={value} suffix={suffix} /></p>
              <p className="text-sm font-semibold" style={{ color:'rgba(245,240,235,0.40)' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works Layer Component */}
      <HowItWorks />

      {/* Scroll-reveal text section */}
      <section style={{ background: C.bg, padding: '120px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <ScrollRevealText
            className="display"
            style={{ fontSize: 'clamp(32px,4.5vw,60px)', letterSpacing: '-0.02em', lineHeight: 1.15, color: C.dark }}
            mutedColor="rgba(28,25,23,0.15)"
          >
            Raphio turns your photos and words into polished videos — with a real voice, real scenes, and real results.
          </ScrollRevealText>
          <div style={{ marginTop: 40, height: 2, width: 64, borderRadius: 99, background: C.terra }} />
        </div>
      </section>

      {/* Pricing placeholder */}
      <section id="pricing" className="py-28 px-6" style={{ background: C.bgAlt }}>
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color:C.terra }}>Pricing</p>
          <h2 className="display mb-4" style={{ fontSize:'clamp(36px,4vw,56px)', color:C.dark, letterSpacing:'-0.02em' }}>
            Simple, transparent<br/>credit packs.
          </h2>
          <p className="text-base max-w-md mx-auto" style={{ color:C.muted }}>
            No subscription hooks. Buy the credits you need, create whenever inspiration strikes.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-28 px-6" style={{ background: C.dark }}>
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity:0,y:24 }} whileInView={{ opacity:1,y:0 }} viewport={{ once:true }} transition={{ duration:0.6 }}>
            <h2 className="display mb-6" style={{ fontSize:'clamp(40px,5vw,72px)', color:C.bg, letterSpacing:'-0.02em', lineHeight:1 }}>
              Ready to make<br/>your first video?
            </h2>
            <p className="text-base mb-10" style={{ color:'rgba(245,240,235,0.40)' }}>It's completely free to start. No account needed.</p>
            <button onClick={() => navigate('/create')}
              className="inline-flex items-center gap-2 px-10 py-4 rounded-full text-base font-bold text-white transition-all duration-300"
              style={{ background:`linear-gradient(135deg,${C.terra},${C.terraLt})`, boxShadow:`0 4px 24px rgba(193,68,14,0.35)` }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow=`0 8px 40px rgba(193,68,14,0.55)`; e.currentTarget.style.transform='translateY(-2px) scale(1.02)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow=`0 4px 24px rgba(193,68,14,0.35)`; e.currentTarget.style.transform='translateY(0) scale(1)'; }}
            >Get Started — It's Free <ArrowRight className="w-4 h-4" /></button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6" style={{ background: C.dark, borderTop:`1px solid rgba(245,240,235,0.07)` }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <img src="/Logo.svg" alt="Raphio" className="h-7 opacity-60" />
          <p className="text-sm" style={{ color:'rgba(245,240,235,0.28)' }}>Make videos from your ideas, no experience needed.</p>
        </div>
      </footer>
    </div>
  );
}