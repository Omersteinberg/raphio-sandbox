// The creation screen's header: icon mark + headline + subtitle. Previously
// duplicated per pipeline (PromptStep.jsx had its own copy, with a
// References-specific variant; IntroBriefStep.jsx had a third, Brand-Intro
// specific version). Now that all four modes live on one page behind a
// toggle instead of four separate screens, a header that changed per tab
// made the switch feel like a full page change - one static header,
// rendered once by Creator.jsx above the tab row, removes that. Copy and
// markup are reused verbatim from PromptStep.jsx's former default (non-
// references) header - the copy every mode now shares.
// `compact` drops the headline/tagline down to just the logo mark - used
// while a merged run (references/script/scenes/video auto-progressing with
// no manual review in between) is on screen, where ProgressChecklist is
// already carrying the page's title and the full headline is redundant
// weight above it. Same badge treatment as the full header below (same
// gradient box, same size, same white-inverted mark) minus boxShadow - a
// shadow-free badge still reads as "the create page's logo," just flatter,
// which suits sitting directly on the page background with no card beneath
// it. No scroll-linked behavior of any kind - it's plain content that
// scrolls with the page like everything else. mb-6/mb-8 (vs. the full
// header's mb-1) is intentionally more breathing room, so the mark doesn't
// read as glued to the checklist under it.
export default function CreatorHeader({ compact = false }) {
  if (compact) {
    return (
      <div className="text-center mb-6 sm:mb-8 flex justify-center">
        <div
          className="w-[60px] h-[60px] sm:w-[75px] sm:h-[75px] rounded-[20px] sm:rounded-[24px] flex items-center justify-center"
          style={{
            background: 'linear-gradient(225deg, #F9B31B, #FF7A1A, #F3283C)',
            outline: '1.5px solid rgba(255,255,255,0.55)',
            outlineOffset: '-1.5px',
          }}
        >
          {/* drop-shadow (not a wrapper box-shadow) traces the icon's own
              edge, giving it a little definition without recreating the
              card/container look the wrapper's boxShadow was deliberately
              stripped of above. */}
          <img
            src="/Raphio.png"
            alt="Raphio"
            className="w-[50%] h-[50%] object-contain"
            style={{ filter: 'brightness(0) invert(1) drop-shadow(0 1px 2px rgba(0,0,0,0.08))' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="text-center mb-1">
      <div className="relative inline-flex items-center justify-center mb-3 sm:mb-5">
        <div
          className="w-[60px] h-[60px] sm:w-[75px] sm:h-[75px] rounded-[20px] sm:rounded-[24px] flex items-center justify-center"
          style={{
            background: 'linear-gradient(225deg, #F9B31B, #FF7A1A, #F3283C)',
            boxShadow: '0 2px 8px rgba(193,68,14,0.25), 0 10px 24px rgba(193,68,14,0.20)',
            outline: '1.5px solid rgba(255,255,255,0.55)',
            outlineOffset: '-1.5px',
          }}
        >
          <img
            src="/Raphio.png"
            alt="Raphio"
            className="w-[50%] h-[50%] object-contain"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        </div>
      </div>

      <h1 className="font-black" style={{ fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: 'var(--ink-warm)', letterSpacing: '-0.01em', lineHeight: 1.05 }}>
        Your story. Your <span style={{ color: '#C1440E' }}>video.</span>
      </h1>
      <p className="hidden sm:block mt-5 text-base font-medium" style={{ color: '#75695F' }}>
        Tell Raphio what you want. It handles everything else.
      </p>
    </div>
  );
}
