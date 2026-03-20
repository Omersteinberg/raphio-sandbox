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

export default function VideoCard({ session, onClick }) {
  const thumbnail = session.images?.[0]?.imageUrl;
  const title = getTitle(session);
  const duration = getDuration(session);
  const isInProgress = !["COMPLETED", "EDITING"].includes(session.stage);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="cursor-pointer rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-100">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="w-10 h-10 text-gray-300" />
          </div>
        )}

        {/* Stage badge overlay for in-progress */}
        {isInProgress && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/60 text-white text-xs font-medium">
            {getStageLabel(session)}
          </div>
        )}

        {/* Duration badge for completed */}
        {duration && !isInProgress && (
          <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/60 text-white text-xs font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {duration}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-gray-900 truncate">
          {title}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-500">
            {getRelativeTime(session.createdAt)}
          </span>
          {session.style && (
            <>
              <span className="text-xs text-gray-300">·</span>
              <span className="text-xs text-primary font-medium capitalize">
                {session.style}
              </span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
