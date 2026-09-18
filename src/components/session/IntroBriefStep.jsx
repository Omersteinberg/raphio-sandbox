import { useRef, useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, X, Image as ImageIcon, ArrowRight,
  Lightbulb, Clock, Palette, Plus, RotateCcw,
  RectangleHorizontal, RectangleVertical,
  Flame, Scissors, Smartphone, Trees, ChevronRight,
  Wand2, Loader2, Check, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PromptMentionField from "./PromptMentionField";
import BrandUrlField from "./BrandUrlField";
import BrandKitPanel from "./BrandKitPanel";
import SitePhotoModal from "./SitePhotoModal";
import { ComposerChip, ComposerChipRow, ChipPanelLabel, ChipSegments } from "./ComposerChip";
import { useTypedPlaceholder, TYPED_PLACEHOLDER_CARET } from "@/hooks/useTypedPlaceholder";
import { useIsMobile, useMediaQuery } from "@/hooks/useMediaQuery";
import { ComposerFrame } from "./PipelineShell";
import { fetchIntroScenes } from "@/services/session";
import { improvePrompt as improvePromptApi } from "@/services/reference";
import { downscaleImageToDataUrl } from "@/lib/downscaleImage";
import { scoreIntroBrief } from "@/lib/promptStrength";
import { INTRO_DURATION_OPTIONS } from "../../constants/introDurations";
import { ASPECT_RATIO_OPTIONS } from "../../constants/aspectRatios";
import { ACCEPTED_IMAGE_ACCEPT, validateImageFile, filterValidImages } from "@/lib/imageValidation";
import { INTRO_CREDITS } from "@/lib/limits";
import HelpFab from "@/components/ui/HelpFab";
import { startIntroTour } from "@/lib/promptTour";
import { TOUR_KEYS } from "@/lib/tourState";
import { useStepTour } from "@/lib/useStepTour";

const GRADIENT = "var(--gradient-brand)";
// Eight, not more: the intro planner only ever attaches the first
// MAX_ATTACHED_PHOTOS (8) to the vision call in merge-api's introPrompt.js.
// Anything past that is planned around blind, so keep the two in sync.
const MAX_SHOWCASE = 8;

// Same warm-tinted card shadow PromptStep.jsx uses (its own local
// CARD_SHADOW, not exported - replicated here rather than imported). The
// third box-shadow layer stands in for a border, so the card carries no
// separate `border` class alongside it.
const CARD_SHADOW = {
  background: '#ffffff',
  boxShadow: '0 2px 16px rgba(193,68,14,0.06), 0 1px 0 rgba(255,255,255,0.8), 0 0 0 1px rgba(193,68,14,0.08)',
};

// Short pill labels for the strength meter's collapsed row (PromptStep.jsx's
// SEGMENT_FACTOR_LABEL) - the full descriptive strings from scoreIntroBrief()
// still drive the expanded hint text below. "identity" is shortened from its
// full label ("What you offer & who it's for") to fit the compact pill row;
// "detail"/"clearMessage" already match scoreIntroBrief's own factor labels.
const INTRO_SEGMENT_FACTOR_LABEL = {
  detail: 'Detailed',
  identity: 'What & who',
  clearMessage: 'Clear message',
};

// Met criteria swap their "what to add" hint for a short confirmation
// instead (PromptStep.jsx's FACTOR_CONFIRMATION) - unmet criteria keep
// showing the instructional hint unchanged.
const INTRO_FACTOR_CONFIRMATION = {
  detail: 'Your brief has enough detail to write a good script.',
  identity: 'Says what you offer and who it serves.',
  clearMessage: 'Connects what you offer to why it matters.',
};

// Worked briefs for the "Help me start" menu. A blank box is the main reason a
// brief comes back as "we do plumbing", and a vague brief can only produce a
// vague intro, so these model the three things the script actually needs: what
// you do, where, and who for.
// Directive rather than descriptive: these name the shots in order, because that
// is the brief that produces the video someone pictured. The @names refer to
// uploads, so each example doubles as a demonstration of the mention syntax.
// Every @ name below is either an upload the brief also describes, or a real beat
// from the catalog. Nothing here asks for something the engine cannot build:
// a brief that promises a conversion chart pulled out of a screenshot teaches
// people to write briefs that come back disappointing.
const EXAMPLES = [
  {
    label: "Heating engineer",
    text: "Gas Safe heating engineers in Manchester. Open on @chat with someone asking about a leak on a Sunday, then @rating, then @service_area for how far we travel, ending on @contact.",
    Icon: Flame,
  },
  {
    label: "Hair studio",
    text: "A two chair studio in Leeds doing colour corrections. Start with @before_after of a colour, then @price from £49, then @quote from a regular, ending on @logo.",
    Icon: Scissors,
  },
  {
    label: "App demo",
    text: "A demo of our app. Open on @dashboard, click into @analytics, then @metrics for the numbers that matter, then @features for what you get, ending on @cta.",
    Icon: Smartphone,
  },
  {
    label: "Garden design",
    text: "Garden design and build across Surrey. @steps for how a job runs, then @before_after of a patio, then @timeline for the years we have been at it, ending on @contact.",
    Icon: Trees,
  },
];

// The placeholder types the whole brief, not an abbreviation of it: the point is
// to show the level of detail that produces a good script, and a half sentence
// demonstrates the opposite.
const HINTS = EXAMPLES.map((e) => e.text);

const MAX_NAME = 24;

const CARET = TYPED_PLACEHOLDER_CARET;

/**
 * Keystroke-level cleanup: keeps the field a valid one-token name while it is
 * being typed.
 *
 * Deliberately does NOT trim trailing separators and does NOT strip a file
 * extension, both of which belong to the blur pass. Doing either per keystroke
 * makes an underscore impossible to type, because "reports_" is tidied back to
 * "reports" before the next character arrives, and turns "v2.1" into "v2".
 */
function sanitizeMentionInput(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9_]+/g, "_").slice(0, MAX_NAME);
}

/** Blur-level cleanup: tidy the ends, and never leave the field empty. */
function tidyMentionName(value, index) {
  const slug = sanitizeMentionInput(value).replace(/^_+|_+$/g, "");
  return slug || `photo_${index + 1}`;
}

/**
 * A filename turned into a default name. "Dashboard Screen.png" becomes
 * "dashboard_screen", so the default is already the name the user would pick.
 *
 * `taken` de-duplicates: two uploads answering to the same @name would leave the
 * model guessing which imageIndex a mention meant, and it has no way to be right.
 */
function toMentionName(filename, index, taken = []) {
  const base = String(filename || "").replace(/\.[^.]+$/, "");
  const slug = tidyMentionName(base, index);
  if (!taken.includes(slug)) return slug;
  for (let n = 2; n < 50; n += 1) {
    const candidate = `${slug}_${n}`.slice(0, MAX_NAME);
    if (!taken.includes(candidate)) return candidate;
  }
  return `photo_${index + 1}`;
}

/** Default names for a file list, each de-duplicated against the ones before it. */
function defaultNamesFor(files) {
  const out = [];
  (files || []).forEach((f, i) => out.push(toMentionName(f?.name, i, out)));
  return out;
}

export default function IntroBriefStep({
  logoFile,
  setLogoFile,
  businessName,
  setBusinessName,
  description,
  setDescription,
  targetDuration,
  setTargetDuration,
  aspectRatio,
  setAspectRatio,
  brandColors,
  setBrandColor,
  brandFonts,
  setBrandFont,
  brandTone,
  applyExtractedBrand,
  sitePhotos,
  showcaseFiles,
  setShowcaseFiles,
  showcaseLabels,
  setShowcaseLabels,
  loading,
  error,
  onContinue,
  onModeChange,
}) {
  const logoInputRef = useRef(null);
  const showcaseInputRef = useRef(null);

  const [logoPreview, setLogoPreview] = useState(null);
  const [showcasePreviews, setShowcasePreviews] = useState([]);

  // "Help me start" popover: local open state + click-outside/Escape close,
  // the same mechanics ComposerChipRow uses for its chip popovers - copied
  // rather than imported because the trigger here is the bare text+icon
  // "Tips" pattern (PromptStep.jsx, no bounding box), not a ComposerChip.
  const [helpOpen, setHelpOpen] = useState(false);
  const helpRef = useRef(null);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  // Fed into the shared ComposerFrame below for the mobile top-padding
  // override, same as PromptStep.jsx does - both now render through the
  // same component, so this can't drift out of sync with the other three
  // modes again.
  const isMobile = useIsMobile();
  useEffect(() => {
    if (!helpOpen) return undefined;
    const onPointerDown = (e) => {
      if (helpRef.current && !helpRef.current.contains(e.target)) setHelpOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setHelpOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [helpOpen]);

  // First-run tour for this screen, mirroring PromptStep.jsx's own
  // useStepTour call: `enabled` gates on `onModeChange`, which
  // IntroPipelineCreator only passes down for a genuinely fresh session
  // (`!intro.sessionId`), never a resumed draft - the underlying signal this
  // was always meant to gate on. No `intro.tourEnabled`-style video-sequencing
  // gate here - Brand Intro has no first-visit video to race against, only
  // the tour.
  const introTour = useStepTour(TOUR_KEYS.introBrief, startIntroTour, { enabled: !!onModeChange });

  // The placeholder only animates on an untouched, unfocused box. Once someone is
  // about to type, motion behind the caret is just noise, and the placeholder is
  // not visible at all once there is any text.
  const [focused, setFocused] = useState(false);

  // The mentionable beats. A failure here is not worth an error state: the brief
  // still works, @ just offers uploads only.
  const [beats, setBeats] = useState([]);
  useEffect(() => {
    let cancelled = false;
    fetchIntroScenes()
      .then((list) => { if (!cancelled && Array.isArray(list)) setBeats(list); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const animating = !description && !focused;
  const typed = useTypedPlaceholder(HINTS, animating);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  useEffect(() => {
    const urls = (showcaseFiles || []).map((f) => URL.createObjectURL(f));
    setShowcasePreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [showcaseFiles]);

  // Memoised because these feed the mention list: as bare `x || []` expressions
  // they get a new identity every render and the memo below never holds.
  const photos = useMemo(() => showcaseFiles || [], [showcaseFiles]);
  const canStart = !!logoFile && description.trim().length > 0;
  const duration = INTRO_DURATION_OPTIONS.find((o) => o.value === targetDuration);

  const pickLogo = (file) => {
    const valid = validateImageFile(file);
    if (valid) setLogoFile(valid);
  };

  // Names are held parallel to the files, and every mutation rewrites both so an
  // index never points at another photo's name.
  const labels = useMemo(() => showcaseLabels || [], [showcaseLabels]);
  const defaults = useMemo(() => defaultNamesFor(photos), [photos]);
  const nameFor = (i) => labels[i] ?? defaults[i] ?? `photo_${i + 1}`;

  // Two photos answering to one @name is unresolvable at generation time, so it is
  // surfaced here rather than silently picking one.
  const names = photos.map((_, i) => nameFor(i));
  const clashes = new Set(names.filter((n, i) => names.indexOf(n) !== i));

  // Pictures a website import found. They arrive as an offer, not as uploads, so
  // the modal opens itself on a fresh import and `takenSitePhotos` is what stops
  // one already sitting in the brief being offered a second time.
  const [sitePhotosOpen, setSitePhotosOpen] = useState(false);
  const [takenSitePhotos, setTakenSitePhotos] = useState([]);
  useEffect(() => {
    setTakenSitePhotos([]);
    if (sitePhotos?.length) setSitePhotosOpen(true);
  }, [sitePhotos]);
  // Offered only while there is somewhere to put them: eight uploads is the cap,
  // and a grid nothing can be ticked in is worse than no grid.
  const offeredSitePhotos = (sitePhotos || []).filter((p) => !takenSitePhotos.includes(p.sourceUrl));
  const sitePhotoRoom = MAX_SHOWCASE - (showcaseFiles || []).length;
  const canPickSitePhotos = offeredSitePhotos.length > 0 && sitePhotoRoom > 0;

  const addShowcase = (files) => {
    const imgs = filterValidImages(files);
    if (!imgs.length) return;
    const next = [...photos, ...imgs].slice(0, MAX_SHOWCASE);
    const fresh = defaultNamesFor(next);
    setShowcaseFiles(next);
    setShowcaseLabels(next.map((f, i) => labels[i] || fresh[i]));
  };

  const removeShowcase = (i) => {
    setShowcaseFiles(photos.filter((_, idx) => idx !== i));
    setShowcaseLabels(photos.map((_, idx) => nameFor(idx)).filter((_, idx) => idx !== i));
  };

  const renameShowcase = (i, value) => {
    const next = photos.map((_, idx) => nameFor(idx));
    next[i] = value;
    setShowcaseLabels(next);
  };

  // What the @ dropdown offers: the pictures you uploaded, and the beats the
  // engine can build. Beats come from the catalog over the wire so a renamed
  // scene cannot leave a dead name here.
  const mentionTargets = useMemo(() => {
    const uploads = photos.map((f, i) => ({
      id: `photo-${i}`,
      name: labels[i] ?? toMentionName(f?.name, i),
      type: "upload",
      preview: showcasePreviews[i],
    }));
    const usable = beats.filter((b) => {
      // A beat that needs pictures is only worth offering once there are enough
      // of them. @before_after with one photo would be asked for and dropped.
      if (b.requires === "product") return photos.length >= 2;
      if (b.requires === "screenshot") return photos.length >= 1;
      return true;
    });
    return [
      ...uploads,
      ...usable.map((b) => ({ id: `beat-${b.type}`, name: b.mention, type: "beat", description: b.summary })),
    ];
  }, [photos, labels, showcasePreviews, beats]);

  // Brief strength - a transparent checklist that doubles as guidance, same
  // pattern PromptStep.jsx uses for its own prompt-strength meter (pure,
  // synchronous, recomputed as the brief changes).
  const strength = useMemo(
    () => scoreIntroBrief({ userPrompt: description }),
    [description]
  );
  const briefIsEmpty = !description?.trim();
  const allFactorsMet = strength.factors.length > 0 && strength.factors.every((f) => f.met);
  // Starts collapsed - just the bar + summary line - same as PromptStep's,
  // and auto-collapses once every factor passes even if opened by hand.
  const [showStrengthDetail, setShowStrengthDetail] = useState(false);
  useEffect(() => {
    if (allFactorsMet) setShowStrengthDetail(false);
  }, [allFactorsMet]);

  const strengthBarColor = briefIsEmpty
    ? "#D8CFC5" // neutral clay - not yet evaluative
    : strength.band === "strong"
      ? "#1C8357" // green, AA-safe as text
      : strength.band === "ok"
      ? "#F0B429" // yellow
      : "#E5484D"; // red

  // "Improve with AI". With an empty box it drafts the first brief instead, which
  // is why the enable check is not simply "is there text".
  const [improving, setImproving] = useState(false);
  const [improveError, setImproveError] = useState(null);
  // The whole previous state of both fields, so one Undo puts the card back as it
  // was. Improve can fill the business name too, and undoing half of that would be
  // worse than not offering it.
  const [prevBrief, setPrevBrief] = useState(null);

  const drafting = !description.trim();
  const canImprove = !drafting || !!logoFile || !!businessName.trim() || photos.length > 0;

  const handleImprove = async () => {
    if (improving || !canImprove) return;
    setImproving(true);
    setImproveError(null);
    const prev = { description, businessName };
    try {
      const [logoDataUrl, shots] = await Promise.all([
        logoFile ? downscaleImageToDataUrl(logoFile) : Promise.resolve(null),
        Promise.all(photos.slice(0, MAX_SHOWCASE).map((f) => downscaleImageToDataUrl(f))),
      ]);
      // All the photos or none of them: the names are sent as a list and the
      // pictures as an ordered set, so a half-attached batch would put the two out
      // of step and bind an @name to the wrong image. Every name still goes, so a
      // downscale failure costs the model its eyes, not the user their mentions.
      const imageDataUrls = shots.length && shots.every(Boolean) ? shots : [];
      const result = await improvePromptApi({
        mode: "intro",
        userPrompt: description,
        businessName,
        targetDuration,
        references: photos.map((_, i) => ({ id: `photo-${i}`, name: nameFor(i), type: "upload" })),
        logoDataUrl,
        imageDataUrls,
      });
      if (result?.improvedPrompt) {
        setPrevBrief(prev);
        setDescription(result.improvedPrompt);
        // Only ever fills a blank field. A name the user typed is theirs.
        if (result.businessName && !businessName.trim()) setBusinessName(result.businessName);
      }
    } catch (err) {
      console.error("[IntroBriefStep] improve brief failed", err);
      setImproveError("Could not write that one. Try again.");
    } finally {
      setImproving(false);
    }
  };

  const handleUndoImprove = () => {
    if (!prevBrief) return;
    setDescription(prevBrief.description);
    setBusinessName(prevBrief.businessName);
    setPrevBrief(null);
  };

  return (
    <div className="w-full h-full overflow-y-auto relative">
      {/* Help FAB: same shared component + fixed bottom-right position as
          PromptStep.jsx. Tour-only (no onPlayVideo) - there is no Brand
          Intro tutorial video, so resolveHelpMode resolves to "tour" and
          the button opens the tour directly on click instead of showing
          the video/tour picker menu PromptStep's does. */}
      <HelpFab onStartTour={introTour.replay} />

      {/* Outer max-width/padding/centering now lives in the shared
          ComposerFrame (PipelineShell.jsx) - both this and PromptStep.jsx's
          composer render through it, so the two can't independently drift in
          width or top spacing again (this used to apply its horizontal
          padding INSIDE the max-w-4xl box, shrinking this card, while
          PromptStep.jsx applied it OUTSIDE, on an ancestor - same numbers,
          different box model, different rendered width). */}
      <ComposerFrame isMobile={isMobile}>
      <div className="space-y-5">
        {/* Hidden pickers, driven by the logo avatar and Photos chip below.
            The native `hidden` attribute, not a `className="hidden"` -
            Tailwind's space-y-* utility compiles to
            `:not([hidden]) ~ :not([hidden])`, which only excludes elements
            using the real HTML attribute. A CSS class named "hidden" doesn't
            match that selector, so these still counted as preceding
            siblings and space-y-5 added a phantom 20px margin-top above the
            composer card below - extra spacing PromptStep.jsx's equivalent
            card never had, since it has no such siblings before it. */}
        <input
          ref={logoInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_ACCEPT}
          hidden
          onChange={(e) => {
            pickLogo(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input
          ref={showcaseInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            addShowcase(Array.from(e.target.files || []));
            e.target.value = "";
          }}
        />

        {/* The brief: one card, everything in it */}
        <div className="rounded-3xl p-5 md:p-7" style={CARD_SHADOW}>
          {/* Optional shortcut. Fills only what is still empty below, so it never
              overwrites something already typed. The length goes with it: the brief
              it drafts names beats, and how many depends on the length picked.
              Wrapped in its own div for the tour anchor - same reason
              intro-settings wraps ComposerChipRow instead of tagging it
              directly: BrandUrlField doesn't spread unlisted props onto its
              own root, so a data-tour prop passed straight to it would be
              silently dropped. The wrapper has no layout classes of its own,
              so BrandUrlField's own mb-4 still collapses through it exactly
              as if the wrapper weren't there. */}
          <div data-tour="intro-fetch">
            <BrandUrlField onApply={applyExtractedBrand} targetDuration={targetDuration} />
            {/* The way back in. Closing the popup is not the same as saying no to
                every picture on the site, so the offer stays reachable. */}
            {canPickSitePhotos && !sitePhotosOpen && (
              <button
                type="button"
                onClick={() => setSitePhotosOpen(true)}
                className="-mt-2 mb-4 text-xs font-bold text-[var(--terra)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra)]/40 rounded"
              >
                Pick from the {offeredSitePhotos.length} {offeredSitePhotos.length === 1 ? "picture" : "pictures"} on your site
              </button>
            )}
          </div>

          {/* Identity: logo avatar + business name, grouped as one field since
              both name the brand on screen. Required behavior (canStart still
              gates on logoFile) is unchanged - only the control's shape moved
              from a settings-row pill to an inline avatar upload. */}
          <div data-tour="intro-identity" className="flex items-center gap-3 mt-6">
            <div className="relative shrink-0 group">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                aria-label={logoFile ? "Change logo" : "Add your logo (required)"}
                className={`w-11 h-11 rounded-full flex items-center justify-center overflow-hidden transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra)]/40 ${
                  logoFile
                    ? "border border-border/60 bg-white"
                    : "border-2 border-dashed border-[var(--terra)]/45 bg-[var(--terra)]/6 hover:border-[var(--terra)]/65 hover:bg-[var(--terra)]/10"
                }`}
              >
                {logoFile && logoPreview ? (
                  <img src={logoPreview} alt="" className="w-full h-full object-contain bg-white" />
                ) : (
                  <Plus className="w-4 h-4 text-[var(--terra)]" />
                )}
              </button>
              {logoFile && (
                <button
                  type="button"
                  onClick={() => setLogoFile(null)}
                  aria-label="Remove logo"
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white border border-border/70 text-[#6B5E7B] hover:text-red-500 hover:border-red-200 flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity shadow-sm"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {/* Visible rather than folded into the prompt because it is set on
                screen in the video and in the corner of every scene. */}
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Business name"
              aria-label="Business name"
              className="flex-1 min-w-0 bg-transparent border-0 outline-none text-xl md:text-2xl font-black tracking-tight text-[#2D2235] placeholder:text-[#C9C0D3] placeholder:font-bold"
            />
          </div>
          <div className="h-px bg-border/50 my-4" />

          {/* Section label + brief actions, tightly grouped with the textarea
              directly below - the label's job is to introduce the field right
              under it, not to sit between the URL fetch bar and the name. */}
          <div className="flex items-center justify-between gap-3 mb-2">
            <label htmlFor="intro-description" className="text-xs font-bold uppercase tracking-widest text-ink-muted">
              Tell us about your business
            </label>
            <div className="flex items-center gap-2 shrink-0">
              {/* Write my brief: matches the outlined-pill style
                  Inspiration/Dictionary use in PromptStep.jsx's header row
                  (resting state, not their active/toggled fill) - same
                  className and inline style values, not an approximation.
                  Kept as a bespoke button rather than ImproveButton because
                  ImproveButton's own base className bakes in different
                  padding/height (px-4 py-2 min-h-11 vs this row's
                  py-1.5 min-h-12) that a caller-supplied className can't
                  reliably override. */}
              <span
                className="inline-flex"
                title={!canImprove ? "Add your business name, logo, or a photo first" : undefined}
              >
                <button
                  type="button"
                  onClick={handleImprove}
                  disabled={!canImprove || improving}
                  className="inline-flex items-center gap-1.5 py-1.5 px-4 min-h-12 rounded-full text-[11px] font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: 'transparent', color: '#C1440E', border: '1.5px solid rgba(193,68,14,0.20)' }}
                  onMouseEnter={e => { if (!(!canImprove || improving)) e.currentTarget.style.background = 'rgba(193,68,14,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {improving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                  <span>{improving ? (drafting ? "Writing…" : "Improving…") : (drafting ? "Write my brief" : "Improve")}</span>
                </button>
              </span>

              {/* Help me start: the "Tips" trigger pattern (PromptStep.jsx) -
                  no bounding box, muted text that only brightens to terra on
                  hover, icon-only below `sm`. A bespoke trigger rather than
                  ComposerChip because ComposerChip's `lg`/`outlined` styling
                  always renders a bordered chip, which is exactly the
                  equal-weight-to-Improve look this needs to move away from.
                  The popover panel itself still reuses ComposerChip's Clay
                  Wash popover markup (bg-surface-alt, same positioning,
                  same motion values, same click-outside/Escape close) rather
                  than inventing new popover styling. */}
              <div className="relative" ref={helpRef}>
                <button
                  type="button"
                  onClick={() => setHelpOpen((o) => !o)}
                  aria-expanded={helpOpen}
                  aria-controls="help-start-popover"
                  aria-label="Help me start"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-11 text-[11px] font-bold transition-colors"
                  style={{ color: '#75695F' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#C1440E'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#75695F'; }}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>Help me start</span>
                </button>
                <AnimatePresence>
                  {helpOpen && (
                    <motion.div
                      id="help-start-popover"
                      role="dialog"
                      aria-label="Help me start"
                      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: -4 }}
                      transition={reducedMotion ? { duration: 0.1 } : { type: "spring", stiffness: 420, damping: 32 }}
                      style={{
                        transformOrigin: "top right",
                        boxShadow: "0 8px 24px rgba(193,68,14,0.16), 0 2px 8px rgba(193,68,14,0.10)",
                      }}
                      className="absolute z-30 top-[calc(100%+8px)] right-0 w-[min(88vw,320px)] max-h-[min(360px,60vh)] overflow-y-auto rounded-2xl bg-surface-alt border border-border/40 p-4"
                    >
                      <ChipPanelLabel>Start from one of these</ChipPanelLabel>
                      <div>
                        {EXAMPLES.map((ex, i) => (
                          <button
                            key={ex.label}
                            type="button"
                            onClick={() => {
                              setDescription(ex.text);
                              setHelpOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 text-left py-2.5 transition-colors hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra)]/40 rounded-lg ${
                              i < EXAMPLES.length - 1 ? "border-b border-border/40" : ""
                            }`}
                          >
                            <span
                              className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                              style={{ background: 'rgba(193,68,14,0.10)', color: 'var(--terra)' }}
                            >
                              <ex.Icon className="w-4 h-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold text-[#2D2235] truncate">{ex.label}</p>
                              <p className="text-xs text-[#6B5E7B] truncate">{ex.text}</p>
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-[#A99FB5] shrink-0" />
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* `relative` is what the @ dropdown positions against, and the focus
              handlers live here rather than on the field because
              PromptMentionField sets its own onBlur after spreading props. Focus
              events bubble, so the wrapper sees both. */}
          <div
            data-tour="intro-brief"
            className="relative"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          >
            <PromptMentionField
              id="intro-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              references={mentionTargets}
              title="Your uploads"
              // Focusing settles the half-typed line into a whole one rather than
              // freezing it mid-word.
              placeholder={typed === null ? EXAMPLES[0].text : `${typed}${CARET}`}
              className="w-full min-h-[128px] md:min-h-[148px] resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm md:text-[15px] leading-relaxed placeholder:text-[#A99FB5]"
              style={{ color: "#2D2235" }}
            />
          </div>

          {/* Controls: logo now lives as the avatar next to Business name above -
              Photos/Length/Ratio/Brand kit are the shared chip primitive.
              `grow` + the row's own `w-full`/`gapClassName` match
              PromptStep.jsx's Length/Ratio/Voice/Music row byte-for-byte, so
              this row stretches to fill the card evenly instead of packing
              left at content width. `whitespace-nowrap min-w-max` stops the
              longest label ("Brand kit") wrapping to a second line once the
              equal-width stretch narrowed its column - `min-w-max` gives it
              (and every chip) a content-width floor so flex-grow only
              redistributes leftover row space instead of forcing a strict
              even split that ignores content. `sm:!px-6` (desktop only,
              `!` forces the override since SIZE.lg's own `sm:px-4` is a
              same-specificity Tailwind utility with no guaranteed source-
              order win) widens the resting horizontal padding from 16px to
              24px for more breathing room now that the row is wider. */}
          <div data-tour="intro-settings">
          <ComposerChipRow className="w-full pt-1" gapClassName="gap-2 sm:gap-3">
            <ComposerChip
              id="photos"
              grow
              size="lg"
              variant="outlined"
              className="whitespace-nowrap min-w-max sm:!px-6"
              icon={ImageIcon}
              label="Photos"
              value={photos.length ? `${photos.length}/${MAX_SHOWCASE}` : undefined}
              modified={photos.length > 0}
              panel={() => (
                <>
                  <ChipPanelLabel>Photos of your product, space or work</ChipPanelLabel>
                  {photos.length === 0 ? (
                    // A lone quarter-width tile in an empty four column grid reads as
                    // a rendering mistake. Empty gets its own full width target.
                    <button
                      type="button"
                      onClick={() => showcaseInputRef.current?.click()}
                      className="w-full rounded-xl border-2 border-dashed border-border py-7 flex flex-col items-center justify-center text-ink-muted hover:border-[var(--terra)]/60 hover:bg-[var(--terra)]/5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra)]/40"
                    >
                      <ImageIcon className="w-6 h-6 mb-1.5" />
                      <span className="text-xs font-bold">Add up to {MAX_SHOWCASE} photos</span>
                    </button>
                  ) : (
                  <div className="grid grid-cols-4 gap-3">
                    {showcasePreviews.map((url, i) => (
                      <motion.div
                        key={url}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-1.5"
                      >
                        <div className="relative group aspect-square">
                          <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover rounded-xl border border-border" />
                          <button
                            type="button"
                            onClick={() => removeShowcase(i)}
                            aria-label={`Remove photo ${i + 1}`}
                            className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex items-center justify-center shadow"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {/* The name is the whole point of the grid now: it is what an
                            @mention in the brief binds to. */}
                        <div
                          className="flex items-center rounded-lg bg-white border px-1.5 focus-within:border-[var(--terra)]/50"
                          style={{ borderColor: clashes.has(nameFor(i)) ? "#EF4444" : undefined }}
                        >
                          <span className="text-xs font-bold text-[var(--terra)]">@</span>
                          <input
                            value={nameFor(i)}
                            onChange={(e) => renameShowcase(i, sanitizeMentionInput(e.target.value))}
                            onBlur={() => renameShowcase(i, tidyMentionName(nameFor(i), i))}
                            maxLength={MAX_NAME}
                            aria-label={`Name for photo ${i + 1}`}
                            className="w-full bg-transparent border-0 outline-none py-1 text-[11px] font-bold text-[#2D2235] min-w-0"
                          />
                        </div>
                      </motion.div>
                    ))}
                    {photos.length < MAX_SHOWCASE && (
                      <button
                        type="button"
                        onClick={() => showcaseInputRef.current?.click()}
                        className="aspect-square self-start rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-ink-muted hover:border-[var(--terra)]/60 hover:bg-[var(--terra)]/5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra)]/40"
                      >
                        <ImageIcon className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-bold">Add</span>
                      </button>
                    )}
                  </div>
                  )}
                  {clashes.size > 0 && (
                    <p className="text-xs font-bold text-red-500 mt-3">
                      Two photos share a name. Give each one its own, or an @mention cannot tell
                      them apart.
                    </p>
                  )}
                  <p className="text-xs text-ink-muted mt-3">
                    Name each one to call it out in the brief with @, like @dashboard. Unnamed
                    photos still get used, we just choose where. Skip photos entirely and we
                    build from type and motion.
                  </p>
                </>
              )}
            />

            <ComposerChip
              id="length"
              grow
              size="lg"
              variant="outlined"
              className="whitespace-nowrap min-w-max sm:!px-6"
              icon={Clock}
              label="Length"
              value={`${targetDuration}s`}
              panel={() => (
                <>
                  <ChipPanelLabel>Length</ChipPanelLabel>
                  <ChipSegments
                    layoutId="introLengthSegment"
                    options={INTRO_DURATION_OPTIONS.map((o) => ({ ...o, key: o.value }))}
                    value={targetDuration}
                    onChange={setTargetDuration}
                    render={(o) => o.label}
                  />
                  <p className="text-xs text-ink-muted mt-3">
                    {duration?.desc}. Every intro costs {INTRO_CREDITS} credits, whatever the length.
                  </p>
                </>
              )}
            />

            <ComposerChip
              id="ratio"
              grow
              size="lg"
              variant="outlined"
              className="whitespace-nowrap min-w-max sm:!px-6"
              icon={aspectRatio === "9:16" ? RectangleVertical : RectangleHorizontal}
              label="Ratio"
              value={aspectRatio}
              panel={() => (
                <>
                  <ChipPanelLabel>Aspect ratio</ChipPanelLabel>
                  <ChipSegments
                    layoutId="introRatioSegment"
                    options={ASPECT_RATIO_OPTIONS.map((o) => ({ ...o, key: o.id }))}
                    value={aspectRatio}
                    onChange={setAspectRatio}
                    render={(o) => (
                      <>
                        <span className="mr-1">{o.icon}</span>
                        {o.name} · {o.id}
                      </>
                    )}
                  />
                  <p className="text-xs text-ink-muted mt-3">
                    {ASPECT_RATIO_OPTIONS.find((o) => o.id === aspectRatio)?.description}
                  </p>
                </>
              )}
            />

            <ComposerChip
              id="brandkit"
              grow
              size="lg"
              variant="outlined"
              className="whitespace-nowrap min-w-max sm:!px-6"
              icon={Palette}
              label="Brand kit"
              modified={!!brandColors}
              panel={() => (
                <>
                  <ChipPanelLabel>Brand kit</ChipPanelLabel>
                  <BrandKitPanel
                    brandColors={brandColors}
                    setBrandColor={setBrandColor}
                    brandFonts={brandFonts}
                    setBrandFont={setBrandFont}
                    brandTone={brandTone}
                    logoPreview={logoPreview}
                    onPickLogo={() => logoInputRef.current?.click()}
                  />
                  <p className="text-xs text-ink-muted mt-4">
                    Pulled from your website or your logo, and used across every scene. Tweak
                    anything to match.
                  </p>
                </>
              )}
            />
          </ComposerChipRow>
          </div>

          {/* Strength meter: copied from PromptStep.jsx's own (same classes,
              colors, motion values - not an approximation), wired to
              scoreIntroBrief() and its three brief-specific factors instead
              of scorePrompt()'s four video-scene ones. `mt-6` matches this
              composer's own section-break convention (the same gap used
              above the Business name row) - PromptStep's copy relies on its
              parent's `space-y-4`/`space-y-6` for this same separation, which
              this card doesn't have, so it sat flush against the chip row
              above it without an explicit margin of its own. */}
          <div className={`mt-6 ${reducedMotion ? '' : 'strength-fade-in'}`}>
            <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(193,68,14,0.10)' }}>
              <div
                className="h-full w-full rounded-full"
                style={{
                  background: strengthBarColor,
                  transform: `scaleX(${strength.score / 100})`,
                  transformOrigin: 'left',
                  transition: 'transform 0.3s ease',
                }}
              />
            </div>

            <div className="flex items-center flex-wrap gap-x-5 gap-y-2 pt-2.5">
              <span className="flex items-center gap-1.5 text-[11px] font-bold flex-shrink-0" style={{ color: briefIsEmpty ? '#75695F' : strengthBarColor }}>
                {allFactorsMet && (
                  <span className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 15, height: 15, background: '#22A06B' }}>
                    <Check className="w-2.5 h-2.5" style={{ color: '#fff' }} strokeWidth={3.5} />
                  </span>
                )}
                {briefIsEmpty ? 'Start typing to see your brief strength' : allFactorsMet ? 'Strong brief' : `Brief strength: ${strength.label}`}
              </span>

              <div className="hidden sm:contents">
                {strength.factors.map((f) => (
                  <span key={f.id} className="flex items-center gap-1.5 flex-shrink-0">
                    <span
                      className="flex items-center justify-center rounded-full flex-shrink-0"
                      style={{
                        width: 15, height: 15,
                        background: f.met ? '#22A06B' : 'transparent',
                        border: f.met ? 'none' : '1.5px solid rgba(193,68,14,0.30)',
                      }}
                    >
                      {f.met && <Check className="w-2.5 h-2.5" style={{ color: '#fff' }} strokeWidth={3.5} />}
                    </span>
                    <span className="text-[11px] font-medium" style={{ color: f.met ? 'var(--ink-warm)' : '#6B5E7B' }}>
                      {INTRO_SEGMENT_FACTOR_LABEL[f.id] || f.label}
                    </span>
                  </span>
                ))}
              </div>

              {strength.factors.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowStrengthDetail((s) => !s)}
                  aria-expanded={showStrengthDetail}
                  aria-controls="intro-strength-hints"
                  className="flex items-center gap-1 text-[11px] font-bold ml-auto flex-shrink-0"
                  style={{ color: allFactorsMet ? '#1C8357' : '#C1440E' }}
                >
                  {showStrengthDetail ? 'Hide' : 'Show details'}
                  {showStrengthDetail ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>

            <AnimatePresence initial={false}>
              {showStrengthDetail && strength.factors.length > 0 && (
                <motion.div
                  initial={reducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={reducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  transition={{ duration: 0.16 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 mb-2" style={{ borderTop: '1px solid rgba(193,68,14,0.10)' }} />
                  <ul id="intro-strength-hints" className="space-y-1.5">
                    {strength.factors.map((f) => (
                      <li key={f.id} className="flex items-start gap-1.5 text-[10.5px] leading-snug">
                        <span
                          className="flex items-center justify-center rounded-full flex-shrink-0 mt-0.5"
                          style={{
                            width: 13, height: 13,
                            background: f.met ? '#22A06B' : 'transparent',
                            border: f.met ? 'none' : '1.5px solid rgba(193,68,14,0.30)',
                          }}
                        >
                          {f.met && <Check className="w-2 h-2" style={{ color: '#fff' }} strokeWidth={3.5} />}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block font-bold" style={{ color: f.met ? '#1C8357' : '#6B5E7B' }}>
                            {f.label}
                            {f.detail && <span className="font-medium" style={{ color: '#75695F' }}> · {f.detail}</span>}
                          </span>
                          <span className="block" style={{ color: '#75695F' }}>
                            {f.met && INTRO_FACTOR_CONFIRMATION[f.id] ? INTRO_FACTOR_CONFIRMATION[f.id] : f.hint}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Undo after an AI write. Restores the brief and the name together. */}
        <AnimatePresence>
          {prevBrief && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex items-center justify-between gap-2 rounded-xl px-3 py-2"
              style={{ background: 'rgba(193,68,14,0.06)', border: '1px solid rgba(193,68,14,0.14)' }}
            >
              <span className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: '#C1440E' }}>
                <Sparkles style={{ width: 12, height: 12 }} />
                {prevBrief.description.trim() ? 'Brief improved with AI' : 'Brief written with AI'}
              </span>
              <button
                type="button"
                onClick={handleUndoImprove}
                className="flex items-center gap-1 text-[11px] font-bold"
                style={{ color: '#75695F' }}
              >
                <RotateCcw style={{ width: 12, height: 12 }} /> Undo
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {improveError && (
          <p className="text-center text-xs font-bold text-red-500">{improveError}</p>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </div>
        )}

        {/* Same width cap PromptStep.jsx puts on its own CTA
            (w-full sm:max-w-[480px] sm:mx-auto): the card just widened to
            max-w-4xl to match the other modes, and without this the button
            would stretch to the full ~896px card width instead of reading
            as a single focused action, same as it would in PromptStep.
            data-tour="intro-cta" re-added: startIntroTour (promptTour.js)
            was missing the final CTA step every other tour has (Image/
            References' own "cta" step targeting their Create-video
            button) - this is that step's anchor. */}
        <div data-tour="intro-cta" className="w-full sm:max-w-[480px] sm:mx-auto">
          <Button
            onClick={onContinue}
            disabled={!canStart || loading}
            className="w-full text-white border-0 rounded-2xl py-6 text-base font-bold disabled:opacity-50"
            style={{ background: GRADIENT }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                />
                Writing your script…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Continue to script
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </Button>
        </div>

        {/* A disabled button with no reason is the commonest dead end in a form. */}
        <p className="text-center text-xs text-ink-muted">
          {!logoFile
            ? "Add your logo to continue"
            : !description.trim()
              ? "Describe your business to continue"
              : `${INTRO_CREDITS} credits · ${targetDuration} second intro with music`}
        </p>
      </div>

      {/* Plain conditional, no AnimatePresence: it is how every other modal in
          the app mounts, and wrapping this one left it stuck in the DOM at
          opacity 0 after a close, swallowing every click on the page. */}
      {sitePhotosOpen && canPickSitePhotos && (
        <SitePhotoModal
          photos={offeredSitePhotos}
          remaining={sitePhotoRoom}
          onAdd={(files, urls) => {
            addShowcase(files);
            setTakenSitePhotos((cur) => [...cur, ...urls]);
          }}
          onClose={() => setSitePhotosOpen(false)}
        />
      )}
      </ComposerFrame>
    </div>
  );
}
