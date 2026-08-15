import { useRef, useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, X, Image as ImageIcon, ArrowRight, ArrowLeft,
  Lightbulb, Clock, Palette, Plus, ChevronDown, RotateCcw,
  RectangleHorizontal, RectangleVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PromptMentionField from "./PromptMentionField";
import ImproveButton from "./ImproveButton";
import BrandUrlField from "./BrandUrlField";
import BrandKitPanel from "./BrandKitPanel";
import { ComposerChip, ComposerChipRow, ChipPanelLabel, ChipSegments } from "./ComposerChip";
import { useTypedPlaceholder, TYPED_PLACEHOLDER_CARET } from "@/hooks/useTypedPlaceholder";
import { fetchIntroScenes } from "@/services/session";
import { improvePrompt as improvePromptApi } from "@/services/reference";
import { downscaleImageToDataUrl } from "@/lib/downscaleImage";
import { INTRO_DURATION_OPTIONS } from "../../constants/introDurations";
import { ASPECT_RATIO_OPTIONS } from "../../constants/aspectRatios";
import { ACCEPTED_IMAGE_ACCEPT, validateImageFile, filterValidImages } from "@/lib/imageValidation";

const GRADIENT = "var(--gradient-brand)";
const MAX_SHOWCASE = 4;

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
  },
  {
    label: "Hair studio",
    text: "A two chair studio in Leeds doing colour corrections. Start with @before_after of a colour, then @price from £49, then @quote from a regular, ending on @logo.",
  },
  {
    label: "App demo",
    text: "A demo of our app. Open on @dashboard, click into @analytics, then @metrics for the numbers that matter, then @features for what you get, ending on @cta.",
  },
  {
    label: "Garden design",
    text: "Garden design and build across Surrey. @steps for how a job runs, then @before_after of a patio, then @timeline for the years we have been at it, ending on @contact.",
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
  // "Help me start" lives in the header, not the chip row below the textarea,
  // so it keeps its own open state instead of the chip row's shared popover
  // coordination (which only spans Photos/Length/Ratio/Brand kit).
  const [examplesOpen, setExamplesOpen] = useState(false);

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
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 space-y-5">
        {/* Header */}
        <div className="text-center space-y-2">
          {onModeChange && (
            <button
              onClick={() => onModeChange("image")}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#6B5E7B] hover:text-[var(--terra)] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Other pipelines
            </button>
          )}
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[#2D2235]">
            Create a brand intro
          </h1>
          <p className="text-sm max-w-md mx-auto text-[#6B5E7B] font-medium leading-relaxed">
            Your logo and a sentence about the business. We write the script, animate it and
            land on your logo.
          </p>
        </div>

        {/* Hidden pickers, driven by the pills below */}
        <input
          ref={logoInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_ACCEPT}
          className="hidden"
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
          className="hidden"
          onChange={(e) => {
            addShowcase(Array.from(e.target.files || []));
            e.target.value = "";
          }}
        />

        {/* The brief: one card, everything in it */}
        <div className="bg-white rounded-3xl border border-border/60 shadow-xs p-5 md:p-7">
          {/* Optional shortcut. Fills only what is still empty below, so it never
              overwrites something already typed. The length goes with it: the brief
              it drafts names beats, and how many depends on the length picked. */}
          <BrandUrlField onApply={applyExtractedBrand} targetDuration={targetDuration} />

          <div className="flex items-start justify-between gap-3">
            <label htmlFor="intro-description" className="text-xs font-bold uppercase tracking-widest text-ink-muted pt-1">
              Tell us about your business
            </label>
            <div className="flex items-center gap-2 shrink-0">
              <ImproveButton
                onClick={handleImprove}
                busy={improving}
                disabled={!canImprove}
                label={drafting ? "Write my brief" : "Improve"}
                busyLabel={drafting ? "Writing…" : "Improving…"}
              />
              <button
                type="button"
                onClick={() => setExamplesOpen((o) => !o)}
                aria-expanded={examplesOpen}
                aria-controls="panel-examples"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6B5E7B] hover:text-[var(--terra)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra)]/40 rounded-lg px-1 py-0.5 shrink-0"
              >
                <Lightbulb className="w-4 h-4" />
                Help me start
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${examplesOpen ? "rotate-180" : ""}`} />
              </button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {examplesOpen && (
              <motion.div
                id="panel-examples"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="mt-3 rounded-2xl bg-surface-alt border border-border/30 p-4">
                  <ChipPanelLabel>Start from one of these</ChipPanelLabel>
                  <div className="space-y-2">
                    {EXAMPLES.map((ex) => (
                      <button
                        key={ex.label}
                        type="button"
                        onClick={() => {
                          setDescription(ex.text);
                          setExamplesOpen(false);
                        }}
                        className="w-full text-left rounded-xl bg-white border border-border/40 px-3.5 py-3 hover:border-[var(--terra)]/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra)]/40"
                      >
                        <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--terra)]">{ex.label}</p>
                        <p className="text-xs text-[#6B5E7B] leading-relaxed mt-1">{ex.text}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Business name. Visible rather than folded into the prompt because it is
              set on screen in the video and in the corner of every scene. */}
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Business name"
            aria-label="Business name"
            className="mt-4 w-full bg-transparent border-0 outline-none text-xl md:text-2xl font-black tracking-tight text-[#2D2235] placeholder:text-[#C9C0D3] placeholder:font-bold"
          />
          <div className="h-px bg-border/50 my-3" />

          {/* `relative` is what the @ dropdown positions against, and the focus
              handlers live here rather than on the field because
              PromptMentionField sets its own onBlur after spreading props. Focus
              events bubble, so the wrapper sees both. */}
          <div
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

          {/* Controls: logo stays a bespoke control (it carries a thumbnail +
              its own remove button, not the icon/label/value chip shape);
              Photos/Length/Ratio/Brand kit are the shared chip primitive. */}
          <ComposerChipRow className="pt-1">
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 min-h-11 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra)]/40 ${
                logoFile
                  ? "border-[var(--terra)]/45 bg-[var(--terra)]/6 text-[var(--terra)]"
                  : "border-[var(--terra)]/55 bg-[var(--terra)]/8 text-[var(--terra)]"
              }`}
            >
              {logoFile && logoPreview ? (
                <>
                  <img src={logoPreview} alt="" className="w-5 h-5 rounded object-contain bg-white" />
                  <span className="max-w-[9rem] truncate">{logoFile.name}</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add logo</span>
                  <span aria-hidden="true">*</span>
                </>
              )}
            </button>
            {logoFile && (
              <button
                type="button"
                onClick={() => setLogoFile(null)}
                aria-label="Remove logo"
                className="inline-flex items-center justify-center w-11 h-11 rounded-full border border-border/70 text-[#6B5E7B] hover:text-red-500 hover:border-red-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra)]/40"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <ComposerChip
              id="photos"
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
                    {duration?.desc}. Every intro costs 1 credit, whatever the length.
                  </p>
                </>
              )}
            />

            <ComposerChip
              id="ratio"
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
                style={{ color: '#9C8F85' }}
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

        {/* A disabled button with no reason is the commonest dead end in a form. */}
        <p className="text-center text-xs text-ink-muted">
          {!logoFile
            ? "Add your logo to continue"
            : !description.trim()
              ? "Describe your business to continue"
              : `1 credit · ${targetDuration} second intro with music`}
        </p>
      </div>
    </div>
  );
}
