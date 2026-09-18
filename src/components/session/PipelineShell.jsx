// Shared layout shell for the creation screen, consolidating what used to be
// four independently-declared copies of the same background/width/spacing
// values (see the audit that motivated this - Creator.jsx history). Two
// pieces, used at two different nesting levels:
//
// - PipelineShell (default export): the page-level gradient background,
//   shared by every step of every pipeline (composer, script review,
//   generating, result, editing) - used by ImagePipelineCreator.jsx,
//   ReferencesPipelineCreator.jsx, and IntroPipelineCreator.jsx as their
//   root element.
// - ComposerFrame (named export): the max-width column + top/bottom padding
//   shared by every mode's composer/brief screen - used by PromptStep.jsx
//   (Prompt/Photos/References) and IntroBriefStep.jsx (Brand Intro) to wrap
//   their own composer card. Deliberately transparent - PipelineShell above
//   already paints the gradient; a competing opaque background here (which
//   PromptStep.jsx used to have, and IntroBriefStep.jsx never did) is what
//   caused the two to visibly diverge despite the gradient value matching.

export default function PipelineShell({ children, className = "", heightClass = "h-full" }) {
  return (
    <div className={`${heightClass} flex flex-col font-figtree ${className}`} style={{ background: "var(--gradient-app)" }}>
      {children}
    </div>
  );
}

export function ComposerFrame({ children, isMobile, className = "" }) {
  return (
    <div
      className="min-h-full flex flex-col items-center justify-start px-2 sm:px-4 pt-5 sm:pt-8 md:pt-10 pb-12 md:pb-16"
      style={{ paddingTop: isMobile ? 24 : undefined }}
    >
      <div className={`w-full max-w-4xl ${className}`}>
        {children}
      </div>
    </div>
  );
}
