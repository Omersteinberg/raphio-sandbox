// ── Preserved for reference only — NOT imported anywhere ────────────
// This is the pre-rebuild "How It Works" section from LandingPage.jsx:
// a sticky-scroll, tab-switching walkthrough of the three sequential
// steps (Describe → Add visuals → Export), each with its own animated
// demo panel (typewriter + canvas brain diagram, drag-and-drop photo
// grid, avatar + waveform + video export). It was replaced by a
// simpler "pick one of three starting points" card layout because the
// scrollytelling version read as complex/sequential rather than simple
// and felt too busy for a non-technical audience. Kept here verbatim
// (module-scoped, self-contained) in case any of this treatment is
// wanted again later.
import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, AnimatePresence, useMotionValueEvent } from 'framer-motion';
import { Play, Mic, Upload, Wand2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/useMediaQuery';
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
function DescribeVisual() {
  const isMobile = useIsMobile();
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

    // On mobile the card is full-width, so centre the brain (0.5) and shrink
    // it + the word orbit so it doesn't overflow the narrower canvas.
    const cx = W * (isMobile ? 0.5 : 0.62), cy = H * (isMobile ? 0.5 : 0.46);
    const lineEndX = W * 0.04, lineEndY = cy;
    const WORD_R = isMobile ? 74 : 105;

    // ── Load brain image ──
    const img = new Image();
    img.src = brainImg;

    const WORDS = ['adventure','cinematic','emotional core','character arc','visual tone','story','journey','memories'];
    const wordAngles = WORDS.map((_, i) => (i / WORDS.length) * Math.PI * 2);

    const drawBrain = (frame) => {
      if (!img.complete || !img.naturalWidth) return;
      const pulse = Math.sin(frame * 0.04) * 3;
      const size = (isMobile ? 96 : 134) + pulse;
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
    // Re-measure + re-centre when switching between mobile/desktop layouts.
  }, [isMobile]);

  return (
    <div style={{
      background: '#1C1917', borderRadius: 16, overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.06)',
      boxShadow: '0 24px 56px rgba(0,0,0,0.3)',
      width: '100%',
      height: isMobile ? 'auto' : 360,
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
    }}>
      {/* Prompt side */}
      <div style={{ display:'flex', flexDirection:'column', padding:isMobile ? 18 : 22, minHeight: isMobile ? 190 : undefined, borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.08)', borderBottom: isMobile ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
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

      {/* Brain canvas */}
      <div style={{ position:'relative', overflow:'hidden', height: isMobile ? 240 : undefined }}>
        <canvas ref={canvasRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} />
      </div>
    </div>
  );
}

// ── Step 2: Scattered photo grid ──────────────────────────────────
function PhotoGridVisual() {
    const isMobile = useIsMobile();
    const cards = [
      { img: scene1Img, fallback:'#ffe2c6', label:'Scene 1', check:'#C1440E', rot:-2   },
      { img: scene2Img, fallback:'#fd996a', label:'Scene 2', check:'#5CB85C', rot:2.5  },
      { img: scene3Img, fallback:'#eed6b7', label:'Scene 3', check:'#5CB85C', rot:-1.5 },
      { img: scene4Img, fallback:'#ffceae', label:'Scene 4', check:'#5CB85C', rot:1.5  },
      { img: scene5Img, fallback:'#fde2c9', label:'Scene 5', check:'#5CB85C', rot:-2   },
    ];

  return (
    <div style={{
      background: '#1C1917', borderRadius: 16, overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.06)',
      boxShadow: '0 24px 56px rgba(0,0,0,0.3)',
      width: '100%',
      height: isMobile ? 'auto' : 360,
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '168px 1fr',
    }}>

      {/* ── Drop zone ── */}
      <div style={{
        borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.07)',
        borderBottom: isMobile ? '1px solid rgba(255,255,255,0.07)' : 'none',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 11, padding: 24, position: 'relative',
      }}>
        <div style={{ position:'absolute', inset:12, border:'1.5px dashed rgba(193,68,14,0.35)', borderRadius:12, pointerEvents:'none' }} />
        <div style={{ width:50, height:50, borderRadius:14, background:'rgba(193,68,14,0.10)', border:'1px solid rgba(193,68,14,0.20)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Upload style={{ width:23, height:23, color:C.terra }} />
        </div>
        <p style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.8)', textAlign:'center', lineHeight:1.45 }}>
          Drag &amp; drop<br />your photos
        </p>
        <p style={{ fontSize:10, color:'rgba(255,255,255,0.3)', textAlign:'center' }}>JPEG or PNG · up to 10</p>
        <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2, padding:'5px 12px', borderRadius:999, background:'rgba(193,68,14,0.10)', border:'1px solid rgba(193,68,14,0.25)' }}>
          <motion.div animate={{ opacity:[1,0.3,1] }} transition={{ repeat:Infinity, duration:1.5 }}
            style={{ width:5, height:5, borderRadius:'50%', background:'#4CAF50' }} />
          <span style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.75)' }}>5 uploaded</span>
        </div>
      </div>

      {/* ── 3×2 photo grid ── */}
      <div style={{
        padding: '20px 18px 38px 18px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        gap: 14,
        height: isMobile ? 240 : '100%',
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

        {/* + Add more: 6th grid cell */}
        <div style={{
          borderRadius: 12,
          border: '2px dashed rgba(193,68,14,0.65)',
          display: 'flex', flexDirection:'column',
          alignItems: 'center', justifyContent:'center',
          gap: 5,
          background: 'rgba(193,68,14,0.07)',
          cursor: 'pointer', width:'100%', height:'100%',
        }}>
          <span style={{ fontSize:30, fontWeight:700, color:'rgba(193,68,14,0.88)', lineHeight:1 }}>+</span>
          <span style={{ fontSize:10, fontWeight:700, color:'rgba(193,68,14,0.60)', letterSpacing:'0.08em' }}>ADD MORE</span>
        </div>

        {/* Progress bar */}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'8px 16px', background:'rgba(20,17,15,0.95)', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ flex:1, height:2, background:'rgba(255,255,255,0.1)', borderRadius:99, overflow:'hidden' }}>
            <div style={{ height:'100%', width:'83%', background:C.terra, borderRadius:99 }} />
          </div>
          <span style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.40)', whiteSpace:'nowrap' }}>5 / 10 scenes matched</span>
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Avatar + video export ─────────────────────────────────
function AvatarExportVisual() {
  const isMobile = useIsMobile();
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
      width: '100%',
      // Stack to a single column on phones; fixed widescreen height on desktop.
      height: isMobile ? 'auto' : 360,
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr',
      gap: isMobile ? 18 : 14,
      padding: '18px 18px 18px 18px',
      alignItems: 'start',
    }}>

      {/* ── Left: Avatar + voice list ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>

        {/* Avatar circle: replace src with your AI avatar image */}
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: isMobile ? 'auto' : '100%', width: '100%' }}>

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

// ── HowItWorksLegacy ─────────────────────────────────────────────────
export default function HowItWorksLegacy() {
  const [active, setActive] = useState(0);
  const isMobile = useIsMobile();
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] });

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    if (v < 0.34) setActive(0);
    else if (v < 0.67) setActive(1);
    else setActive(2);
  });

  const Icon = STEPS[active].icon;

  // On phones the widescreen demo cards (fixed 360px, two-column) and the
  // tab/rail step-switcher don't fit. Show a clean stacked list of the three
  // steps instead - number, title, description - no cramped animations.
  if (isMobile) {
    return (
      <section ref={sectionRef} id="how-it-works" style={{ background: C.bg, padding: '56px 20px' }}>
        <div style={{ marginBottom: 26 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.terra, marginBottom: 6 }}>How it works</p>
          <h2 className="display" style={{ fontSize: 'clamp(28px,8vw,36px)', color: C.dark, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
            Three steps. One great video.
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {STEPS.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.45, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              style={{
                background: C.white, borderRadius: 16, border: `1px solid ${C.faint}`,
                padding: '20px', display: 'flex', flexDirection: 'column', gap: 18,
                boxShadow: '0 2px 14px rgba(28,25,23,0.05)',
              }}
            >
              {/* Number + content sit side by side */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <span className="display" style={{ fontSize: 30, lineHeight: 1, color: C.terra, flexShrink: 0 }}>{s.num}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                  <h3 className="display" style={{ fontSize: 19, color: C.dark, letterSpacing: '-0.01em', lineHeight: 1.15 }}>
                    {s.title}
                  </h3>
                  <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>
                    {s.body}
                  </p>
                </div>
              </div>
              {/* The step's animated demo - stacked full-width on mobile */}
              {STEP_VISUALS[i].visual}
            </motion.div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} id="how-it-works" style={{ height: '170vh', position: 'relative' }}>
      <motion.div style={isMobile
        ? { position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: C.bg }
        : { position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: C.bg }}>

        {/* Header */}
        <div style={{ padding: isMobile ? '40px 20px 0' : '52px 48px 0', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'flex-end', justifyContent: 'space-between', gap: isMobile ? 18 : 0, flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.terra, marginBottom: 4 }}>How it works</p>
            <h2 className="display" style={{ fontSize: isMobile ? 'clamp(26px,7vw,34px)' : 'clamp(26px,2.4vw,36px)', color: C.dark, letterSpacing: '-0.02em', lineHeight: 1 }}>
              Three steps. One great video.
            </h2>
          </div>
          {/* Tab pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
        <div style={{ margin: isMobile ? '20px 20px 0' : '24px 48px 0', height: 1, background: C.faint, flexShrink: 0 }} />

        {/* Main layout */}
        <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: isMobile ? 'visible' : 'hidden', paddingBottom: isMobile ? 40 : 28 }}>

          {/* Left rail */}
          <div style={{ width: isMobile ? '100%' : 260, padding: isMobile ? '16px 20px' : '20px 28px 20px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, flexShrink: 0, borderRight: isMobile ? 'none' : `1px solid ${C.faint}` }}>
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
          <div style={{ flex: 1, padding: isMobile ? '8px 20px 0' : '32px 56px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AnimatePresence mode="wait">
              <motion.div key={active}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '5fr 7fr', gap: isMobile ? 24 : 52, width: '100%', height: '100%', maxHeight: isMobile ? 'none' : 420, alignItems: 'center' }}
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
