import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Hourglass } from "lucide-react";

const TERRA = '#C1440E';
const GRADIENT = 'linear-gradient(135deg, #C1440E, #E8632A)';

// Hand-drawn-feel clapperboard. The bar sits at a natural half-open resting
// tilt (no per-bar swing - that fought with the whole-illustration idle rock
// added around it), the sparkle twinkles, and the whole graphic gets a slow,
// barely-there sway from its wrapper so the still frame reads as "video
// production, paused" rather than "something's broken."
function ClapperboardDoodle() {
  return (
    <svg width="240" height="160" viewBox="0 0 180 120" fill="none" aria-hidden="true">
      {/* Board body */}
      <rect x="22" y="52" width="136" height="54" rx="8" stroke={TERRA} strokeWidth="3" opacity="0.55" fill="rgba(193,68,14,0.03)" />
      <path d="M50 74 q30 -4 60 0" stroke={TERRA} strokeWidth="2.5" strokeLinecap="round" opacity="0.28" fill="none" />
      <path d="M50 88 q38 -3 76 0" stroke={TERRA} strokeWidth="2.5" strokeLinecap="round" opacity="0.22" fill="none" />

      {/* Hinge */}
      <circle cx="30" cy="50" r="4" fill={TERRA} opacity="0.55" />

      {/* Clapper bar - resting half-open, no independent motion */}
      <g transform="rotate(-4 30 50)">
        <rect x="26" y="26" width="132" height="22" rx="6" stroke={TERRA} strokeWidth="3" opacity="0.55" fill="rgba(193,68,14,0.05)" />
        {[40, 58, 76, 94, 112, 130].map((x) => (
          <line key={x} x1={x} y1="46" x2={x + 10} y2="24" stroke={TERRA} strokeWidth="4" strokeLinecap="round" opacity="0.32" />
        ))}
      </g>

      {/* Twinkling sparkle - the "AI" accent, echoing the prompt-mode icon */}
      <motion.path
        d="M150 6 L152.4 12.6 L159 15 L152.4 17.4 L150 24 L147.6 17.4 L141 15 L147.6 12.6 Z"
        fill={TERRA}
        style={{ transformOrigin: "150px 15px" }}
        animate={{ opacity: [0.35, 1, 0.35], scale: [0.85, 1.05, 0.85] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Hand-drawn accent marks */}
      <path d="M14 96 q6 -4 11 0" stroke={TERRA} strokeWidth="2.5" strokeLinecap="round" opacity="0.3" fill="none" />
      <path d="M162 100 l6 6" stroke={TERRA} strokeWidth="2.5" strokeLinecap="round" opacity="0.28" fill="none" />
    </svg>
  );
}

/**
 * Full-screen stand-in for the mode chooser while MAINTENANCE_MODE is on
 * (see Creator.jsx). Fonts/colors/spacing are pulled straight from the create
 * page hero (PromptStep.jsx) so it reads as the same product, not an error page.
 */
export default function MaintenanceScreen() {
  return (
    <div className="w-full h-full overflow-y-auto relative" style={{ background: '#F5F0EB' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,750&display=swap');
        .display { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 750; }
      `}</style>

      <div className="min-h-[calc(100dvh-56px)] flex flex-col items-center justify-center px-6 py-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center max-w-md"
        >
          {/* Icon tile - same gradient-tile treatment as each mode card's icon */}
          <div className="relative inline-flex items-center justify-center mb-6">
            <div
              className="absolute rounded-3xl"
              style={{ inset: '-10px', background: 'rgba(193,68,14,0.08)', filter: 'blur(18px)' }}
            />
            <div
              className="relative w-[56px] h-[56px] sm:w-[72px] sm:h-[72px] rounded-[18px] sm:rounded-[22px] flex items-center justify-center"
              style={{ background: GRADIENT, boxShadow: '0 4px 14px rgba(193,68,14,0.25)' }}
            >
              <motion.div
                animate={{ rotate: [-8, 8] }}
                transition={{ duration: 3, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }}
              >
                <Hourglass className="w-7 h-7 sm:w-9 sm:h-9 text-white" />
              </motion.div>
            </div>
          </div>

          <h1
            className="display"
            style={{ fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: 'var(--ink-warm)', letterSpacing: '-0.01em', lineHeight: 1.05 }}
          >
            Taking a quick break
          </h1>

          {/* Illustration - large ambient glow anchors it, whole graphic idles with a slow sway */}
          <div className="relative flex items-center justify-center my-8">
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 260,
                height: 260,
                background: 'radial-gradient(circle, rgba(193,68,14,0.05), transparent 70%)',
                filter: 'blur(50px)',
              }}
            />
            <motion.div
              className="relative"
              animate={{ rotate: [-2, 2, -2] }}
              transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}
            >
              <ClapperboardDoodle />
            </motion.div>
          </div>

          <p style={{ fontSize: 15.5, lineHeight: 1.6, color: 'rgba(28,25,23,0.72)' }}>
            We're making some improvements. Sit tight, your videos aren't going anywhere. You
            can still watch them in{' '}
            <Link to="/videos" className="font-semibold hover:underline" style={{ color: TERRA }}>
              My Videos
            </Link>
            .
          </p>
        </motion.div>
      </div>
    </div>
  );
}
