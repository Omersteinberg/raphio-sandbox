import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Upload, X, Image as ImageIcon, ArrowRight, ArrowLeft, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { STYLE_OPTIONS } from "../../constants/styles";
import { ASPECT_RATIO_OPTIONS } from "../../constants/aspectRatios";
import { ACCEPTED_IMAGE_ACCEPT, validateImageFile, filterValidImages } from "@/lib/imageValidation";

const GRADIENT = "var(--gradient-brand)";

export default function IntroBriefStep({
  logoFile,
  setLogoFile,
  businessName,
  setBusinessName,
  description,
  setDescription,
  targetAudience,
  setTargetAudience,
  style,
  setStyle,
  aspectRatio,
  setAspectRatio,
  brandColors,
  setBrandColor,
  showcaseFiles,
  setShowcaseFiles,
  loading,
  error,
  onContinue,
  onModeChange,
}) {
  const logoInputRef = useRef(null);
  const showcaseInputRef = useRef(null);

  const [logoPreview, setLogoPreview] = useState(null);
  const [showcasePreviews, setShowcasePreviews] = useState([]);

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

  const canStart = !!logoFile && description.trim().length > 0;

  const pickLogo = (file) => {
    const valid = validateImageFile(file);
    if (valid) setLogoFile(valid);
  };

  const addShowcase = (files) => {
    const imgs = filterValidImages(files);
    if (imgs.length) setShowcaseFiles([...(showcaseFiles || []), ...imgs].slice(0, 4));
  };

  const removeShowcase = (i) =>
    setShowcaseFiles((showcaseFiles || []).filter((_, idx) => idx !== i));

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          {onModeChange && (
            <button
              onClick={() => onModeChange("image")}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#6B5E7B] hover:text-[var(--terra)] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Other pipelines
            </button>
          )}
          <div
            className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #FFF5EE, #F5EEFF)" }}
          >
            <Wand2 className="w-6 h-6 text-[var(--terra)]" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[#2D2235]">
            Create a Brand Intro
          </h1>
          <p className="text-sm max-w-md mx-auto text-[#6B5E7B] font-medium leading-relaxed">
            Upload your logo and tell us about your business, we’ll generate a short montage
            that swirls into your logo reveal.
          </p>
        </div>

        {/* Logo dropzone (required) */}
        <div className="bg-white rounded-3xl p-4 md:p-6 border border-border/60 shadow-xs space-y-4">
          <label className="block text-xs font-bold uppercase tracking-widest text-ink-muted">
            Logo <span className="text-[var(--terra)]">*</span>
          </label>
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
          {logoFile && logoPreview ? (
            <div className="relative inline-flex items-center gap-4 w-full">
              <div className="w-24 h-24 rounded-2xl border border-border bg-surface-alt flex items-center justify-center overflow-hidden shrink-0">
                <img src={logoPreview} alt="Logo preview" className="max-w-full max-h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#2D2235] truncate">{logoFile.name}</p>
                <button
                  onClick={() => setLogoFile(null)}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-600"
                >
                  <X className="w-3.5 h-3.5" />
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => logoInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                pickLogo(Array.from(e.dataTransfer.files || [])[0]);
              }}
              className="border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:border-terra/60 hover:bg-terra/5 transition-all"
            >
              <Upload className="w-9 h-9 text-[var(--terra)] mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#2D2235]">Drop your logo or click to upload</p>
              <p className="text-xs text-ink-muted mt-1">PNG or JPG · transparent background works best</p>
            </div>
          )}
        </div>

        {/* Business brief */}
        <div className="bg-white rounded-3xl p-4 md:p-6 border border-border/60 shadow-xs space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-ink-muted">
              Business name
            </label>
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Raphio"
              className="rounded-2xl border-border focus:border-terra/40 focus:ring-terra/30 bg-surface"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-ink-muted">
              What does your business do? <span className="text-[var(--terra)]">*</span>
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., An AI app that creates different kinds of marketing videos for small businesses."
              className="w-full min-h-[110px] rounded-2xl border-border focus:border-terra/40 focus:ring-terra/30 resize-none bg-surface leading-relaxed"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-widest text-ink-muted">
              Target audience
            </label>
            <Input
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="small businesses & creators"
              className="rounded-2xl border-border focus:border-terra/40 focus:ring-terra/30 bg-surface"
            />
          </div>
        </div>

        {/* Style + aspect ratio */}
        <div className="bg-white rounded-3xl p-4 md:p-6 border border-border/60 shadow-xs space-y-5">
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-widest text-ink-muted">
              Visual style
            </label>
            <div className="flex flex-wrap gap-2">
              {STYLE_OPTIONS.map((opt) => {
                const active = style === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setStyle(opt.id)}
                    className="px-3 py-2 rounded-xl text-xs font-bold border transition-all"
                    style={
                      active
                        ? { background: GRADIENT, color: "#fff", borderColor: "transparent" }
                        : { color: "#6B5E7B", borderColor: "rgba(168,162,158,0.4)" }
                    }
                  >
                    <span className="mr-1">{opt.icon}</span>
                    {opt.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-widest text-ink-muted">
              Aspect ratio
            </label>
            <div className="flex p-1.5 rounded-2xl bg-surface-alt border border-border/30">
              {ASPECT_RATIO_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setAspectRatio(opt.id)}
                  className="flex-1 py-2.5 px-2 md:px-4 rounded-xl text-xs font-bold tracking-wide transition-all"
                  style={
                    aspectRatio === opt.id
                      ? { background: GRADIENT, color: "#fff", boxShadow: "0 4px 14px rgba(249,112,102,0.25)" }
                      : { color: "#6B5E7B" }
                  }
                >
                  <span className="mr-1">{opt.icon}</span>
                  {opt.name} · {opt.id}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Brand colours (auto-filled from logo, editable) */}
        <div className="bg-white rounded-3xl p-4 md:p-6 border border-border/60 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-widest text-ink-muted">
              Brand colours
            </label>
            <span className="text-xs text-ink-muted font-medium">Captions &amp; end card</span>
          </div>
          <div className="flex flex-wrap gap-5">
            {[
              { key: "primary", label: "Primary", fallback: "#F97066" },
              { key: "secondary", label: "Accent", fallback: "#FB923C" },
            ].map(({ key, label, fallback }) => {
              const value = (brandColors && brandColors[key]) || fallback;
              return (
                <div key={key} className="flex items-center gap-3">
                  <label
                    className="relative w-11 h-11 rounded-2xl border border-border overflow-hidden cursor-pointer shrink-0"
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
                  <div>
                    <p className="text-xs font-bold text-[#2D2235]">{label}</p>
                    <p className="text-xs text-ink-muted font-mono uppercase">{value}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-ink-muted">Pulled from your logo. Tweak to match your brand.</p>
        </div>

        {/* Optional showcase images */}
        <div className="bg-white rounded-3xl p-4 md:p-6 border border-border/60 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-widest text-ink-muted">
              Showcase images <span className="text-ink-muted normal-case font-medium tracking-normal">(optional)</span>
            </label>
            <span className="text-xs text-ink-muted font-medium">{(showcaseFiles || []).length} / 4</span>
          </div>
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
          <div className="grid grid-cols-4 gap-3">
            {showcasePreviews.map((url, i) => (
              <motion.div
                key={url}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative group aspect-square"
              >
                <img src={url} alt={`Showcase ${i + 1}`} className="w-full h-full object-cover rounded-xl border border-border" />
                <button
                  onClick={() => removeShowcase(i)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
            {(showcaseFiles || []).length < 4 && (
              <button
                onClick={() => showcaseInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-ink-muted hover:border-terra/60 hover:bg-terra/5 transition-all"
              >
                <ImageIcon className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-bold">Add</span>
              </button>
            )}
          </div>
          <p className="text-xs text-ink-muted">Real photos of your product, space or work to feature in the montage.</p>
        </div>

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
        <p className="text-center text-xs text-ink-muted">1 credit · ~8 second intro with music</p>
      </div>
    </div>
  );
}
