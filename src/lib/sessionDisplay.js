import { STYLE_OPTIONS } from "@/constants/styles";

const TERRA = '#C1440E';
const TERRA_LT = '#E8632A';
const MUTED = '#6B5E7B';

export const PIPELINE_STATUS = {
  AWAITING_SCRIPT: 'Script ready', AWAITING_FRAMES: 'Storyboard ready',
  SCRIPTING: 'Writing script', FRAMING: 'Drawing storyboard', GENERATING: 'Filming', FAILED: 'Failed',
};

const PIPELINE_STATUS_TONE = {
  AWAITING_SCRIPT: { bg: 'rgba(193,68,14,0.08)', color: TERRA, pulse: false },
  AWAITING_FRAMES: { bg: 'rgba(193,68,14,0.08)', color: TERRA, pulse: false },
  SCRIPTING: { bg: 'rgba(107,94,123,0.10)', color: MUTED, pulse: true },
  FRAMING: { bg: 'rgba(107,94,123,0.10)', color: MUTED, pulse: true },
  GENERATING: { bg: 'rgba(232,99,42,0.10)', color: TERRA_LT, pulse: true },
  FAILED: { bg: 'rgba(220,38,38,0.08)', color: '#DC2626', pulse: false },
};

// Title for a session card or banner, never the raw prompt.
export function getSessionTitle(session) {
  const done = ['COMPLETED', 'EDITING'].includes(session.stage);
  return (
    session.pipeline?.title ||
    session.video?.title ||
    session.scriptData?.title ||
    (done ? 'Untitled Video' : 'Untitled draft')
  );
}

// First available preview image for a session, or null.
export function getSessionThumbnail(session) {
  return (
    session.pipeline?.thumbUrl ||
    session.video?.posterUrl ||
    session.video?.sections?.find((s) => s.imageUrl)?.imageUrl ||
    session.images?.[0]?.imageUrl ||
    null
  );
}

// Unfinished draft from the old wizard: no v2 run, so it can't be reopened. Intro keeps its own creator.
export function isLegacyDraft(session) {
  if (!session || session.pipeline || session.pipelineMode === 'intro') return false;
  return !['COMPLETED', 'EDITING', 'GENERATING', 'FAILED', 'ERROR'].includes(session.stage);
}

// Status pill for a session: v2 pipeline status first, legacy stage otherwise.
export function getSessionBadge(session) {
  const status = session.pipeline?.status;
  if (status && PIPELINE_STATUS[status]) {
    return { label: PIPELINE_STATUS[status], ...PIPELINE_STATUS_TONE[status] };
  }
  if (session.pipeline) return null;
  const stage = session.stage;
  if (!stage || stage === 'COMPLETED' || stage === 'EDITING') return null;
  if (isLegacyDraft(session))
    return { label: 'Old draft', bg: 'rgba(45,34,53,0.08)', color: MUTED, pulse: false };
  if (stage === 'GENERATING') {
    const sections  = session.video?.sections || [];
    const completed = sections.filter(s => s.status === 'COMPLETED').length;
    const total     = sections.length;
    const progress  = total > 0 ? `${completed}/${total} clips` : null;
    return { label: progress ? `Generating · ${progress}` : 'Generating', bg: 'rgba(232,99,42,0.10)', color: TERRA_LT, pulse: true };
  }
  if (['FAILED','ERROR'].includes(stage))
    return { label: 'Failed', bg: 'rgba(220,38,38,0.08)', color: '#DC2626', pulse: false };
  return { label: 'Draft', bg: 'rgba(45,34,53,0.08)', color: MUTED, pulse: false };
}

// Card tag: "Brand promo" for intro sessions, else the style name when present.
export function getSessionTag(session) {
  if (session.pipelineMode === 'intro') return 'Brand promo';
  const opt = STYLE_OPTIONS.find((s) => s.id === session.style);
  return opt ? opt.name : session.style || null;
}
