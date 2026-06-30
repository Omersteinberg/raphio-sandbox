import { useState } from "react";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/useMediaQuery";

// ── Palette ───────────────────────────────────────────────────────
export const C = {
  bg: "#FBF7F4",
  dark: "#2D2235",
  terra: "#C1440E",
  terraLt: "#E8632A",
  muted: "#6B5E7B",
  faint: "rgba(45,34,53,0.12)",
};

// ── Thumbnail data ────────────────────────────────────────────────
// Mixed aspect ratios. Colours pulled from Raphio's actual palette.
// opacity + rotation per item = organic, not mechanical.
const COL_A = [
  {
    id: 1,
    ratio: "16/9",
    grad: "linear-gradient(135deg, #C1440E 0%, #E8632A 100%)",
    opacity: 0.32,
    rot: 1.2,
    time: "0:34",
    label: "Travel",
  },
  {
    id: 2,
    ratio: "9/16",
    grad: "linear-gradient(160deg, #FDDCC8 0%, #F0A070 100%)",
    opacity: 0.3,
    rot: -0.8,
    time: "1:02",
    label: "Family",
  },
  {
    id: 3,
    ratio: "4/3",
    grad: "linear-gradient(120deg, #E8632A 0%, #FDDCC8 100%)",
    opacity: 0.36,
    rot: 0.5,
    time: "0:47",
    label: "Sport",
  },
  {
    id: 4,
    ratio: "1/1",
    grad: "linear-gradient(150deg, #FFB088 0%, #C1440E 100%)",
    opacity: 0.38,
    rot: -1.5,
    time: "0:21",
    label: "Cinematic",
  },
  {
    id: 5,
    ratio: "16/9",
    grad: "linear-gradient(135deg, #F0A070 0%, #E8632A 100%)",
    opacity: 0.34,
    rot: 0.9,
    time: "1:15",
    label: "Nature",
  },
  {
    id: 6,
    ratio: "3/4",
    grad: "linear-gradient(145deg, #C1440E 0%, #FFB088 100%)",
    opacity: 0.3,
    rot: -0.4,
    time: "0:58",
    label: "Wedding",
  },
];

const COL_B = [
  {
    id: 7,
    ratio: "4/3",
    grad: "linear-gradient(125deg, #7A1A00 0%, #C1440E 100%)",
    opacity: 0.32,
    rot: -1.0,
    time: "0:43",
    label: "Adventure",
  },
  {
    id: 8,
    ratio: "16/9",
    grad: "linear-gradient(140deg, #E8632A 0%, #7A1A00 100%)",
    opacity: 0.36,
    rot: 1.6,
    time: "1:08",
    label: "Birthday",
  },
  {
    id: 9,
    ratio: "1/1",
    grad: "linear-gradient(155deg, #FFB088 0%, #E8632A 100%)",
    opacity: 0.38,
    rot: -0.6,
    time: "0:29",
    label: "Memories",
  },
  {
    id: 10,
    ratio: "9/16",
    grad: "linear-gradient(135deg, #5C1000 0%, #C1440E 100%)",
    opacity: 0.3,
    rot: 0.3,
    time: "0:52",
    label: "Lifestyle",
  },
  {
    id: 11,
    ratio: "16/9",
    grad: "linear-gradient(145deg, #C1440E 0%, #FDDCC8 100%)",
    opacity: 0.34,
    rot: -1.2,
    time: "1:33",
    label: "Fitness",
  },
  {
    id: 12,
    ratio: "3/4",
    grad: "linear-gradient(130deg, #7A1A00 0%, #FFB088 100%)",
    opacity: 0.32,
    rot: 0.7,
    time: "0:38",
    label: "Pets",
  },
];

// ── Play icon SVG ─────────────────────────────────────────────────
function PlayIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle
        cx="12"
        cy="12"
        r="11"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="1"
      />
      <path d="M10 8.5l6 3.5-6 3.5V8.5z" fill="rgba(255,255,255,0.7)" />
    </svg>
  );
}

// ── Single thumbnail card ─────────────────────────────────────────
function Thumbnail({ item, width }) {
  const isWide = item.ratio === "16/9";
  const isPortrait = item.ratio === "9/16" || item.ratio === "3/4";
  const playSize = isPortrait ? 16 : isWide ? 22 : 18;

  return (
    <div
      style={{
        width,
        aspectRatio: item.ratio,
        borderRadius: 10,
        background: item.grad,
        border: "1px solid rgba(255,255,255,0.18)",
        opacity: item.opacity,
        transform: `rotate(${item.rot}deg)`,
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── Top colour bar — mimics video player chapter strip ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "rgba(255,255,255,0.22)",
          borderRadius: "10px 10px 0 0",
        }}
      />

      {/* ── Noise texture overlay ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
          backgroundSize: "cover",
          opacity: 0.35,
          mixBlendMode: "overlay",
          pointerEvents: "none",
        }}
      />

      {/* ── Centre play icon ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <PlayIcon size={playSize} />
      </div>

      {/* ── Bottom meta row: timestamp + scene label ── */}
      <div
        style={{
          position: "absolute",
          bottom: 6,
          left: 7,
          right: 7,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Scene label */}
        <span
          style={{
            fontSize: 7,
            fontWeight: 700,
            color: "rgba(255,255,255,0.60)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            lineHeight: 1,
          }}
        >
          {item.label}
        </span>

        {/* Timestamp pill */}
        <span
          style={{
            fontSize: 7,
            fontWeight: 600,
            color: "rgba(255,255,255,0.70)",
            background: "rgba(0,0,0,0.35)",
            padding: "2px 5px",
            borderRadius: 4,
            lineHeight: 1,
            letterSpacing: "0.02em",
          }}
        >
          {item.time}
        </span>
      </div>
    </div>
  );
}

// ── Stream column ─────────────────────────────────────────────────
// Tiles scroll from top → completely off bottom, then loop.
// Using CSS animation so it's GPU-composited, no JS on the animation loop.
function StreamColumn({ items, reverse = false, speed = 30, width = 160 }) {
  const doubled = [...items, ...items];
  const animName = `scroll-${reverse ? "down" : "up"}-${width}`;

  return (
    <div style={{ width, overflow: "visible", position: "relative" }}>
      <style>{`
        @keyframes ${animName} {
          0%   { transform: translateY(${reverse ? "-50%" : "0%"}); }
          100% { transform: translateY(${reverse ? "0%" : "-50%"}); }
        }
      `}</style>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          animation: `${animName} ${speed}s linear infinite`,
          willChange: "transform",
        }}
      >
        {doubled.map((item, idx) => (
          <Thumbnail key={`${item.id}-${idx}`} item={item} width={width} />
        ))}
      </div>
    </div>
  );
}

// ── Background frame stream ───────────────────────────────────────
export function FrameStream() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        padding: "0 3%",
        gap: 16,
      }}
    >
      {/* Left cluster — 2 columns */}
      <div style={{ display: "flex", gap: 14, marginTop: "-8%" }}>
        <StreamColumn items={COL_A} reverse={false} speed={32} width={155} />
        <StreamColumn items={COL_B} reverse={true} speed={40} width={140} />
      </div>

      {/* Right cluster — 2 columns */}
      <div style={{ display: "flex", gap: 14, marginTop: "-4%" }}>
        <StreamColumn items={COL_B} reverse={true} speed={36} width={140} />
        <StreamColumn items={COL_A} reverse={false} speed={28} width={155} />
      </div>

      {/* Vignette: fades tiles at top, bottom, and toward centre card */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: [
            "radial-gradient(ellipse 55% 70% at 50% 50%, rgba(251,247,244,0.92) 0%, rgba(251,247,244,0.50) 55%, transparent 100%)",
            "linear-gradient(to bottom, #FBF7F4 0%, transparent 14%, transparent 86%, #FBF7F4 100%)",
          ].join(", "),
          pointerEvents: "none",
          zIndex: 2,
        }}
      />
    </div>
  );
}

// ── Inputs ────────────────────────────────────────────────────────
export function UnderlineInput({
  id,
  type = "text",
  label,
  placeholder,
  value,
  onChange,
  required,
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 22 }}>
      <label
        htmlFor={id}
        style={{
          display: "block",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: C.muted,
          marginBottom: 4,
        }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          height: 40,
          border: "none",
          borderBottom: `1.5px solid ${focused ? C.terra : C.faint}`,
          borderRadius: 0,
          background: "transparent",
          padding: "0 0 4px 0",
          fontSize: 15,
          color: C.dark,
          fontFamily: "inherit",
          outline: "none",
          transition: "border-color 0.25s ease",
          WebkitBoxShadow: "0 0 0px 1000px #fff inset",
          WebkitTextFillColor: C.dark,
        }}
      />
    </div>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div
      style={{
        padding: "10px 14px",
        borderRadius: 8,
        background: "#FEF2F2",
        border: "1px solid #FECACA",
        color: "#DC2626",
        fontSize: 13,
        fontWeight: 500,
        marginBottom: 16,
      }}
    >
      {message}
    </div>
  );
}

export function PrimaryButton({ children, loading, disabled }) {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      style={{
        width: "100%",
        height: 48,
        borderRadius: 9999,
        border: "none",
        background: `linear-gradient(135deg, ${C.terra}, ${C.terraLt})`,
        color: "#fff",
        fontSize: 15,
        fontWeight: 700,
        fontFamily: "inherit",
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled || loading ? 0.75 : 1,
        boxShadow: "0 4px 20px rgba(193,68,14,0.28)",
        letterSpacing: "-0.01em",
        transition: "box-shadow 0.2s ease, transform 0.15s ease",
        marginTop: 6,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.boxShadow = "0 8px 32px rgba(193,68,14,0.40)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 20px rgba(193,68,14,0.28)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {children}
    </button>
  );
}

export function Divider() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        margin: "20px 0",
      }}
    >
      <div style={{ flex: 1, height: 1, background: C.faint }} />
      <span style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>or</span>
      <div style={{ flex: 1, height: 1, background: C.faint }} />
    </div>
  );
}

// New shared page shell: background + centered white card + Raphio logo.
export function AuthScreen({ children, maxWidth = 420 }) {
  const isMobile = useIsMobile();
  return (
    <div
      className="font-figtree"
      style={{
        minHeight: "100vh",
        background: C.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {!isMobile && <FrameStream />}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "relative",
          zIndex: 3,
          width: "100%",
          maxWidth,
          background: "#FFFFFF",
          borderRadius: 20,
          padding: isMobile ? "28px 22px 24px" : "44px 40px 36px",
          boxShadow:
            "0 4px 24px rgba(45,34,53,0.08), 0 1px 4px rgba(45,34,53,0.06)",
          border: "1px solid rgba(45,34,53,0.07)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 28,
          }}
        >
          <img src="/Logo.svg" alt="Raphio" style={{ height: 30 }} />
        </div>
        {children}
      </motion.div>
    </div>
  );
}
