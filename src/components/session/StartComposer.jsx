// The front door of the creator: one box for the words and one for the photos,
// and Raphio decides which kind of video it is.
//
// The four mode tabs this replaces asked the client to know our pipelines ("Photos"
// animates the pictures themselves; "References" writes a story and films it with
// the people and logo in them). Someone who drops in photos of their team and types
// "spring promo" has already said everything the tabs asked. The decision is made
// as they type (POST /video/route-intent), shown as one line they can change, and
// the chosen pipeline opens pre-filled behind "Continue". See Creator.jsx.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Upload, X, Sparkles, ChevronDown, Check, Loader2, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComposerFrame } from "@/components/session/PipelineShell";
import { routeIntent } from "@/services/reference";
import { filterValidImages, ACCEPTED_IMAGE_ACCEPT } from "@/lib/imageValidation";
import { downscaleImageToDataUrl } from "@/lib/downscaleImage";
import { MAX_IMAGES, PIPELINE_DURATIONS, creditsForDuration } from "@/lib/limits";
import VoiceSelector from "@/components/session/VoiceSelector";
import { toast } from "@/lib/toast";
import { ROUTE_OPTIONS, MODE_OF_ROUTE, optionFor, PLACEHOLDER_BY_USE_CASE, DEFAULT_PLACEHOLDER } from "@/lib/routeOptions";
import { useAuth } from "@/hooks/useAuth";

// The router looks at this many pictures at most (the backend's MAX_PICTURES).
const ROUTED_PICTURES = 8;
// Route once the client has stopped typing for this long.
const ROUTE_DEBOUNCE_MS = 900;
const MIN_WORDS_TO_ROUTE = 3;

const RATIOS = [{ id: "16:9", label: "Landscape" }, { id: "9:16", label: "Vertical" }];

const wordCount = (s) => String(s || "").trim().split(/\s+/).filter(Boolean).length;

/**
 * @param {object} p
 * @param {string} p.userPrompt
 * @param {(v: string) => void} p.setUserPrompt
 * @param {Array<{file: File, preview: string}>} p.photos
 * @param {(updater) => void} p.setPhotos
 * @param {object|null} p.decision - { mode, headline, seen, uncertain, references, businessName, source: 'ai'|'user' }
 * @param {(d: object|null) => void} p.setDecision
 * @param {(d: object) => void} p.onContinue
 * @param {number} p.targetDuration / setTargetDuration, aspectRatio / setAspectRatio, voiceId / setVoiceId
 */
export default function StartComposer({
  userPrompt, setUserPrompt, photos, setPhotos, decision, setDecision, onContinue,
  targetDuration = null, setTargetDuration, aspectRatio, setAspectRatio, voiceId, setVoiceId,
}) {
  const { user } = useAuth();
  const placeholder = PLACEHOLDER_BY_USE_CASE[user?.useCase] || DEFAULT_PLACEHOLDER;
  const [routing, setRouting] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const shapeSetByUser = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef(null);
  const dataUrlCache = useRef(new Map());
  const requestSeq = useRef(0);
  const menuRef = useRef(null);

  const hasWords = wordCount(userPrompt) >= MIN_WORDS_TO_ROUTE;
  const hasPhotos = photos.length > 0;
  const chosenByUser = decision?.source === "user";

  // Ask the router. The latest request wins; older replies are dropped.
  const route = useCallback(async () => {
    const seq = ++requestSeq.current;
    setRouting(true);
    try {
      const shots = photos.slice(0, ROUTED_PICTURES);
      const images = await Promise.all(
        shots.map(async (p) => {
          if (!dataUrlCache.current.has(p.file)) {
            dataUrlCache.current.set(p.file, await downscaleImageToDataUrl(p.file, 768, 0.75));
          }
          return dataUrlCache.current.get(p.file);
        }),
      );
      const r = await routeIntent({ userPrompt, images, targetDuration, photoCount: photos.length });
      if (seq !== requestSeq.current) return;
      if (!r || !r.mode) { setDecision(null); return; }
      setDecision({
        mode: MODE_OF_ROUTE[r.mode] || r.mode,
        headline: r.headline,
        seen: r.seen,
        uncertain: !!r.uncertain,
        confidence: r.confidence,
        references: Array.isArray(r.references) ? r.references : [],
        businessName: r.businessName || "",
        // Whether the photos fit the chosen length, in one sentence when they do not.
        room: r.room || null,
        source: "ai",
      });
    } catch (err) {
      if (seq !== requestSeq.current) return;
      console.warn("[StartComposer] route-intent failed:", err?.message || err);
    } finally {
      if (seq === requestSeq.current) setRouting(false);
    }
  }, [photos, userPrompt, targetDuration, setDecision]);

  // Route as they go: after a pause in typing, and after every change to the photos.
  // A choice the client made by hand is kept until they change their inputs again.
  useEffect(() => {
    if (chosenByUser) return undefined;
    if (!hasWords && !hasPhotos) { setDecision(null); return undefined; }
    const t = setTimeout(route, hasWords ? ROUTE_DEBOUNCE_MS : 150);
    return () => clearTimeout(t);
    // route changes identity with its inputs, which is exactly what should re-arm the timer.
  }, [route, hasWords, hasPhotos, chosenByUser, setDecision]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const addFiles = (fileList) => {
    const files = filterValidImages(fileList);
    if (!files.length) return;
    setPhotos((prev) => {
      const room = Math.max(0, MAX_IMAGES - prev.length);
      if (files.length > room) toast.error(room === 0 ? `That's the limit: ${MAX_IMAGES} photos.` : `Only added ${room}: the limit is ${MAX_IMAGES} photos.`);
      const added = files.slice(0, room).map((file) => ({ file, preview: URL.createObjectURL(file) }));
      return [...prev, ...added];
    });
    // Fresh photos deserve a fresh read, even after a hand-picked choice.
    if (chosenByUser) setDecision(null);
  };

  const removePhoto = (index) => {
    setPhotos((prev) => {
      const gone = prev[index];
      if (gone) URL.revokeObjectURL(gone.preview);
      return prev.filter((_, i) => i !== index);
    });
    if (chosenByUser) setDecision(null);
  };

  const choose = (mode) => {
    setMenuOpen(false);
    // A reply still on its way from the router must not overwrite what the client
    // just picked by hand.
    requestSeq.current += 1;
    setRouting(false);
    const option = optionFor(mode);
    setDecision({
      ...(decision || {}),
      mode,
      headline: option ? option.label : "",
      uncertain: false,
      source: "user",
    });
  };

  // The words can name the format ("vertical", "for reels"): follow them until the user picks a shape.
  useEffect(() => {
    if (shapeSetByUser.current || !setAspectRatio) return;
    if (/\b(vertical|portrait|reels?|tiktok|stories|shorts|9:16)\b/i.test(userPrompt)) setAspectRatio("9:16");
    else if (/\b(landscape|horizontal|widescreen|youtube|16:9)\b/i.test(userPrompt)) setAspectRatio("16:9");
  }, [userPrompt, setAspectRatio]);

  const isIntro = decision?.mode === "intro";
  const canContinue = (hasPhotos || userPrompt.trim().length > 0) && !!decision && !routing;
  const pill = (active) => `px-3.5 py-2 rounded-full text-xs font-bold border transition-colors ${active ? "text-white border-transparent" : "border-border/50 bg-white hover:bg-orange-50"}`;
  const pillStyle = (active) => (active ? { background: "var(--gradient-brand)" } : { color: "var(--ink-warm)" });
  const option = useMemo(() => optionFor(decision?.mode), [decision]);

  return (
    <ComposerFrame>
      <div className="rounded-3xl border border-border/40 bg-white/85 backdrop-blur-sm shadow-xl shadow-orange-100/40 p-5 sm:p-8 space-y-7">
        {/* Words */}
        <div className="space-y-3">
          <h2 className="font-black" style={{ fontSize: "clamp(1.15rem, 2.4vw, 1.4rem)", color: "var(--ink-warm)", letterSpacing: "-0.01em" }}>
            What's your video about?
          </h2>
          <textarea
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder={placeholder}
            rows={4}
            className="w-full min-h-[160px] sm:min-h-[140px] rounded-2xl resize-none text-base p-4 sm:p-5 leading-relaxed border border-border/40 bg-white/70 focus:outline-none focus:ring-2 focus:ring-orange-200 placeholder:text-[#9B8FA8]"
            style={{ color: "var(--ink-warm)" }}
          />
        </div>

        {/* Photos */}
        <div
          className="space-y-3"
          onDragEnter={(e) => { e.preventDefault(); if (e.dataTransfer?.types?.includes("Files")) setDragging(true); }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => { if (e.currentTarget.contains(e.relatedTarget)) return; setDragging(false); }}
          onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-black" style={{ fontSize: "clamp(1.15rem, 2.4vw, 1.4rem)", color: "var(--ink-warm)", letterSpacing: "-0.01em" }}>
              Your photos
            </h2>
            <span className="text-xs font-bold" style={{ color: "#9B8FA8" }}>
              {hasPhotos ? `${photos.length} of ${MAX_IMAGES}` : "Optional"}
            </span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
          />
          {hasPhotos ? (
            <div className="flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <div key={p.preview} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border/40 bg-stone-100">
                  <img src={p.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {photos.length < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-orange-200 text-orange-500 flex flex-col items-center justify-center gap-1 text-[11px] font-bold hover:bg-orange-50 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Add
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`w-full rounded-2xl border-2 border-dashed px-4 py-6 flex items-center gap-4 text-left transition-colors ${dragging ? "border-orange-400 bg-orange-50" : "border-orange-200/80 hover:bg-orange-50/60"}`}
            >
              <span className="w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: "var(--gradient-brand)" }}>
                <Upload className="w-5 h-5" />
              </span>
              <span>
                <span className="block font-bold text-sm" style={{ color: "var(--ink-warm)" }}>Drop in your photos</span>
                <span className="block text-xs mt-0.5" style={{ color: "#6B5E7B" }}>
                  Your people, your products, your logo, or the moments you want to relive. Raphio works out what each one is.
                </span>
              </span>
            </button>
          )}
        </div>

        {/* The decision */}
        <div
          className="rounded-2xl border px-4 py-3 flex items-start gap-3"
          style={{ borderColor: decision ? "#FDBA74" : "rgba(0,0,0,0.06)", background: decision ? "#FFF7ED" : "rgba(255,255,255,0.5)" }}
          aria-live="polite"
        >
          <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "var(--gradient-brand)", color: "white" }}>
            {routing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          </span>
          <div className="min-w-0 flex-1">
            {decision ? (
              <>
                <p className="text-sm font-bold" style={{ color: "var(--ink-warm)" }}>
                  {decision.uncertain ? "I'll treat this as " : chosenByUser ? "You chose " : "I'll make "}
                  {option ? option.label.replace(/^An? /, (m) => m.toLowerCase()).replace(/\bmy\b/g, "your") : decision.headline}
                  {decision.uncertain ? ". Is that right?" : ""}
                </p>
                {decision.seen && !chosenByUser && (
                  <p className="text-xs mt-0.5" style={{ color: "#6B5E7B" }}>{decision.seen}</p>
                )}
                {decision.room?.note && decision.mode === "references" && (
                  <p className="text-xs mt-1 font-semibold" style={{ color: "#C2410C" }}>{decision.room.note}</p>
                )}
                {option && chosenByUser && (
                  <p className="text-xs mt-0.5" style={{ color: "#6B5E7B" }}>{option.hint}</p>
                )}
              </>
            ) : (
              <p className="text-sm" style={{ color: "#6B5E7B" }}>
                {routing ? "Having a look…" : "Add photos or a few words and Raphio will work out what kind of video to make."}
              </p>
            )}
          </div>
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="text-xs font-bold flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-border/50 bg-white hover:bg-orange-50 transition-colors"
              style={{ color: "#C2410C" }}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              Change <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 bottom-full mb-2 max-h-[60vh] overflow-y-auto w-[min(320px,calc(100vw-48px))] rounded-2xl border border-border/40 bg-white shadow-xl p-1.5 z-30">
                {ROUTE_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    role="menuitem"
                    type="button"
                    onClick={() => choose(o.id)}
                    className="w-full text-left rounded-xl px-3 py-2 hover:bg-orange-50 transition-colors flex items-start gap-2"
                  >
                    <span className="w-4 pt-0.5 shrink-0" style={{ color: "#C2410C" }}>
                      {decision?.mode === o.id ? <Check className="w-4 h-4" /> : null}
                    </span>
                    <span>
                      <span className="block text-sm font-bold" style={{ color: "var(--ink-warm)" }}>{o.label}</span>
                      <span className="block text-xs" style={{ color: "#6B5E7B" }}>{o.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Length, shape and voice. Brand intros pick their own on the next screen. */}
        {!isIntro && (
          <div className="flex flex-wrap gap-x-6 gap-y-4">
            <div>
              <span className="block text-xs font-bold mb-1.5" style={{ color: "#6B5E7B" }}>Length</span>
              <div className="flex gap-1.5">
                {PIPELINE_DURATIONS.map((d) => (
                  <button key={d} type="button" onClick={() => setTargetDuration(d)} className={pill(targetDuration === d)} style={pillStyle(targetDuration === d)}>
                    {d}s
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="block text-xs font-bold mb-1.5" style={{ color: "#6B5E7B" }}>Shape</span>
              <div className="flex gap-1.5">
                {RATIOS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { shapeSetByUser.current = true; setAspectRatio(r.id); }}
                    className={pill(aspectRatio === r.id)}
                    style={pillStyle(aspectRatio === r.id)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="block text-xs font-bold mb-1.5" style={{ color: "#6B5E7B" }}>Voice</span>
              <button type="button" onClick={() => setVoiceOpen(true)} className={`${pill(false)} flex items-center gap-1.5`} style={pillStyle(false)}>
                <Mic className="w-3.5 h-3.5" />
                {voiceId ? voiceId.charAt(0).toUpperCase() + voiceId.slice(1) : "Default"}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="w-full sm:max-w-[480px] sm:mx-auto">
          <Button
            onClick={() => decision && onContinue(decision)}
            disabled={!canContinue}
            className="w-full text-white py-6 text-sm font-bold rounded-2xl border-0 shadow-xl shadow-orange-200/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            style={{ background: "var(--gradient-brand)" }}
          >
            <span className="flex items-center justify-center gap-2 font-black">
              {isIntro ? "Continue" : "Write my script"} <span aria-hidden="true">→</span>
            </span>
          </Button>
          <p className="text-center text-xs font-bold mt-2" style={{ color: "#75695F" }}>
            {isIntro
              ? "Next you'll set up your brand and pick a length."
              : `${creditsForDuration(targetDuration)} credits for ${targetDuration}s, charged only when you approve the storyboard.`}
          </p>
        </div>
      </div>

      {voiceOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setVoiceOpen(false)}>
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className="text-base font-black" style={{ color: "var(--ink-warm)" }}>Choose a voice</h3>
              <button
                type="button"
                onClick={() => setVoiceOpen(false)}
                aria-label="Close"
                className="w-11 h-11 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <VoiceSelector value={voiceId} onChange={setVoiceId} />
            </div>
            <Button onClick={() => setVoiceOpen(false)} className="w-full mt-4 text-white border-0 shrink-0" style={{ background: "var(--gradient-brand)" }}>
              Done
            </Button>
          </div>
        </div>
      )}
    </ComposerFrame>
  );
}
