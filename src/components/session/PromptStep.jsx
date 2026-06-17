import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Palette, Upload, X, Image as ImageIcon, Film, Wand2, ChevronDown, ChevronUp, GripVertical, HelpCircle, Plus, Layers, Grid, Users, Briefcase, Smartphone, Heart, Tag, Lightbulb, Camera, Clapperboard, Drama, Droplet, Box, Zap, Check, Play, Square } from "lucide-react";
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

const STYLE_ICON_MAP = {
  realistic: Camera,
  animated: Palette,
  cinematic: Clapperboard,
  surreal: Wand2,
  anime: Drama,
  comic_book: Zap,
  watercolor: Droplet,
  '3d_render': Box,
};

const CHIP_CONFIG = {
  general:          { label: 'General Blueprint', Icon: Layers     },
  business_ad:      { label: 'Business Ad',       Icon: Briefcase  },
  social_content:   { label: 'Social Clip',       Icon: Smartphone },
  birthday:         { label: 'Memory Event',      Icon: Heart      },
  product_showcase: { label: 'Product Showcase',  Icon: Tag        },
};

function ReferenceInput({ item, index, type, onChange, onRemove }) {
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

  const isCharacter = type === 'character';
  const accent = isCharacter ? '#C1440E' : '#E8603C';
  const accentRgb = isCharacter ? '193,68,14' : '232,96,60';
  const gradientEnd = isCharacter ? '#E8603C' : '#FB923C';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 360, damping: 26 }}
      className="relative rounded-2xl border overflow-hidden bg-white"
      style={{ borderColor: `rgba(${accentRgb},0.18)`, borderLeftWidth: 3, borderLeftColor: accent, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
    >
      {/* Card header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: `rgba(${accentRgb},0.08)`, background: `rgba(${accentRgb},0.025)` }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${accent}, ${gradientEnd})` }}
          >
            {isCharacter
              ? <Users className="w-2.5 h-2.5 text-white" />
              : <Camera className="w-2.5 h-2.5 text-white" />
            }
          </div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: accent }}>
            {isCharacter ? `Subject ${index + 1}` : `Background ${index + 1}`}
          </span>
        </div>
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => onRemove(index)}
          aria-label={`Remove ${isCharacter ? 'subject' : 'background'} ${index + 1}`}
          className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
          style={{ background: `rgba(${accentRgb},0.07)`, color: accent }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.12)'; e.currentTarget.style.color = '#dc2626'; }}
          onMouseLeave={e => { e.currentTarget.style.background = `rgba(${accentRgb},0.07)`; e.currentTarget.style.color = accent; }}
        >
          <X className="w-3 h-3" strokeWidth={2.5} />
        </motion.button>
      </div>

      <div className="p-4 space-y-3">
        {/* Name field */}
        <div
          className="rounded-xl"
          style={{ border: `1.5px solid rgba(${accentRgb},0.12)`, background: '#FBFAF8', transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease' }}
          onFocusCapture={e => { e.currentTarget.style.borderColor = `rgba(${accentRgb},0.38)`; e.currentTarget.style.boxShadow = `0 0 0 3px rgba(${accentRgb},0.06)`; }}
          onBlurCapture={e => { e.currentTarget.style.borderColor = `rgba(${accentRgb},0.12)`; e.currentTarget.style.boxShadow = 'none'; }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = `rgba(${accentRgb},0.24)`; e.currentTarget.style.background = '#FFF9F5'; }}
          onMouseLeave={e => { if (!e.currentTarget.contains(document.activeElement)) { e.currentTarget.style.borderColor = `rgba(${accentRgb},0.12)`; e.currentTarget.style.background = '#FBFAF8'; } }}
        >
          <input
            type="text"
            value={item.name}
            onChange={(e) => onChange(index, { ...item, name: e.target.value })}
            placeholder={isCharacter ? 'Name (e.g. "Red Leather Jacket")' : 'Name (e.g. "City Rooftop at Dusk")'}
            className="w-full bg-transparent px-3 py-2.5 text-xs font-bold text-stone-800 placeholder-stone-400 focus:outline-none rounded-xl"
          />
        </div>

        {/* Description field */}
        <div
          className="rounded-xl"
          style={{ border: `1.5px solid rgba(${accentRgb},0.12)`, background: '#FBFAF8', transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease' }}
          onFocusCapture={e => { e.currentTarget.style.borderColor = `rgba(${accentRgb},0.38)`; e.currentTarget.style.boxShadow = `0 0 0 3px rgba(${accentRgb},0.06)`; }}
          onBlurCapture={e => { e.currentTarget.style.borderColor = `rgba(${accentRgb},0.12)`; e.currentTarget.style.boxShadow = 'none'; }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = `rgba(${accentRgb},0.24)`; e.currentTarget.style.background = '#FFF9F5'; }}
          onMouseLeave={e => { if (!e.currentTarget.contains(document.activeElement)) { e.currentTarget.style.borderColor = `rgba(${accentRgb},0.12)`; e.currentTarget.style.background = '#FBFAF8'; } }}
        >
          <textarea
            value={item.description}
            onChange={(e) => onChange(index, { ...item, description: e.target.value })}
            placeholder={isCharacter
              ? 'Describe exactly how this looks across all scenes...'
              : 'Describe the lighting, mood, and visual feel of this space...'
            }
            rows={2}
            className="w-full bg-transparent px-3 py-2.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-none resize-none rounded-xl"
          />
        </div>

        {/* Source toggle */}
        <div
          className="flex items-center gap-1.5 p-1 rounded-xl"
          style={{ background: `rgba(${accentRgb},0.04)`, border: `1.5px solid rgba(${accentRgb},0.10)` }}
        >
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onChange(index, { ...item, useUpload: true })}
            aria-pressed={item.useUpload}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
            style={item.useUpload
              ? { background: '#fff', color: accent, boxShadow: '0 1px 4px rgba(0,0,0,0.10)' }
              : { color: '#9B8FA8' }
            }
          >
            <Upload className="w-3 h-3" /> Upload Reference
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onChange(index, { ...item, useUpload: false, referenceFile: null, referenceImage: null })}
            aria-pressed={!item.useUpload}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
            style={!item.useUpload
              ? { background: '#fff', color: accent, boxShadow: '0 1px 4px rgba(0,0,0,0.10)' }
              : { color: '#9B8FA8' }
            }
          >
            <Wand2 className="w-3 h-3" /> AI Generate
          </motion.button>
        </div>

        {/* Upload zone or AI state */}
        <AnimatePresence mode="wait">
          {item.useUpload ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="overflow-hidden rounded-xl"
            >
              {item.referenceImage ? (
                <div className="relative aspect-video w-full">
                  <img src={item.referenceImage} alt="Reference" className="w-full h-full object-cover rounded-xl border shadow-inner" style={{ borderColor: `rgba(${accentRgb},0.18)` }} />
                  <button
                    onClick={() => onChange(index, { ...item, referenceFile: null, referenceImage: null })}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs transition-colors hover:bg-red-600 backdrop-blur-sm"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <label
                  className="flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200"
                  style={{ borderColor: `rgba(${accentRgb},0.18)`, background: '#FBFAF8' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `rgba(${accentRgb},0.38)`; e.currentTarget.style.background = '#FFF9F5'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = `rgba(${accentRgb},0.18)`; e.currentTarget.style.background = '#FBFAF8'; }}
                >
                  <Upload className="w-4 h-4 mb-1.5" style={{ color: accent, opacity: 0.5 }} />
                  <span className="text-xs font-semibold text-stone-500">Click to upload reference image</span>
                  <span className="text-[10px] text-stone-400 mt-0.5">JPEG or PNG</span>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="ai"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="overflow-hidden"
            >
              <div
                className="flex items-center justify-center gap-2 h-14 rounded-xl"
                style={{ background: `rgba(${accentRgb},0.04)`, border: `1.5px solid rgba(${accentRgb},0.12)` }}
              >
                <Wand2 className="w-3.5 h-3.5" style={{ color: accent, opacity: 0.6 }} />
                <span className="text-xs font-semibold" style={{ color: accent, opacity: 0.75 }}>
                  AI will generate from your description
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
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
  references = { characters: [], settings: [] },
  onReferencesChange,
  error,
}) {
  const isReferencesMode = pipelineMode === 'references';
  const fileInputRef = useRef(null);
  const openingFileRef = useRef(null);
  const closingFileRef = useRef(null);
  const [frameConfigExpanded, setFrameConfigExpanded] = useState(false);
  const [openingEnabled, setOpeningEnabled] = useState(false);
  const [closingEnabled, setClosingEnabled] = useState(false);
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
    ? userPrompt?.trim() && style && references.characters.some(c => c.name?.trim() && c.description?.trim())
    : userPrompt?.trim() && images?.length > 0;

  return (
    <div className="w-full h-full overflow-y-auto" style={{ background: 'linear-gradient(160deg, #FDF6F0 0%, #FDFAF8 50%, #F7F4FB 100%)' }}>
      <div className="min-h-full flex flex-col items-center justify-start px-6 py-12 md:py-16 pb-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-4xl space-y-7"
        >
          {/* Header */}
          <div className="text-center mb-2">
            {/* Layered icon */}
            <div className="relative inline-flex items-center justify-center mb-5">
              <div
                className="absolute rounded-3xl"
                style={{ inset: '-10px', background: 'rgba(193,68,14,0.08)', filter: 'blur(18px)' }}
              />
              <div
                className="relative flex items-center justify-center w-[72px] h-[72px] rounded-[22px]"
                style={{
                  background: 'linear-gradient(145deg, #FFF6EF 0%, #FAF0EA 100%)',
                  boxShadow: '0 0 0 1px rgba(193,68,14,0.12), 0 6px 6px rgba(193,68,14,0.18), inset 0 1px 0 rgba(255,255,255,0.95)',
                }}
              >
                <ImageIcon style={{ width: 30, height: 30, color: '#C1440E' }} />
                <div
                  className="absolute flex items-center justify-center"
                  style={{
                    bottom: -9, right: -9, width: 30, height: 30, borderRadius: 11,
                    background: 'linear-gradient(135deg, #C1440E, #E8603C)',
                    boxShadow: '0 2px 8px rgba(193,68,14,0.45), 0 0 0 2.5px #F5F0EB',
                  }}
                >
                  <Sparkles style={{ width: 16, height: 16, color: '#fff' }} />
                </div>
              </div>
            </div>

            {!isReferencesMode ? (
              <div className="space-y-2.5">
                <h1
                  className="font-black tracking-tight leading-none"
                  style={{ fontSize: 'clamp(2.3rem, 5vw, 2rem)', color: '#1C1917' }}
                >
                  Create your{' '}
                  <span style={{ color: '#C1440E' }}>video.</span>
                </h1>
                <p className="font-medium leading-relaxed" style={{ fontSize: 15, color: '#6B5A52', paddingTop: '5px' }}>
                  Tell us what your video should be about, and map out your scene pictures.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <h1
                  className="font-black tracking-tight leading-none"
                  style={{ fontSize: 'clamp(2.3rem, 5vw, 2rem)', color: '#1C1917' }}
                >
                  Studio Blueprint{' '}
                  <span style={{ color: '#C1440E' }}>Builder.</span>
                </h1>
                <p className="font-medium leading-relaxed" style={{ fontSize: 15, color: '#6B5A52', paddingTop: '5px' }}>
                  Define your visual props and settings, then reveal the full storyline.
                </p>
              </div>
            )}
          </div>

          {/* Pipeline Mode Toggle */}
          {onModeChange && (
            <div
              className="flex p-1 rounded-full"
              style={{ background: '#EAE4DC', boxShadow: 'inset 0 1px 3px rgba(28,25,23,0.10)' }}
            >
              {[
                { id: 'image',      label: 'Storyboard mode',     Icon: Film },
                { id: 'references', label: 'Character mode',  Icon: Users    },
              ].map((mode) => {
                const isActive = pipelineMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => onModeChange(mode.id)}
                    className="relative flex-1 flex items-center justify-center gap-1.5 py-2.5 px-5 rounded-full text-xs font-bold tracking-wide"
                    style={{ color: isActive ? '#FFFAF7' : '#7A6A62', transition: 'color 0.18s ease', background: 'transparent' }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = '#2D1F16'; e.currentTarget.style.background = 'rgba(193,68,14,0.07)'; } }}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = '#7A6A62'; e.currentTarget.style.background = 'transparent'; } }}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="tabPill"
                        className="absolute inset-0 rounded-full"
                        style={{ background: 'linear-gradient(135deg, #C1440E, #E8603C)', boxShadow: '0 2px 10px rgba(193,68,14,0.30)' }}
                        transition={{ type: 'tween', duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                      />
                    )}
                    <mode.Icon style={{ width: 15, height: 15, flexShrink: 0, position: 'relative', zIndex: 1 }} />
                    <span style={{ position: 'relative', zIndex: 1 }}>{mode.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Prompt Input Card */}
          <div
            className="rounded-3xl p-6 space-y-4"
            style={{
              background: '#ffffff',
              boxShadow: '0 2px 16px rgba(193,68,14,0.06), 0 1px 0 rgba(255,255,255,0.8), 0 0 0 1px rgba(193,68,14,0.08)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:18, height:18, borderRadius:'50%', background:'#C1440E', color:'#fff', fontSize:10, fontWeight:800, flexShrink:0 }}>1</span>
                <label className="block font-black uppercase" style={{ fontSize: 11, letterSpacing: '0.14em', color: '#1C1917' }}>
                  Direction
                </label>
              </div>
                <button
                  onClick={() => setShowPromptGuide(true)}
                  className="flex items-center gap-1.5 rounded-full"
                  style={{
                    fontSize: 12,
                    padding: '6px 14px',
                    background: 'rgba(193,68,14,0.06)',
                    color: '#C1440E',
                    border: '1px solid rgba(193,68,14,0.15)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    boxShadow: '0 2px 8px rgba(193,68,14,0.02)',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(193,68,14,0.10)';
                    e.currentTarget.style.borderColor = 'rgba(193,68,14,0.25)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(193,68,14,0.05)';

                    const icon = e.currentTarget.querySelector('.tips-icon');
                    if (icon) {
                      icon.style.transform = 'rotate(-10deg) scale(1.08)';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(193,68,14,0.06)';
                    e.currentTarget.style.borderColor = 'rgba(193,68,14,0.15)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(193,68,14,0.02)';

                    const icon = e.currentTarget.querySelector('.tips-icon');
                    if (icon) {
                      icon.style.transform = 'rotate(0deg) scale(1)';
                    }
                  }}
                >
                  <Lightbulb
                    className="tips-icon"
                    style={{
                      width: 14,
                      height: 14,
                      strokeWidth: 3,
                      transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  />
                  Tips
                </button>
            </div>
            <div
              className="relative rounded-2xl"
              style={{ background: '#FBFAF8', border: '1.5px solid rgba(193,68,14,0.10)', transition: 'box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
              onFocusCapture={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.35)'; e.currentTarget.style.boxShadow = '0 0 0 1px rgba(193,68,14,0.15), 0 4px 20px rgba(193,68,14,0.08), 0 0 0 4px rgba(193,68,14,0.06)'; }}
              onBlurCapture={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.10)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <Textarea
                value={userPrompt}
                onChange={(e) => {
                  console.log("[PromptStep] Prompt changed:", e.target.value.substring(0, 30));
                  setUserPrompt(e.target.value);
                }}
                placeholder="e.g., A cinematic track of a classic luxury car cruising along mountain ridge turns in Switzerland at sunset..."
                className="w-full min-h-[140px] rounded-2xl resize-none text-sm p-4 leading-relaxed border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[#B09A8A]"
                style={{ color: '#1C1917', paddingBottom: '36px', outline: 'none' }}
              />
              <span
                style={{ position:'absolute', bottom:8, right:12, fontSize:11, fontWeight:600, color:'rgba(193,68,14,0.5)', pointerEvents:'none', userSelect:'none' }}
              >
                {userPrompt?.trim() ? userPrompt.trim().split(/\s+/).filter(Boolean).length : 0} words
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5" style={{ fontSize: 11, color: '#9c8f85', fontWeight: 500 }}>
                <Sparkles style={{ width: 11, height: 11, flexShrink: 0 }} />
                More detail → better results
              </span>
            </div>
          </div>

          {/* References Mode Pipeline Subsections */}
          {isReferencesMode && (
            <div className="space-y-5">

              {/* Studio Props & Subjects */}
              <div
                className="rounded-3xl overflow-hidden border"
                style={{ borderColor: 'rgba(193,68,14,0.14)', borderLeftWidth: 3, borderLeftColor: '#C1440E', background: '#fff', boxShadow: '0 2px 12px rgba(193,68,14,0.05)' }}
              >
                {/* Section header */}
                <div
                  className="flex items-center justify-between px-6 py-4"
                  style={{ background: 'rgba(193,68,14,0.025)', borderBottom: '1px solid rgba(193,68,14,0.07)' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #C1440E, #E8603C)' }}
                    >
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold" style={{ color: '#2D2235' }}>Studio Props & Subjects</span>
                        <div className="group relative">
                          <HelpCircle className="w-3.5 h-3.5 cursor-help" style={{ color: '#9B8FA8' }} />
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 rounded-xl bg-stone-900 text-white text-[11px] leading-relaxed opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none shadow-xl">
                            Props are anchor elements that stay visually consistent across all cuts — characters, branding, or key focus objects.
                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-stone-900 rotate-45" />
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] mt-0.5" style={{ color: '#9B8FA8' }}>Subjects held stable across every generated cut</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(193,68,14,0.07)', color: '#C1440E' }}
                    >
                      {references.characters.length}/4
                    </div>
                    {references.characters.length < 4 && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          onReferencesChange({
                            ...references,
                            characters: [
                              ...references.characters,
                              { name: '', description: '', useUpload: false, referenceFile: null, referenceImage: null },
                            ],
                          });
                        }}
                        className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full text-white transition-all"
                        style={{ background: 'linear-gradient(135deg, #C1440E, #E8603C)', boxShadow: '0 2px 8px rgba(193,68,14,0.30)' }}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(193,68,14,0.42)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(193,68,14,0.30)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Subject
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <AnimatePresence mode="popLayout">
                    {references.characters.length === 0 ? (
                      <motion.div
                        key="chars-empty"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="flex flex-col items-center justify-center py-8 rounded-2xl border-2 border-dashed text-center"
                        style={{ borderColor: 'rgba(193,68,14,0.15)', background: 'rgba(193,68,14,0.015)' }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                          style={{ background: 'rgba(193,68,14,0.06)' }}
                        >
                          <Users className="w-5 h-5" style={{ color: '#C1440E', opacity: 0.5 }} />
                        </div>
                        <p className="text-xs font-bold mb-1" style={{ color: '#6B5E7B' }}>No subjects added yet</p>
                        <p className="text-[11px]" style={{ color: '#9B8FA8' }}>Add at least one prop or character to anchor your scene</p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="chars-grid"
                        layout
                        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                      >
                        <AnimatePresence>
                          {references.characters.map((char, idx) => (
                            <ReferenceInput
                              key={idx}
                              item={char}
                              index={idx}
                              type="character"
                              onChange={(i, updated) => {
                                const chars = [...references.characters];
                                chars[i] = updated;
                                onReferencesChange({ ...references, characters: chars });
                              }}
                              onRemove={(i) => {
                                const chars = references.characters.filter((_, j) => j !== i);
                                onReferencesChange({ ...references, characters: chars });
                              }}
                            />
                          ))}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Environment Backgrounds */}
              <div
                className="rounded-3xl overflow-hidden border"
                style={{ borderColor: 'rgba(232,96,60,0.14)', borderLeftWidth: 3, borderLeftColor: '#E8603C', background: '#fff', boxShadow: '0 2px 12px rgba(232,96,60,0.05)' }}
              >
                {/* Section header */}
                <div
                  className="flex items-center justify-between px-6 py-4"
                  style={{ background: 'rgba(232,96,60,0.025)', borderBottom: '1px solid rgba(232,96,60,0.07)' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #E8603C, #FB923C)' }}
                    >
                      <Camera className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <span className="text-sm font-extrabold" style={{ color: '#2D2235' }}>Environment Backgrounds</span>
                      <p className="text-[11px] mt-0.5" style={{ color: '#9B8FA8' }}>Location blueprints for locked spatial structure</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(232,96,60,0.07)', color: '#E8603C' }}
                    >
                      {references.settings.length}/2
                    </div>
                    {references.settings.length < 2 && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          onReferencesChange({
                            ...references,
                            settings: [
                              ...references.settings,
                              { name: '', description: '', useUpload: false, referenceFile: null, referenceImage: null },
                            ],
                          });
                        }}
                        className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full text-white transition-all"
                        style={{ background: 'linear-gradient(135deg, #E8603C, #FB923C)', boxShadow: '0 2px 8px rgba(232,96,60,0.30)' }}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(232,96,60,0.42)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(232,96,60,0.30)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Background
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <AnimatePresence mode="popLayout">
                    {references.settings.length === 0 ? (
                      <motion.div
                        key="settings-empty"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="flex flex-col items-center justify-center py-8 rounded-2xl border-2 border-dashed text-center"
                        style={{ borderColor: 'rgba(232,96,60,0.15)', background: 'rgba(232,96,60,0.015)' }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                          style={{ background: 'rgba(232,96,60,0.06)' }}
                        >
                          <Camera className="w-5 h-5" style={{ color: '#E8603C', opacity: 0.5 }} />
                        </div>
                        <p className="text-xs font-bold mb-1" style={{ color: '#6B5E7B' }}>No backgrounds defined</p>
                        <p className="text-[11px]" style={{ color: '#9B8FA8' }}>Optional — add environment blueprints for locked spatial structure</p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="settings-grid"
                        layout
                        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                      >
                        <AnimatePresence>
                          {references.settings.map((setting, idx) => (
                            <ReferenceInput
                              key={idx}
                              item={setting}
                              index={idx}
                              type="setting"
                              onChange={(i, updated) => {
                                const sets = [...references.settings];
                                sets[i] = updated;
                                onReferencesChange({ ...references, settings: sets });
                              }}
                              onRemove={(i) => {
                                const sets = references.settings.filter((_, j) => j !== i);
                                onReferencesChange({ ...references, settings: sets });
                              }}
                            />
                          ))}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

            </div>
          )}

          {/* Image Upload Pipeline Section (image mode only) */}
          {!isReferencesMode && (
            <div className="bg-white rounded-3xl p-6 border border-stone-200/60 shadow-xs space-y-5">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:18, height:18, borderRadius:'50%', background:'#C1440E', color:'#fff', fontSize:10, fontWeight:800, flexShrink:0 }}>2</span>
                  <label className="block text-xs font-bold uppercase tracking-widest" style={{ color: '#1C1917' }}>
                    Select Storyboard Intent Blueprint
                  </label>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(CHIP_CONFIG).map(([key, { label, Icon }]) => {
                    const isActive = template === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setTemplate(key)}
                        className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-full transition-all duration-200 font-bold tracking-wide"
                        style={
                          isActive
                            ? {
                                background: 'linear-gradient(135deg, #C1440E, #E8603C)',
                                color: '#fff',
                                border: '1.5px solid transparent',
                                boxShadow: '0 2px 10px rgba(193,68,14,0.25)',
                              }
                            : {
                                background: '#FBFAF8',
                                color: '#6B5A52',
                                border: '1.5px solid rgba(193,68,14,0.10)',
                              }
                        }
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = 'rgba(193,68,14,0.25)'; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = 'rgba(193,68,14,0.10)'; }}
                      >
                        <Icon style={{ width: 13, height: 13, flexShrink: 0 }} />
                        {label}
                      </button>
                    );
                  })}
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
                    className="cursor-pointer rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 py-12 px-6"
                    style={{ 
                      borderColor: 'rgba(193,68,14,0.10)', 
                      background: '#FBFAF8', 
                      transition: 'background 0.2s ease, border-color 0.2s ease, transform 0.2s ease' 
                    }}
                    onMouseEnter={e => { 
                      e.currentTarget.style.background = '#FFF9F5';
                      e.currentTarget.style.borderColor = 'rgba(193,68,14,0.25)';
                    }}
                    onMouseLeave={e => { 
                      e.currentTarget.style.background = '#FBFAF8';
                      e.currentTarget.style.borderColor = 'rgba(193,68,14,0.10)';
                    }}
                    onDragEnter={e => {
                      e.currentTarget.style.background = 'rgba(193,68,14,0.06)';
                      e.currentTarget.style.borderColor = 'rgba(193,68,14,0.6)';
                      e.currentTarget.style.transform = 'scale(1.01)';
                    }}
                    onDragLeave={e => {
                      e.currentTarget.style.background = '#FBFAF8';
                      e.currentTarget.style.borderColor = 'rgba(193,68,14,0.10)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    >
                    <motion.div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #C1440E, #E8603C)', boxShadow: '0 4px 16px rgba(193,68,14,0.30)' }}
                      whileHover={{ y: -4, scale: 1.08, boxShadow: '0 8px 24px rgba(193,68,14,0.40)' }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                      <Upload className="w-6 h-6 text-white" />
                    </motion.div>
                    <div className="text-center space-y-1">
                      <p className="font-bold text-sm text-stone-800">Drop your scene photos here</p>
                      <p className="text-xs text-stone-400">Click to browse  ·  JPEG or PNG  ·  Up to {MAX_IMAGES} images</p>
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
                            aria-label="Remove image"
                            className="absolute top-1 right-1 w-6 h-6 text-white rounded-full transition-all flex items-center justify-center shadow-md z-10"
                            style={{ background: '#C1440E' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#A8380C'}
                            onMouseLeave={e => e.currentTarget.style.background = '#C1440E'}

                          >
                            <X className="w-3 h-3" strokeWidth={2.5} />
                          </button>
                        </motion.div>
                      ))}

                      {/* Continuous Sequence Append Container */}
                      {!atCap && (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          onDrop={handleDrop}
                          onDragOver={handleDragOver}
                          className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all"
                          style={{ background: '#FBFAF8', borderColor: 'rgba(193,68,14,0.15)', transition: 'background 0.2s ease, border-color 0.2s ease' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.35)'; e.currentTarget.style.background = '#FFF9F5'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.15)'; e.currentTarget.style.background = '#FBFAF8'; }}
                        >
                          <Plus className="w-5 h-5 mb-0.5" style={{ color: '#C1440E', opacity: 0.5 }} />
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
            <div className="flex items-center gap-2">
              <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:18, height:18, borderRadius:'50%', background:'#C1440E', color:'#fff', fontSize:10, fontWeight:800, flexShrink:0 }}>{isReferencesMode ? '2' : '3'}</span>
              <label className="text-xs font-bold uppercase tracking-widest" style={{ color: '#1C1917' }}>
                Pick Rendering Style Engine
              </label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(isReferencesMode ? STYLE_OPTIONS : styleOptions).map((option) => {
                const isSelected = style === option.id;
                const StyleIcon = STYLE_ICON_MAP[option.id] || Sparkles;
                return (
                  <motion.button
                    key={option.id}
                    onClick={() => setStyle(option.id)}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="relative p-4 rounded-2xl border-2 text-left flex flex-col gap-2.5 min-h-[124px]"
                    style={
                      isSelected
                        ? { borderColor: "#C1440E", background: "linear-gradient(160deg, rgba(193,68,14,0.07) 0%, rgba(232,96,60,0.04) 100%)", boxShadow: "0 4px 16px rgba(193,68,14,0.14)" }
                        : { borderColor: "rgba(193,68,14,0.08)", background: "#FBFAF8" }
                    }
                  >
                    {isSelected && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                        className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, #C1440E, #E8603C)", boxShadow: "0 2px 6px rgba(193,68,14,0.35)" }}
                      >
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </motion.span>
                    )}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200"
                      style={
                        isSelected
                          ? { background: "linear-gradient(135deg, #C1440E, #E8603C)", boxShadow: "0 4px 10px rgba(193,68,14,0.30)" }
                          : { background: "rgba(193,68,14,0.06)" }
                      }
                    >
                      <StyleIcon style={{ width: 18, height: 18, color: isSelected ? "#fff" : "#C1440E" }} strokeWidth={2} />
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-extrabold text-xs block" style={{ color: "#1C1917" }}>{option.name}</span>
                      <span className="text-[10px] block leading-snug line-clamp-2" style={{ color: "#9c8f85" }}>{option.description}</span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Target Duration Configuration Output Module */}
          {setTargetDuration && (
            <div className="bg-white rounded-3xl p-6 border border-stone-200/60 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:18, height:18, borderRadius:'50%', background:'#C1440E', color:'#fff', fontSize:10, fontWeight:800, flexShrink:0 }}>{isReferencesMode ? '3' : '4'}</span>
                <label className="text-xs font-bold uppercase tracking-widest" style={{ color: '#1C1917' }}>
                  Target Clip Duration
                </label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {DURATION_OPTIONS.map((opt, idx) => {
                  const isSelected = targetDuration === opt.value;
                  const level = idx + 1;
                  return (
                    <motion.button
                      key={opt.value}
                      onClick={() => setTargetDuration(opt.value)}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="relative p-4 rounded-2xl border-2 flex flex-col items-center gap-2"
                      style={
                        isSelected
                          ? { borderColor: "#C1440E", background: "linear-gradient(160deg, rgba(193,68,14,0.07) 0%, rgba(232,96,60,0.04) 100%)", boxShadow: "0 4px 16px rgba(193,68,14,0.14)" }
                          : { borderColor: "rgba(193,68,14,0.08)", background: "#FBFAF8" }
                      }
                    >
                      {isSelected && (
                        <motion.span
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 25 }}
                          className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg, #C1440E, #E8603C)", boxShadow: "0 2px 6px rgba(193,68,14,0.35)" }}
                        >
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        </motion.span>
                      )}
                      <div className="flex items-end gap-1 h-5">
                        {[1, 2, 3, 4].map((bar) => (
                          <span
                            key={bar}
                            className="rounded-full transition-colors duration-200"
                            style={{
                              width: 4,
                              height: 6 + bar * 3,
                              background: bar <= level
                                ? (isSelected ? "linear-gradient(180deg, #C1440E, #E8603C)" : "rgba(193,68,14,0.30)")
                                : "rgba(193,68,14,0.10)",
                            }}
                          />
                        ))}
                      </div>
                      <span className="font-black block text-base" style={{ color: "#1C1917" }}>{opt.label}</span>
                      <span className="text-[10px] block" style={{ color: "#9c8f85" }}>{opt.desc}</span>
                    </motion.button>
                  );
                })}
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
                aria-pressed={enableBridges}
                className="w-full flex items-center justify-between gap-4 p-5 transition-colors bg-white hover:bg-stone-50/50 text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200"
                    style={
                      enableBridges
                        ? { background: "linear-gradient(135deg, #C1440E, #E8603C)", boxShadow: "0 4px 10px rgba(193,68,14,0.30)" }
                        : { background: "rgba(193,68,14,0.06)" }
                    }
                  >
                    <Wand2 style={{ width: 18, height: 18, color: enableBridges ? "#fff" : "#C1440E" }} />
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-extrabold text-sm block text-stone-800">Smooth Scene Transitions</span>
                    <span className="text-xs text-stone-400 block leading-relaxed">
                      Generate extra AI frames between your images for smoother cuts
                    </span>
                  </div>
                </div>
                <div
                  className="relative w-12 h-6 rounded-full flex-shrink-0 transition-colors duration-200"
                  style={{ background: enableBridges ? "linear-gradient(135deg, #C1440E, #E8603C)" : "#E5DFD8" }}
                >
                  <motion.span
                    className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                    animate={{ left: enableBridges ? 26 : 4 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </div>
              </button>
            </div>
          )}

          {/* Intro & Outro Frames */}
          {!isReferencesMode && (
            <div className="bg-white rounded-3xl border border-stone-200/60 shadow-xs overflow-hidden">
              {/* Collapsible header — shows configured badge when cards are active */}
              <motion.button
                onClick={() => setFrameConfigExpanded(!frameConfigExpanded)}
                whileTap={{ scale: 0.99 }}
                className="w-full flex items-center justify-between p-5 transition-colors bg-white hover:bg-stone-50/50 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
                    style={{ background: frameConfigExpanded ? 'linear-gradient(135deg, #C1440E, #E8603C)' : 'rgba(193,68,14,0.08)' }}
                  >
                    <Film className="w-3.5 h-3.5" style={{ color: frameConfigExpanded ? '#fff' : '#C1440E' }} />
                  </div>
                  <span className="text-sm font-extrabold text-stone-800">Intro & Outro Frames</span>
                  {(openingEnabled || closingEnabled) ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(193,68,14,0.10)', color: '#C1440E' }}>
                      {[openingEnabled && 'Intro', closingEnabled && 'Outro'].filter(Boolean).join(' + ')}
                    </span>
                  ) : (
                    <span className="text-xs text-stone-400 font-semibold">(Optional)</span>
                  )}
                </div>
                {frameConfigExpanded ? (
                  <ChevronUp className="w-4 h-4 text-stone-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-stone-400" />
                )}
              </motion.button>

              <AnimatePresence>
                {frameConfigExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden border-t border-stone-100"
                  >
                    <motion.div
                      className="p-5 space-y-3 text-xs"
                      initial="hidden"
                      animate="visible"
                      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.09, delayChildren: 0.06 } } }}
                    >
                      <p className="text-stone-400 font-medium leading-relaxed">
                        Add a branded intro or outro screen around your video. Toggle either one on to configure it.
                      </p>

                      {/* Opening Frame card */}
                      <motion.div
                        variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 380, damping: 26 } } }}
                        className="rounded-2xl border overflow-hidden"
                        style={{ borderColor: openingEnabled ? 'rgba(193,68,14,0.35)' : 'rgba(193,68,14,0.12)', borderLeftWidth: 3, borderLeftColor: openingEnabled ? '#C1440E' : 'rgba(193,68,14,0.15)' }}
                      >
                        <motion.button
                          whileTap={{ scale: 0.985 }}
                          onClick={() => setOpeningEnabled(!openingEnabled)}
                          aria-pressed={openingEnabled}
                          className="w-full flex items-center justify-between px-4 py-3.5 transition-colors cursor-pointer"
                          style={{ background: openingEnabled ? 'rgba(193,68,14,0.04)' : '#FAFAF9' }}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-all duration-200"
                              style={{ background: openingEnabled ? 'linear-gradient(135deg, #C1440E, #E8603C)' : 'rgba(193,68,14,0.08)' }}
                            >
                              <Play className="w-3 h-3" style={{ color: openingEnabled ? '#fff' : '#C1440E' }} />
                            </div>
                            <div>
                              <span className="font-extrabold text-sm text-stone-800">Opening Frame</span>
                              {!openingEnabled && <span className="ml-2 text-[10px] text-stone-400 font-medium">tap to enable</span>}
                            </div>
                          </div>
                          <div
                            className="relative w-10 h-5 rounded-full flex-shrink-0 transition-colors duration-200"
                            style={{ background: openingEnabled ? 'linear-gradient(135deg, #C1440E, #E8603C)' : '#E5DFD8' }}
                          >
                            <motion.span
                              className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                              animate={{ left: openingEnabled ? 22 : 2 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          </div>
                        </motion.button>
                        <AnimatePresence>
                          {openingEnabled && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 space-y-4 bg-white border-t border-stone-100">
                                <div className="space-y-1.5">
                                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400">What should this frame show?</label>
                                  <div
                                    className="rounded-xl"
                                    style={{ border: '1.5px solid rgba(193,68,14,0.10)', background: '#FBFAF8', transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease' }}
                                    onFocusCapture={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.35)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(193,68,14,0.06)'; }}
                                    onBlurCapture={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.10)'; e.currentTarget.style.boxShadow = 'none'; }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.22)'; e.currentTarget.style.background = '#FFF9F5'; }}
                                    onMouseLeave={e => { if (!e.currentTarget.contains(document.activeElement)) { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.10)'; e.currentTarget.style.background = '#FBFAF8'; } }}
                                  >
                                    <Textarea
                                      value={openingFrame.description || ""}
                                      onChange={(e) => setOpeningFrame((prev) => ({ ...prev, description: e.target.value }))}
                                      placeholder="e.g., Brand logo on a dark background with a subtle glow effect"
                                      className="text-xs rounded-xl bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                      rows={2}
                                    />
                                  </div>
                                  <p className="text-[11px] text-stone-400 leading-relaxed">Describe the mood, content, and look of this frame.</p>
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Frame source</label>
                                  <div className="flex gap-2 p-1 rounded-xl bg-stone-100/70 border border-stone-200/30">
                                    <motion.button
                                      whileTap={{ scale: 0.97 }}
                                      onClick={() => setOpeningFrame((prev) => ({ ...prev, useUpload: false }))}
                                      aria-pressed={!openingFrame.useUpload}
                                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-xs transition-all cursor-pointer"
                                      style={!openingFrame.useUpload ? { background: "#fff", color: "#C1440E", boxShadow: "0 1px 4px rgba(0,0,0,0.10)" } : { color: "#9B8FA8" }}
                                    >
                                      <Wand2 className="w-3.5 h-3.5" /> Generate with AI
                                    </motion.button>
                                    <motion.button
                                      whileTap={{ scale: 0.97 }}
                                      onClick={() => setOpeningFrame((prev) => ({ ...prev, useUpload: true }))}
                                      aria-pressed={openingFrame.useUpload}
                                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-xs transition-all cursor-pointer"
                                      style={openingFrame.useUpload ? { background: "#fff", color: "#C1440E", boxShadow: "0 1px 4px rgba(0,0,0,0.10)" } : { color: "#9B8FA8" }}
                                    >
                                      <Upload className="w-3.5 h-3.5" /> Upload image
                                    </motion.button>
                                  </div>
                                </div>
                                {!openingFrame.useUpload ? (
                                  <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400">AI image prompt <span className="normal-case font-medium text-stone-300">(optional)</span></label>
                                    <div
                                      className="rounded-xl"
                                      style={{ border: '1.5px solid rgba(193,68,14,0.10)', background: '#FBFAF8', transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease' }}
                                      onFocusCapture={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.35)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(193,68,14,0.06)'; }}
                                      onBlurCapture={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.10)'; e.currentTarget.style.boxShadow = 'none'; }}
                                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.22)'; e.currentTarget.style.background = '#FFF9F5'; }}
                                      onMouseLeave={e => { if (!e.currentTarget.contains(document.activeElement)) { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.10)'; e.currentTarget.style.background = '#FBFAF8'; } }}
                                    >
                                      <Textarea
                                        value={openingFrame.customPrompt || ""}
                                        onChange={(e) => setOpeningFrame((prev) => ({ ...prev, customPrompt: e.target.value }))}
                                        placeholder="Describe what the opening frame should look like in detail..."
                                        className="text-xs rounded-xl bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                        rows={2}
                                      />
                                    </div>
                                    <p className="text-[11px] text-stone-400">Leave blank and AI will infer from your video description.</p>
                                  </div>
                                ) : (
                                  <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Your image</label>
                                    <input ref={openingFileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => handleFrameFileChange(e, "opening")} />
                                    {openingFrame.uploadedImage ? (
                                      <div className="relative inline-block mt-1">
                                        <img src={openingFrame.uploadedImage} alt="Opening frame" className="w-32 h-20 object-cover rounded-xl border border-stone-200 shadow-sm" />
                                        <button onClick={() => removeFrameImage("opening")} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs shadow font-bold">×</button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => openingFileRef.current?.click()}
                                        className="w-full py-5 border-2 border-dashed rounded-xl transition-all flex flex-col items-center gap-1.5 cursor-pointer"
                                        style={{ borderColor: 'rgba(193,68,14,0.15)', color: '#B0A49A', background: '#FBFAF8', transition: 'background 0.2s ease, border-color 0.2s ease' }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.35)'; e.currentTarget.style.background = '#FFF9F5'; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.15)'; e.currentTarget.style.background = '#FBFAF8'; }}
                                      >
                                        <Upload className="w-5 h-5" />
                                        <span className="font-bold text-xs">Click to upload image</span>
                                        <span className="text-[10px] text-stone-300 font-medium">JPEG or PNG</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                                <div className="space-y-1.5">
                                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Text overlay <span className="normal-case font-medium text-stone-300">(optional)</span></label>
                                  <div
                                    className="rounded-xl"
                                    style={{ border: '1.5px solid rgba(193,68,14,0.10)', background: '#FBFAF8', transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease' }}
                                    onFocusCapture={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.35)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(193,68,14,0.06)'; }}
                                    onBlurCapture={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.10)'; e.currentTarget.style.boxShadow = 'none'; }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.22)'; e.currentTarget.style.background = '#FFF9F5'; }}
                                    onMouseLeave={e => { if (!e.currentTarget.contains(document.activeElement)) { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.10)'; e.currentTarget.style.background = '#FBFAF8'; } }}
                                  >
                                    <Input value={openingFrame.textOverlay || ""} onChange={(e) => setOpeningFrame((prev) => ({ ...prev, textOverlay: e.target.value }))} placeholder="e.g., Chapter 1: The Ascent" className="text-xs h-11 rounded-xl bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0" />
                                  </div>
                                  <p className="text-[11px] text-stone-400">Text shown on screen during this frame.</p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>

                      {/* Closing Frame card */}
                      <motion.div
                        variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 380, damping: 26 } } }}
                        className="rounded-2xl border overflow-hidden"
                        style={{ borderColor: closingEnabled ? 'rgba(193,68,14,0.35)' : 'rgba(193,68,14,0.12)', borderLeftWidth: 3, borderLeftColor: closingEnabled ? '#C1440E' : 'rgba(193,68,14,0.15)' }}
                      >
                        <motion.button
                          whileTap={{ scale: 0.985 }}
                          onClick={() => setClosingEnabled(!closingEnabled)}
                          aria-pressed={closingEnabled}
                          className="w-full flex items-center justify-between px-4 py-3.5 transition-colors cursor-pointer"
                          style={{ background: closingEnabled ? 'rgba(193,68,14,0.04)' : '#FAFAF9' }}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-all duration-200"
                              style={{ background: closingEnabled ? 'linear-gradient(135deg, #C1440E, #E8603C)' : 'rgba(193,68,14,0.08)' }}
                            >
                              <Square className="w-3 h-3" style={{ color: closingEnabled ? '#fff' : '#C1440E' }} />
                            </div>
                            <div>
                              <span className="font-extrabold text-sm text-stone-800">Closing Frame</span>
                              {!closingEnabled && <span className="ml-2 text-[10px] text-stone-400 font-medium">tap to enable</span>}
                            </div>
                          </div>
                          <div
                            className="relative w-10 h-5 rounded-full flex-shrink-0 transition-colors duration-200"
                            style={{ background: closingEnabled ? 'linear-gradient(135deg, #C1440E, #E8603C)' : '#E5DFD8' }}
                          >
                            <motion.span
                              className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                              animate={{ left: closingEnabled ? 22 : 2 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          </div>
                        </motion.button>
                        <AnimatePresence>
                          {closingEnabled && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 space-y-4 bg-white border-t border-stone-100">
                                <div className="space-y-1.5">
                                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400">What should this frame show?</label>
                                  <div
                                    className="rounded-xl"
                                    style={{ border: '1.5px solid rgba(193,68,14,0.10)', background: '#FBFAF8', transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease' }}
                                    onFocusCapture={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.35)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(193,68,14,0.06)'; }}
                                    onBlurCapture={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.10)'; e.currentTarget.style.boxShadow = 'none'; }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.22)'; e.currentTarget.style.background = '#FFF9F5'; }}
                                    onMouseLeave={e => { if (!e.currentTarget.contains(document.activeElement)) { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.10)'; e.currentTarget.style.background = '#FBFAF8'; } }}
                                  >
                                    <Textarea
                                      value={closingFrame.description || ""}
                                      onChange={(e) => setClosingFrame((prev) => ({ ...prev, description: e.target.value }))}
                                      placeholder="e.g., Call-to-action card with website URL and logo"
                                      className="text-xs rounded-xl bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                      rows={2}
                                    />
                                  </div>
                                  <p className="text-[11px] text-stone-400 leading-relaxed">Describe the mood, content, and look of this frame.</p>
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Frame source</label>
                                  <div className="flex gap-2 p-1 rounded-xl bg-stone-100/70 border border-stone-200/30">
                                    <motion.button
                                      whileTap={{ scale: 0.97 }}
                                      onClick={() => setClosingFrame((prev) => ({ ...prev, useUpload: false }))}
                                      aria-pressed={!closingFrame.useUpload}
                                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-xs transition-all cursor-pointer"
                                      style={!closingFrame.useUpload ? { background: "#fff", color: "#C1440E", boxShadow: "0 1px 4px rgba(0,0,0,0.10)" } : { color: "#9B8FA8" }}
                                    >
                                      <Wand2 className="w-3.5 h-3.5" /> Generate with AI
                                    </motion.button>
                                    <motion.button
                                      whileTap={{ scale: 0.97 }}
                                      onClick={() => setClosingFrame((prev) => ({ ...prev, useUpload: true }))}
                                      aria-pressed={closingFrame.useUpload}
                                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-xs transition-all cursor-pointer"
                                      style={closingFrame.useUpload ? { background: "#fff", color: "#C1440E", boxShadow: "0 1px 4px rgba(0,0,0,0.10)" } : { color: "#9B8FA8" }}
                                    >
                                      <Upload className="w-3.5 h-3.5" /> Upload image
                                    </motion.button>
                                  </div>
                                </div>
                                {!closingFrame.useUpload ? (
                                  <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400">AI image prompt <span className="normal-case font-medium text-stone-300">(optional)</span></label>
                                    <div
                                      className="rounded-xl"
                                      style={{ border: '1.5px solid rgba(193,68,14,0.10)', background: '#FBFAF8', transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease' }}
                                      onFocusCapture={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.35)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(193,68,14,0.06)'; }}
                                      onBlurCapture={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.10)'; e.currentTarget.style.boxShadow = 'none'; }}
                                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.22)'; e.currentTarget.style.background = '#FFF9F5'; }}
                                      onMouseLeave={e => { if (!e.currentTarget.contains(document.activeElement)) { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.10)'; e.currentTarget.style.background = '#FBFAF8'; } }}
                                    >
                                      <Textarea
                                        value={closingFrame.customPrompt || ""}
                                        onChange={(e) => setClosingFrame((prev) => ({ ...prev, customPrompt: e.target.value }))}
                                        placeholder="Describe what the closing frame should look like in detail..."
                                        className="text-xs rounded-xl bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                        rows={2}
                                      />
                                    </div>
                                    <p className="text-[11px] text-stone-400">Leave blank and AI will infer from your video description.</p>
                                  </div>
                                ) : (
                                  <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Your image</label>
                                    <input ref={closingFileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => handleFrameFileChange(e, "closing")} />
                                    {closingFrame.uploadedImage ? (
                                      <div className="relative inline-block mt-1">
                                        <img src={closingFrame.uploadedImage} alt="Closing frame" className="w-32 h-20 object-cover rounded-xl border border-stone-200 shadow-sm" />
                                        <button onClick={() => removeFrameImage("closing")} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs shadow font-bold">×</button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => closingFileRef.current?.click()}
                                        className="w-full py-5 border-2 border-dashed rounded-xl transition-all flex flex-col items-center gap-1.5 cursor-pointer"
                                        style={{ borderColor: 'rgba(193,68,14,0.15)', color: '#B0A49A', background: '#FBFAF8', transition: 'background 0.2s ease, border-color 0.2s ease' }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.35)'; e.currentTarget.style.background = '#FFF9F5'; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.15)'; e.currentTarget.style.background = '#FBFAF8'; }}
                                      >
                                        <Upload className="w-5 h-5" />
                                        <span className="font-bold text-xs">Click to upload image</span>
                                        <span className="text-[10px] text-stone-300 font-medium">JPEG or PNG</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                                <div className="space-y-1.5">
                                  <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Text overlay <span className="normal-case font-medium text-stone-300">(optional)</span></label>
                                  <div
                                    className="rounded-xl"
                                    style={{ border: '1.5px solid rgba(193,68,14,0.10)', background: '#FBFAF8', transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease' }}
                                    onFocusCapture={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.35)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(193,68,14,0.06)'; }}
                                    onBlurCapture={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.10)'; e.currentTarget.style.boxShadow = 'none'; }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.22)'; e.currentTarget.style.background = '#FFF9F5'; }}
                                    onMouseLeave={e => { if (!e.currentTarget.contains(document.activeElement)) { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.10)'; e.currentTarget.style.background = '#FBFAF8'; } }}
                                  >
                                    <Input value={closingFrame.textOverlay || ""} onChange={(e) => setClosingFrame((prev) => ({ ...prev, textOverlay: e.target.value }))} placeholder="e.g., Join us at website.com" className="text-xs h-11 rounded-xl bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0" />
                                  </div>
                                  <p className="text-[11px] text-stone-400">Text shown on screen during this frame.</p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </motion.div>
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
              style={{ background: "linear-gradient(135deg, #C1440E, #E8603C)" }}
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
                ? "Add your characters and describe your video to get started"
                : "Upload your scene images and describe your video to get started"}
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
                  {isReferencesMode ? "Writing a great character prompt" : "Writing a great prompt"}
                </h2>
                <button
                  onClick={() => setShowPromptGuide(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200 text-stone-500 font-bold transition-colors"
                >
                  ×
                </button>
              </div>

              {isReferencesMode ? (
                <div className="space-y-5 text-xs text-[#6B5E7B] leading-relaxed">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-stone-800">Tell us the story, not just the appearance</h3>
                    <p><span className="font-bold text-red-500">Weak:</span> "A woman with red hair"</p>
                    <p><span className="font-bold text-orange-500">Better:</span> "A confident woman in her 30s with short red hair and sharp green eyes, wearing a tailored black blazer"</p>
                    <p><span className="font-bold text-emerald-600">Best:</span> "A confident woman in her 30s with short copper-red hair, sharp green eyes and faint freckles — wearing a fitted black blazer over a white shirt, silver ring on her right hand. Moves with quiet authority."</p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-extrabold text-stone-800">Include these key ingredients</h3>
                    <div className="grid grid-cols-2 gap-2 bg-stone-50 p-3 rounded-xl border border-stone-100 text-[11px] font-medium">
                      <div><span className="font-bold text-orange-500">Who:</span> Age, build, defining features</div>
                      <div><span className="font-bold text-orange-500">Wear:</span> Clothing, accessories, details</div>
                      <div><span className="font-bold text-orange-500">Mood:</span> Personality, energy, expression</div>
                      <div><span className="font-bold text-orange-500">Where:</span> The environment they exist in</div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-extrabold text-stone-800">Keep it specific and physical</h3>
                    <p>Describe what a camera would actually see — hair colour, clothing texture, posture, expression. Avoid abstract personality traits like "kind" or "mysterious" unless paired with something visual that shows it.</p>
                  </div>
                </div>
              ) : (
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
              )}
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
                  style={{ background: "linear-gradient(135deg, #C1440E, #E8603C)" }}
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
