import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Zap, X, ChevronLeft, ChevronRight, ExternalLink, Film, AlertCircle,
} from 'lucide-react';
import { getUser, adjustCredits } from '../services/admin';
import { describeError } from '../lib/errorDetail';
import AdminShell from '../components/admin/AdminShell';
import {
  C, cardStyle, inputStyle, primaryBtn, fmtDate, fmtDateTime, formatDuration,
} from '../lib/adminTheme';

const SESS_LIMIT = 25;

const MODE_LABELS = { image: 'Image', prompt: 'Prompt', references: 'References', intro: 'Intro' };

function pill(text, color, bg) {
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ color, background: bg }}>
      {text}
    </span>
  );
}

function statusPill(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'COMPLETED') return pill('Completed', C.green, C.greenBg);
  if (s === 'FAILED') return pill('Failed', C.red, C.redBg);
  if (s === 'PROCESSING' || s === 'GENERATING') return pill(s, C.blue, C.blueBg);
  return pill(s || '-', C.muted, C.faint);
}

const TXN_LABELS = {
  SIGNUP_BONUS: 'Signup bonus',
  VIDEO_GENERATION: 'Video',
  PURCHASE: 'Purchase',
  REFUND: 'Refund',
  CLIP_REGENERATION: 'Clip regen',
  CLIP_REFUND: 'Clip refund',
  PROMO_REDEMPTION: 'Promo',
  ADMIN_ADJUSTMENT: 'Admin',
};

const TABS = ['Sessions', 'Videos', 'Transactions'];

export default function AdminUserDetailPage() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessPage, setSessPage] = useState(1);
  const [tab, setTab] = useState('Sessions');

  const [adjustOpen, setAdjustOpen] = useState(false);

  const load = useCallback(async (p) => {
    setLoading(true);
    setError('');
    try {
      setDetail(await getUser(userId, { page: p, limit: SESS_LIMIT }));
    } catch (err) {
      setError(describeError(err, 'Could not load this user.').userMessage);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(sessPage); }, [load, sessPage]);

  const user = detail?.user;
  const sessTotalPages = detail ? Math.max(1, Math.ceil(detail.sessionTotal / SESS_LIMIT)) : 1;

  return (
    <AdminShell>
      <button
        onClick={() => navigate('/admin/users')}
        className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors mb-4"
        style={{ color: C.muted }}
        onMouseEnter={(e) => { e.currentTarget.style.color = C.terra; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = C.muted; }}
      >
        <ArrowLeft className="w-4 h-4" /> Back to users
      </button>

      {error && (
        <p className="text-sm font-medium mb-4 px-3 py-2 rounded-lg" style={{ background: C.redBg, color: C.red }}>
          {error}
        </p>
      )}

      {loading && !detail ? (
        <p className="text-sm py-16 text-center" style={{ color: C.muted }}>Loading…</p>
      ) : user ? (
        <>
          {/* User header */}
          <div className="rounded-2xl p-5 mb-5 flex items-start justify-between gap-4 flex-wrap" style={cardStyle}>
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold text-white shrink-0"
                style={{ background: `linear-gradient(135deg, ${C.terra}, ${C.terraLight})` }}
              >
                {(user.username || user.email || '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-extrabold leading-tight truncate" style={{ color: C.charcoal }}>
                  {user.username}
                </h1>
                {user.email && <p className="text-sm truncate" style={{ color: C.muted }}>{user.email}</p>}
                <p className="text-xs mt-0.5" style={{ color: C.muted }}>Joined {fmtDate(user.signupDate)} · ID {user.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl" style={{ background: C.terraSoft }}>
                <Zap className="w-4 h-4" style={{ color: C.terraLight }} />
                <span className="text-lg font-extrabold" style={{ color: C.charcoal }}>{user.credits}</span>
                <span className="text-xs font-semibold" style={{ color: C.muted }}>credits</span>
              </div>
              <button
                onClick={() => setAdjustOpen(true)}
                className="rounded-xl px-4 py-2.5 text-sm font-bold shrink-0"
                style={primaryBtn}
              >
                Adjust credits
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1.5 mb-4">
            {TABS.map((t) => {
              const active = tab === t;
              const count = t === 'Sessions' ? detail.sessionTotal
                : t === 'Videos' ? detail.videos.length
                : detail.transactions.length;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="px-3.5 py-2 rounded-xl text-sm font-bold transition-all"
                  style={active
                    ? { background: C.terraSoft, color: C.terra, border: `1px solid ${C.cardBorder}` }
                    : { background: 'transparent', color: C.muted, border: '1px solid transparent' }}
                >
                  {t} <span style={{ opacity: 0.7 }}>({count})</span>
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="rounded-2xl p-2 sm:p-4" style={cardStyle}>
            {tab === 'Sessions' && (
              detail.sessions.length === 0 ? (
                <p className="text-sm py-8 text-center" style={{ color: C.muted }}>No sessions yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ color: C.charcoal }}>
                    <thead>
                      <tr style={{ color: C.muted }} className="text-left text-xs uppercase tracking-wider">
                        <th className="py-2 pr-3 font-bold">Prompt</th>
                        <th className="py-2 px-3 font-bold">Mode</th>
                        <th className="py-2 px-3 font-bold">Stage</th>
                        <th className="py-2 px-3 font-bold">Model</th>
                        <th className="py-2 px-3 font-bold">Time</th>
                        <th className="py-2 pl-3 font-bold">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.sessions.map((s) => (
                        <tr key={s.id} style={{ borderTop: `1px solid ${C.faint}` }}>
                          <td className="py-2.5 pr-3 max-w-[280px]">
                            <div className="truncate" title={s.userPrompt || ''}>
                              {s.userPrompt || <span style={{ color: C.muted }}>—</span>}
                            </div>
                            {s.jobError && (
                              <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: C.red }}>
                                <AlertCircle className="w-3 h-3 shrink-0" />
                                <span className="truncate" title={s.jobError}>{s.jobError}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">{pill(MODE_LABELS[s.pipelineMode] || s.pipelineMode, C.terra, C.terraSoft)}</td>
                          <td className="py-2.5 px-3 text-xs" style={{ color: C.muted }}>{s.stage}</td>
                          <td className="py-2.5 px-3 text-xs" style={{ color: C.muted }}>{s.videoModel || '—'}</td>
                          <td className="py-2.5 px-3" style={{ color: C.muted }}>{formatDuration(s.durationSeconds)}</td>
                          <td className="py-2.5 pl-3 whitespace-nowrap" style={{ color: C.muted }}>{fmtDate(s.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {detail.sessionTotal > SESS_LIMIT && (
                    <div className="flex items-center justify-between mt-3 px-1">
                      <p className="text-xs font-semibold" style={{ color: C.muted }}>Page {sessPage} of {sessTotalPages}</p>
                      <div className="flex items-center gap-2">
                        <button disabled={sessPage <= 1 || loading} onClick={() => setSessPage((p) => Math.max(1, p - 1))}
                          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-40"
                          style={{ color: C.terra, border: `1px solid ${C.cardBorder}` }}>
                          <ChevronLeft className="w-3.5 h-3.5" /> Prev
                        </button>
                        <button disabled={sessPage >= sessTotalPages || loading} onClick={() => setSessPage((p) => Math.min(sessTotalPages, p + 1))}
                          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-40"
                          style={{ color: C.terra, border: `1px solid ${C.cardBorder}` }}>
                          Next <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}

            {tab === 'Videos' && (
              detail.videos.length === 0 ? (
                <p className="text-sm py-8 text-center" style={{ color: C.muted }}>No videos yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {detail.videos.map((v) => (
                    <div key={v.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.faint}` }}>
                      <div className="aspect-video flex items-center justify-center" style={{ background: C.faint }}>
                        {v.posterUrl
                          ? <img src={v.posterUrl} alt="" className="w-full h-full object-cover" />
                          : <Film className="w-8 h-8" style={{ color: C.muted }} />}
                      </div>
                      <div className="p-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-bold truncate" style={{ color: C.charcoal }}>{v.title || 'Untitled'}</p>
                          {statusPill(v.status)}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs" style={{ color: C.muted }}>{fmtDate(v.createdAt)}</span>
                          {v.finalVideoUrl && (
                            <a href={v.finalVideoUrl} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: C.terra }}>
                              Open <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {tab === 'Transactions' && (
              detail.transactions.length === 0 ? (
                <p className="text-sm py-8 text-center" style={{ color: C.muted }}>No transactions yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ color: C.charcoal }}>
                    <thead>
                      <tr style={{ color: C.muted }} className="text-left text-xs uppercase tracking-wider">
                        <th className="py-2 pr-3 font-bold">Type</th>
                        <th className="py-2 px-3 font-bold">Amount</th>
                        <th className="py-2 px-3 font-bold">Balance</th>
                        <th className="py-2 px-3 font-bold">Note</th>
                        <th className="py-2 pl-3 font-bold">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.transactions.map((t) => {
                        const amt = Number(t.amount);
                        return (
                          <tr key={t.id} style={{ borderTop: `1px solid ${C.faint}` }}>
                            <td className="py-2.5 pr-3">{pill(TXN_LABELS[t.type] || t.type, C.charcoal, C.faint)}</td>
                            <td className="py-2.5 px-3 font-bold" style={{ color: amt >= 0 ? C.green : C.red }}>
                              {amt >= 0 ? `+${amt}` : amt}
                            </td>
                            <td className="py-2.5 px-3" style={{ color: C.muted }}>{t.balance_after}</td>
                            <td className="py-2.5 px-3 text-xs max-w-[220px]">
                              <span className="truncate block" title={t.note || ''}>{t.note || '—'}</span>
                            </td>
                            <td className="py-2.5 pl-3 whitespace-nowrap" style={{ color: C.muted }}>{fmtDateTime(t.created_at)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </>
      ) : null}

      <AnimatePresence>
        {adjustOpen && user && (
          <AdjustCreditsModal
            user={user}
            onClose={() => setAdjustOpen(false)}
            onDone={() => { setAdjustOpen(false); load(sessPage); }}
          />
        )}
      </AnimatePresence>
    </AdminShell>
  );
}

const MODES = [
  { key: 'grant', label: 'Grant', hint: 'Add credits' },
  { key: 'set', label: 'Set', hint: 'Exact balance' },
  { key: 'deduct', label: 'Deduct', hint: 'Remove credits' },
];

function AdjustCreditsModal({ user, onClose, onDone }) {
  const [mode, setMode] = useState('grant');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setMsg('');
    try {
      await adjustCredits(user.id, { mode, amount: Number(amount), note: note.trim() || undefined });
      onDone();
    } catch (err) {
      setMsg(describeError(err, 'Could not adjust credits.').userMessage);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'rgba(44,36,32,0.45)' }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: C.card, border: `1.5px solid ${C.cardBorder}`, boxShadow: '0 24px 64px rgba(193,68,14,0.14)' }}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold" style={{ color: C.charcoal }}>Adjust credits</h3>
          <button onClick={onClose} style={{ color: C.muted }} aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm mb-4" style={{ color: C.muted }}>
          {user.username} currently has <span className="font-bold" style={{ color: C.charcoal }}>{user.credits}</span> credits.
        </p>

        <form onSubmit={submit} className="flex flex-col gap-3">
          {/* Mode selector */}
          <div className="grid grid-cols-3 gap-2">
            {MODES.map((m) => {
              const active = mode === m.key;
              return (
                <button key={m.key} type="button" onClick={() => setMode(m.key)}
                  className="rounded-xl px-2 py-2 text-center transition-all"
                  style={active
                    ? { background: C.terraSoft, border: `1.5px solid ${C.terra}`, color: C.terra }
                    : { background: '#fff', border: `1.5px solid ${C.cardBorder}`, color: C.muted }}>
                  <div className="text-sm font-bold">{m.label}</div>
                  <div className="text-[10px] font-semibold">{m.hint}</div>
                </button>
              );
            })}
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: C.charcoal }}>
              {mode === 'set' ? 'New balance' : 'Amount'}
            </label>
            <input type="number" min="0" step="1" required value={amount}
              onChange={(e) => setAmount(e.target.value)} placeholder="0"
              className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold outline-none" style={inputStyle} />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: C.charcoal }}>Note (optional)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
              placeholder="Reason for this adjustment…"
              className="w-full rounded-xl px-3 py-2.5 text-sm font-medium outline-none resize-none" style={inputStyle} />
          </div>

          {msg && <p className="text-xs font-semibold" style={{ color: C.red }}>{msg}</p>}

          <button type="submit" disabled={saving}
            className="rounded-xl py-2.5 text-sm font-bold mt-1" style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Apply adjustment'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
