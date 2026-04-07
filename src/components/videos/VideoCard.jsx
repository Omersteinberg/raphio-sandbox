import { motion } from "framer-motion";
import { Video, Clock } from "lucide-react";

const STAGE_LABELS = {
  PROMPT_ENTERED: "Prompt Created",
  IMAGES_UPLOADED: "Images Uploaded",
  IMAGES_ANALYZED: "Images Analyzed",
  SCRIPT_GENERATED: "Script Ready",
  SCRIPT_APPROVED: "Script Approved",
  FRAMES_CONFIGURED: "Frames Configured",
  GENERATING: "Generating",
  EDITING: "Editing",
};

const PLACEHOLDER_GRADIENTS = [
  "linear-gradient(135deg, #FFF0E6, #F0EAFF)",
  "linear-gradient(135deg, #EDE9FE, #DBEAFE)",
  "linear-gradient(135deg, #DBEAFE, #FFF0E6)",
  "linear-gradient(135deg, #F0EAFF, #FCE7F3)",
  "linear-gradient(135deg, #FCE7F3, #FFF0E6)",
];

function getTitle(session) {
  return (
    session.video?.title ||
    session.scriptData?.title ||
    (session.userPrompt?.length > 60
      ? session.userPrompt.slice(0, 60) + "..."
      : session.userPrompt) ||
    "Untitled Video"
  );
}

function getRelativeTime(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getDuration(session) {
  const sections = session.video?.sections;
  if (!sections?.length) return null;
  const total = sections.reduce((sum, s) => sum + (s.clipDuration || 0), 0);
  if (total === 0) return null;
  const mins = Math.floor(total / 60);
  const secs = Math.round(total % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function getClipProgress(session) {
  const sections = session.video?.sections;
  if (!sections?.length) return null;
  const completed = sections.filter((s) => s.status === "COMPLETED").length;
  return `${completed}/${sections.length} clips`;
}

function getStageLabel(session) {
  const label = STAGE_LABELS[session.stage] || session.stage;
  if (session.stage === "GENERATING") {
    const progress = getClipProgress(session);
    return progress ? `Generating ${progress}` : label;
  }
  return label;
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export default function VideoCard({ session, onClick }) {
  const thumbnail = session.images?.[0]?.imageUrl;
  const title = getTitle(session);
  const duration = getDuration(session);
  const isInProgress = !["COMPLETED", "EDITING"].includes(session.stage);
  const placeholderGradient = PLACEHOLDER_GRADIENTS[hashCode(session.id || "x") % PLACEHOLDER_GRADIENTS.length];

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="cursor-pointer rounded-2xl border border-white/60 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
      style={{ background: "rgba(255,255,255,0.7)" }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-2 px-4"
            style={{ background: placeholderGradient }}
          >
            <Video className="w-8 h-8" style={{ color: "#B8A9C9" }} />
            <span
              className="text-xs font-semibold text-center truncate max-w-full"
              style={{ color: "#8B7BA0" }}
            >
              {title}
            </span>
          </div>
        )}

        {/* Stage badge for in-progress */}
        {isInProgress && (
          <div
            className="absolute top-2 left-2 px-2.5 py-1 rounded-full text-xs font-semibold text-white"
            style={{ background: "rgba(45,34,53,0.7)", backdropFilter: "blur(4px)" }}
          >
            {getStageLabel(session)}
          </div>
        )}

        {/* Duration badge for completed */}
        {duration && !isInProgress && (
          <div
            className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full text-xs font-semibold text-white flex items-center gap-1"
            style={{ background: "rgba(45,34,53,0.7)", backdropFilter: "blur(4px)" }}
          >
            <Clock className="w-3 h-3" />
            {duration}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-sm font-bold truncate" style={{ color: "#2D2235" }}>
          {title}
        </h3>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs" style={{ color: "#9B8FA8" }}>
            {getRelativeTime(session.createdAt)}
          </span>
          {session.style && (
            <>
              <span className="text-xs" style={{ color: "#D4CDE0" }}>·</span>
              <span
                className="text-xs font-semibold capitalize"
                style={{ color: "#F97066" }}
              >
                {session.style}
              </span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
