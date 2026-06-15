import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Palette, Upload, X, Image as ImageIcon, Film, Wand2, ChevronDown, ChevronUp, GripVertical, HelpCircle, Plus, Clock, Layers, Grid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { STYLE_OPTIONS } from '../../constants/styles';
import { MAX_IMAGES } from "@/lib/limits";

const SLOT_LABELS = {
  general: ['Opening Scene','Main Hook','Scene 3','Scene 4','Scene 5','Scene 6','Scene 7','Scene 8','Scene 9','Call to Action'],
  business_ad: ['Hook','Problem','Solution','Product Demo','Social Proof','Testimonial','Scene 7','Scene 8','Scene 9','Call to Action'],
  social_content: ['Hook','Scene 2','Scene 3','Scene 4','Scene 5','Scene 6','Scene 7','Scene 8','Scene 9','Outro'],
  birthday: ['Opening Moment','Memory 1','Memory 2','Memory 3','Memory 4','Memory 5','Memory 6','Memory 7','Memory 8','Closing Message'],
  product_showcase: ['Hero Shot','Feature 1','Feature 2','Feature 3','Feature 4','Lifestyle','Testimonial','Price & CTA','Scene 9','Closing'],
};

const DURATION_OPTIONS = [
  { value: 15, label: '~15s', desc: 'Quick clip' },
  { value: 30, label: '~30s', desc: 'Short form' },
  { value: 45, label: '~45s', desc: 'Standard' },
  { value: 60, label: '~60s', desc: 'Extended' },
];

const STYLE_ICONS = {
  realistic: "📷",
  animated: "🎨",
  cinematic: "🎬",
  surreal: "✨",
};

const REF_TYPE_OPTIONS = [
  { value: 'character', label: 'Character / Subject', color: 'orange' },
  { value: 'setting', label: 'Background / Setting', color: 'purple' },
  { value: 'logo', label: 'Logo / Brand Mark', color: 'blue' },
  { value: 'product', label: 'Product', color: 'emerald' },
];

const REF_TYPE_COLORS = {
  character: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600' },
  setting: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600' },
  logo: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' },
  product: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600' },
};

function ReferenceInput({ item, index, onChange, onRemove }) {
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange(index, {
        ...item,
        referenceFile: file,
        referenceImage: URL.createObjectURL(file),
      });
    }
  };

  const isLogo = item.type === 'logo';
  const typeInfo = REF_TYPE_OPTIONS.find(t => t.value === item.type) || REF_TYPE_OPTIONS[0];

  return (
    <div className="group/ref relative border border-stone-200/80 rounded-2xl p-5 bg-white shadow-sm transition-all duration-300 hover:shadow-md hover:border-stone-300">
      {/* Remove button */}
      <button
        onClick={() => onRemove(index)}
        className="absolute top-3 right-3 w-7 h-7 rounded-full bg-stone-50 hover:bg-red-50 text-stone-400 hover:text-red-500 flex items-center justify-center text-base transition-all duration-200 border border-stone-100 shadow-sm"
      >
        ×
      </button>

      {/* Type selector */}
      <div className="mb-3">
        <select
          value={item.type}
          onChange={(e) => {
            const newType = e.target.value;
            const updates = { ...item, type: newType };
            if (newType === 'logo') {
              updates.useUpload = true;
            }
            onChange(index, updates);
          }}
          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-700 focus:outline-none focus:border-orange-400 transition-colors cursor-pointer"
        >
          {REF_TYPE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Name */}
      <div className="mb-3">
        <input
          type="text"
          value={item.name}
          onChange={(e) => onChange(index, { ...item, name: e.target.value })}
          placeholder={`${typeInfo.label} name`}
          className="w-full bg-transparent border-b border-stone-200 pb-1.5 text-sm font-bold text-stone-800 focus:outline-none focus:border-orange-400 placeholder-stone-400 transition-colors"
        />
      </div>

      {/* Description */}
      <textarea
        value={item.description}
        onChange={(e) => onChange(index, { ...item, description: e.target.value })}
        placeholder={isLogo ? 'Describe how this logo should appear in scenes (e.g., "on the truck door", "on the storefront sign")...' : `Describe this ${typeInfo.label.toLowerCase()} in detail (required)...`}
        rows={2}
        className="w-full mb-4 bg-stone-50/60 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-orange-400 focus:bg-white resize-none transition-all"
      />

      {/* Upload / AI Generate toggle — logos are upload-only */}
      {isLogo ? (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-blue-50 rounded-xl border border-blue-100">
          <span className="text-[11px] font-bold text-blue-600">Upload only — logos are preserved exactly</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 mb-3 bg-stone-100/80 p-1 rounded-xl border border-stone-200/40">
          <button
            onClick={() => onChange(index, { ...item, useUpload: true })}
            className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-all ${
              item.useUpload
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Upload Reference
          </button>
          <button
            onClick={() => onChange(index, { ...item, useUpload: false, referenceFile: null, referenceImage: null })}
            className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-all ${
              !item.useUpload
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            AI Conceptualize
          </button>
        </div>
      )}

      {/* File picker or AI label */}
      {item.useUpload ? (
        <div className="overflow-hidden rounded-xl">
          {item.referenceImage ? (
            <div className="relative aspect-video w-full group/preview">
              <img src={item.referenceImage} alt="Preview" className="w-full h-full object-cover rounded-xl border border-stone-200 shadow-inner" />
              <button
                onClick={() => onChange(index, { ...item, referenceFile: null, referenceImage: null })}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white hover:bg-black flex items-center justify-center text-xs transition-colors backdrop-blur-xs"
              >
                ×
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-stone-200 bg-stone-50/50 rounded-xl cursor-pointer hover:border-orange-400 hover:bg-orange-50/20 transition-all duration-200">
              <Upload className="w-4 h-4 text-stone-400 mb-1" />
              <span className="text-xs font-semibold text-stone-500">Tap to upload asset image</span>
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-16 bg-purple-50/40 border border-purple-100/60 rounded-xl">
          <span className="text-xs font-semibold text-purple-600 tracking-wide">
            ✨ Generates directly from custom parameters
          </span>
        </div>
      )}
    </div>
  );
}

export default function PromptStep({
  userPrompt,
  setUserPrompt,
  style,
  setStyle,
  images,
  addImages,
  setImages,
  removeImage,
  reorderImages,
  onStart,
  loading,
  openingFrame,
  setOpeningFrame,
  closingFrame,
  setClosingFrame,
  styleOptions = [],
  enableBridges,
  setEnableBridges,
  targetDuration,
  setTargetDuration,
  pipelineMode,
  onModeChange,
  references = [],
  onReferencesChange,
  error,
}) {
  const isReferencesMode = pipelineMode === 'references';
  const fileInputRef = useRef(null);
  const openingFileRef = useRef(null);
  const closingFileRef = useRef(null);
  const [frameConfigExpanded, setFrameConfigExpanded] = useState(false);
  const [showPromptGuide, setShowPromptGuide] = useState(false);
  const [showImageOrderGuide, setShowImageOrderGuide] = useState(false);
  const [template, setTemplate] = useState('general');
  const [targetSlot, setTargetSlot] = useState(null);
  const [dragSlot, setDragSlot] = useState(null);
  const atCap = (images?.length ?? 0) >= MAX_IMAGES;
  const slotLabels = SLOT_LABELS[template] ?? SLOT_LABELS.general;

  const handleFrameFileChange = (e, frameType) => {
    const file = e.target.files?.[0];
    if (file && (file.type === "image/jpeg" || file.type === "image/png")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const setter = frameType === "opening" ? setOpeningFrame : setClosingFrame;
        setter((prev) => ({
          ...prev,
          uploadedImage: event.target.result,
          uploadedFile: file,
        }));
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const removeFrameImage = (frameType) => {
    const setter = frameType === "opening" ? setOpeningFrame : setClosingFrame;
    setter((prev) => ({
      ...prev,
      uploadedImage: null,
      uploadedFile: null,
    }));
  };

  console.log("[PromptStep] Rendering with:", {
    userPrompt: userPrompt?.substring(0, 50),
    style,
    imagesCount: images?.length || 0,
    loading,
  });

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0 && targetSlot !== null) {
      const newImages = [...(images || [])];
      newImages.splice(targetSlot, 0, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f) })));
      addImages(newImages.slice(0, MAX_IMAGES));
    } else if (files.length > 0) {
      addImages(files);
    }
    setTargetSlot(null);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    console.log("[PromptStep] Files dropped");
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type === "image/jpeg" || f.type === "image/png"
    );
    console.log("[PromptStep] Valid image files:", files.length);
    if (files.length > 0) {
      addImages(files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleStart = () => {
    console.log("[PromptStep] Start button clicked");
    onStart();
  };

  const canStart = isReferencesMode
    ? userPrompt?.trim() && style && references.some(r => r.name?.trim() && r.description?.trim())
    : userPrompt?.trim() && images?.length > 0;

  return (
    <div className="w-full h-full overflow-y-auto bg-[#FAF8F6]">
      <div className="min-h-full flex flex-col items-center justify-start px-6 py-12 md:py-16 pb-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-2xl space-y-7"
        >
          {/* Header Module */}
          <div className="text-center space-y-2.5 mb-2">
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl shadow-sm border border-orange-100"
              style={{ background: "linear-gradient(135deg, #FFF5EE, #F5EEFF)" }}
            >
              <Sparkles className="w-6 h-6 text-[#F97066]" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[#2D2235]">
              {isReferencesMode ? "Studio Blueprint Builder" : "Create Your Video"}
            </h1>
            <p className="text-sm max-w-md mx-auto text-[#6B5E7B] font-medium leading-relaxed">
              {isReferencesMode
                ? "Define your custom visual props and settings, then reveal the full storyline"
                : "Tell us what your video should be about and map out your scene pictures"}
            </p>
          </div>

          {/* Pipeline Segment Mode Toggle */}
          {onModeChange && (
            <div className="flex p-1.5 rounded-2xl bg-stone-200/50 backdrop-blur-md border border-stone-300/30 shadow-inner">
              {[
                { id: 'image', label: 'Image-Based Storyboard' },
                { id: 'references', label: 'Visual Character References' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => onModeChange(mode.id)}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-bold tracking-wide transition-all duration-300 ease-out"
                  style={
                    pipelineMode === mode.id
                      ? { background: "linear-gradient(135deg, #F97066, #FB923C)", color: "#fff", boxShadow: "0 4px 14px rgba(249,112,102,0.25)" }
                      : { color: "#6B5E7B" }
                  }
                >
                  {mode.label}
                </button>
              ))}
            </div>
          )}

          {/* Card Module 1: Prompt Input Area */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/60 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-widest text-stone-500">
                Core Storyline & Prompts
              </label>
              <button
                onClick={() => setShowPromptGuide(true)}
                className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full transition-all bg-stone-50 hover:bg-stone-100 border border-stone-200 text-[#F97066]"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Prompt Guide
              </button>
            </div>
            <Textarea
              value={userPrompt}
              onChange={(e) => {
                console.log("[PromptStep] Prompt changed:", e.target.value.substring(0, 30));
                setUserPrompt(e.target.value);
              }}
              placeholder="e.g., A cinematic track of a classic luxury car cruising along mountain ridge turns in Switzerland at sunset..."
              className="w-full min-h-[130px] rounded-2xl border-stone-200 focus:border-orange-300 focus:ring-orange-200/40 resize-none text-sm p-4 bg-stone-50/30 placeholder:text-stone-400/80 leading-relaxed transition-all"
            />
          </div>

          {/* References Mode — Unified References Section */}
          {isReferencesMode && (
            <div className="bg-white rounded-3xl p-6 border border-stone-200/60 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-stone-500">
                    References
                  </label>
                  <div className="group relative">
                    <HelpCircle className="w-4 h-4 text-stone-400 cursor-help" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 p-3 rounded-xl bg-stone-900 text-white text-[11px] leading-relaxed opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none shadow-xl">
                      Add characters, settings, logos, or products. Each reference gets a type tag that controls how it's used in video generation. Logos are preserved exactly — no AI restyling.
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-stone-900 rotate-45" />
                    </div>
                  </div>
                </div>
                {references.length < 8 && (
                  <button
                    onClick={() => {
                      onReferencesChange([
                        ...references,
                        { type: 'character', name: '', description: '', useUpload: false, referenceFile: null, referenceImage: null },
                      ]);
                    }}
                    className="text-xs font-bold px-3 py-1.5 rounded-full bg-orange-50 text-[#F97066] border border-orange-100 hover:bg-orange-100/60 transition-all"
                  >
                    + Add Reference ({references.length}/8)
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {references.map((ref, idx) => (
                  <ReferenceInput
                    key={idx}
                    item={ref}
                    index={idx}
                    onChange={(i, updated) => {
                      const updated_refs = [...references];
                      updated_refs[i] = updated;
                      onReferencesChange(updated_refs);
                    }}
                    onRemove={(i) => {
                      onReferencesChange(references.filter((_, j) => j !== i));
                    }}
                  />
                ))}
              </div>
              {references.length === 0 && (
                <div className="text-center py-6 border-2 border-dashed border-stone-200 rounded-2xl bg-stone-50/50">
                  <p className="text-xs font-bold text-stone-400">Add at least one reference (character, setting, logo, or product) to get started</p>
                </div>
              )}
            </div>
          )}

          {/* Image Upload Pipeline Section (image mode only) */}
          {!isReferencesMode && (
            <div className="bg-white rounded-3xl p-6 border border-stone-200/60 shadow-xs space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-stone-500">
                  Select Storyboard Intent Blueprint
                </label>
                <div className="flex gap-2 flex-wrap">
                  {Object.keys(SLOT_LABELS).map((key) => (
                    <button
                      key={key}
                      onClick={() => setTemplate(key)}
                      className="text-xs px-3.5 py-2 rounded-xl border transition-all duration-200 font-bold tracking-wide"
                      style={
                        template === key
                          ? {
                              background: "linear-gradient(90deg, #FF7E67 0%, #FF9E44 100%)",
                              color: "#fff",
                              borderColor: "transparent",
                              boxShadow: "0 2px 10px rgba(255, 126, 103, 0.25)",
                            }
                          : {
                              background: "#FDFCFF",
                              color: "#6B5E7B",
                              borderColor: "#E3DCF7",
                            }
                      }
                    >
                      {key === "general" ? "General Blueprint" : key === "business_ad" ? "Business Ad" : key === "social_content" ? "Social Clip" : key === "birthday" ? "Memory Event" : "Product Showcase"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hidden file input track anchor */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg,image/png"
                multiple
                className="hidden"
                disabled={atCap}
              />

              <AnimatePresence mode="wait">
                {/* Empty State Loop Dropzone Grid */}
                {(images?.length ?? 0) === 0 && (
                  <motion.div
                    key="dropzone"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="cursor-pointer rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 py-12 px-6 transition-all border-[#C8B8FF] bg-[#FAF9FF] hover:border-orange-400 hover:bg-orange-50/20"
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-orange-50 border border-orange-100 shadow-xs">
                      <Upload className="w-5 h-5 text-[#F97066]" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="font-bold text-sm text-stone-800">Drop continuous scene framework images or tap to explore</p>
                      <p className="text-xs text-stone-400">Supports JPEG/PNG assets up to {MAX_IMAGES} linear progression blocks</p>
                    </div>
                  </motion.div>
                )}

                {/* Populated Frame Flow Segment Tracks */}
                {(images?.length ?? 0) > 0 && (
                  <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    <div className="flex items-center justify-between text-xs font-bold border-b border-stone-100 pb-2.5">
                      <p className="text-orange-600 flex items-center gap-1.5">
                        <Grid className="w-3.5 h-3.5" />
                        {images.length} Sequential segment sequence tracks mapped
                      </p>
                      {images.length >= 2 && (
                        <p className="text-stone-400 font-medium">Slide modules horizontally to arrange timing chronology</p>
                      )}
                    </div>

                    {/* Timeline Grid Track Structure Block */}
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                      {images.map((img, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: "spring", stiffness: 350, damping: 25, delay: index * 0.03 }}
                          draggable
                          onDragStart={() => setDragSlot(index)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => {
                            if (dragSlot !== null && dragSlot !== index) reorderImages(dragSlot, index);
                            setDragSlot(null);
                          }}
                          className={`relative group aspect-square rounded-xl overflow-hidden cursor-grab active:cursor-grabbing border border-stone-200 bg-stone-50 transition-all duration-150 shadow-xs ${
                            dragSlot === index ? "opacity-30 scale-95 shadow-none border-dashed" : "hover:border-orange-400 hover:shadow"
                          }`}
                        >
                          <img src={img.preview} alt={slotLabels[index]} className="w-full h-full object-cover pointer-events-none" />
                          <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1.5 py-1 text-center backdrop-blur-[1px]">
                            <p className="text-[9px] font-bold text-white uppercase tracking-wider truncate">
                              {slotLabels[index]}
                            </p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                            className="absolute top-1 right-1 w-4.5 h-4.5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-md"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </motion.div>
                      ))}

                      {/* Continuous Sequence Append Container */}
                      {!atCap && (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          onDrop={handleDrop}
                          onDragOver={handleDragOver}
                          className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all bg-stone-50/60 border-stone-300 hover:border-orange-400 hover:bg-orange-50/20 group"
                        >
                          <Plus className="w-5 h-5 text-stone-400 group-hover:text-orange-500 transition-colors mb-0.5" />
                          <span className="text-[10px] font-bold text-stone-500">Insert Card</span>
                        </button>
                      )}
                    </div>

                    {/* Metrics Loop Footer Layout */}
                    <div className="flex items-center justify-between text-xs pt-1 text-stone-400 font-medium">
                      <span>Maximum sequence depth boundary: {MAX_IMAGES} slots</span>
                      <span className="font-mono font-bold bg-stone-100 border border-stone-200/80 px-2.5 py-0.5 rounded-lg text-stone-700">
                        {images.length} / {MAX_IMAGES}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Aesthetics Style Selection Grid Card Module */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/60 shadow-xs space-y-4">
            <label className="block text-xs font-bold uppercase tracking-widest text-stone-500">
              <Palette className="w-4 h-4 inline mr-1.5 text-stone-400 align-text-bottom" />
              Pick Rendering Style Engine
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(isReferencesMode ? STYLE_OPTIONS : styleOptions).map((option) => (
                <button
                  key={option.id}
                  onClick={() => setStyle(option.id)}
                  className="p-4 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col justify-between min-h-[110px] bg-white group"
                  style={
                    style === option.id
                      ? { borderColor: "#F97066", background: "rgba(249,112,102,0.03)", boxShadow: "0 4px 12px rgba(249,112,102,0.05)" }
                      : { borderColor: "#F2EDFF", background: "#FCFAFF" }
                  }
                >
                  <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform duration-200">
                    {option.icon || STYLE_ICONS[option.id] || "🎬"}
                  </span>
                  <div className="space-y-0.5">
                    <span className="font-black text-xs block text-stone-800">{option.name}</span>
                    <span className="text-[10px] text-stone-400 block line-clamp-1">{option.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Target Duration Configuration Output Module */}
          {setTargetDuration && (
            <div className="bg-white rounded-3xl p-6 border border-stone-200/60 shadow-xs space-y-4">
              <label className="block text-xs font-bold uppercase tracking-widest text-stone-500">
                <Clock className="w-4 h-4 inline mr-1.5 text-stone-400 align-text-bottom" />
                Target Clip Target Duration
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTargetDuration(opt.value)}
                    className="p-3.5 rounded-2xl border-2 text-center transition-all duration-200 bg-white"
                    style={
                      targetDuration === opt.value
                        ? { borderColor: "#F97066", background: "rgba(249,112,102,0.04)", fontWeight: "bold" }
                        : { borderColor: "rgba(240,234,255,0.8)" }
                    }
                  >
                    <span className="font-black block text-base text-stone-800">{opt.label}</span>
                    <span className="text-[10px] text-stone-400 block mt-0.5">{opt.desc}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] font-medium text-stone-400/90 leading-relaxed">
                Actual cinematic duration calculates dynamically based on segment volume requirements—this sets the baseline threshold.
              </p>
            </div>
          )}

          {/* AI Bridge Scene Frame Tracking Toggle */}
          {!isReferencesMode && setEnableBridges && (
            <div className="bg-white rounded-3xl border border-stone-200/60 shadow-xs overflow-hidden">
              <button
                onClick={() => setEnableBridges(!enableBridges)}
                className="w-full flex items-center gap-3.5 p-5 transition-colors bg-white hover:bg-stone-50/50 text-left"
              >
                <div
                  className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200"
                  style={
                    enableBridges
                      ? { background: "linear-gradient(135deg, #F97066, #FB923C)", borderColor: "#F97066" }
                      : { background: "transparent", borderColor: "#D4CDE0" }
                  }
                >
                  {enableBridges && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="space-y-0.5">
                  <span className="font-extrabold text-sm block text-stone-800">Interpolate AI Bridge Frames</span>
                  <span className="text-xs text-stone-400 block">
                    Instructs the processor to output calculated transition context assets between static script cards
                  </span>
                </div>
              </button>
            </div>
          )}

          {/* Advanced Pre-Roll & Post-Roll Sequence Configuration */}
          {!isReferencesMode && (
            <div className="bg-white rounded-3xl border border-stone-200/60 shadow-xs overflow-hidden">
              <button
                onClick={() => setFrameConfigExpanded(!frameConfigExpanded)}
                className="w-full flex items-center justify-between p-5 transition-colors bg-white hover:bg-stone-50/50"
              >
                <div className="flex items-center gap-2.5">
                  <Film className="w-4 h-4 text-[#F97066]" />
                  <span className="text-sm font-extrabold text-stone-800">Opening & Closing Frames Configuration</span>
                  <span className="text-xs text-stone-400 font-bold">(Optional)</span>
                </div>
                {frameConfigExpanded ? (
                  <ChevronUp className="w-4 h-4 text-stone-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-stone-400" />
                )}
              </button>

              <AnimatePresence>
                {frameConfigExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden border-t border-stone-100"
                  >
                    <div className="p-5 space-y-6 bg-stone-50/30 text-xs">
                      {/* Intro Header Section */}
                      <p className="text-stone-500 font-medium leading-relaxed">
                        Introduce introductory cinematic pre-roll screens or end credits into the video canvas stack natively.
                      </p>

                      {/* Pre-Roll Intro Block component */}
                      <div className="space-y-4 bg-white p-5 rounded-2xl border border-stone-100 shadow-xs">
                        <div className="flex items-center justify-between border-b border-stone-50 pb-2">
                          <span className="font-extrabold text-sm text-stone-800">Pre-Roll Opening Setup</span>
                          <span className="text-stone-400 tracking-wide font-medium">Render sequence overlay intro block</span>
                        </div>

                        <div className="space-y-4 pl-1">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Target Core Intent Descriptor</label>
                            <Textarea
                              value={openingFrame.description || ""}
                              onChange={(e) => setOpeningFrame((prev) => ({ ...prev, description: e.target.value }))}
                              placeholder="e.g., Showcase corporate brand intro card details or title cards clearly..."
                              className="text-xs rounded-xl"
                              rows={2}
                            />
                          </div>

                          <div className="flex gap-2 p-1 rounded-xl bg-stone-100/70 border border-stone-200/30">
                            <button
                              onClick={() => setOpeningFrame((prev) => ({ ...prev, useUpload: false }))}
                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold text-xs transition-all"
                              style={!openingFrame.useUpload ? { background: "#fff", color: "#F97066", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" } : { color: "#6B5E7B" }}
                            >
                              <Wand2 className="w-3.5 h-3.5" /> AI Engine Design
                            </button>
                            <button
                              onClick={() => setOpeningFrame((prev) => ({ ...prev, useUpload: true }))}
                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold text-xs transition-all"
                              style={openingFrame.useUpload ? { background: "#fff", color: "#F97066", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" } : { color: "#6B5E7B" }}
                            >
                              <Upload className="w-3.5 h-3.5" /> Asset File Upload
                            </button>
                          </div>

                          {!openingFrame.useUpload ? (
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400">AI Prompt Concept Overlay Input</label>
                              <Textarea
                                value={openingFrame.customPrompt || ""}
                                onChange={(e) => setOpeningFrame((prev) => ({ ...prev, customPrompt: e.target.value }))}
                                placeholder="Describe parameters for automated prompt building engine frames (optional)..."
                                className="text-xs rounded-xl"
                                rows={2}
                              />
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <input ref={openingFileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => handleFrameFileChange(e, "opening")} />
                              {openingFrame.uploadedImage ? (
                                <div className="relative inline-block mt-1">
                                  <img src={openingFrame.uploadedImage} alt="Opening frame" className="w-32 h-20 object-cover rounded-xl border border-stone-200 shadow-sm" />
                                  <button onClick={() => removeFrameImage("opening")} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-xs shadow">×</button>
                                </div>
                              ) : (
                                <button onClick={() => openingFileRef.current?.click()} className="w-full py-3 border-2 border-dashed rounded-xl text-stone-500 hover:bg-stone-50 font-bold border-stone-200 transition-colors">
                                  Tap to select picture resource asset
                                </button>
                              )}
                            </div>
                          )}

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Narration / Text Overlay</label>
                            <Input value={openingFrame.textOverlay || ""} onChange={(e) => setOpeningFrame((prev) => ({ ...prev, textOverlay: e.target.value }))} placeholder="e.g., Chapter 1: The Ascent" className="text-xs h-10 rounded-xl" />
                          </div>
                        </div>
                      </div>

                      {/* Post-Roll Credits Block component */}
                      <div className="space-y-4 bg-white p-5 rounded-2xl border border-stone-100 shadow-xs">
                        <div className="flex items-center justify-between border-b border-stone-50 pb-2">
                          <span className="font-extrabold text-sm text-stone-800">Post-Roll Outro Setup</span>
                          <span className="text-stone-400 tracking-wide font-medium">Render sequence layout ending elements</span>
                        </div>

                        <div className="space-y-4 pl-1">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Target Core Intent Descriptor</label>
                            <Textarea
                              value={closingFrame.description || ""}
                              onChange={(e) => setClosingFrame((prev) => ({ ...prev, description: e.target.value }))}
                              placeholder="e.g., Set up ending parameters such as call-to-action cards or website links..."
                              className="text-xs rounded-xl"
                              rows={2}
                            />
                          </div>

                          <div className="flex gap-2 p-1 rounded-xl bg-stone-100/70 border border-stone-200/30">
                            <button
                              onClick={() => setClosingFrame((prev) => ({ ...prev, useUpload: false }))}
                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold text-xs transition-all"
                              style={!closingFrame.useUpload ? { background: "#fff", color: "#F97066", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" } : { color: "#6B5E7B" }}
                            >
                              <Wand2 className="w-3.5 h-3.5" /> AI Engine Design
                            </button>
                            <button
                              onClick={() => setClosingFrame((prev) => ({ ...prev, useUpload: true }))}
                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-bold text-xs transition-all"
                              style={closingFrame.useUpload ? { background: "#fff", color: "#F97066", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" } : { color: "#6B5E7B" }}
                            >
                              <Upload className="w-3.5 h-3.5" /> Asset File Upload
                            </button>
                          </div>

                          {!closingFrame.useUpload ? (
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400">AI Prompt Concept Overlay Input</label>
                              <Textarea
                                value={closingFrame.customPrompt || ""}
                                onChange={(e) => setClosingFrame((prev) => ({ ...prev, customPrompt: e.target.value }))}
                                placeholder="Describe parameters for ending graphic structures (optional)..."
                                className="text-xs rounded-xl"
                                rows={2}
                              />
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <input ref={closingFileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => handleFrameFileChange(e, "closing")} />
                              {closingFrame.uploadedImage ? (
                                <div className="relative inline-block mt-1">
                                  <img src={closingFrame.uploadedImage} alt="Closing frame" className="w-32 h-20 object-cover rounded-xl border border-stone-200 shadow-sm" />
                                  <button onClick={() => removeFrameImage("closing")} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-xs shadow">×</button>
                                </div>
                              ) : (
                                <button onClick={() => closingFileRef.current?.click()} className="w-full py-3 border-2 border-dashed rounded-xl text-stone-500 hover:bg-stone-50 font-bold border-stone-200 transition-colors">
                                  Tap to select picture resource asset
                                </button>
                              )}
                            </div>
                          )}

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Narration / Text Overlay</label>
                            <Input value={closingFrame.textOverlay || ""} onChange={(e) => setClosingFrame((prev) => ({ ...prev, textOverlay: e.target.value }))} placeholder="e.g., Join us at website.com" className="text-xs h-10 rounded-xl" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Centralized Notification Error Canvas Card */}
          {error && (
            <div
              className="px-4 py-3.5 rounded-2xl text-sm font-bold border shadow-xs"
              style={{ background: "#FEF2F2", color: "#DC2626", borderColor: "#FECACA" }}
            >
              {error}
            </div>
          )}

          {/* Core Creation Submission Trigger Assembly */}
          <div className="space-y-3 pt-2">
            <Button
              onClick={handleStart}
              disabled={!canStart || loading}
              className="w-full text-white py-7 text-base font-bold rounded-2xl border-0 shadow-xl shadow-orange-200/40 hover:scale-[1.005] hover:shadow-orange-200/60 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
              style={{ background: canStart && !loading ? "linear-gradient(135deg, #F97066, #FB923C)" : "#D4CDE0" }}
            >
              {loading ? (
                <span className="flex items-center gap-2 tracking-wide font-black uppercase">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full"
                  />
                  Assembling Rendering Elements...
                </span>
              ) : (
                <span className="flex items-center gap-2 font-black tracking-wider text-sm uppercase">
                  <Sparkles className="w-4.5 h-4.5 animate-pulse" />
                  Compile Video Stack
                  {!canStart && (
                    <span className="text-xs font-normal opacity-85 lowercase">
                      ({!userPrompt?.trim() ? "add prompt text" : "add clip assets"})
                    </span>
                  )}
                </span>
              )}
            </Button>
            <p className="text-center text-xs text-[#9B8FA8] font-bold">
              {isReferencesMode
                ? "Enter visual elements configuration specifications, type the core prompt script, and start compilation pass"
                : "Enter blueprint track instructions along with sequence pictures to initialize compiler pipeline pass"}
            </p>
          </div>
        </motion.div>
      </div>

      {/* CORE GUIDE INFORMATION OVERLAY DRAWER MODAL SLATE */}
      <AnimatePresence>
        {showPromptGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            style={{ background: "rgba(45,34,53,0.4)" }}
            onClick={() => setShowPromptGuide(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border bg-white shadow-2xl p-6"
              style={{ borderColor: "rgba(240,234,255,0.6)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3.5 border-b border-stone-100 mb-4">
                <h2 className="text-base font-black text-stone-800 uppercase tracking-wider">
                  How to Write a Great Prompt
                </h2>
                <button
                  onClick={() => setShowPromptGuide(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200 text-stone-500 font-bold transition-colors"
                >
                  ×
                </button>
              </div>

              <div className="space-y-5 text-xs text-[#6B5E7B] leading-relaxed">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-stone-800">Tell us the story, not just the topic</h3>
                  <p><span className="font-bold text-red-500">Weak:</span> "A video about coffee"</p>
                  <p><span className="font-bold text-orange-500">Better:</span> "A barista crafts a latte from bean to cup in a cozy morning cafe"</p>
                  <p><span className="font-bold text-emerald-600">Best:</span> "Follow a barista through her morning routine — grinding fresh beans, steaming milk, and pouring latte art for her first customer of the day"</p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-extrabold text-stone-800">Include these key ingredients</h3>
                  <div className="grid grid-cols-2 gap-2 bg-stone-50 p-3 rounded-xl border border-stone-100 text-[11px] font-medium">
                    <div><span className="font-bold text-orange-500">Who:</span> Main characters (1-2 max)</div>
                    <div><span className="font-bold text-orange-500">Where:</span> The setting or location</div>
                    <div><span className="font-bold text-orange-500">Action:</span> Narrative progression arc</div>
                    <div><span className="font-bold text-orange-500">Mood:</span> Warm, dramatic, energetic</div>
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="font-extrabold text-stone-800">Keep it visual and grounded</h3>
                  <p>Describe concrete physical behaviors and scenes a real camera could actually capture rather than abstract concepts or floating themes.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TIMELINE GUIDE CONTEXT ANCHOR DRAWER MODAL SLATE */}
      <AnimatePresence>
        {showImageOrderGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
            style={{ background: "rgba(45,34,53,0.3)" }}
            onClick={() => setShowImageOrderGuide(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="w-full max-w-sm rounded-3xl border bg-white shadow-2xl p-6"
              style={{ borderColor: "rgba(240,234,255,0.6)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-4 text-center">
                <h3 className="text-base font-extrabold text-stone-800">Arrange Image Chronology</h3>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Arrange your pictures inside the tracking rails to correctly align the progression arc prior to generating files.
                </p>
                <Button
                  onClick={() => setShowImageOrderGuide(false)}
                  className="w-full text-white font-bold py-2.5 rounded-xl"
                  style={{ background: "linear-gradient(135deg, #F97066, #FB923C)" }}
                >
                  Confirm Configuration Order
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
