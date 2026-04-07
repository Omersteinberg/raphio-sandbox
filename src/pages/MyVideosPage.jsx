import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Video, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { listSessions } from "@/services/session";
import VideoCard from "@/components/videos/VideoCard";

const PAGE_SIZE = 12;
const TABS = [
  { key: "completed", label: "Completed" },
  { key: "in-progress", label: "In Progress" },
];

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/60 shadow-sm overflow-hidden animate-pulse" style={{ background: "rgba(255,255,255,0.6)" }}>
      <div className="aspect-video" style={{ background: "linear-gradient(135deg, #FFF0E6, #F0EAFF)" }} />
      <div className="p-4 space-y-2">
        <div className="h-4 rounded-full w-3/4" style={{ background: "#F0EAFF" }} />
        <div className="h-3 rounded-full w-1/2" style={{ background: "#FFF0E6" }} />
      </div>
    </div>
  );
}

export default function MyVideosPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("completed");
  const [sessions, setSessions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasVideos = !loading && sessions.length > 0;

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listSessions({
        status: activeTab,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      setSessions(result.data);
      setTotal(result.total);
    } catch (err) {
      setError("Failed to load videos");
      toast.error("Failed to load videos");
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleCardClick = (session) => {
    if (["COMPLETED", "EDITING"].includes(session.stage)) {
      navigate(`/video/${session.id}`);
    } else {
      navigate(`/create?session=${session.id}`);
    }
  };

  return (
    <div
      className="min-h-full font-figtree"
      style={{ background: "linear-gradient(165deg, #FFF7F0 0%, #FFF0E6 30%, #F0EAFF 70%, #F9FAFB 100%)" }}
    >
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold" style={{ color: "#2D2235" }}>My Videos</h1>
          <Button
            onClick={() => navigate("/create")}
            size="sm"
            className="text-white rounded-full px-5 border-0 font-semibold shadow-md shadow-orange-200/50 hover:shadow-lg transition-all"
            style={{ background: "linear-gradient(135deg, #F97066, #FB923C)" }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Create New
          </Button>
        </div>

        {/* Welcome banner — shown when no videos exist */}
        {!loading && total === 0 && activeTab === "completed" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl p-8 md:p-10 mb-8 border border-white/60 shadow-sm"
            style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,240,230,0.6))" }}
          >
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
              {/* Illustration area */}
              <div className="flex-shrink-0">
                <div
                  className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-sm"
                  style={{ background: "linear-gradient(135deg, #FFF0E6, #F0EAFF)" }}
                >
                  <Sparkles className="w-10 h-10" style={{ color: "#F97066" }} />
                </div>
              </div>

              <div className="text-center md:text-left flex-1">
                <h2 className="text-xl md:text-2xl font-bold mb-2" style={{ color: "#2D2235" }}>
                  Welcome to Raphio!
                </h2>
                <p className="text-base mb-5 leading-relaxed" style={{ color: "#6B5E7B" }}>
                  You're all set. Making a video is easy — just describe your idea, add a few pictures, pick a voice, and we'll do the rest.
                </p>
                <Button
                  onClick={() => navigate("/create")}
                  className="text-white rounded-full px-8 py-5 text-base font-bold border-0 shadow-lg shadow-orange-200/40 hover:shadow-xl hover:scale-[1.02] transition-all"
                  style={{ background: "linear-gradient(135deg, #F97066, #FB923C)" }}
                >
                  Make Your First Video
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b" style={{ borderColor: "rgba(45,34,53,0.1)" }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-2.5 text-sm font-semibold transition-colors relative ${
                activeTab === tab.key
                  ? ""
                  : "hover:opacity-70"
              }`}
              style={{ color: activeTab === tab.key ? "#F97066" : "#6B5E7B" }}
            >
              {tab.label}
              {activeTab === tab.key && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: "linear-gradient(135deg, #F97066, #FB923C)" }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="mb-4" style={{ color: "#6B5E7B" }}>{error}</p>
            <Button
              variant="outline"
              onClick={fetchSessions}
              className="rounded-full px-6 font-semibold"
            >
              Try Again
            </Button>
          </div>
        ) : sessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "linear-gradient(135deg, #FFF0E6, #F0EAFF)" }}
            >
              <Video className="w-7 h-7" style={{ color: "#B8A9C9" }} />
            </div>
            <p className="text-base mb-5" style={{ color: "#6B5E7B" }}>
              {activeTab === "completed"
                ? "Your finished videos will appear here"
                : "Videos you're working on will show up here"}
            </p>
            <Button
              onClick={() => navigate("/create")}
              className="text-white rounded-full px-6 py-5 font-semibold border-0 shadow-md shadow-orange-200/50 hover:shadow-lg transition-all"
              style={{ background: "linear-gradient(135deg, #F97066, #FB923C)" }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Create a Video
            </Button>
          </motion.div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {sessions.map((session) => (
                <VideoCard
                  key={session.id}
                  session={session}
                  onClick={() => handleCardClick(session)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                  className="rounded-full px-5 font-semibold"
                >
                  Previous
                </Button>
                <span className="text-sm font-medium" style={{ color: "#6B5E7B" }}>
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages}
                  className="rounded-full px-5 font-semibold"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
