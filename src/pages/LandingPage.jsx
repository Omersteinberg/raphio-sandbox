import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence, useMotionValueEvent } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, Play, Mic, Sparkles, Upload, Wand2, Mail, X, MapPin, Menu } from "lucide-react";
import { Infinity as InfinityIcon, ShieldCheck, Clock, CheckCircle, XCircle, Zap, Layers, Crown } from 'lucide-react';
import brainImg from '../assets/brain.png';
import adamImg from '../assets/Adam.png';
import scene1Img from '../assets/scene-1.png';
import scene2Img from '../assets/scene-2.png';
import scene3Img from '../assets/scene-3.jpg';
import scene4Img from '../assets/scene-4.png';
import scene5Img from '../assets/scene-5.png';

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

// ── Steps data ────────────────────────────────────────────────────
const STEPS = [
  {
    num: '01', label: 'Describe', tab: 'Write your idea', title: 'Write your idea',
    icon: Wand2,
    body: "Type what you want your video to be about, whether that's one sentence or a full paragraph. Think of it like texting a friend. You're in control of the story.",
  },
  {
    num: '02', label: 'Add visuals', tab: 'Upload photos', title: 'Upload your photos',
    icon: Upload,
    body: 'Drop in photos from your phone or computer. Raphio matches each photo to the right moment in your video automatically, so there is no sorting needed.',
  },
  {
    num: '03', label: 'Export', tab: 'Download', title: 'Pick a voice, download your video',
    icon: Mic,
    body: 'Choose from 36+ natural-sounding voices, hit generate, and your finished video is ready in minutes. Download it or share the link directly.',
  },
];

// ── Redesigned Light/Alternating How It Works Section ─────────────────
// ── Final Production Overhaul: High-Velocity Widescreen Studio Engine ──
function DescribeVisual({ compact = false }) {
  const twRef = useRef(null);
  const ccRef = useRef(null);
  const tagRef = useRef(null);
  const canvasRef = useRef(null);

  const phrases = [
    { text: "A father takes his daughter to see the northern lights for the first time. They bond, explore, and realise the best memories come from being together.", tags: ['Heartwarming','Family'] },
    { text: "A small café opens its doors on a rainy morning. The barista crafts the perfect latte as the first customers trickle in from the cold.", tags: ['Cosy','Cinematic'] },
    { text: "A young athlete trains before dawn every day, pushing through exhaustion to reach the finish line at the championship race.", tags: ['Inspirational','Sport'] },
    { text: "A couple road-trips along the coast with no map and no plan, just music, sunsets, and each other.", tags: ['Adventure','Romantic'] },
  ];

  // ── Typewriter ────────────────────────────────────────────────
  useEffect(() => {
    let pIdx=0, cIdx=0, isDel=false, pause=0, timer;
    const base = ['Heartwarming','Adventure','Family','Magical'];

    const setTags = (active) => {
      if (!tagRef.current) return;
      tagRef.current.innerHTML = '';
      [...base, ...active].filter((v,i,a) => a.indexOf(v)===i).slice(0,4).forEach(t => {
        const s = document.createElement('span');
        const isOn = active.includes(t);
        s.style.cssText = `padding:4px 10px;border-radius:999px;font-size:10px;font-weight:600;transition:all 0.5s;border:1px solid ${isOn ? 'rgba(193,68,14,0.45)' : 'rgba(255,255,255,0.1)'};background:${isOn ? 'rgba(193,68,14,0.12)' : 'transparent'};color:${isOn ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)'}`;
        s.textContent = t;
        tagRef.current.appendChild(s);
      });
    };

    const tick = () => {
      const ph = phrases[pIdx].text;
      if (pause > 0) { pause--; timer = setTimeout(tick, 16); return; }
      if (!isDel) { cIdx++; if (cIdx >= ph.length) { isDel = true; pause = 100; timer = setTimeout(tick, 16); return; } }
      else { cIdx--; if (cIdx <= 0) { isDel = false; pIdx = (pIdx+1)%phrases.length; cIdx = 0; pause = 24; setTags(phrases[pIdx].tags); timer = setTimeout(tick, 16); return; } }
      if (twRef.current) twRef.current.textContent = ph.slice(0, cIdx);
      if (ccRef.current) ccRef.current.textContent = `${cIdx} / 1000`;
      timer = setTimeout(tick, isDel ? 9 : 27);
    };

    setTags(phrases[0].tags);
    tick();
    return () => clearTimeout(timer);
  }, []);

  // ── Brain canvas ───────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const parent = canvas.parentElement;
    const W = parent.clientWidth, H = parent.clientHeight;
    canvas.width = W; canvas.height = H;

    const cx = W * 0.62, cy = H * 0.46;
    const lineEndX = W * 0.04, lineEndY = cy;
    const WORD_R = 105;

    // ── Load brain image ──
    const img = new Image();
    img.src = brainImg;

    const WORDS = ['adventure','cinematic','emotional core','character arc','visual tone','story','journey','memories'];
    const wordAngles = WORDS.map((_, i) => (i / WORDS.length) * Math.PI * 2);

    const drawBrain = (frame) => {
      if (!img.complete || !img.naturalWidth) return;
      const pulse = Math.sin(frame * 0.04) * 3;
      const size = 134 + pulse;
      ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
    };

    const getPos = (lineIdx, t) => {
      const arcH = 38;
      if (lineIdx === 0) return { x: cx+(lineEndX-cx)*t, y: cy+(lineEndY-cy)*t };
      const sign = lineIdx === 1 ? -1 : 1;
      const midX = (cx+lineEndX)/2;
      const mt = 1-t;
      return {
        x: mt*mt*cx + 2*mt*t*midX + t*t*lineEndX,
        y: mt*mt*cy + 2*mt*t*(cy+sign*arcH) + t*t*lineEndY
      };
    };

    const drawLines = () => {
      [0,1,2].forEach(i => {
        ctx.beginPath();
        if (i === 0) {
          ctx.moveTo(cx, cy); ctx.lineTo(lineEndX, lineEndY);
        } else {
          const sign = i === 1 ? -1 : 1;
          const midX = (cx+lineEndX)/2;
          ctx.moveTo(cx, cy);
          ctx.quadraticCurveTo(midX, cy+sign*38, lineEndX, lineEndY);
        }
        ctx.strokeStyle = 'rgba(193,68,14,0.55)'; ctx.lineWidth = 1.4; ctx.stroke();
      });
    };

    const particles = [
      { line:0, t:0.0,  speed:0.006 },
      { line:1, t:0.33, speed:0.006 },
      { line:2, t:0.66, speed:0.006 },
    ];

    let frame = 0, animId;
    const draw = () => {
      animId = requestAnimationFrame(draw);
      frame++;
      ctx.clearRect(0, 0, W, H);

      drawBrain(frame);

      // Orbiting words
      WORDS.forEach((word, i) => {
        const angle = wordAngles[i] + frame * 0.002;
        const wx = cx + Math.cos(angle) * WORD_R;
        const wy = cy + Math.sin(angle) * WORD_R * 0.82;
        const dx = wx-cx, dy = wy-cy, dist = Math.sqrt(dx*dx+dy*dy);
        const ex = cx+dx/dist*40, ey = cy+dy/dist*32;
        const endX = wx - (dx/dist)*28, endY = wy - (dy/dist)*28;
        ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(endX, endY);
        ctx.strokeStyle = 'rgba(193,68,14,0.55)'; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.beginPath(); ctx.arc(wx, wy, 2, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(193,68,14,0.45)'; ctx.fill();
        const alpha = 0.55 + Math.sin(frame*0.03+i)*0.2;
        ctx.font = '500 11px sans-serif';
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(word, wx, wy);
      });

      drawLines();

      // Particles along lines
      particles.forEach(p => {
        p.t += p.speed;
        if (p.t > 1) p.t = 0;
        const pos = getPos(p.line, p.t);
        const tail = getPos(p.line, Math.max(0, p.t - 0.06));
        const alpha = 0.4 + Math.sin(p.t * Math.PI) * 0.6;
        ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = `rgba(232,96,60,${alpha*0.6})`; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.beginPath(); ctx.arc(pos.x, pos.y, 3.5, 0, Math.PI*2);
        ctx.fillStyle = `rgba(232,96,60,${alpha})`; ctx.fill();
        ctx.beginPath(); ctx.arc(pos.x, pos.y, 6.5, 0, Math.PI*2);
        ctx.fillStyle = `rgba(193,68,14,${alpha*0.22})`; ctx.fill();
      });

      // Arrow at line end
      const aa = 0.4 + Math.sin(frame*0.07)*0.2;
      ctx.beginPath();
      ctx.moveTo(lineEndX+20, lineEndY-4); ctx.lineTo(lineEndX+30, lineEndY); ctx.lineTo(lineEndX+20, lineEndY+4);
      ctx.strokeStyle = `rgba(193,68,14,${aa})`; ctx.lineWidth = 1.4;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    };
    // Start loop only once image is ready
    img.onload = () => { draw(); };
    if (img.complete && img.naturalWidth) { draw(); }
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div style={{
      background: '#1C1917', borderRadius: 16, overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.06)',
      boxShadow: '0 24px 56px rgba(0,0,0,0.3)',
      height: 360, display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr',
    }}>
      {/* Prompt side */}
      <div style={{ display:'flex', flexDirection:'column', padding:22, borderRight: compact ? 'none' : '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:12, flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:7, flexShrink:0 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:C.terra, flexShrink:0 }} />
            <span style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.36)', letterSpacing:'0.06em' }}>Describe your idea</span>
          </div>
          <div style={{ flex:1, padding:16, display:'flex', flexDirection:'column', justifyContent:'space-between', minHeight:0 }}>
            <p style={{ fontSize:12.5, lineHeight:1.72, color:'rgba(255,255,255,0.76)', fontStyle:'italic', flex:1 }}>
              <span ref={twRef} />
              <motion.span animate={{ opacity:[1,0,1] }} transition={{ repeat:Infinity, duration:1, times:[0,0.5,1] }}
                style={{ display:'inline-block', width:2, height:13, background:C.terra, borderRadius:1, verticalAlign:'middle', marginLeft:2 }} />
            </p>
            <div>
              <p ref={ccRef} style={{ fontSize:10, color:'rgba(255,255,255,0.18)', textAlign:'right', marginBottom:10 }}>0 / 1000</p>
              <div ref={tagRef} style={{ display:'flex', flexWrap:'wrap', gap:6 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Brain canvas — desktop only; dropped on mobile per compact mode */}
      {!compact && (
        <div style={{ position:'relative', overflow:'hidden' }}>
          <canvas ref={canvasRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} />
        </div>
      )}
    </div>
  );
}

// ── Step 2: Scattered photo grid ──────────────────────────────────
function PhotoGridVisual({ compact = false }) {
    const allCards = [
      { img: scene1Img, fallback:'#ffe2c6', label:'Scene 1', check:'#C1440E', rot:-2   },
      { img: scene2Img, fallback:'#fd996a', label:'Scene 2', check:'#5CB85C', rot:2.5  },
      { img: scene3Img, fallback:'#eed6b7', label:'Scene 3', check:'#5CB85C', rot:-1.5 },
      { img: scene4Img, fallback:'#ffceae', label:'Scene 4', check:'#5CB85C', rot:1.5  },
      { img: scene5Img, fallback:'#fde2c9', label:'Scene 5', check:'#5CB85C', rot:-2   },
    ];
    // Mobile shows a simpler 2×2 (3 photos + add-more) instead of the full 3×2 grid.
    const cards = compact ? allCards.slice(0, 3) : allCards;

  return (
    <div style={{
      background: '#1C1917', borderRadius: 16, overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.06)',
      boxShadow: '0 24px 56px rgba(0,0,0,0.3)',
      height: 360, display: 'grid', gridTemplateColumns: 'clamp(110px, 32vw, 168px) 1fr',
    }}>

      {/* ── Drop zone ── */}
      <div style={{
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: compact ? 8 : 11, padding: compact ? 14 : 24, position: 'relative',
      }}>
        <div style={{ position:'absolute', inset:12, border:'1.5px dashed rgba(193,68,14,0.35)', borderRadius:12, pointerEvents:'none' }} />
        <div style={{ width: compact ? 40 : 50, height: compact ? 40 : 50, borderRadius:14, background:'rgba(193,68,14,0.10)', border:'1px solid rgba(193,68,14,0.20)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Upload style={{ width: compact ? 18 : 23, height: compact ? 18 : 23, color:C.terra }} />
        </div>
        <p style={{ fontSize: compact ? 11 : 12, fontWeight:700, color:'rgba(255,255,255,0.8)', textAlign:'center', lineHeight:1.45 }}>
          Drag &amp; drop<br />your photos
        </p>
        {!compact && <p style={{ fontSize:10, color:'rgba(255,255,255,0.3)', textAlign:'center' }}>JPEG or PNG · up to 10</p>}
        <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2, padding: compact ? '4px 9px' : '5px 12px', borderRadius:999, background:'rgba(193,68,14,0.10)', border:'1px solid rgba(193,68,14,0.25)' }}>
          <motion.div animate={{ opacity:[1,0.3,1] }} transition={{ repeat:Infinity, duration:1.5 }}
            style={{ width:5, height:5, borderRadius:'50%', background:'#4CAF50' }} />
          <span style={{ fontSize: compact ? 9 : 10, fontWeight:600, color:'rgba(255,255,255,0.75)', whiteSpace:'nowrap' }}>{compact ? '3 uploaded' : '5 uploaded'}</span>
        </div>
      </div>

      {/* ── Photo grid: 3×2 on desktop, 2×2 on mobile ── */}
      <div style={{
        padding: compact ? '14px 14px 34px 14px' : '20px 18px 38px 18px',
        display: 'grid',
        gridTemplateColumns: compact ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        gap: compact ? 10 : 14,
        height: '100%',
        position: 'relative',
      }}>
        {cards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity:0, scale:0.82, rotate: card.rot - 5 }}
            whileInView={{ opacity:1, scale:1, rotate: card.rot }}
            whileHover={{ rotate:0, scale:1.03, zIndex:10, borderColor:'rgba(193,68,14,0.55)' }}
            viewport={{ once:true }}
            transition={{ delay: i * 0.08, type:'spring', stiffness:280, damping:22 }}
            style={{
              borderRadius: 12, overflow:'hidden',
              border: '1.5px solid rgba(255,255,255,0.10)',
              position: 'relative', width:'100%', height:'100%',
            }}
          >
            {/*
              ── PHOTO IMAGES ──
            */}
            <img
              src={card.img}
              alt={card.label}
              style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
            {/* Fallback until images added */}
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:`${card.fallback}10` }}>
              <div style={{ width:32, height:32, borderRadius:'50%', background:`${card.fallback}22`, border:`1px solid ${card.fallback}55`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ width:14, height:14, borderRadius:'50%', background:card.fallback, opacity:0.7 }} />
              </div>
            </div>
            {/* Label */}
            <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(0,0,0,0.62)', color:'rgba(255,255,255,0.88)', fontSize:9, fontWeight:600, padding:'5px 8px', textAlign:'center', letterSpacing:'0.04em' }}>
              {card.label}
            </div>
            {/* Check */}
            <div style={{ position:'absolute', top:7, right:7, width:17, height:17, borderRadius:'50%', background:card.check, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ color:'#fff', fontSize:9, fontWeight:700, lineHeight:1 }}>✓</span>
            </div>
          </motion.div>
        ))}

        {/* + Add more — last grid cell (4th on mobile's 2×2, 6th on desktop's 3×2) */}
        <div style={{
          borderRadius: 12,
          border: '2px dashed rgba(193,68,14,0.65)',
          display: 'flex', flexDirection:'column',
          alignItems: 'center', justifyContent:'center',
          gap: 5,
          background: 'rgba(193,68,14,0.07)',
          cursor: 'pointer', width:'100%', height:'100%',
        }}>
          <span style={{ fontSize: compact ? 22 : 30, fontWeight:700, color:'rgba(193,68,14,0.88)', lineHeight:1 }}>+</span>
          <span style={{ fontSize: compact ? 9 : 10, fontWeight:700, color:'rgba(193,68,14,0.60)', letterSpacing:'0.08em' }}>ADD MORE</span>
        </div>

        {/* Progress bar */}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'8px 16px', background:'rgba(20,17,15,0.95)', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ flex:1, height:2, background:'rgba(255,255,255,0.1)', borderRadius:99, overflow:'hidden' }}>
            <div style={{ height:'100%', width: compact ? '50%' : '83%', background:C.terra, borderRadius:99 }} />
          </div>
          <span style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.40)', whiteSpace:'nowrap' }}>{compact ? '3 / 10 scenes matched' : '5 / 10 scenes matched'}</span>
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Avatar + video export ─────────────────────────────────
function AvatarExportVisual() {
  const waveRef = useRef(null);
  const progressRef = useRef(null);
  const timeLabelRef = useRef(null);
  const barHeights = [4,7,5,9,4,8,5,10,4,7,5,8,4,6,5];

  useEffect(() => {
    let wFrame = 0, wId;
    const animWave = () => {
      wFrame++;
      waveRef.current?.querySelectorAll('.wave-bar').forEach((b, i) => {
        const base = barHeights[i];
        const h = base * 2.2 + Math.sin(wFrame * 0.18 + i * 0.7) * 5;
        b.style.height = Math.max(4, h) + 'px';
      });
      wId = requestAnimationFrame(animWave);
    };
    animWave();

    let pct = 0, pId;
    const animProg = () => {
      pct = (pct + 0.004) % 1;
      if (progressRef.current) progressRef.current.style.width = (pct * 100) + '%';
      if (timeLabelRef.current) {
        const s = Math.round(pct * 34);
        timeLabelRef.current.textContent = '0:' + (s < 10 ? '0' : '') + s;
      }
      pId = requestAnimationFrame(animProg);
    };
    animProg();
    return () => { cancelAnimationFrame(wId); cancelAnimationFrame(pId); };
  }, []);

  return (
    <div style={{
      background: '#1C1917',
      borderRadius: 16,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.06)',
      boxShadow: '0 24px 56px rgba(0,0,0,0.3)',
      // ↓ Fixed: tall enough to show all content
      height: 360,
      display: 'grid',
      gridTemplateColumns: '1fr 1.2fr',
      gap: 14,
      padding: '18px 18px 18px 18px',
      alignItems: 'start',
    }}>

      {/* ── Left: Avatar + voice list ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>

        {/* Avatar circle — replace src with your AI avatar image */}
        <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
          {/* Outer pulse rings */}
          <motion.div
            animate={{ scale: [1, 1.07, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
            style={{ position: 'absolute', inset: -10, borderRadius: '50%', border: '1px solid rgba(193,68,14,0.3)' }}
          />
          <motion.div
            animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ repeat: Infinity, duration: 2.2, delay: 0.5, ease: 'easeInOut' }}
            style={{ position: 'absolute', inset: -20, borderRadius: '50%', border: '1px solid rgba(193,68,14,0.15)' }}
          />
          {/* Circle frame */}
          <div style={{
            width: 96, height: 96, borderRadius: '50%',
            border: '2px solid rgba(193,68,14,0.6)',
            background: '#2C2420',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img
              src={adamImg}
              alt="Adam, AI voice avatar"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
              onError={e => {
                // Fallback if image not loaded yet
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextSibling.style.display = 'flex';
              }}
            />
            {/* Fallback SVG shown until image is provided */}
            <div style={{ display: 'none', position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="15" r="7" fill={C.terra} opacity="0.9"/>
                <path d="M4 38c0-8.837 7.163-16 16-16s16 7.163 16 16" stroke={C.terra} strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Name + language */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 2 }}>Adam</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>English · Natural</p>
        </div>

        {/* Animated waveform */}
        <div ref={waveRef} style={{ display: 'flex', alignItems: 'center', gap: 2.5, height: 28 }}>
          {barHeights.map((h, i) => (
            <div
              key={i}
              className="wave-bar"
              style={{ width: 3, height: h * 2.2, borderRadius: 99, background: C.terra, transition: 'height 0.1s ease', flexShrink: 0 }}
            />
          ))}
        </div>

        {/* Voice list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%' }}>
          {[
            { n: 'Warm & Narrative', s: 'Adam',  active: true },
            { n: 'Calm & Smooth',   s: 'Sarah' },
            { n: 'Energetic',       s: 'James' },
            { n: 'Deep & Cinematic',s: 'Aria'  },
          ].map((v, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '6px 10px', borderRadius: 8,
              border: `0.5px solid ${v.active ? 'rgba(193,68,14,0.5)' : 'rgba(255,255,255,0.07)'}`,
              background: v.active ? 'rgba(193,68,14,0.1)' : 'transparent',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: v.active ? C.terra : 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: v.active ? 600 : 400, color: v.active ? '#fff' : 'rgba(255,255,255,0.55)', flex: 1 }}>{v.n}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{v.s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: Video preview + download ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>

        {/* Video preview panel */}
        <div style={{
          flex: 1,
          borderRadius: 12,
          overflow: 'hidden',
          border: '0.5px solid rgba(255,255,255,0.1)',
          position: 'relative',
          minHeight: 180,
          background: '#100C0A',
        }}>
          <img
            src={scene5Img}
            alt="Video preview thumbnail"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />

          {/* Dark overlay so play button reads well over any image */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />

          {/* Play button */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
              style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(193,68,14,0.9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 0 8px rgba(193,68,14,0.15)',
              }}
            >
              <Play style={{ width: 16, height: 16, color: '#fff', marginLeft: 2 }} />
            </motion.div>
          </div>

          {/* LIVE OUTPUT badge */}
          <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.65)', padding: '3px 8px', borderRadius: 999 }}>
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
              style={{ width: 5, height: 5, borderRadius: '50%', background: '#4CAF50' }}
            />
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
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', borderRadius: 10,
          background: 'rgba(193,68,14,0.08)',
          border: '0.5px solid rgba(193,68,14,0.3)',
        }}>
          <motion.div
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ repeat: Infinity, duration: 1.6 }}
            style={{ width: 6, height: 6, borderRadius: '50%', background: '#4CAF50', flexShrink: 0 }}
          />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', flex: 1 }}>Video ready: 0:34</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.terra }}>Download ↓</span>
        </div>
      </div>
    </div>
  );
}

const STEP_VISUALS = [
  { visual: <DescribeVisual />,   status: 'Writing scene 2 of 4...' },
  { visual: <PhotoGridVisual />,   status: 'Images matched to script' },
  { visual: <AvatarExportVisual />, status: 'Render complete · HD 1080p' },
];

// Mobile uses simplified visuals: no brain canvas on step 1, a 2×2 photo grid on step 2.
const STEP_VISUALS_MOBILE = [
  { visual: <DescribeVisual compact />,   status: 'Writing scene 2 of 4...' },
  { visual: <PhotoGridVisual compact />,   status: 'Images matched to script' },
  { visual: <AvatarExportVisual />, status: 'Render complete · HD 1080p' },
];

// ── HowItWorks ─────────────────────────────────────────────────────
function HowItWorks() {
  const [active, setActive] = useState(0);
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 768px)').matches);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Scroll-linked active step only drives on desktop, where the sticky-scroll layout is shown.
  // Mobile uses the stacked layout below, navigated by tapping tabs instead.
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (!isDesktop) return;
    if (v < 0.34) setActive(0);
    else if (v < 0.67) setActive(1);
    else setActive(2);
  });

  const Icon = STEPS[active].icon;

  return (
    <section ref={sectionRef} id="how-it-works" className="relative h-auto md:h-[170vh]">
      {/* Mobile / tablet — stacked, tap-driven layout (no sticky scroll) */}
      <div className="md:hidden flex flex-col py-14 px-5" style={{ background: C.bg }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.terra, marginBottom: 4 }}>How it works</p>
        <h2 className="display" style={{ fontSize: 'clamp(24px,6vw,32px)', color: C.dark, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 20 }}>
          Three steps. One great video.
        </h2>

        {/* Tab pills — horizontally scrollable */}
        <div className="hide-scrollbar flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 mb-6">
          {STEPS.map((s, i) => (
            <button key={s.num} onClick={() => setActive(i)}
              className="flex-shrink-0"
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 999, cursor: 'pointer',
                background: active === i ? C.terra : C.white,
                border: `1px solid ${active === i ? C.terra : C.faint}`,
                boxShadow: active === i ? '0 4px 14px rgba(193,68,14,0.22)' : 'none',
                transition: 'all 0.22s ease',
              }}>
              <span style={{ fontSize: 12, color: active === i ? 'rgba(255,255,255,0.6)' : C.muted }}>{s.num}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: active === i ? '#fff' : C.dark, whiteSpace: 'nowrap' }}>{s.tab}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={active}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-5"
          >
            <div className="flex items-center gap-3">
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(193,68,14,0.07)', border: '1px solid rgba(193,68,14,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon style={{ width: 17, height: 17, color: C.terra }} />
              </div>
              <h3 className="display" style={{ fontSize: 'clamp(19px,5vw,24px)', color: C.dark, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                {STEPS[active].title}
              </h3>
            </div>
            <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.65 }}>
              {STEPS[active].body}
            </p>
            <div className="w-full overflow-hidden rounded-2xl">
              {STEP_VISUALS_MOBILE[active].visual}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2 mt-7">
          {STEPS.map((s, i) => (
            <button key={s.num} onClick={() => setActive(i)} aria-label={`Go to step ${i + 1}: ${s.label}`}
              style={{
                width: active === i ? 22 : 8, height: 8, borderRadius: 99,
                background: active === i ? C.terra : C.faint,
                transition: 'all 0.25s ease',
              }}
            />
          ))}
        </div>
      </div>

      {/* Desktop — sticky scroll layout (unchanged) */}
      <motion.div className="hidden md:flex md:sticky md:top-0 md:h-screen md:overflow-hidden flex-col" style={{ background: C.bg }}>

        {/* Header */}
        <div style={{ padding: '52px 48px 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.terra, marginBottom: 4 }}>How it works</p>
            <h2 className="display" style={{ fontSize: 'clamp(26px,2.4vw,36px)', color: C.dark, letterSpacing: '-0.02em', lineHeight: 1 }}>
              Three steps. One great video.
            </h2>
          </div>
          {/* Tab pills */}
          <div style={{ display: 'flex', gap: 6 }}>
            {STEPS.map((s, i) => (
              <button key={s.num} onClick={() => setActive(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px', borderRadius: 999, cursor: 'pointer',
                  background: active === i ? C.terra : C.white,
                  border: `1px solid ${active === i ? C.terra : C.faint}`,
                  boxShadow: active === i ? '0 4px 14px rgba(193,68,14,0.22)' : 'none',
                  transition: 'all 0.22s ease',
                }}>
                <span style={{ fontSize: 12, color: active === i ? 'rgba(255,255,255,0.6)' : C.muted }}>{s.num}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: active === i ? '#fff' : C.dark }}>{s.tab}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ margin: '24px 48px 0', height: 1, background: C.faint, flexShrink: 0 }} />

        {/* Main layout */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', paddingBottom: 28 }}>

          {/* Left rail */}
          <div style={{ width: 260, padding: '20px 28px 20px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, flexShrink: 0, borderRight: `1px solid ${C.faint}` }}>
            {STEPS.map((s, i) => (
              <button key={s.num} onClick={() => setActive(i)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px', borderRadius: 12, cursor: 'pointer',
                  background: active === i ? C.white : 'transparent', border: 'none', textAlign: 'left',
                  boxShadow: active === i ? '0 4px 16px rgba(28,25,23,0.05)' : 'none', transition: 'all 0.25s',
                }}>
                <div style={{ position: 'relative' }}>
                  <span className="display" style={{ fontSize: active === i ? 42 : 32, lineHeight: 1, color: active === i ? C.terra : C.faint, transition: 'color 0.25s, font-size 0.25s' }}>{s.num}</span>
                  {active === i && (
                    <motion.div layoutId="pip" style={{ position: 'absolute', bottom: -3, left: 0, right: 0, height: 2, borderRadius: 99, background: C.terra }} />
                  )}
                </div>
                <div>
                  <p style={{ fontSize: active === i ? 18 : 15, fontWeight: active === i ? 800 : 600, color: active === i ? C.dark : C.muted, lineHeight: 1.2, transition: 'color 0.25s, font-size 0.25s' }}>{s.label}</p>
                  <p style={{ fontSize: 13, fontWeight: active === i ? 600 : 500, color: active === i ? C.terra : C.muted, marginTop: 2, opacity: active === i ? 1 : 0.55 }}>
                    {active === i ? 'Active' : 'Jump to step'}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Right panel */}
          <div style={{ flex: 1, padding: '32px 56px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AnimatePresence mode="wait">
              <motion.div key={active}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 52, width: '100%', height: '100%', maxHeight: 420, alignItems: 'center' }}
              >
                {/* Description */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(193,68,14,0.07)', border: '1px solid rgba(193,68,14,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon style={{ width: 18, height: 18, color: C.terra }} />
                  </div>
                  <h3 className="display" style={{ fontSize: 'clamp(22px,2.4vw,34px)', color: C.dark, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                    {STEPS[active].title}
                  </h3>
                  <p style={{ fontSize: 14.5, color: C.muted, lineHeight: 1.65 }}>
                    {STEPS[active].body}
                  </p>
                </div>

                <div style={{ flex:1, height:'100%', maxHeight:420 }}>
                  {STEP_VISUALS[active].visual}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

// ── "See it in action" — real output reel ────────────────────────
// Base URL for the gallery videos — swap filenames below as real exports land.
const VIDEO_BASE_URL = 'https://pub-130d5201a986450fa0c5297fa3bc461f.r2.dev/';
const SEE_IT_ITEMS = [
  { label: 'Travel montage',   file: 'Travel_brand_ad_montage_202606181523.mp4' },
  { label: 'Product showcase', file: 'Luxury_watch_ad_Raphio_202606181523.mp4' },
  { label: 'Luxury brand ad',  file: 'Perfume_bottle_rotates_Raphio_br%E2%80%A6_202606181522.mp4' },
  { label: 'Food commercial',  file: 'Burger_built_Raphio_brandmark_202606181522.mp4' },
];

function ActionVideoCard({ item, onOpen, cardRef }) {
  return (
    <button
      ref={cardRef}
      onClick={() => onOpen(item)}
      className="gallery-card relative flex-shrink-0 rounded-2xl overflow-hidden block"
      style={{
        width: 'clamp(220px, 26vw, 300px)',
        aspectRatio: '16/9',
        background: C.white,
        border: `1px solid ${C.faint}`,
        boxShadow: '0 4px 18px rgba(28,25,23,0.08)',
      }}
    >
      <video
        src={VIDEO_BASE_URL + item.file}
        muted
        loop
        playsInline
        autoPlay
        preload="metadata"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Bottom gradient overlay anchoring the label */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{ height: '60%', background: 'linear-gradient(to top, rgba(10,9,8,0.70), transparent)' }}
      />
      <span className="absolute bottom-3 left-3 right-3 text-sm font-semibold text-white text-left truncate">
        {item.label}
      </span>

      {/* Centered play badge — fades in on hover */}
      <div className="gallery-play-badge absolute inset-0 flex items-center justify-center opacity-0">
        <div className="rounded-full flex items-center justify-center" style={{ width: 52, height: 52, background: 'rgba(255,250,247,0.94)' }}>
          <Play style={{ width: 20, height: 20, color: C.terra, marginLeft: 2 }} fill={C.terra} />
        </div>
      </div>
    </button>
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
        className="relative w-full rounded-2xl overflow-hidden"
        style={{ maxWidth: 480, boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <video
          ref={videoRef}
          src={VIDEO_BASE_URL + item.file}
          controls
          autoPlay
          playsInline
          className="w-full aspect-video block"
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

// Marquee speed in pixels/second — duration is derived from the measured
// track distance so the visual speed stays constant at any screen size.
const MARQUEE_SPEED = 40;

function SeeItInAction() {
  const [activeItem, setActiveItem] = useState(null);
  const firstItemRef = useRef(null);
  const secondSetFirstItemRef = useRef(null);
  const [distance, setDistance] = useState(0);
  // How many copies of SEE_IT_ITEMS to render. 2 is only enough when the set
  // is wider than the viewport — on any screen wide enough to show all the
  // cards at once, the track runs out of content before the loop point and
  // the right edge goes blank. Recomputed so the track is always at least
  // one full set wider than the viewport, however many copies that takes.
  const [copies, setCopies] = useState(3);

  useEffect(() => {
    const measure = () => {
      if (firstItemRef.current && secondSetFirstItemRef.current) {
        const d = secondSetFirstItemRef.current.getBoundingClientRect().left
          - firstItemRef.current.getBoundingClientRect().left;
        if (d > 0) {
          setDistance(d);
          setCopies(Math.max(3, Math.ceil(window.innerWidth / d) + 2));
        }
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const sets = Array.from({ length: copies }, (_, i) => i);

  return (
    <section className="py-24" style={{ background: C.bg }}>
      <style>{`
        @keyframes gallery-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(var(--marquee-distance)); }
        }
        .gallery-track {
          animation-name: gallery-scroll;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          will-change: transform;
        }
        .gallery-track:hover { animation-play-state: paused; }
        .gallery-card { transition: transform 0.3s ease; }
        .gallery-card:hover { transform: scale(1.05); }
        .gallery-card:hover .gallery-play-badge { opacity: 1; }
        .gallery-play-badge { transition: opacity 0.2s ease; }
        @media (prefers-reduced-motion: reduce) {
          .gallery-track { animation: none; }
        }
      `}</style>

      <div className="max-w-6xl mx-auto px-6 text-center mb-12">
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.terra }}>See it in action</p>
        <h2 className="display" style={{ fontSize: 'clamp(28px,4vw,44px)', color: C.dark, letterSpacing: '-0.01em', lineHeight: 1.1 }}>
          See what Raphio creates
        </h2>
        <p className="text-base mt-3" style={{ color: C.muted }}>
          Real outputs from real prompts, no editing, no post-production.
        </p>
      </div>

      <div className="overflow-hidden">
        {/*
          N back-to-back copies of the same row (N grows with viewport width —
          see `copies` above). The track animates by the exact pixel distance
          between the first item of set 0 and the first item of set 1
          (measured via refs, not a 50%/1-over-N guess — gap-based flex
          spacing makes percentage math land slightly off and produces a
          visible "snap" at the loop point). Once set 0 has fully scrolled
          past, set 1 sits exactly where set 0 started, set 2 where set 1
          started, etc., so the animation restart at 0% is invisible and the
          loop reads as truly continuous, no matter how wide the screen is.
        */}
        <div
          className="gallery-track flex gap-5"
          style={{
            width: 'max-content',
            '--marquee-distance': `-${distance}px`,
            animationDuration: distance ? `${distance / MARQUEE_SPEED}s` : '0s',
          }}
        >
          {sets.map((setIndex) => (
            <div key={setIndex} className="flex gap-5" aria-hidden={setIndex > 0 ? 'true' : undefined}>
              {SEE_IT_ITEMS.map((item, i) => (
                <ActionVideoCard
                  key={`${setIndex}-${i}`}
                  item={item}
                  onOpen={setActiveItem}
                  cardRef={
                    setIndex === 0 && i === 0 ? firstItemRef
                      : setIndex === 1 && i === 0 ? secondSetFirstItemRef
                      : undefined
                  }
                />
              ))}
            </div>
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

// ── Contact section — Unified direct action layout ───────────────
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
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') setMobileMenuOpen(false); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
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
        #hero { height: 100vh; }
        @supports (height: 100dvh) {
          #hero { height: 100dvh; }
        }
      `}</style>

      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-200" style={{
        background: scrolled ? 'rgba(245,240,235,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        borderBottom: scrolled ? `1px solid rgba(193,68,14,0.10)` : '1px solid transparent',
      }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button onClick={() => scrollTo('hero')} className="hover:opacity-80 transition-opacity flex-shrink-0">
              <img src={scrolled ? '/Logo.svg' : '/Logo-Light.svg'} alt="Raphio" className="h-6 sm:h-7" />
            </button>
            <nav className="hidden sm:flex items-center gap-1">
              {[['How it works','how-it-works'],['Pricing','pricing'],['Contact','contact']].map(([label, id]) => (
                <button key={id} onClick={() => scrollTo(id)}
                  className="px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all"
                  style={{ color: scrolled ? C.dark : 'rgba(255,250,247,0.92)', background: 'transparent' }}
                  onMouseEnter={e => { e.currentTarget.style.background = scrolled ? 'rgba(193,68,14,0.06)' : 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = scrolled ? C.terra : '#FFD9C7'; }}
                  onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color = scrolled ? C.dark : 'rgba(255,250,247,0.92)'; }}
                >{label}</button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button onClick={() => navigate('/login')}
              className="px-2.5 py-1 text-xs sm:px-3.5 sm:py-1.5 sm:text-sm rounded-lg font-semibold transition-all"
              style={{ color: scrolled ? C.dark : 'rgba(255,250,247,0.92)', background: 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.background = scrolled ? 'rgba(193,68,14,0.06)' : 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = scrolled ? C.terra : '#FFD9C7'; }}
              onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color = scrolled ? C.dark : 'rgba(255,250,247,0.92)'; }}
            >Log in</button>
            <button onClick={() => navigate('/create')}
              className="flex items-center gap-1 px-2.5 py-1 text-xs sm:gap-1.5 sm:px-4 sm:py-1.5 sm:text-sm rounded-full font-bold transition-all"
              style={{
                background: scrolled ? C.white : 'transparent',
                color: scrolled ? C.terra : '#FFFAF7',
                border: `1.5px solid ${scrolled ? C.terra : 'rgba(255,250,247,0.55)'}`,
              }}
              onMouseEnter={e => { e.currentTarget.style.background=`linear-gradient(135deg,${C.terra},${C.terraLt})`; e.currentTarget.style.color='#fff'; e.currentTarget.style.borderColor='transparent'; e.currentTarget.style.boxShadow=`0 4px 16px rgba(193,68,14,0.30)`; }}
              onMouseLeave={e => { e.currentTarget.style.background = scrolled ? C.white : 'transparent'; e.currentTarget.style.color = scrolled ? C.terra : '#FFFAF7'; e.currentTarget.style.borderColor = scrolled ? C.terra : 'rgba(255,250,247,0.55)'; e.currentTarget.style.boxShadow='none'; }}
            >Get started <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" /></button>
            <button
              onClick={() => setMobileMenuOpen(o => !o)}
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
              className="sm:hidden inline-flex items-center justify-center rounded-lg flex-shrink-0"
              style={{ width: 36, height: 36, color: scrolled ? C.dark : '#FFFAF7' }}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav panel */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="sm:hidden overflow-hidden"
              style={{
                background: scrolled ? 'rgba(245,240,235,0.97)' : 'rgba(10,9,8,0.92)',
                backdropFilter: 'blur(14px)',
                borderBottom: '1px solid rgba(193,68,14,0.12)',
              }}
            >
              <nav className="max-w-6xl mx-auto px-4 py-2 flex flex-col">
                {[['How it works', 'how-it-works'], ['Pricing', 'pricing']].map(([label, id]) => (
                  <button key={id} onClick={() => scrollTo(id)}
                    className="text-left px-3 py-3 rounded-lg text-sm font-semibold transition-colors"
                    style={{ color: scrolled ? C.dark : 'rgba(255,250,247,0.92)' }}
                  >{label}</button>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero — fullscreen cinematic video */}
      <section id="hero" className="relative w-full overflow-hidden" style={{ minHeight: 560, background: '#0A0908' }}>
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          src={HERO_VIDEO_URL}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Dark overlay for headline legibility — tuned so the footage still reads as vivid underneath */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, rgba(10,9,8,0.55) 0%, rgba(10,9,8,0.30) 45%, rgba(10,9,8,0.62) 100%)' }}
        />

        {/* Headline content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-5 sm:px-6">
          <motion.h1
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease: [0.22,1,0.36,1] }}
            className="display leading-none max-w-4xl"
            style={{ fontSize: 'clamp(32px,6vw,72px)', color: '#FFFAF7', letterSpacing: '-0.01em', lineHeight: 1.08, textShadow: '0 4px 28px rgba(0,0,0,0.4)' }}
          >
            Turn your photos into a video{' '}
            <span style={{ color: C.terra }}>instantly.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.26 }}
            className="mt-4 sm:mt-5 max-w-lg text-base sm:text-lg leading-relaxed"
            style={{ color: 'rgba(255,250,247,0.84)' }}
          >
            Upload your photos, describe what you want, and Raphio handles the rest. No editing skills needed.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}
            className="mt-7 sm:mt-9 flex flex-col items-center gap-3"
          >
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 px-8 sm:px-10 py-3.5 sm:py-4 rounded-full text-base font-bold text-white transition-all duration-300"
              style={{ background: `linear-gradient(135deg,${C.terra},${C.terraLt})`, boxShadow: '0 4px 24px rgba(193,68,14,0.35)' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 40px rgba(193,68,14,0.55)'; e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 24px rgba(193,68,14,0.35)'; e.currentTarget.style.transform = 'translateY(0) scale(1)'; }}
            >
              Try it free
              <ArrowRight className="w-4 h-4" />
            </button>
            <span className="text-xs sm:text-sm font-medium text-center px-2" style={{ color: 'rgba(255,250,247,0.58)' }}>No credit card needed · Ready in minutes</span>
          </motion.div>
        </div>
      </section>

      {/* Hero footnote — stays on the hero's dark background so it flows
          straight into the stats strip instead of breaking to a new color */}
      <div className="py-6 px-6 text-center" style={{ background: '#0A0908' }}>
        <p className="text-sm font-semibold" style={{ color: 'rgba(245,240,235,0.55)' }}>
          All videos above were made with Raphio. They are real outputs, with no post-production
        </p>
      </div>

      {/* Stats strip */}
      <div style={{ background: C.dark }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 grid grid-cols-3 gap-3 sm:gap-8 text-center">
          {[{value:36,suffix:'+',label:'Natural voices'},{value:10,suffix:'x',label:'Faster than editing'},{value:100,suffix:'%',label:'Free to start'}].map(({value,suffix,label}) => (
            <div key={label}>
              <p className="display text-2xl sm:text-4xl mb-1" style={{ color:C.terra }}><Counter to={value} suffix={suffix} /></p>
              <p className="text-xs sm:text-sm font-semibold leading-snug" style={{ color:'rgba(245,240,235,0.40)' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works Layer Component */}
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
              { icon: ShieldCheck, text: '30-day money back on Starter' },
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
                  { text: '1 short video (≤15s)',   ok: true  },
                ],
              },
              {
                id: 'starter', label: 'Starter', price: 29, credits: 6, 
                icon: Zap, cta: 'Get Starter pack', popular: false,
                features: [
                  { text: 'Up to 3 short videos (≤15s)', ok: true  },
                ],
              },
              {
                id: 'creator', label: 'Creator', price: 55, credits: 12, save: 'Save 8%',
                icon: Layers, cta: 'Get Creator Pack', popular: true,
                features: [
                  { text: 'Up to 6 videos (≤30s)',  ok: true  },
                ],
              },
              {
                id: 'studio', label: 'Studio', price: 99, credits: 24, save: 'Save 17%',
                icon: Crown, cta: 'Get Studio Pack', popular: false,
                features: [
                  { text: 'Up to 8 full videos (≤60s)', ok: true },
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
            <p className="text-xs mb-3" style={{ color: C.muted }}>Start with your 10 free credits, no card needed.</p>
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