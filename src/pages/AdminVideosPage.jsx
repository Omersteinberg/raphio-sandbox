import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Play, Film, X, ExternalLink } from 'lucide-react';
import { listVideos } from '../services/admin';
import { describeError } from '../lib/errorDetail';
import AdminShell from '../components/admin/AdminShell';
import { C, cardStyle, inputStyle, fmtRelative, fmtDateTime } from '../lib/adminTheme';

const LIMIT = 24;

const STATUS_OPTIONS = [
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'all', label: 'All statuses' },
];

const STATUS_COLORS = {
  COMPLETED: { color: C.green, background: C.greenBg },
  FAILED: { color: C.red, background: C.redBg },
  PROCESSING: { color: C.blue, background: C.blueBg },
};

function statusPill(status) {
  return STATUS_COLORS[status] || { color: C.muted, background: C.faint };
}

/** Best available label for a video: its title, else the prompt that made it. */
function videoTitle(v) {
  return v.title || v.userPrompt || 'Untitled video';
}

/**
 * Modal player. Plays the rendered file straight from GCS; the public watch page
 * is one click away when the session has a share token minted.
 */
function PlayerModal({ video, onClose, onOwner }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!video) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44,36,32,0.72)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl overflow-hidden"
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <video
          key={video.id}
          src={video.finalVideoUrl}
          poster={video.posterUrl || undefined}
          controls
          autoPlay
          className="w-full max-h-[70vh] bg-black"
        />
        <div className="p-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-extrabold leading-tight truncate" style={{ color: C.charcoal }}>
              {videoTitle(video)}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: C.muted }}>
              {video.username ? (
                <button
                  onClick={() => onOwner(video.userId)}
                  className="font-bold hover:underline"
                  style={{ color: C.terra }}
                >
                  {video.username}
                </button>
              ) : (
                <span>Owner deleted</span>
              )}
              {' · '}{fmtDateTime(video.createdAt)}
              {video.videoModel ? ` · ${video.videoModel}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {video.watchUrl && (
              <a
                href={video.watchUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold"
                style={{ color: C.terra, border: `1px solid ${C.cardBorder}` }}
              >
                Watch page <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5"
              style={{ color: C.muted, border: `1px solid ${C.cardBorder}` }}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** One poster tile. Playable tiles open the modal; the rest are just informative. */
function VideoCard({ video, onPlay, onOwner }) {
  const playable = Boolean(video.finalVideoUrl);
  const pill = statusPill(video.status);

  return (
    <div
      onClick={() => playable && onPlay(video)}
      className={`rounded-2xl overflow-hidden transition-transform ${playable ? 'cursor-pointer hover:-translate-y-0.5' : ''}`}
      style={cardStyle}
    >
      <div className="relative aspect-video" style={{ background: C.faint }}>
        {video.posterUrl ? (
          <img
            src={video.posterUrl}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-8 h-8" style={{ color: C.muted, opacity: 0.5 }} />
          </div>
        )}

        {playable && (
          <div
            className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(44,36,32,0.35)' }}
          >
            <span
              className="rounded-full p-3"
              style={{ background: C.terra, boxShadow: `0 4px 12px ${C.terraGlow}` }}
            >
              <Play className="w-5 h-5 text-white" fill="#fff" />
            </span>
          </div>
        )}

        {video.status !== 'COMPLETED' && (
          <span
            className="absolute top-2 right-2 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={pill}
          >
            {video.status}
          </span>
        )}
      </div>

      <div className="p-3">
        <p className="text-sm font-bold leading-snug truncate" style={{ color: C.charcoal }}>
          {videoTitle(video)}
        </p>
        <p className="text-xs mt-1 truncate" style={{ color: C.muted }}>
          {video.username ? (
            <button
              onClick={(e) => { e.stopPropagation(); onOwner(video.userId); }}
              className="font-bold hover:underline"
              style={{ color: C.terra }}
            >
              {video.username}
            </button>
          ) : (
            <span>Owner deleted</span>
          )}
          {' · '}{fmtRelative(video.createdAt)}
        </p>
      </div>
    </div>
  );
}

export default function AdminVideosPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('COMPLETED');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ videos: [], total: 0, page: 1, limit: LIMIT });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(null);

  // Debounce the search box; reset to page 1 whenever the term changes.
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async (p, term, st) => {
    setLoading(true);
    setError('');
    try {
      setData(await listVideos({ page: p, limit: LIMIT, search: term, status: st }));
    } catch (err) {
      setError(describeError(err, 'Could not load videos.').userMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page, debounced, status); }, [load, page, debounced, status]);

  const totalPages = Math.max(1, Math.ceil(data.total / LIMIT));
  const goToUser = (userId) => { if (userId) navigate(`/admin/users/${userId}`); };

  return (
    <AdminShell>
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold leading-tight" style={{ color: C.charcoal }}>Videos</h1>
          <p className="text-sm" style={{ color: C.muted }}>
            {data.total} total · click a tile to play.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="rounded-xl px-3 py-2.5 text-sm font-semibold outline-none"
            style={inputStyle}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.muted }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, prompt, or user…"
              className="w-full rounded-xl pl-9 pr-3 py-2.5 text-sm font-medium outline-none"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm font-medium mb-4 px-3 py-2 rounded-lg" style={{ background: C.redBg, color: C.red }}>
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm py-16 text-center" style={{ color: C.muted }}>Loading…</p>
      ) : data.videos.length === 0 ? (
        <p className="text-sm py-16 text-center" style={{ color: C.muted }}>No videos found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.videos.map((v) => (
            <VideoCard key={v.id} video={v} onPlay={setPlaying} onOwner={goToUser} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data.total > LIMIT && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-xs font-semibold" style={{ color: C.muted }}>
            Page {data.page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-40"
              style={{ color: C.terra, border: `1px solid ${C.cardBorder}` }}
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-40"
              style={{ color: C.terra, border: `1px solid ${C.cardBorder}` }}
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <PlayerModal video={playing} onClose={() => setPlaying(null)} onOwner={(id) => { setPlaying(null); goToUser(id); }} />
    </AdminShell>
  );
}
