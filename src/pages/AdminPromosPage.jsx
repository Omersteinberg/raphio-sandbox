import { useState, useEffect, useCallback, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { listCodes, createCode, updateCode, listRedemptions } from '../services/promo';
import { describeError } from '../lib/errorDetail';
import { ArrowLeft, Ticket, Plus, Users, X } from 'lucide-react';

const C = {
  bg:         'linear-gradient(160deg, #FDF6F0 0%, #FDFAF8 50%, #F7F4FB 100%)',
  card:       '#FFFAF7',
  cardBorder: 'rgba(193,68,14,0.12)',
  terra:      '#C1440E',
  terraLight: '#E8603C',
  terraGlow:  'rgba(193,68,14,0.18)',
  charcoal:   '#2C2420',
  muted:      '#7A6A62',
  faint:      '#F0EAE5',
  green:      '#15803D',
  greenBg:    'rgba(21,128,61,0.08)',
  red:        '#B91C1C',
  redBg:      'rgba(185,28,28,0.07)',
};

function fmtDate(value) {
  if (!value) return 'Never';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Never';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// ISO/datetime -> YYYY-MM-DD for a <input type="date"> value.
function toDateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

const primaryBtn = {
  background: `linear-gradient(135deg, ${C.terra}, ${C.terraLight})`,
  color: '#fff',
  border: 'none',
  boxShadow: `0 4px 12px ${C.terraGlow}`,
};

const inputStyle = {
  background: '#fff',
  color: C.charcoal,
  border: `1.5px solid ${C.cardBorder}`,
};

export default function AdminPromosPage() {
  const navigate = useNavigate();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [form, setForm] = useState({ code: '', credits: '', expiresAt: '' });
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState(null); // { type, text }

  const [editing, setEditing] = useState(null); // the code being edited
  const [editForm, setEditForm] = useState({ credits: '', expiresAt: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editMsg, setEditMsg] = useState('');

  const [expandedId, setExpandedId] = useState(null);
  const [redemptions, setRedemptions] = useState({}); // codeId -> rows

  const loadCodes = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      setCodes(await listCodes());
    } catch (err) {
      setLoadError(describeError(err, 'Could not load promo codes.').userMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCodes(); }, [loadCodes]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    setCreateMsg(null);
    try {
      await createCode({
        code: form.code.trim(),
        credits: Number(form.credits),
        expiresAt: form.expiresAt || null,
      });
      setForm({ code: '', credits: '', expiresAt: '' });
      setCreateMsg({ type: 'success', text: 'Code created.' });
      await loadCodes();
    } catch (err) {
      setCreateMsg({ type: 'error', text: describeError(err, 'Could not create code.').userMessage });
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (code) => {
    try {
      await updateCode(code.id, { active: !code.active });
      await loadCodes();
    } catch (err) {
      setLoadError(describeError(err, 'Could not update code.').userMessage);
    }
  };

  const openEdit = (code) => {
    setEditing(code);
    setEditForm({ credits: String(code.credits), expiresAt: toDateInput(code.expires_at) });
    setEditMsg('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (savingEdit) return;
    setSavingEdit(true);
    setEditMsg('');
    try {
      await updateCode(editing.id, {
        credits: Number(editForm.credits),
        expiresAt: editForm.expiresAt || null,
      });
      setEditing(null);
      await loadCodes();
    } catch (err) {
      setEditMsg(describeError(err, 'Could not save changes.').userMessage);
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleRedemptions = async (code) => {
    if (expandedId === code.id) { setExpandedId(null); return; }
    setExpandedId(code.id);
    if (!redemptions[code.id]) {
      try {
        const rows = await listRedemptions(code.id);
        setRedemptions((prev) => ({ ...prev, [code.id]: rows }));
      } catch {
        setRedemptions((prev) => ({ ...prev, [code.id]: [] }));
      }
    }
  };

  return (
    <div className="min-h-full font-figtree py-10 px-4" style={{ background: C.bg }}>
      <div className="max-w-4xl w-full mx-auto pt-4">

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors mb-4"
          style={{ color: C.muted }}
          onMouseEnter={(e) => { e.currentTarget.style.color = C.terra; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = C.muted; }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: C.faint }}>
            <Ticket className="w-5 h-5" style={{ color: C.terra }} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold leading-tight" style={{ color: C.charcoal }}>Promo Codes</h1>
            <p className="text-sm" style={{ color: C.muted }}>Create and manage free-credit codes.</p>
          </div>
        </div>

        {/* Create form */}
        <div className="rounded-2xl p-5 mb-6" style={{ background: C.card, border: `1.5px solid ${C.cardBorder}` }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: C.muted }}>Create a code</p>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label className="block text-xs font-semibold mb-1" style={{ color: C.charcoal }}>Code</label>
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="WELCOME10"
                required
                className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold uppercase tracking-wide outline-none"
                style={inputStyle}
              />
            </div>
            <div className="w-full sm:w-28">
              <label className="block text-xs font-semibold mb-1" style={{ color: C.charcoal }}>Credits</label>
              <input
                type="number" min="1" step="1"
                value={form.credits}
                onChange={(e) => setForm((f) => ({ ...f, credits: e.target.value }))}
                placeholder="5"
                required
                className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold outline-none"
                style={inputStyle}
              />
            </div>
            <div className="w-full sm:w-44">
              <label className="block text-xs font-semibold mb-1" style={{ color: C.charcoal }}>Expiry (optional)</label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold outline-none"
                style={inputStyle}
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="rounded-xl px-4 py-2.5 text-sm font-bold flex items-center justify-center gap-1.5 shrink-0"
              style={{ ...primaryBtn, opacity: creating ? 0.6 : 1 }}
            >
              <Plus className="w-4 h-4" />
              {creating ? 'Creating…' : 'Create'}
            </button>
          </form>
          <AnimatePresence>
            {createMsg && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-xs font-semibold mt-3"
                style={{ color: createMsg.type === 'success' ? C.green : C.red }}>
                {createMsg.text}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Codes list */}
        <div className="rounded-2xl p-5" style={{ background: C.card, border: `1.5px solid ${C.cardBorder}` }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: C.muted }}>All codes</p>

          {loadError && (
            <p className="text-sm font-medium mb-3 px-3 py-2 rounded-lg"
              style={{ background: C.redBg, color: C.red }}>{loadError}</p>
          )}

          {loading ? (
            <p className="text-sm py-6 text-center" style={{ color: C.muted }}>Loading…</p>
          ) : codes.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: C.muted }}>No codes yet. Create one above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ color: C.charcoal }}>
                <thead>
                  <tr style={{ color: C.muted }} className="text-left text-xs uppercase tracking-wider">
                    <th className="py-2 pr-3 font-bold">Code</th>
                    <th className="py-2 px-3 font-bold">Credits</th>
                    <th className="py-2 px-3 font-bold">Expires</th>
                    <th className="py-2 px-3 font-bold">Status</th>
                    <th className="py-2 px-3 font-bold">Redeemed</th>
                    <th className="py-2 pl-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((code) => {
                    const count = Number(code.redemption_count) || 0;
                    const isExpanded = expandedId === code.id;
                    return (
                      <Fragment key={code.id}>
                        <tr style={{ borderTop: `1px solid ${C.faint}` }}>
                          <td className="py-2.5 pr-3 font-bold tracking-wide">{code.code}</td>
                          <td className="py-2.5 px-3">{code.credits}</td>
                          <td className="py-2.5 px-3" style={{ color: C.muted }}>{fmtDate(code.expires_at)}</td>
                          <td className="py-2.5 px-3">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={code.active
                                ? { background: C.greenBg, color: C.green }
                                : { background: C.faint, color: C.muted }}>
                              {code.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <button
                              onClick={() => count > 0 && toggleRedemptions(code)}
                              className="inline-flex items-center gap-1 font-semibold"
                              style={{ color: count > 0 ? C.terra : C.muted, cursor: count > 0 ? 'pointer' : 'default' }}
                            >
                              <Users className="w-3.5 h-3.5" />
                              {count}
                            </button>
                          </td>
                          <td className="py-2.5 pl-3">
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                onClick={() => openEdit(code)}
                                className="text-xs font-bold px-2.5 py-1 rounded-lg"
                                style={{ color: C.terra, border: `1px solid rgba(193,68,14,0.28)` }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleToggleActive(code)}
                                className="text-xs font-bold px-2.5 py-1 rounded-lg"
                                style={code.active
                                  ? { color: C.red, border: `1px solid rgba(185,28,28,0.25)` }
                                  : { color: C.green, border: `1px solid rgba(21,128,61,0.25)` }}
                              >
                                {code.active ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr style={{ background: 'rgba(193,68,14,0.03)' }}>
                            <td colSpan={6} className="px-3 py-3">
                              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.muted }}>
                                Redeemed by
                              </p>
                              {!redemptions[code.id] ? (
                                <p className="text-xs" style={{ color: C.muted }}>Loading…</p>
                              ) : redemptions[code.id].length === 0 ? (
                                <p className="text-xs" style={{ color: C.muted }}>No redemptions.</p>
                              ) : (
                                <ul className="flex flex-col gap-1">
                                  {redemptions[code.id].map((r) => (
                                    <li key={`${r.user_id}-${r.redeemed_at}`} className="text-xs flex justify-between gap-3">
                                      <span style={{ color: C.charcoal }}>
                                        {r.username}{r.email ? ` · ${r.email}` : ''}
                                      </span>
                                      <span style={{ color: C.muted }}>{fmtDate(r.redeemed_at)}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      <AnimatePresence>
        {editing && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            style={{ background: 'rgba(44,36,32,0.45)' }}
            onClick={() => setEditing(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl p-6"
              style={{ background: C.card, border: `1.5px solid ${C.cardBorder}`, boxShadow: '0 24px 64px rgba(193,68,14,0.14)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold" style={{ color: C.charcoal }}>
                  Edit <span style={{ color: C.terra }}>{editing.code}</span>
                </h3>
                <button onClick={() => setEditing(null)} style={{ color: C.muted }} aria-label="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSaveEdit} className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: C.charcoal }}>Credits</label>
                  <input
                    type="number" min="1" step="1" required
                    value={editForm.credits}
                    onChange={(e) => setEditForm((f) => ({ ...f, credits: e.target.value }))}
                    className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold outline-none"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: C.charcoal }}>Expiry (optional)</label>
                  <input
                    type="date"
                    value={editForm.expiresAt}
                    onChange={(e) => setEditForm((f) => ({ ...f, expiresAt: e.target.value }))}
                    className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold outline-none"
                    style={inputStyle}
                  />
                  <button type="button" onClick={() => setEditForm((f) => ({ ...f, expiresAt: '' }))}
                    className="text-xs font-semibold mt-1" style={{ color: C.muted }}>
                    Clear expiry (never expires)
                  </button>
                </div>
                {editMsg && <p className="text-xs font-semibold" style={{ color: C.red }}>{editMsg}</p>}
                <button type="submit" disabled={savingEdit}
                  className="rounded-xl py-2.5 text-sm font-bold mt-1"
                  style={{ ...primaryBtn, opacity: savingEdit ? 0.6 : 1 }}>
                  {savingEdit ? 'Saving…' : 'Save changes'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
