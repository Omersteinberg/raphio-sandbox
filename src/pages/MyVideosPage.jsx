import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
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
    <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden animate-pulse">
      <div className="aspect-video bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
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

  // Reset page when switching tabs
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
    <div className="min-h-full bg-gradient-to-b from-blue-50/50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Videos</h1>
          <Button onClick={() => navigate("/create")} size="sm">
            <Plus className="w-4 h-4" />
            Create New
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                activeTab === tab.key
                  ? "text-primary"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-4">{error}</p>
            <Button variant="outline" onClick={fetchSessions}>
              Try Again
            </Button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-4">
              {activeTab === "completed"
                ? "No completed videos yet"
                : "No videos in progress"}
            </p>
            <Button onClick={() => navigate("/create")}>
              <Plus className="w-4 h-4" />
              Create Your First Video
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages}
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
