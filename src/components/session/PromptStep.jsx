import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Palette, Upload, X, Film, Wand2,
  ChevronDown, ChevronUp, HelpCircle, Plus, Grid, Users,
  Lightbulb, Camera, Drama, Droplet, Box, Zap, Check, Square, BookOpen, Play, Package,
  Loader2, RotateCcw, Mic, Music, ArrowLeft, AlertCircle, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import PromptMentionField from "./PromptMentionField";
import VoiceSelector from "./VoiceSelector";
import AutoApproveIntroModal from "./AutoApproveIntroModal";
import { scorePrompt } from "@/lib/promptStrength";
import { downscaleImageToDataUrl } from "@/lib/downscaleImage";
import { improvePrompt as improvePromptApi } from "@/services/reference";
import { getRegionDefault } from "@/services/voices";
import { getJsonPref, PREF_KEYS } from "@/lib/preferences";

// How many uploaded photos the "Improve" button sends to the vision model.
// Capped so the call stays fast and cheap on a button click.
const IMPROVE_VISION_MAX_IMAGES = 6;
import { Input } from "@/components/ui/input";
import { STYLE_OPTIONS } from '../../constants/styles';
import { ASPECT_RATIO_OPTIONS } from '../../constants/aspectRatios';
import { MAX_IMAGES, creditsForDuration } from "@/lib/limits";
import { ACCEPTED_IMAGE_ACCEPT, validateImageFile, filterValidImages } from "@/lib/imageValidation";
import DurationEstimate from "./DurationEstimate";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.jsx";
import { saveReturnTo } from "@/lib/returnTo";
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { startImageTour, startReferencesTour } from "@/lib/promptTour";
import { TOUR_KEYS } from "@/lib/tourState";
import { useStepTour } from "@/lib/useStepTour";
import HelpFab from "@/components/ui/HelpFab";
import IntroVideoModal from "@/components/IntroVideoModal";
import { useIntroVideo } from "@/hooks/useIntroVideo";
import { useIsMobile } from "@/hooks/useMediaQuery";

const SLOT_LABELS = {
  general: ['Opening shot', 'Main moment', 'Scene 3', 'Scene 4', 'Scene 5', 'Scene 6', 'Scene 7', 'Scene 8', 'Scene 9', 'Ending'],
  business_ad: ['Opening shot', 'The problem', 'The solution', 'Product in action', 'Happy customers', 'Testimonial', 'Scene 7', 'Scene 8', 'Scene 9', 'Call to action'],
  social_content: ['Opening shot', 'Scene 2', 'Scene 3', 'Scene 4', 'Scene 5', 'Scene 6', 'Scene 7', 'Scene 8', 'Scene 9', 'Ending'],
  birthday: ['Opening moment', 'Memory 1', 'Memory 2', 'Memory 3', 'Memory 4', 'Memory 5', 'Memory 6', 'Memory 7', 'Memory 8', 'Closing message'],
  product_showcase: ['Main shot', 'Feature 1', 'Feature 2', 'Feature 3', 'Feature 4', 'Lifestyle shot', 'Testimonial', 'Price & call to action', 'Scene 9', 'Ending'],
};

const DURATION_OPTIONS = [
  { value: 15, label: '15s', desc: 'Quick highlight' },
  { value: 30, label: '30s', desc: 'Standard' },
  { value: 45, label: '45s', desc: 'Extended' },
  { value: 60, label: '60s', desc: 'Full story' },
];

const STYLE_ICON_MAP = {
  realistic: Camera,
  animated: Palette,
  cinematic: Film,
  surreal: Wand2,
  anime: Drama,
  comic_book: Zap,
  watercolor: Droplet,
  '3d_render': Box,
};

const STYLE_IMAGE_MAP = {
  realistic:   'https://pub-130d5201a986450fa0c5297fa3bc461f.r2.dev/realistic_car.jpg',
  animated:    'https://pub-130d5201a986450fa0c5297fa3bc461f.r2.dev/animated_car.jpg',
  cinematic:   'https://pub-130d5201a986450fa0c5297fa3bc461f.r2.dev/cinematic_car.jpg',
  surreal:     'https://pub-130d5201a986450fa0c5297fa3bc461f.r2.dev/surreal_car.jpg',
  watercolor:  'https://pub-130d5201a986450fa0c5297fa3bc461f.r2.dev/watercolor_car.webp',
  comic_book:  'https://pub-130d5201a986450fa0c5297fa3bc461f.r2.dev/cartoon_car.webp',
  anime:       'https://pub-130d5201a986450fa0c5297fa3bc461f.r2.dev/anime_car.webp',
  '3d_render': 'https://pub-130d5201a986450fa0c5297fa3bc461f.r2.dev/3D_car.webp',
};

const STYLE_SUB_LABEL_MAP = {
  realistic:   'Natural, true-to-life',
  animated:    'Illustrated, motion-graphic',
  cinematic:   'Dramatic, film-grade look',
  surreal:     'Abstract, dreamlike, artistic',
  anime:       'Japanese animation style',
  comic_book:  'Bold lines, vivid panels',
  watercolor:  'Soft, painted texture',
  '3d_render': 'Digital, rendered depth',
};

// Pixel dimensions for the literal landscape/portrait rectangle previews
const RATIO_BOX = {
  '16:9': { w: 52, h: 29 },
  '9:16': { w: 29, h: 52 },
};

const PROMPT_DICTIONARY = [
  {
    id: 'shot',
    label: 'Shot Type',
    Icon: Film,
    terms: ['close-up', 'extreme close-up', 'wide shot', 'aerial shot', 'over-the-shoulder', 'POV shot', 'tracking shot', 'Dutch angle', "bird's-eye view", "worm's-eye view"],
  },
  {
    id: 'motion',
    label: 'Camera Motion',
    Icon: Camera,
    terms: ['slow pan', 'dolly in', 'dolly out', 'handheld', 'slow zoom', 'orbit', 'push in', 'pull back', 'crane shot', 'static wide'],
  },
  {
    id: 'lighting',
    label: 'Lighting',
    Icon: Zap,
    terms: ['golden hour', 'soft diffused', 'dramatic shadows', 'backlit', 'rim lighting', 'neon glow', 'candlelit', 'volumetric light', 'silhouette', 'overcast'],
  },
  {
    id: 'mood',
    label: 'Mood',
    Icon: Sparkles,
    terms: ['cinematic', 'nostalgic', 'dramatic', 'serene', 'energetic', 'mysterious', 'warm & cozy', 'epic', 'melancholic', 'triumphant'],
  },
  {
    id: 'style',
    label: 'Visual Style',
    Icon: Palette,
    terms: ['film grain', 'hyper-real', 'muted tones', 'high contrast', 'bokeh', 'vivid colors', 'anamorphic', 'shallow depth of field', 'desaturated', 'HDR'],
  },
];

// Each inspiration item pairs a prompt with the R2 video preview that shows the result
const INSPIRATION_ITEMS = [
  {
    label: 'Travel montage',
    prompt: 'A travel montage from my holiday photos, upbeat and cinematic with warm sunset tones',
    poster: 'https://pub-130d5201a986450fa0c5297fa3bc461f.r2.dev/Travel_brand_ad_montage_202606181523.mp4',
  },
  {
    label: 'Product showcase',
    prompt: 'A polished product showcase for my business, clean studio lighting with dynamic rotation',
    poster: 'https://pub-130d5201a986450fa0c5297fa3bc461f.r2.dev/Luxury_watch_ad_Raphio_202606181523.mp4',
  },
  {
    label: 'Birthday memory reel',
    prompt: 'A heartfelt birthday memory reel for someone special, warm and nostalgic with gentle transitions',
    poster: 'https://pub-130d5201a986450fa0c5297fa3bc461f.r2.dev/Luxury_beauty_ad_Raphio_202606181523.mp4',
  },
  {
    label: 'Fitness transformation',
    prompt: 'A gym transformation video, energetic and motivating with bold cuts',
    poster: 'https://pub-130d5201a986450fa0c5297fa3bc461f.r2.dev/Athlete_training_fitness_ad_202606181523.mp4',
  },
  {
    label: 'Real estate walkthrough',
    prompt: 'A real estate walkthrough of my property, smooth tracking shots and natural lighting',
    poster: 'https://pub-130d5201a986450fa0c5297fa3bc461f.r2.dev/Real-estate_tour_Raphio_brandmark_202606181522%20(1).mp4',
  },
  {
    label: 'Food commercial',
    prompt: 'A mouth-watering food commercial with dramatic close-ups and slow motion',
    poster: 'https://pub-130d5201a986450fa0c5297fa3bc461f.r2.dev/Burger_built_Raphio_brandmark_202606181522.mp4',
  },
  {
    label: 'Luxury brand ad',
    prompt: 'A high-end luxury brand advertisement, moody lighting and elegant pacing',
    poster: 'https://pub-130d5201a986450fa0c5297fa3bc461f.r2.dev/Perfume_bottle_rotates_Raphio_br%E2%80%A6_202606181522.mp4',
  },
  {
    label: 'App promo',
    prompt: 'A corporate app promo, modern and confident with clean UI shots',
    poster: 'https://pub-130d5201a986450fa0c5297fa3bc461f.r2.dev/Corporate_app_promo_Raphio_202606181523.mp4',
  },
];

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

// ── Shared step badge: used by every section header in the new flow ──
function StepBadge({ n }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full flex-shrink-0 font-black"
      style={{
        width: 30, height: 30, fontSize: 14,
        background: 'linear-gradient(135deg, #C1440E, #E8603C)',
        color: '#fff',
        boxShadow: '0 3px 10px rgba(193,68,14,0.28)',
      }}
    >
      {n}
    </span>
  );
}

const CARD_SHADOW = {
  background: '#ffffff',
  boxShadow: '0 2px 16px rgba(193,68,14,0.06), 0 1px 0 rgba(255,255,255,0.8), 0 0 0 1px rgba(193,68,14,0.08)',
};

function ReferenceInput({ item, index, type, onChange, onRemove, isDuplicateName }) {
  const handleFileChange = (e) => {
    const file = validateImageFile(e.target.files?.[0]);
    if (file) {
      onChange(index, {
        ...item,
        referenceFile: file,
        referenceImage: URL.createObjectURL(file),
      });
    }
    e.target.value = "";
  };

  const isCharacter = type === 'character';
  const isSetting = type === 'setting';
  const isLogo = type === 'logo';
  const isProduct = type === 'product';
  const accent = isCharacter ? '#C1440E' : isSetting ? '#7C3AED' : isLogo ? '#2563EB' : '#059669';
  const accentRgb = isCharacter ? '193,68,14' : isSetting ? '124,58,237' : isLogo ? '37,99,235' : '5,150,105';
  const gradientEnd = isCharacter ? '#E8603C' : isSetting ? '#A855F7' : isLogo ? '#3B82F6' : '#10B981';

  const typeInfo = REF_TYPE_OPTIONS.find(t => t.value === item.type) || REF_TYPE_OPTIONS[0];

  // What this card still needs before it counts as a usable reference. Shown as
  // a gentle amber footer so it's obvious why the "Create" button stays disabled
  // (mirrors the red duplicate-name line above). A reference is "complete" when
  // it has a name AND (an uploaded image or a description), the same test the
  // parent uses to gate the CTA.
  const missingParts = [];
  if (!item.name?.trim()) missingParts.push('a name');
  if (item.useUpload ? !item.referenceFile : !item.description?.trim()) {
    missingParts.push(item.useUpload ? 'an uploaded image' : 'a description');
  }
  const incompleteHint =
    missingParts.length === 0
      ? null
      : missingParts.length === 1
        ? `Still needs ${missingParts[0]}`
        : `Still needs ${missingParts.slice(0, -1).join(', ')} and ${missingParts[missingParts.length - 1]}`;

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
              : isSetting
                ? <Camera className="w-2.5 h-2.5 text-white" />
                : isLogo
                  ? <Camera className="w-2.5 h-2.5 text-white" />
                  : <Package className="w-2.5 h-2.5 text-white" />
            }
          </div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: accent }}>
            {isCharacter
              ? `Subject ${index + 1}`
              : isSetting
                ? `Background ${index + 1}`
                : isLogo
                  ? `Logo ${index + 1}`
                  : `Product ${index + 1}`
            }
          </span>
        </div>
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => onRemove(index)}
          aria-label={`Remove ${isCharacter ? 'subject' : isSetting ? 'background' : isLogo ? 'logo' : 'product'} ${index + 1}`}
          className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
          style={{ background: `rgba(${accentRgb},0.07)`, color: accent }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.12)'; e.currentTarget.style.color = '#dc2626'; }}
          onMouseLeave={e => { e.currentTarget.style.background = `rgba(${accentRgb},0.07)`; e.currentTarget.style.color = accent; }}
        >
          <X className="w-3 h-3" strokeWidth={2.5} />
        </motion.button>
      </div>

      <div className="p-4 space-y-3">

        {/* Type selector */}
        <div>
          <select
            value={item.type}
            onChange={(e) => {
              const newType = e.target.value;
              const updates = { ...item, type: newType };
              if (newType === 'logo') updates.useUpload = true;
              onChange(index, updates);
            }}
            className="w-full rounded-xl px-3 py-2 text-xs font-bold focus:outline-none cursor-pointer"
            style={{ background: '#FBFAF8', border: `1.5px solid rgba(${accentRgb},0.12)`, color: '#1C1917' }}
          >
            {REF_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

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
              placeholder={isCharacter ? 'Name (e.g. "Red Leather Jacket")' : isSetting ? 'Name (e.g. "City Rooftop at Dusk")' : isLogo ? 'Name (e.g. "Brand Mark")' : 'Name (e.g. "Running Shoe")'}
            className="w-full bg-transparent px-3 py-2.5 text-xs font-bold text-stone-800 placeholder-stone-400 focus:outline-none rounded-xl"
          />
        </div>
        {isDuplicateName && (
          <p className="text-[11px] font-semibold -mt-1.5 flex items-center gap-1" style={{ color: '#dc2626' }}>
            <X className="w-3 h-3" strokeWidth={3} />
            This name is already used. Give each reference a unique name so @mentions map correctly.
          </p>
        )}

        {/* Description field - only for AI-generate refs. Uploaded references
            (and logos, which are upload-only) carry their identity in the image
            itself, so no description is needed. */}
        {!item.useUpload && (
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
              placeholder={
              isCharacter
                ? 'Describe exactly how this looks across all scenes...'
                : isSetting
                  ? 'Describe the lighting, mood, and visual feel of this space...'
                  : 'Describe the product details, materials, and visual styling...'
            }
            rows={2}
            className="w-full bg-transparent px-3 py-2.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-none resize-none rounded-xl"
          />
        </div>
        )}

        {/* Source toggle */}
        {isLogo ? (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(59,130,246,0.06)', border: '1.5px solid rgba(59,130,246,0.12)' }}
          >
            <span className="text-[11px] font-bold" style={{ color: '#3b82f6' }}>
              Upload only: logos are preserved exactly
            </span>
          </div>
        ) : (
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
        )}

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
                  <input type="file" accept={ACCEPTED_IMAGE_ACCEPT} onChange={handleFileChange} className="hidden" />
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

        {/* Incomplete-reference hint: tells the user exactly what's missing on
            this card so the disabled "Create" button never feels mysterious. */}
        {incompleteHint && (
          <div
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.22)' }}
          >
            <AlertCircle className="w-3 h-3 flex-shrink-0" strokeWidth={2.5} style={{ color: '#B45309' }} />
            <span className="text-[11px] font-semibold" style={{ color: '#B45309' }}>
              {incompleteHint}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Sortable photo tile - dnd-kit so reordering works with mouse AND touch
// (long-press to start dragging on touch, so page scrolling still works).
function SortableTile({ id, className, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 20 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} className={className} {...attributes} {...listeners}>
      {children}
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
  extendPhotos = true,
  setExtendPhotos,
  targetDuration,
  setTargetDuration,
  aspectRatio,
  setAspectRatio,
  pipelineMode,
  onModeChange,
  onBackToChooser,
  references = [],
  onReferencesChange,
  onLabelsChange,
  voiceId,
  setVoiceId,
  backgroundMusic,
  setBackgroundMusic,
  error,
}) {
  const isReferencesMode = pipelineMode === 'references';
  // Prompt-only (text-to-video) mode: reuses the image pipeline but hides the
  // photo upload, advanced settings, and image-count duration advisory.
  const isPromptOnly = pipelineMode === 'prompt';
  // On touch, dnd-kit's TouchSensor needs a ~200ms press before a drag starts
  // (so page scrolling still works), so the hint must tell users to hold first.
  const isMobile = useIsMobile();
  const [showInspiration, setShowInspiration] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [editingLabel, setEditingLabel] = useState(null);
  const [customLabels, setCustomLabels] = useState({});
  const fileInputRef = useRef(null);
  const openingFileRef = useRef(null);
  const closingFileRef = useRef(null);
  const [frameConfigExpanded, setFrameConfigExpanded] = useState(false);
  const [openingEnabled, setOpeningEnabled] = useState(false);
  const [closingEnabled, setClosingEnabled] = useState(false);
  const [showPromptGuide, setShowPromptGuide] = useState(false);
  const [showImageOrderGuide, setShowImageOrderGuide] = useState(false);
  const [showDictionary, setShowDictionary] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('shot');
  const [template, setTemplate] = useState('general');
  const [targetSlot, setTargetSlot] = useState(null);
  const [dragSlot, setDragSlot] = useState(null);
  // Latest duration-vs-image-count status reported by <DurationEstimate>.
  // `null` = pending/unknown (CTA stays blocked until an estimate resolves).
  const [durationStatus, setDurationStatus] = useState(null);
  // Affordability reported by <DurationEstimate>. Defaults true so the CTA isn't
  // blocked before an estimate resolves; flips false only when cost > balance.
  const [affordable, setAffordable] = useState(true);
  const {
    credits,
    updateAutoApprove,
    autoApproveIntroSeen,
    markAutoApproveIntroSeen,
    settingsReady,
  } = useAuth();
  // One-time "approve everything automatically" modal, gating the very first
  // generation (see handleStart / handleAutoApproveConfirm below).
  const [showAutoApproveModal, setShowAutoApproveModal] = useState(false);
  const navigate = useNavigate();
  const handleTopUp = () => {
    saveReturnTo(window.location.pathname + window.location.search);
    navigate("/buy-credits");
  };
  const atCap = (images?.length ?? 0) >= MAX_IMAGES;
  const slotLabels = SLOT_LABELS[template] ?? SLOT_LABELS.general;

  // Photos whose shape doesn't match the video's frame. Mirrors the backend's
  // 8% tolerance (video.service uploadImages), which is the authoritative check;
  // this one only drives the warning and the toggle below the grid. Dimensions
  // are measured as each photo is added, so a photo is "on ratio" until it lands.
  const offRatioCount = useMemo(() => {
    const [w, h] = String(aspectRatio || '16:9').split(':').map(Number);
    if (!w || !h) return 0;
    const target = w / h;
    return (images ?? []).filter((img) => {
      if (!img.width || !img.height) return false;
      return Math.abs(img.width / img.height - target) / target > 0.08;
    }).length;
  }, [images, aspectRatio]);
  const ctaRef = useRef(null);
  const prevImagesLengthRef = useRef(images?.length ?? 0);

  // dnd-kit: photo reordering that works with mouse AND touch.
  const imageId = (img, i) => img?.preview || img?.name || `img-${i}`;
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );
  const handleImageDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = images.findIndex((img, i) => imageId(img, i) === active.id);
    const newIndex = images.findIndex((img, i) => imageId(img, i) === over.id);
    if (oldIndex !== -1 && newIndex !== -1) reorderImages(oldIndex, newIndex);
  };

  const chipStyle = (active) => active
    ? { background: 'linear-gradient(135deg, #C1440E, #E8603C)', color: '#fff', border: '1.5px solid transparent', boxShadow: '0 2px 6px rgba(193,68,14,0.25)' }
    : { background: '#fff', color: '#6B5E7B', border: '1.5px solid rgba(193,68,14,0.12)' };

  // Infer a sensible aspect-ratio default once, based on viewport, image mode only.
  useEffect(() => {
    if (!isReferencesMode && !aspectRatio && setAspectRatio) {
      setAspectRatio(window.innerWidth < 768 ? '9:16' : '16:9');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll the CTA into view the moment the user finishes the 0 → 1 image upload transition.
  useEffect(() => {
    const currentLength = images?.length ?? 0;
    if (prevImagesLengthRef.current === 0 && currentLength > 0) {
      ctaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    prevImagesLengthRef.current = currentLength;
  }, [images?.length]);

  // First-run onboarding for this creation screen. Both the intro video and the
  // tour auto-run once per mode (persisted) and only for a fresh creation: the
  // parent passes `onModeChange` only when there's no session yet, so resuming a
  // draft triggers neither. Switching modes remounts this component (Creator
  // swaps the two pipeline creators), so each mode shows its own video and tour
  // on first entry. The help FAB replays the tour via promptTour.replay.
  //
  // pipelineMode is already exactly 'prompt' | 'image' | 'references', which are
  // three of the five intro video keys, so this one mount covers all three.
  const intro = useIntroVideo(pipelineMode, { enabled: !!onModeChange });

  const promptTour = useStepTour(
    isReferencesMode ? TOUR_KEYS.promptReferences : TOUR_KEYS.promptImage,
    isReferencesMode ? startReferencesTour : startImageTour,
    { enabled: !!onModeChange && intro.tourEnabled }
  );

  const handleFrameFileChange = (e, frameType) => {
    const file = validateImageFile(e.target.files?.[0]);
    if (file) {
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
    const files = filterValidImages(e.target.files);
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

  // Remove the last N images (the duration advisory's "Remove N images" action).
  // Delete from the highest index down so the remaining indices stay valid.
  const handleRemoveImages = (count) => {
    const total = images?.length ?? 0;
    const n = Math.min(count ?? 0, total);
    for (let i = 0; i < n; i++) {
      removeImage(total - 1 - i);
    }
  };

  const appendTerm = (term) => {
    const current = userPrompt?.trim() || '';
    setUserPrompt(current ? `${current}, ${term}` : term);
  };

  const handleStart = () => {
    console.log("[PromptStep] Start button clicked");
    // First video ever: offer the one-time "approve everything" modal before we
    // kick off generation. Only gate once settings have loaded, so returning
    // users who've already dismissed it are never nagged on a slow load.
    if (settingsReady && !autoApproveIntroSeen) {
      setShowAutoApproveModal(true);
      return;
    }
    onStart();
  };

  // The user answered the one-time modal. `enableAll` turns on every auto-approve
  // toggle (including the credit-spending final generate). Either way we record
  // that they've seen it, then proceed into generation. We persist the toggles
  // BEFORE onStart() because the backend snapshots them when the session starts.
  const handleAutoApproveConfirm = async (enableAll) => {
    setShowAutoApproveModal(false);
    markAutoApproveIntroSeen();
    if (enableAll) {
      await updateAutoApprove({
        references: true,
        script: true,
        bridges: true,
        frames: true,
        generate: true,
      });
    }
    onStart();
  };

  // Image pipeline: keep the CTA disabled until the duration estimate confirms the
  // image count fits. `null` (pending) and `too_many_images` block; a resolved-safe
  // status, or an estimate error (fail open), allows it.
  const durationOk =
    durationStatus === 'exact_fit' ||
    durationStatus === 'needs_ai_fill' ||
    durationStatus === 'no_target' ||
    durationStatus === 'error';

  // AI bridge clips only make sense when there aren't enough images to fill the
  // chosen length. Once the images meet or exceed the budget, lock the toggle off
  // so the user can't add AI filler clips they don't need.
  const hasEnoughImages =
    durationStatus === 'exact_fit' || durationStatus === 'too_many_images';
  useEffect(() => {
    if (hasEnoughImages && enableBridges) setEnableBridges?.(false);
  }, [hasEnoughImages, enableBridges, setEnableBridges]);

  // References mode has no images, so <DurationEstimate> (image-count driven)
  // never renders. Compute affordability directly so we can show an in-place
  // credit message and gate the CTA, instead of bouncing to the pricing page.
  const refRequiredCredits = creditsForDuration(targetDuration);
  const refAffordable =
    credits == null || refRequiredCredits <= 0 || credits >= refRequiredCredits;

  const canStart = isReferencesMode
    ? userPrompt?.trim() && style && references.some(r => r.name?.trim() && (r.useUpload ? !!r.referenceFile : r.description?.trim())) && refAffordable
    : isPromptOnly
    ? userPrompt?.trim() && style && refAffordable
    : userPrompt?.trim() && images?.length > 0 && durationOk && affordable;

  // The concrete list of what still blocks the CTA, so the disabled button's
  // reason is explicit instead of a vague hint. Credit and duration problems are
  // deliberately left to the dedicated advisory cards (the references
  // affordability card and <DurationEstimate>), which carry their own fix
  // actions, so we never double-report them here.
  const blockers = [];
  if (isReferencesMode) {
    if (!userPrompt?.trim()) blockers.push('Describe your video in the prompt box above');
    if (!style) blockers.push('Choose a style');
    const completeRefs = references.filter(
      (r) => r.name?.trim() && (r.useUpload ? !!r.referenceFile : r.description?.trim())
    );
    if (references.length === 0) {
      blockers.push('Add at least one reference (character, setting, logo, or product)');
    } else if (completeRefs.length === 0) {
      blockers.push('Finish a reference: each needs a name plus an image or description');
    }
  } else if (isPromptOnly) {
    if (!userPrompt?.trim()) blockers.push('Describe your video in the prompt box above');
    if (!style) blockers.push('Choose a style');
  } else {
    if (!userPrompt?.trim()) blockers.push('Describe your video in the prompt box above');
    if (!(images?.length > 0)) blockers.push('Upload at least one photo');
  }

  const wordCount = userPrompt?.trim() ? userPrompt.trim().split(/\s+/).filter(Boolean).length : 0;

  // Image mode: uploaded photos are the @mention targets. Each carries its slot
  // label (custom rename, else the template default) so the user can reference a
  // scene by name in the prompt, with a thumbnail in the dropdown.
  // Prompt-only has no photos, so it must never produce mention targets: a stray
  // image would otherwise surface as a phantom "@Opening shot" scene in a mode
  // that cannot show, reorder, or upload one.
  const imageMentionItems = useMemo(
    () => (isPromptOnly ? [] : (images || []).map((img, i) => ({
      id: `img-${i}`,
      name: customLabels[i] || slotLabels[i] || `Scene ${i + 1}`,
      type: 'image',
      preview: img?.preview,
    }))),
    [isPromptOnly, images, customLabels, slotLabels]
  );

  // Lift the effective per-image labels (aligned to `images`) up to the pipeline
  // hook so they can be sent to the backend at upload - that's what lets a
  // "@Opening shot" mention bind to the right photo during generation.
  useEffect(() => {
    onLabelsChange?.(imageMentionItems.map((it) => it.name));
  }, [imageMentionItems, onLabelsChange]);

  // The things the user can @mention: named references (references mode) or the
  // uploaded scenes (image mode). Drives both the dropdown source and the
  // strength "coverage" factor.
  const mentionTargets = isReferencesMode ? references : imageMentionItems;

  // Prompt strength - a transparent checklist that doubles as guidance.
  // Pure/synchronous; recomputed as the prompt, references, or scenes change.
  const strength = useMemo(
    () => scorePrompt({ userPrompt, references: mentionTargets, mode: isReferencesMode ? 'references' : 'image' }),
    [userPrompt, mentionTargets, isReferencesMode]
  );
  const [showStrengthDetail, setShowStrengthDetail] = useState(true);

  // Voice recommendation. Two sources, weakest first: the caller's region (from
  // their IP, available as soon as the voice list loads) and then the video's
  // content (from the Improve pass, which wins because it knows the actual story).
  // Either way it is only ever a suggestion: the moment the user picks a voice by
  // hand, voiceUserSetRef latches and nothing may overwrite their choice again.
  const [voiceRecommendation, setVoiceRecommendation] = useState(null);
  const voiceUserSetRef = useRef(false);

  // Read during render, not in the effect: useSession's auto-save effect writes
  // lastVoiceId on mount, so by the time any effect runs there is always a saved
  // value and this check would never be true.
  const [hadSavedVoice] = useState(() => getJsonPref(PREF_KEYS.lastVoiceId, null) !== null);

  const handleVoiceChange = (key) => {
    voiceUserSetRef.current = true;
    setVoiceId?.(key);
  };

  useEffect(() => {
    // Only seed a region default for someone who has never picked a voice. A
    // returning user's saved choice is theirs and outranks their geography.
    if (hadSavedVoice || !setVoiceId) return;
    let cancelled = false;
    getRegionDefault().then((region) => {
      if (cancelled || !region?.voiceKey || voiceUserSetRef.current) return;
      setVoiceId(region.voiceKey);
      setVoiceRecommendation({
        voiceKey: region.voiceKey,
        accent: region.accent,
        useCase: null,
        reason: region.accent ? `${region.accent} accent, for your region` : null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [hadSavedVoice, setVoiceId]);

  // "Improve prompt" AI action. Stashes the previous value so the change is undoable.
  const [improving, setImproving] = useState(false);
  const [prevPrompt, setPrevPrompt] = useState(null);
  const handleImprove = async () => {
    if (!userPrompt?.trim() || improving) return;
    setImproving(true);
    const prev = userPrompt;
    try {
      // Image mode: let the AI actually see the uploaded photos (downscaled) so
      // it can ground the prompt in what they show. Failures fall back to text.
      let imageDataUrls = [];
      if (!isReferencesMode && !isPromptOnly && images?.length) {
        const shots = await Promise.all(
          images.slice(0, IMPROVE_VISION_MAX_IMAGES).map((im) => downscaleImageToDataUrl(im?.preview || im?.file))
        );
        imageDataUrls = shots.filter(Boolean);
      }
      const result = await improvePromptApi({
        userPrompt,
        references: mentionTargets.map(({ id, name, type, description }) => ({ id, name, type, description })),
        style,
        mode: isReferencesMode ? 'references' : isPromptOnly ? 'prompt' : 'image',
        imageDataUrls,
      });
      if (result?.improvedPrompt) {
        setPrevPrompt(prev);
        setUserPrompt(result.improvedPrompt);
      }
      // The content-based recommendation beats the region one, but never beats the
      // user. If the model returned no recommendation (it degrades to plain text on
      // a parse failure), leave whatever we already had in place.
      if (result?.recommendedVoiceKey && !voiceUserSetRef.current) {
        setVoiceId?.(result.recommendedVoiceKey);
        setVoiceRecommendation({
          voiceKey: result.recommendedVoiceKey,
          accent: result.recommendedAccent,
          useCase: result.recommendedUseCase,
          reason: result.recommendedReason,
        });
      }
    } catch (err) {
      console.error("[PromptStep] improve prompt failed", err);
    } finally {
      setImproving(false);
    }
  };
  const handleUndoImprove = () => {
    if (prevPrompt != null) {
      setUserPrompt(prevPrompt);
      setPrevPrompt(null);
    }
  };

  // Red → yellow → green as the prompt gets stronger.
  const strengthBarColor =
    strength.band === "strong"
      ? "#22A06B" // green
      : strength.band === "ok"
      ? "#F0B429" // yellow
      : "#E5484D"; // red

  return (
    <div
      className="w-full h-full overflow-y-auto relative"
      style={{ background: '#F5F0EB' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,750&display=swap');
        .display { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 750; }
      `}</style>

      {/* Help FAB: offers the current mode's video and tour on demand. */}
      <HelpFab onStartTour={promptTour.replay} onPlayVideo={intro.replay} />

      {/* One-time first-video modal: offers to auto-approve every step. */}
      {showAutoApproveModal && (
        <AutoApproveIntroModal onConfirm={handleAutoApproveConfirm} busy={loading} />
      )}

      <IntroVideoModal
        open={intro.open}
        src={intro.src}
        title={intro.title}
        onClose={intro.close}
        onDismissWithoutSeen={intro.dismissWithoutSeen}
      />

      {/* Change mode: return to the 3-card chooser (fresh session only). Anchored
          to the top-left of the creator canvas (this root is position:relative),
          NOT the viewport, so it sits below the app header instead of behind it.
          The old inline mode pill was replaced by the chooser page. */}
      {onBackToChooser && (
        <button
          type="button"
          onClick={onBackToChooser}
          aria-label="Back to mode selection"
          className="absolute top-4 left-4 z-40 w-10 h-10 rounded-full inline-flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(45,34,53,0.10)', color: '#7A6A62', boxShadow: '0 2px 10px rgba(45,34,53,0.08)', transition: 'color 0.18s ease, background 0.18s ease' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#C1440E'; e.currentTarget.style.background = 'rgba(255,255,255,0.95)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#7A6A62'; e.currentTarget.style.background = 'rgba(255,255,255,0.8)'; }}
        >
          <ArrowLeft style={{ width: 18, height: 18 }} />
        </button>
      )}

      <div className="min-h-full flex flex-col items-center justify-start px-2 sm:px-4 py-6 sm:py-12 md:py-16 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-4xl space-y-3 sm:space-y-5"
        >
        {/* Hero headline */}
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

          <h1 className="display" style={{ fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#1C1917', letterSpacing: '-0.01em', lineHeight: 1.05 }}>
            {isReferencesMode ? (
              <>Studio Blueprint <span style={{ color: '#C1440E' }}>Builder.</span></>
            ) : (
              <>Your story. Your <span style={{ color: '#C1440E' }}>video.</span></>
            )}
          </h1>
          <p className="hidden sm:block mt-2 text-sm font-medium" style={{ color: '#9C8F85' }}>
            {isReferencesMode
              ? 'Define your visual props and settings, then reveal the full storyline.'
              : 'Tell Raphio what you want. It handles everything else.'}
          </p>
        </div>

          {/* Zone 1 - Prompt (the hero) */}
          <div data-tour="prompt" className="rounded-3xl p-4 sm:p-7 space-y-4" style={CARD_SHADOW}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="font-black" style={{ fontSize: 'clamp(1.15rem, 2.4vw, 1.4rem)', color: '#1C1917', letterSpacing: '-0.01em' }}>
                  {isReferencesMode ? "What's your video about?" : "What's your video about?"}
                </h2>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => { setShowInspiration(s => !s); if (showDictionary) setShowDictionary(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all"
                  style={showInspiration
                    ? { background: 'linear-gradient(135deg, #C1440E, #E8603C)', color: '#fff', border: '1.5px solid transparent', boxShadow: '0 2px 8px rgba(193,68,14,0.28)' }
                    : { background: 'transparent', color: '#C1440E', border: '1.5px solid rgba(193,68,14,0.20)' }
                  }
                >
                  <Sparkles className="w-3 h-3" />
                  <span className="hidden sm:inline">Inspiration</span>
                </button>
                <button
                  onClick={() => { setShowDictionary(s => !s); if (showInspiration) setShowInspiration(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all"
                  style={showDictionary
                    ? { background: 'linear-gradient(135deg, #C1440E, #E8603C)', color: '#fff', border: '1.5px solid transparent', boxShadow: '0 2px 8px rgba(193,68,14,0.28)' }
                    : { background: 'transparent', color: '#C1440E', border: '1.5px solid rgba(193,68,14,0.20)' }
                  }
                >
                  <BookOpen className="w-3 h-3" />
                  <span className="hidden sm:inline">Dictionary</span>
                </button>
                <button
                  onClick={() => setShowPromptGuide(true)}
                  className="flex items-center gap-1 text-[11px] font-bold transition-colors"
                  style={{ color: '#9C8F85' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#C1440E'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#9C8F85'; }}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tips</span>
                </button>
              </div>
            </div>

            {/* Textarea: the hero of this card */}
            <div
              className="relative rounded-2xl"
              style={{ background: '#FBFAF8', border: '1.5px solid rgba(193,68,14,0.10)', transition: 'box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
              onFocusCapture={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.35)'; e.currentTarget.style.boxShadow = '0 0 0 1px rgba(193,68,14,0.15), 0 4px 20px rgba(193,68,14,0.08), 0 0 0 4px rgba(193,68,14,0.06)'; }}
              onBlurCapture={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.10)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              {isReferencesMode ? (
                <PromptMentionField
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  references={references}
                  placeholder="e.g. @Sarah discovers @Acme in her workshop, warm and hopeful. Type @ to add a reference."
                  className="w-full min-h-[140px] rounded-2xl resize-none text-sm p-4 leading-relaxed border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[#B09A8A]"
                  style={{ color: '#1C1917', paddingBottom: '48px', outline: 'none' }}
                />
              ) : (
                <PromptMentionField
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  references={imageMentionItems}
                  title="Your scenes"
                  placeholder={isPromptOnly
                    ? "e.g. A cinematic reveal of a handcrafted watch in a sunlit workshop, warm and hopeful."
                    : "e.g. A warm birthday montage from our photos. Type @ to add a scene."}
                  className="w-full min-h-[140px] rounded-2xl resize-none text-sm p-4 leading-relaxed border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[#B09A8A]"
                  style={{ color: '#1C1917', paddingBottom: '48px', outline: 'none' }}
                />
              )}
              {/* Improve button - anchored bottom-left INSIDE the box so it's
                  clearly tied to the prompt. Always shows its label (mobile too)
                  so it's never a mystery icon. */}
              <button
                onClick={handleImprove}
                disabled={!userPrompt?.trim() || improving}
                className="absolute flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all"
                style={{
                  bottom: 7, left: 10, zIndex: 5,
                  ...((!userPrompt?.trim() || improving)
                    ? { background: 'rgba(193,68,14,0.10)', color: '#B09A8A', cursor: 'not-allowed' }
                    : { background: 'linear-gradient(135deg, #C1440E, #E8603C)', color: '#fff', boxShadow: '0 2px 8px rgba(193,68,14,0.28)' }),
                }}
              >
                {improving
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Wand2 className="w-3 h-3" />}
                <span>{improving ? 'Improving…' : 'Improve'}</span>
              </button>
              <span style={{ position:'absolute', bottom:8, right:12, fontSize:11, fontWeight:600, color:'rgba(193,68,14,0.5)', pointerEvents:'none', userSelect:'none' }}>
                {wordCount} words
              </span>
            </div>

            {/* Inspiration Panel */}
            <AnimatePresence>
              {showInspiration && (
                <motion.div
                  key="inspiration-panel"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring', stiffness: 340, damping: 30, mass: 0.8 }}
                  className="overflow-hidden"
                >
                  <div
                    className="rounded-2xl p-4 space-y-3"
                    style={{ background: '#F5EFE6', border: '1px solid rgba(193,68,14,0.10)' }}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#9C8F85' }}>
                        Tap an idea: see the result, use the prompt
                      </p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {INSPIRATION_ITEMS.map((item) => (
                        <motion.button
                          key={item.label}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => { setUserPrompt(item.prompt); setShowInspiration(false); }}
                          className="group relative aspect-video rounded-xl overflow-hidden text-left bg-neutral-900"
                          style={{ boxShadow: '0 2px 10px rgba(193,68,14,0.10), 0 0 0 1px rgba(193,68,14,0.08)' }}
                        >
                          <video
                            // #t=0.1 forces the browser to paint the first frame as a
                            // still (iOS won't render anything from preload=metadata
                            // alone, leaving the tile blank).
                            src={`${item.poster}#t=0.1`}
                            muted
                            loop
                            playsInline
                            preload="metadata"
                            onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                            onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div
                            className="absolute inset-0 flex flex-col justify-end p-2"
                            style={{ background: 'linear-gradient(to top, rgba(28,25,23,0.78) 0%, rgba(28,25,23,0.20) 50%, transparent 100%)' }}
                          >
                            <span className="text-[10px] font-bold text-white leading-tight">
                              {item.label}
                            </span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dictionary Panel: your existing block, unchanged */}
            <AnimatePresence>
              {showDictionary && (
                <motion.div
                  key="dict-panel"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring', stiffness: 340, damping: 30, mass: 0.8 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-2xl p-4 space-y-3" style={{ background: '#F5EFE6', border: '1px solid rgba(193,68,14,0.10)' }}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {PROMPT_DICTIONARY.map(({ id, label, Icon }) => (
                        <motion.button
                          key={id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setActiveCategory(id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer"
                          style={activeCategory === id
                            ? { background: 'linear-gradient(135deg, #C1440E, #E8603C)', color: '#fff', boxShadow: '0 2px 8px rgba(193,68,14,0.30)', border: '1px solid transparent' }
                            : { background: 'rgba(255,255,255,0.7)', color: '#6B5E7B', border: '1px solid rgba(193,68,14,0.14)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }
                          }
                        >
                          <Icon style={{ width: 11, height: 11 }} />
                          {label}
                        </motion.button>
                      ))}
                    </div>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeCategory}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.14, ease: 'easeOut' }}
                        className="flex flex-wrap gap-1.5"
                      >
                        {PROMPT_DICTIONARY.find(c => c.id === activeCategory)?.terms.map(term => (
                          <motion.button
                            key={term}
                            whileTap={{ scale: 0.94 }}
                            onClick={() => appendTerm(term)}
                            className="px-3 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer"
                            style={{ background: '#fff', color: '#6B5E7B', border: '1.5px solid rgba(193,68,14,0.14)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'background 0.15s ease, border-color 0.15s ease, color 0.15s ease' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(193,68,14,0.07)'; e.currentTarget.style.borderColor = 'rgba(193,68,14,0.38)'; e.currentTarget.style.color = '#C1440E'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'rgba(193,68,14,0.14)'; e.currentTarget.style.color = '#6B5E7B'; }}
                          >
                            {term}
                          </motion.button>
                        ))}
                      </motion.div>
                    </AnimatePresence>
                    <p style={{ fontSize: 10, color: '#9B8FA8', fontWeight: 500 }}>
                      Click any term to append it to your prompt
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {(
              <div className="space-y-2">
                {/* Undo banner after an AI improve */}
                <AnimatePresence>
                  {prevPrompt != null && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex items-center justify-between gap-2 rounded-xl px-3 py-2"
                      style={{ background: 'rgba(193,68,14,0.06)', border: '1px solid rgba(193,68,14,0.14)' }}
                    >
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: '#C1440E' }}>
                        <Sparkles style={{ width: 12, height: 12 }} /> Prompt improved with AI
                      </span>
                      <button
                        onClick={handleUndoImprove}
                        className="flex items-center gap-1 text-[11px] font-bold"
                        style={{ color: '#9C8F85' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#C1440E'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#9C8F85'; }}
                      >
                        <RotateCcw style={{ width: 12, height: 12 }} /> Undo
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Strength bar + expandable checklist */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-bold" style={{ color: strengthBarColor }}>
                    Prompt strength: {strength.label}
                  </span>
                  <button
                    onClick={() => setShowStrengthDetail(s => !s)}
                    className="flex items-center gap-1 text-[11px] font-bold"
                    style={{ color: '#C1440E' }}
                  >
                    {showStrengthDetail ? 'Hide' : "What's missing?"}
                    {showStrengthDetail ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
                <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(193,68,14,0.10)' }}>
                  <div className="h-full rounded-full" style={{ width: `${strength.score}%`, background: strengthBarColor, transition: 'width 0.3s ease' }} />
                </div>
                <AnimatePresence>
                  {showStrengthDetail && (
                    <motion.ul
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden space-y-1.5 pt-1"
                    >
                      {strength.factors.map((f) => (
                        <li key={f.id} className="flex items-start gap-2">
                          <span
                            className="mt-0.5 flex items-center justify-center rounded-full flex-shrink-0"
                            style={{
                              width: 15, height: 15,
                              background: f.met ? 'linear-gradient(135deg, #C1440E, #E8603C)' : 'transparent',
                              border: f.met ? 'none' : '1.5px solid rgba(193,68,14,0.30)',
                            }}
                          >
                            {f.met && <Check className="w-2.5 h-2.5" style={{ color: '#fff' }} strokeWidth={3.5} />}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="text-[11px] font-bold" style={{ color: f.met ? '#1C1917' : '#6B5E7B' }}>
                              {f.label}
                              {f.detail && <span className="font-medium" style={{ color: '#9C8F85' }}> · {f.detail}</span>}
                            </span>
                            {!f.met && (
                              <span className="block text-[10.5px] leading-snug" style={{ color: '#9C8F85' }}>{f.hint}</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* References Mode: unified References Section (untouched; redesigned in a separate task) */}
          {isReferencesMode && (
            <div data-tour="references" className="bg-white rounded-3xl p-6 border border-stone-200/60 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-stone-500">
                    References
                  </label>
                  <div className="group relative">
                    <HelpCircle className="w-4 h-4 text-stone-400 cursor-help" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 max-w-[calc(100vw-2rem)] p-3 rounded-xl bg-stone-900 text-white text-[11px] leading-relaxed opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none shadow-xl">
                      Add characters, settings, logos, or products. Each reference gets a type tag that controls how it's used in video generation. Logos are preserved exactly, so no AI restyling.
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
                    className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full text-white transition-all"
                    style={{ background: 'linear-gradient(135deg, #C1440E, #E8603C)', boxShadow: '0 2px 8px rgba(193,68,14,0.30)' }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(193,68,14,0.42)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(193,68,14,0.30)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Reference ({references.length}/8)
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {references.map((ref, idx) => (
                  <ReferenceInput
                    key={idx}
                    item={ref}
                    index={idx}
                    type={ref.type}
                    isDuplicateName={
                      !!ref.name?.trim() &&
                      references.some((other, j) => j !== idx && other.name?.trim().toLowerCase() === ref.name.trim().toLowerCase())
                    }
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
                <div
                  className="flex flex-col items-center justify-center py-8 rounded-2xl border-2 border-dashed text-center"
                  style={{ borderColor: 'rgba(193,68,14,0.15)', background: 'rgba(193,68,14,0.015)' }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: 'rgba(193,68,14,0.06)' }}
                  >
                    <Users className="w-5 h-5" style={{ color: '#C1440E', opacity: 0.5 }} />
                  </div>
                  <p className="text-xs font-bold mb-1" style={{ color: '#6B5E7B' }}>No references added yet</p>
                  <p className="text-[11px]" style={{ color: '#9B8FA8' }}>Add a character, setting, logo, or product to get started</p>
                </div>
              )}
            </div>
          )}

          {/* Zone 2: Upload your photos (image mode only, hidden in prompt-only) */}
          {!isReferencesMode && !isPromptOnly && (
            <div
              data-tour="upload"
              className="rounded-3xl p-4 sm:p-7 space-y-4 relative"
              style={CARD_SHADOW}
              onDragEnter={(e) => {
                e.preventDefault();
                if (e.dataTransfer?.types?.includes('Files')) setIsDraggingFile(true);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget)) return;
                setIsDraggingFile(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingFile(false);
                const files = filterValidImages(e.dataTransfer.files);
                if (files.length > 0) addImages(files);
              }}
            >
              {/* Header with inline count + reorder hint */}
              <div className="flex items-baseline justify-between gap-3">
                <h2
                  className="font-black"
                  style={{
                    fontSize: 'clamp(1.15rem, 2.4vw, 1.4rem)',
                    color: '#1C1917',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Upload your photos
                </h2>
                {(images?.length ?? 0) > 0 && (
                  <span className="text-xs font-medium" style={{ color: '#9C8F85' }}>
                    {images.length} of {MAX_IMAGES}
                    {/* Desktop: subtle inline hint (mouse drag starts instantly).
                        Mobile needs the press-and-hold hint, shown on its own line below. */}
                    {images.length >= 2 && !isMobile && (
                      <span className="ml-2" style={{ color: '#C8BFB5' }}>
                        · drag to reorder
                      </span>
                    )}
                  </span>
                )}
              </div>

              {/* Mobile reorder hint - the TouchSensor requires a press-and-hold
                  before dragging, which isn't discoverable, so spell it out. */}
              {isMobile && (images?.length ?? 0) >= 2 && (
                <div
                  className="flex items-center gap-1.5 text-xs font-semibold rounded-lg px-2.5 py-1.5"
                  style={{ color: '#C1440E', background: 'rgba(193,68,14,0.07)' }}
                >
                  <Grid className="w-3.5 h-3.5 shrink-0" />
                  Press &amp; hold a photo, then drag to reorder
                </div>
              )}

              {/* Hidden file input */}
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
                {/* Empty state dropzone */}
                {(images?.length ?? 0) === 0 && (
                  <motion.div
                    key="dropzone"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 py-14 px-6"
                    style={{
                      borderColor: 'rgba(193,68,14,0.12)',
                      background: '#FBFAF8',
                      transition: 'background 0.2s ease, border-color 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#FFF9F5';
                      e.currentTarget.style.borderColor = 'rgba(193,68,14,0.28)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#FBFAF8';
                      e.currentTarget.style.borderColor = 'rgba(193,68,14,0.12)';
                    }}
                  >
                    <motion.div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #C1440E, #E8603C)',
                        boxShadow: '0 6px 18px rgba(193,68,14,0.30)',
                      }}
                      whileHover={{
                        y: -4,
                        scale: 1.08,
                        boxShadow: '0 10px 26px rgba(193,68,14,0.40)',
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                      <Upload className="w-7 h-7 text-white" />
                    </motion.div>
                    <div className="text-center space-y-1">
                      <p className="font-bold text-sm" style={{ color: '#1C1917' }}>
                        Drag your photos here
                      </p>
                      <p className="text-xs" style={{ color: '#9C8F85' }}>
                        or click to browse · JPEG or PNG · up to {MAX_IMAGES} photos
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Populated grid */}
                {(images?.length ?? 0) > 0 && (
                  <motion.div
                    key="grid"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleImageDragEnd}>
                    <SortableContext items={images.map(imageId)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {images.map((img, index) => (
                        <SortableTile
                          key={imageId(img, index)}
                          id={imageId(img, index)}
                          className="cursor-grab active:cursor-grabbing"
                        >
                          <div
                            className="relative aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-orange-300 transition-all duration-150"
                            style={{ background: '#FBFAF8' }}
                          >
                            <img
                              src={img.preview}
                              alt={customLabels[index] || slotLabels[index]}
                              className="w-full h-full object-cover pointer-events-none"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeImage(index);
                              }}
                              aria-label="Remove image"
                              className="absolute top-1.5 right-1.5 w-6 h-6 text-white rounded-full transition-all flex items-center justify-center shadow-md z-10"
                              style={{ background: '#C1440E' }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background = '#A8380C')
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background = '#C1440E')
                              }
                            >
                              <X className="w-3 h-3" strokeWidth={2.5} />
                            </button>
                          </div>

                          {/* Editable label */}
                          {editingLabel === index ? (
                            <input
                              type="text"
                              autoFocus
                              value={customLabels[index] ?? slotLabels[index]}
                              onChange={(e) =>
                                setCustomLabels((c) => ({ ...c, [index]: e.target.value }))
                              }
                              onBlur={() => setEditingLabel(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === 'Escape')
                                  setEditingLabel(null);
                              }}
                              className="w-full text-[10px] font-bold text-center mt-1.5 bg-transparent border-b focus:outline-none"
                              style={{
                                color: '#C1440E',
                                borderColor: 'rgba(193,68,14,0.4)',
                              }}
                            />
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingLabel(index);
                              }}
                              className="w-full text-[10px] font-bold text-center mt-1.5 truncate cursor-text transition-colors"
                              style={{
                                color: customLabels[index] ? '#C1440E' : '#6B5A52',
                              }}
                              title="Click to rename"
                            >
                              {customLabels[index] || slotLabels[index]}
                            </button>
                          )}
                        </SortableTile>
                      ))}

                      {/* Add more tile */}
                      {!atCap && (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all"
                          style={{
                            background: '#FBFAF8',
                            borderColor: 'rgba(193,68,14,0.15)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(193,68,14,0.35)';
                            e.currentTarget.style.background = '#FFF9F5';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(193,68,14,0.15)';
                            e.currentTarget.style.background = '#FBFAF8';
                          }}
                        >
                          <Plus
                            className="w-5 h-5 mb-0.5"
                            style={{ color: '#C1440E', opacity: 0.5 }}
                          />
                          <span className="text-[10px] font-bold text-stone-500">
                            Add more
                          </span>
                        </button>
                      )}
                    </div>
                    </SortableContext>
                    </DndContext>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Off-ratio photos: warn, and let the user choose how they're handled */}
              <AnimatePresence>
                {offRatioCount > 0 && setExtendPhotos && (
                  <motion.div
                    key="off-ratio"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="rounded-2xl border p-4 space-y-3"
                    style={
                      extendPhotos
                        ? { background: 'rgba(193,68,14,0.05)', borderColor: 'rgba(193,68,14,0.20)' }
                        : { background: '#FFF7ED', borderColor: '#FED7AA' }
                    }
                  >
                    <p
                      className="font-semibold flex items-center gap-1.5"
                      style={{ color: extendPhotos ? '#C1440E' : '#C2410C', fontSize: 14.5 }}
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {offRatioCount} of your photos {offRatioCount > 1 ? "aren't" : "isn't"} {aspectRatio}
                    </p>
                    <p className="text-xs text-stone-500 leading-relaxed">
                      {extendPhotos
                        ? "We'll extend them outward with AI so they fill the frame. Photos with text in them stay untouched, so their words don't get garbled."
                        : "They'll play with bars down the sides. Turn this on to have AI fill the frame instead."}
                    </p>

                    <button
                      onClick={() => setExtendPhotos(!extendPhotos)}
                      aria-pressed={extendPhotos}
                      className="w-full flex items-center justify-between gap-4 p-3 rounded-xl transition-colors text-left"
                      style={{ background: '#FBFAF8', border: '1px solid rgba(193,68,14,0.10)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200"
                          style={
                            extendPhotos
                              ? { background: 'linear-gradient(135deg, #C1440E, #E8603C)', boxShadow: '0 4px 10px rgba(193,68,14,0.30)' }
                              : { background: 'rgba(193,68,14,0.06)' }
                          }
                        >
                          <Sparkles style={{ width: 16, height: 16, color: extendPhotos ? '#fff' : '#C1440E' }} />
                        </div>
                        <div>
                          <span className="font-extrabold text-sm block text-stone-800">Extend photos with AI</span>
                          <span className="text-xs text-stone-400 block leading-relaxed">
                            Fill the frame instead of showing bars
                          </span>
                        </div>
                      </div>
                      <div
                        className="relative w-12 h-6 rounded-full flex-shrink-0 transition-colors duration-200"
                        style={{ background: extendPhotos ? 'linear-gradient(135deg, #C1440E, #E8603C)' : '#E5DFD8' }}
                      >
                        <motion.span
                          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                          animate={{ left: extendPhotos ? 26 : 4 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Drag-over overlay */}
              <AnimatePresence>
                {isDraggingFile && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="absolute inset-0 z-20 rounded-3xl flex flex-col items-center justify-center pointer-events-none"
                    style={{
                      background: 'rgba(193,68,14,0.08)',
                      border: '2px dashed rgba(193,68,14,0.55)',
                      backdropFilter: 'blur(2px)',
                      WebkitBackdropFilter: 'blur(2px)',
                    }}
                  >
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
                      style={{
                        background: 'linear-gradient(135deg, #C1440E, #E8603C)',
                        boxShadow: '0 8px 24px rgba(193,68,14,0.40)',
                      }}
                    >
                      <Upload className="w-7 h-7 text-white" />
                    </motion.div>
                    <p className="font-black text-base" style={{ color: '#C1440E' }}>
                      Drop to add
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Zone 3 - Defaults strip: unified Style / Video Length / Aspect Ratio card for both modes; Advanced is image mode only */}
          <div data-tour="settings" className="rounded-3xl p-4 sm:p-6 space-y-4 sm:space-y-6" style={{ background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(193,68,14,0.08)' }}>

            {/* Style Selection (renders in both image and references modes) */}
            <div className="space-y-2">
              <span className="text-sm font-bold block text-stone-500">Style</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {styleOptions.map((opt) => {
                  const isSelected = style === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setStyle(opt.id)}
                      className="relative overflow-hidden rounded-2xl transition-all duration-200 group"
                      style={{
                        height: 144,
                        padding: 0,
                        WebkitAppearance: 'none',
                        appearance: 'none',
                        border: isSelected ? '2.5px solid #C1440E' : '2.5px solid transparent',
                        boxShadow: isSelected
                          ? '0 6px 20px rgba(193,68,14,0.32), 0 0 0 3px rgba(193,68,14,0.12)'
                          : '0 2px 8px rgba(0,0,0,0.08)',
                        transform: isSelected ? 'translateY(-2px)' : 'translateY(0)',
                      }}
                    >
                      {/* Photo layer: isolated so it can zoom on hover/selected without affecting the card */}
                      <div
                        className="absolute inset-0 transition-transform duration-500 ease-out"
                        style={{
                          background: `url(${STYLE_IMAGE_MAP[opt.id]}) center/cover no-repeat`,
                          transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                        }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.transform = 'scale(1.08)'; }}
                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.transform = 'scale(1)'; }}
                      />

                      {/* Dark gradient overlay: kept light over most of the photo, only built up near the text */}
                      <div
                        className="absolute inset-0 rounded-2xl"
                        style={{
                          background: 'linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.25) 38%, rgba(0,0,0,0) 62%)',
                          borderRadius: 'inherit',
                        }}
                      />

                      {/* Selected checkmark badge */}
                      {isSelected && (
                        <div
                          className="absolute top-2 right-2 flex items-center justify-center rounded-full"
                          style={{
                            width: 18,
                            height: 18,
                            background: 'linear-gradient(135deg, #C1440E, #E8603C)',
                            boxShadow: '0 2px 6px rgba(193,68,14,0.45)',
                          }}
                        >
                          <Check style={{ width: 10, height: 10, color: '#fff' }} strokeWidth={3} />
                        </div>
                      )}

                      {/* Text: pinned to bottom left */}
                      <div
                        className="absolute bottom-0 left-0 right-0 px-3 pb-2.5"
                      >
                        <span
                          className="block font-black text-white leading-tight"
                          style={{ fontSize: 13, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
                        >
                          {opt.name}
                        </span>
                        <span
                          className="block font-medium text-white/60 leading-tight mt-0.5"
                          style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
                        >
                          {STYLE_SUB_LABEL_MAP[opt.id] || opt.description}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Video Length: Continuous Track Slider Strip (renders in both image and references modes) */}
            {setTargetDuration && (
              <div className="space-y-2">
                <label className="text-sm font-bold block text-stone-500">
                  Video Length
                </label>
                <div
                  className="w-full flex p-1 rounded-xl border relative"
                  style={{ background: '#F0EAE1', borderColor: 'rgba(193,68,14,0.15)' }}
                >
                  {DURATION_OPTIONS.map((opt) => {
                    const isSelected = targetDuration === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setTargetDuration(opt.value)}
                        className="flex-1 py-2 text-xs font-black transition-all relative z-10 cursor-pointer text-center"
                        style={{ color: isSelected ? '#FFFAF7' : '#7A6A62' }}
                      >
                        {isSelected && (
                          <motion.span
                            layoutId="activeLengthSegment"
                            className="absolute inset-0 rounded-lg -z-10"
                            style={{
                              background: 'linear-gradient(135deg, #C1440E, #E8603C)',
                              boxShadow: '0 2px 8px rgba(193,68,14,0.25)'
                            }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          />
                        )}
                        <span className="flex flex-col items-center gap-0">
                          <span style={{ fontSize: 12, fontWeight: 800 }}>{opt.label}</span>
                          <span style={{
                            fontSize: 9,
                            fontWeight: 500,
                            color: isSelected ? 'rgba(255,255,255,0.70)' : '#9C8F85',
                            marginTop: 1,
                          }}>
                            {opt.desc}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Aspect Ratio: Twin Box Visual Selectors (renders in both image and references modes) */}
            {setAspectRatio && (
              <div className="space-y-2">
                <label className="text-sm font-bold block text-stone-500">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: '9:16', iconStyle: { width: 14, height: 24 } },
                    { id: '16:9', iconStyle: { width: 24, height: 14 } },
                  ].map((opt) => {
                    const isSelected = (aspectRatio || '16:9') === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setAspectRatio(opt.id)}
                        className="flex flex-col items-center justify-center py-5 rounded-2xl border transition-all duration-200 bg-white group"
                        style={isSelected
                          ? {
                              borderColor: '#C1440E',
                              background: 'rgba(193,68,14,0.03)',
                              boxShadow: '0 4px 14px rgba(193,68,14,0.08)'
                            }
                          : { borderColor: 'rgba(193,68,14,0.12)' }
                        }
                      >
                        {/* Screen Wireframe Box Graphic */}
                        <div className="h-8 flex items-center justify-center mb-2.5">
                          <div
                            className="border-2 rounded-[3px] transition-all duration-200"
                            style={{
                              ...opt.iconStyle,
                              borderColor: isSelected ? '#C1440E' : '#A89E95',
                              background: isSelected ? 'rgba(193,68,14,0.12)' : 'transparent'
                            }}
                          />
                        </div>

                        <span className="flex flex-col items-center gap-0.5">
                          <span className="text-xs font-black text-stone-800 tracking-wider">
                            {opt.id}
                          </span>
                          <span style={{ fontSize: 9, fontWeight: 500, color: '#9C8F85' }}>
                            {opt.id === '9:16' ? 'Phone · Social' : 'TV · Laptop'}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Advanced Controls Accordion Section (image mode only, hidden in prompt-only) */}
            {!isReferencesMode && !isPromptOnly && (
              <div className="pt-3 border-t" style={{ borderColor: 'rgba(193,68,14,0.08)' }}>
                <button
                  onClick={() => setFrameConfigExpanded(!frameConfigExpanded)}
                  className="w-full flex items-center justify-between gap-3 text-left cursor-pointer"
                >
                  <span className="text-xs font-bold" style={{ color: (enableBridges || openingEnabled || closingEnabled) ? '#C1440E' : '#9C8F85' }}>
                    Advanced
                    {(enableBridges || openingEnabled || closingEnabled)
                      ? ` · ${[enableBridges && 'Smooth transitions', openingEnabled && 'Intro', closingEnabled && 'Outro'].filter(Boolean).join(' + ')} on`
                      : ' · Intro, Outro, Bridge Scenes'}
                  </span>
                  {frameConfigExpanded ? (
                    <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: '#9C8F85' }} />
                  ) : (
                    <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: '#9C8F85' }} />
                  )}
                </button>

              <AnimatePresence>
                {frameConfigExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 space-y-4">

                      {/* Smooth Scene Transitions toggle */}
                      {setEnableBridges && (
                        <button
                          onClick={() => { if (!hasEnoughImages) setEnableBridges(!enableBridges); }}
                          aria-pressed={enableBridges}
                          disabled={hasEnoughImages}
                          className="w-full flex items-center justify-between gap-4 p-4 rounded-2xl transition-colors text-left"
                          style={{ background: '#FBFAF8', border: '1px solid rgba(193,68,14,0.10)', opacity: hasEnoughImages ? 0.55 : 1, cursor: hasEnoughImages ? 'not-allowed' : 'pointer' }}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200"
                              style={
                                enableBridges
                                  ? { background: "linear-gradient(135deg, #C1440E, #E8603C)", boxShadow: "0 4px 10px rgba(193,68,14,0.30)" }
                                  : { background: "rgba(193,68,14,0.06)" }
                              }
                            >
                              <Wand2 style={{ width: 16, height: 16, color: enableBridges ? "#fff" : "#C1440E" }} />
                            </div>
                            <div>
                              <span className="font-extrabold text-sm block text-stone-800">Bridge Scene</span>
                              <span className="text-xs text-stone-400 block leading-relaxed">
                                {hasEnoughImages
                                  ? "Your images already fill the video, so no AI clips are needed."
                                  : "Generate extra AI frames between your images for smoother cuts."}
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
                      )}

                      <p className="text-stone-400 font-medium leading-relaxed text-xs">
                        Add a branded intro or outro screen around your video. Toggle either one on to configure it.
                      </p>

                      {/* Opening Frame card */}
                      <div
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
                                    <input ref={openingFileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => handleFrameFileChange(e, "opening")} />
                                    {openingFrame.uploadedImage ? (
                                      <div className="relative">
                                        <img src={openingFrame.uploadedImage} alt="Opening frame" className="w-full h-48 object-cover rounded-xl border border-stone-200 shadow-sm" />
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
                      </div>

                      {/* Closing Frame card */}
                      <div
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
                                    <input ref={closingFileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => handleFrameFileChange(e, "closing")} />
                                    {closingFrame.uploadedImage ? (
                                      <div className="relative">
                                        <img src={closingFrame.uploadedImage} alt="Closing frame" className="w-full h-48 object-cover rounded-xl border border-stone-200 shadow-sm" />
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
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              </div>
            )}

          </div>

          {/* Zone 4 - Voice & Music (both modes). Configured up front here so the
              later steps go straight to review + generate. State lives in the
              session hook, so setting it here flows through to generation. */}
          {setVoiceId && setBackgroundMusic && (
            <div data-tour="sound" className="rounded-3xl p-4 sm:p-6 space-y-3" style={CARD_SHADOW}>
              <div>
                <h2 className="font-black" style={{ fontSize: 'clamp(1.15rem, 2.4vw, 1.4rem)', color: '#1C1917', letterSpacing: '-0.01em' }}>
                  Voice &amp; Music
                </h2>
                <p className="text-xs font-medium mt-1" style={{ color: '#9C8F85' }}>
                  Pick the narration voice and choose whether to add background music.
                </p>
              </div>

              {/* Narration voice - opens the picker modal (works on mobile too) */}
              <button
                onClick={() => setVoiceModalOpen(true)}
                className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl text-left"
                style={{ background: '#FBFAF8', border: '1.5px solid rgba(193,68,14,0.10)', transition: 'border-color 0.2s ease, background 0.2s ease' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.28)'; e.currentTarget.style.background = '#FFF9F5'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(193,68,14,0.10)'; e.currentTarget.style.background = '#FBFAF8'; }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #C1440E, #E8603C)', boxShadow: '0 4px 10px rgba(193,68,14,0.25)' }}>
                    <Mic className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-extrabold text-sm block" style={{ color: '#1C1917' }}>Narration voice</span>
                    <span className="text-xs block truncate" style={{ color: '#9C8F85' }}>
                      {voiceId ? voiceId.charAt(0).toUpperCase() + voiceId.slice(1) : 'Default voice'}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-bold flex items-center gap-1 flex-shrink-0" style={{ color: '#C1440E' }}>
                  Change <ChevronDown className="w-3 h-3" />
                </span>
              </button>

              {/* Background music toggle */}
              <button
                onClick={() => setBackgroundMusic(!backgroundMusic)}
                aria-pressed={!!backgroundMusic}
                className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl text-left"
                style={{ background: '#FBFAF8', border: '1.5px solid rgba(193,68,14,0.10)' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200"
                    style={backgroundMusic
                      ? { background: 'linear-gradient(135deg, #C1440E, #E8603C)', boxShadow: '0 4px 10px rgba(193,68,14,0.25)' }
                      : { background: 'rgba(193,68,14,0.06)' }}
                  >
                    <Music className="w-4 h-4" style={{ color: backgroundMusic ? '#fff' : '#C1440E' }} />
                  </div>
                  <div className="min-w-0">
                    <span className="font-extrabold text-sm block" style={{ color: '#1C1917' }}>Background music</span>
                    <span className="text-xs block" style={{ color: '#9C8F85' }}>
                      {backgroundMusic ? 'AI music matched to your video' : 'No background music'}
                    </span>
                  </div>
                </div>
                <div
                  className="relative w-12 h-6 rounded-full flex-shrink-0 transition-colors duration-200"
                  style={{ background: backgroundMusic ? 'linear-gradient(135deg, #C1440E, #E8603C)' : '#E5DFD8' }}
                >
                  <motion.span
                    className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                    animate={{ left: backgroundMusic ? 26 : 4 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </div>
              </button>
            </div>
          )}

          {/* Duration vs. image-count advisory + CTA gate (image mode only, hidden in prompt-only) */}
          {!isReferencesMode && !isPromptOnly && (
            <DurationEstimate
              imageCount={images?.length ?? 0}
              targetDuration={targetDuration}
              style={style}
              enableBridges={enableBridges}
              onSetDuration={setTargetDuration}
              onToggleAiFill={setEnableBridges}
              onUploadMore={() => fileInputRef.current?.click()}
              onRemoveImages={handleRemoveImages}
              onStatusChange={setDurationStatus}
              onAffordableChange={setAffordable}
              onTopUp={handleTopUp}
            />
          )}

          {/* Credit cost / affordability (references + prompt-only modes, which
              have no DurationEstimate). Tells the user in place instead of
              redirecting to the pricing page. */}
          {(isReferencesMode || isPromptOnly) && refRequiredCredits > 0 && (
            <div
              className="rounded-2xl border p-4 flex items-center justify-between gap-2"
              style={{
                background: refAffordable ? "#F0FDF4" : "#FFF7ED",
                borderColor: refAffordable ? "#BBF7D0" : "#FED7AA",
              }}
            >
              <span
                className="text-[11px] font-bold"
                style={{ color: refAffordable ? "#15803D" : "#C2410C" }}
              >
                {refAffordable
                  ? `Costs ${refRequiredCredits} credit${refRequiredCredits !== 1 ? "s" : ""}, you have ${credits ?? 0}`
                  : `Needs ${refRequiredCredits} credits, you have ${credits ?? 0}`}
              </span>
              {!refAffordable && (
                <button
                  onClick={handleTopUp}
                  className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white flex-shrink-0"
                  style={{ background: "#C1440E" }}
                >
                  Top up
                </button>
              )}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div
              className="px-4 py-3.5 rounded-2xl text-sm font-bold border shadow-xs"
              style={{ background: "#FEF2F2", color: "#DC2626", borderColor: "#FECACA" }}
            >
              {error}
            </div>
          )}

          {/* "What's left" checklist: spells out exactly why the Create button
              is disabled, for both modes. Credit and duration problems are
              covered by their own advisory cards, so they're not repeated here. */}
          {!loading && blockers.length > 0 && (
            <div
              className="rounded-2xl border p-4"
              style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}
              role="status"
              aria-live="polite"
            >
              <p className="flex items-center gap-1.5 text-xs font-black mb-2.5" style={{ color: "#B45309" }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" strokeWidth={2.5} />
                Before you can continue
              </p>
              <ul className="space-y-1.5">
                {blockers.map((blocker, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-semibold" style={{ color: "#92400E" }}>
                    <span
                      className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: "#D97706" }}
                    />
                    <span>{blocker}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Inline CTA: the only "Create my video" action on the page */}
          <div ref={ctaRef} data-tour="cta" className="w-full sm:max-w-[480px] sm:mx-auto">
            <Button
              onClick={handleStart}
              disabled={!canStart || loading}
              className="w-full text-white py-6 text-sm font-bold rounded-2xl border-0 shadow-xl shadow-orange-200/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              style={{ background: "linear-gradient(135deg, #C1440E, #E8603C)" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2 tracking-wide font-black">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  />
                  Creating your video...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2 font-black">
                  Create my video
                  <span aria-hidden="true">→</span>
                </span>
              )}
            </Button>
            <p className="text-center text-xs font-bold mt-2" style={{ color: '#9C8F85' }}>
              {canStart
                ? "Looks good, create your video"
                : blockers.length > 0
                ? "Complete the checklist above to continue"
                : (isReferencesMode ? !refAffordable : !affordable)
                ? "Top up your credits to continue"
                : durationStatus === 'too_many_images'
                ? "Remove images or choose a longer length to continue"
                : "Getting things ready..."}
            </p>
          </div>

        </motion.div>
      </div>

      {/* Voice picker modal - a bottom sheet on phones, centered card on desktop */}
      <AnimatePresence>
        {voiceModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
            onClick={() => setVoiceModalOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h3 className="text-base font-black" style={{ color: '#1C1917' }}>Choose a voice</h3>
                <button
                  onClick={() => setVoiceModalOpen(false)}
                  aria-label="Close"
                  className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <VoiceSelector
                  value={voiceId}
                  onChange={handleVoiceChange}
                  recommendation={voiceRecommendation}
                />
              </div>
              <Button
                onClick={() => setVoiceModalOpen(false)}
                className="w-full mt-4 text-white border-0 shrink-0"
                style={{ background: 'linear-gradient(135deg, #C1440E, #E8603C)' }}
              >
                Done
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prompt Guide Modal */}
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
                    <p><span className="font-bold text-emerald-600">Best:</span> "A confident woman in her 30s with short copper-red hair, sharp green eyes and faint freckles, wearing a fitted black blazer over a white shirt, silver ring on her right hand. Moves with quiet authority."</p>
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
                    <p>Describe what a camera would actually see: hair colour, clothing texture, posture, expression. Avoid abstract personality traits like "kind" or "mysterious" unless paired with something visual that shows it.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 text-xs text-[#6B5E7B] leading-relaxed">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-stone-800">Tell us the story, not just the topic</h3>
                    <p><span className="font-bold text-red-500">Weak:</span> "A video about coffee"</p>
                    <p><span className="font-bold text-orange-500">Better:</span> "A barista crafts a latte from bean to cup in a cozy morning cafe"</p>
                    <p><span className="font-bold text-emerald-600">Best:</span> "Follow a barista through her morning routine: grinding fresh beans, steaming milk, and pouring latte art for her first customer of the day"</p>
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

      {/* Image Order Guide Modal */}
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
