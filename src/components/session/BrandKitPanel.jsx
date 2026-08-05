import { BRAND_FONT_NAMES, DEFAULT_BRAND_FONTS } from "@/constants/brandFonts";

// Four swatches, not two: these are exactly the keys the Remotion scene catalog
// reads (primary, secondary, ink, paper). Anything more would be a control that
// changes nothing on screen.
const SWATCHES = [
  { key: "primary", label: "Primary", fallback: "#F97066", hint: "The colour you lead with" },
  { key: "secondary", label: "Secondary", fallback: "#FB923C", hint: "Supporting accents" },
  { key: "ink", label: "Ink", fallback: "#2D2235", hint: "Text on light scenes" },
  { key: "paper", label: "Paper", fallback: "#FFF7F2", hint: "Light backgrounds" },
];

const FontSelect = ({ label, value, onChange }) => (
  <label className="flex items-center gap-3">
    <span className="text-xs font-bold text-[#2D2235] w-16 shrink-0">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 min-w-0 rounded-xl bg-white border border-border/40 px-3 py-2 text-xs font-semibold text-[#2D2235] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra)]/40"
    >
      {BRAND_FONT_NAMES.map((name) => (
        <option key={name} value={name}>{name}</option>
      ))}
    </select>
  </label>
);

/**
 * The brand kit editor behind the Brand kit pill. Its own file rather than more
 * inline JSX because IntroBriefStep is already 746 lines and this panel grew from
 * two swatches to a logo control, four swatches, two font selects and a tone chip.
 */
export default function BrandKitPanel({
  brandColors, setBrandColor,
  brandFonts, setBrandFont,
  brandTone,
  logoPreview, onPickLogo,
}) {
  const fonts = brandFonts || DEFAULT_BRAND_FONTS;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onPickLogo}
          className="w-14 h-14 rounded-2xl border border-border bg-white flex items-center justify-center overflow-hidden shrink-0 hover:border-[var(--terra)]/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra)]/40"
        >
          {logoPreview ? (
            <img src={logoPreview} alt="Your logo" className="w-full h-full object-contain p-1.5" />
          ) : (
            <span className="text-[10px] font-bold text-ink-muted">Add</span>
          )}
        </button>
        <div>
          <p className="text-xs font-bold text-[#2D2235]">Logo</p>
          <p className="text-xs text-ink-muted">
            {logoPreview ? "Tap to swap" : "Required for the closing shot"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {SWATCHES.map(({ key, label, fallback, hint }) => {
          const value = (brandColors && brandColors[key]) || fallback;
          return (
            <div key={key} className="flex items-center gap-3">
              <label
                className="relative w-10 h-10 rounded-xl border border-border overflow-hidden cursor-pointer shrink-0"
                style={{ background: value }}
              >
                <input
                  type="color"
                  value={value}
                  onChange={(e) => setBrandColor && setBrandColor(key, e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  aria-label={`${label} brand colour`}
                />
              </label>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#2D2235]">{label}</p>
                <p className="text-[11px] text-ink-muted truncate">{hint}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2.5">
        <FontSelect label="Heading" value={fonts.heading} onChange={(v) => setBrandFont && setBrandFont("heading", v)} />
        <FontSelect label="Body" value={fonts.body} onChange={(v) => setBrandFont && setBrandFont("body", v)} />
      </div>

      {/* Only after a website import: there is no other source for tone, and an
          empty chip would just be furniture. */}
      {brandTone && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-[#2D2235]">Style</span>
          <span className="rounded-full bg-[var(--terra)]/8 border border-[var(--terra)]/30 px-2.5 py-1 text-[11px] font-bold text-[var(--terra)] capitalize">
            {brandTone}
          </span>
          <span className="text-[11px] text-ink-muted">read from your site, steers the scenes</span>
        </div>
      )}
    </div>
  );
}
