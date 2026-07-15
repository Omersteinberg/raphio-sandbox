import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { listUsers } from '../services/admin';
import { describeError } from '../lib/errorDetail';
import AdminShell from '../components/admin/AdminShell';
import { C, cardStyle, inputStyle, fmtDate, fmtRelative, formatDuration } from '../lib/adminTheme';

const LIMIT = 25;

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ users: [], total: 0, page: 1, limit: LIMIT });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Debounce the search box; reset to page 1 whenever the term changes.
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async (p, term) => {
    setLoading(true);
    setError('');
    try {
      setData(await listUsers({ page: p, limit: LIMIT, search: term }));
    } catch (err) {
      setError(describeError(err, 'Could not load users.').userMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page, debounced); }, [load, page, debounced]);

  const totalPages = Math.max(1, Math.ceil(data.total / LIMIT));

  return (
    <AdminShell>
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold leading-tight" style={{ color: C.charcoal }}>Users</h1>
          <p className="text-sm" style={{ color: C.muted }}>{data.total} total · click a row for detail.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.muted }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search username or email…"
            className="w-full rounded-xl pl-9 pr-3 py-2.5 text-sm font-medium outline-none"
            style={inputStyle}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm font-medium mb-4 px-3 py-2 rounded-lg" style={{ background: C.redBg, color: C.red }}>
          {error}
        </p>
      )}

      <div className="rounded-2xl p-2 sm:p-4" style={cardStyle}>
        {loading ? (
          <p className="text-sm py-10 text-center" style={{ color: C.muted }}>Loading…</p>
        ) : data.users.length === 0 ? (
          <p className="text-sm py-10 text-center" style={{ color: C.muted }}>No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ color: C.charcoal }}>
              <thead>
                <tr style={{ color: C.muted }} className="text-left text-xs uppercase tracking-wider">
                  <th className="py-2 pr-3 font-bold">User</th>
                  <th className="py-2 px-3 font-bold">Credits</th>
                  <th className="py-2 px-3 font-bold">Sessions</th>
                  <th className="py-2 px-3 font-bold">Videos</th>
                  <th className="py-2 px-3 font-bold">Total time</th>
                  <th className="py-2 px-3 font-bold">Last active</th>
                  <th className="py-2 pl-3 font-bold">Signed up</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => navigate(`/admin/users/${u.id}`)}
                    className="cursor-pointer transition-colors"
                    style={{ borderTop: `1px solid ${C.faint}` }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(193,68,14,0.03)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td className="py-2.5 pr-3">
                      <div className="font-bold leading-tight">{u.username}</div>
                      {u.email && <div className="text-xs" style={{ color: C.muted }}>{u.email}</div>}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <Zap className="w-3.5 h-3.5" style={{ color: C.terraLight }} />
                        {u.credits}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">{Number(u.sessionCount) || 0}</td>
                    <td className="py-2.5 px-3">{Number(u.completedVideos) || 0}</td>
                    <td className="py-2.5 px-3" style={{ color: C.muted }}>{formatDuration(u.totalTimeSeconds)}</td>
                    <td className="py-2.5 px-3" style={{ color: C.muted }}>{fmtRelative(u.lastActive)}</td>
                    <td className="py-2.5 pl-3" style={{ color: C.muted }}>{fmtDate(u.signupDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data.total > LIMIT && (
        <div className="flex items-center justify-between mt-4">
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
    </AdminShell>
  );
}
