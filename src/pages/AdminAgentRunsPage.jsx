import { useState, useEffect, useCallback } from 'react';
import { Bot, ChevronDown, ChevronRight, AlertTriangle, Check, Undo2, RefreshCw } from 'lucide-react';
import { listAgentRuns, getAgentRun } from '../services/admin';
import { describeError } from '../lib/errorDetail';
import AdminShell from '../components/admin/AdminShell';
import { C, cardStyle, fmtRelative } from '../lib/adminTheme';

const STATUS_COLORS = {
  DONE: { color: C.green, background: C.greenBg },
  FAILED: { color: C.red, background: C.redBg },
  RUNNING: { color: C.blue, background: C.blueBg },
  PENDING: { color: C.muted, background: C.faint },
};

// Categories the critic is allowed to act on. Anything else it records and leaves
// alone, which today means 'text': the prompt is already spelled correctly, so a
// redraw is another roll of the same dice rather than a fix.
const FIXABLE = new Set(['anatomy', 'logo', 'artefact', 'subject']);

function pill(status) {
  return STATUS_COLORS[status] || STATUS_COLORS.PENDING;
}

function Pill({ children, tone = 'muted' }) {
  const tones = {
    muted: { color: C.muted, background: C.faint },
    red: { color: C.red, background: C.redBg },
    green: { color: C.green, background: C.greenBg },
    blue: { color: C.blue, background: C.blueBg },
  };
  return (
    <span className="px-2 py-0.5 rounded-md text-xs font-semibold" style={tones[tone]}>
      {children}
    </span>
  );
}

/** One frame's verdict, with the thumbnail so a claim can be checked against the pixels. */
function Verdict({ verdict, url }) {
  const held = !verdict.ok && !FIXABLE.has(verdict.category);
  return (
    <div className="flex gap-3 py-3" style={{ borderTop: `1px solid ${C.faint}` }}>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="shrink-0">
          <img src={url} alt={`Frame ${verdict.index}`} className="w-28 h-16 object-cover rounded-md"
            style={{ border: `1px solid ${C.cardBorder}` }} />
        </a>
      ) : (
        <div className="w-28 h-16 rounded-md shrink-0" style={{ background: C.faint }} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-sm font-semibold" style={{ color: C.charcoal }}>Frame {verdict.index}</span>
          {verdict.ok
            ? <Pill tone="green">ok</Pill>
            : <><Pill tone="red">{verdict.category}</Pill><Pill>{verdict.severity}</Pill></>}
          {held && <Pill tone="blue">held back, not auto fixable</Pill>}
        </div>
        {verdict.problem && <p className="text-sm" style={{ color: C.charcoal }}>{verdict.problem}</p>}
        {verdict.suggestedFeedback && (
          <p className="text-xs mt-1" style={{ color: C.muted }}>
            suggests: {verdict.suggestedFeedback}
          </p>
        )}
      </div>
    </div>
  );
}

/** Everything one run found and did. Loaded lazily, since the steps can be large. */
function RunDetail({ runId }) {
  const [run, setRun] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    getAgentRun(runId)
      .then((d) => { if (alive) setRun(d); })
      .catch((e) => { if (alive) setError(describeError(e)); });
    return () => { alive = false; };
  }, [runId]);

  if (error) return <p className="text-sm px-4 py-3" style={{ color: C.red }}>{error}</p>;
  if (!run) return <p className="text-sm px-4 py-3" style={{ color: C.muted }}>Loading…</p>;

  const state = run.state || {};
  const frames = state.frames || [];
  const urlFor = (i) => frames.find((f) => f.index === i)?.url;
  const verdicts = state.verdicts || [];
  const flagged = verdicts.filter((v) => !v.ok);
  const issues = state.consistency?.issues || [];
  const after = state.consistencyAfter?.issues;
  const fixes = state.fixes || [];
  const tokensIn = run.steps.reduce((n, s) => n + (s.tokens_in || 0), 0);
  const tokensOut = run.steps.reduce((n, s) => n + (s.tokens_out || 0), 0);

  return (
    <div className="px-4 pb-4">
      <div className="flex flex-wrap gap-4 py-3 text-sm" style={{ color: C.muted }}>
        <span>{run.steps.length} steps</span>
        <span>{tokensIn.toLocaleString()} in / {tokensOut.toLocaleString()} out</span>
        <span>${Number(run.spent_usd).toFixed(4)} spent</span>
        <span>{frames.length} frames</span>
      </div>

      {run.error && (
        <div className="rounded-lg px-3 py-2 mb-3 text-sm" style={{ color: C.red, background: C.redBg }}>
          <AlertTriangle size={14} className="inline mr-1" />{run.error}
        </div>
      )}

      <h4 className="text-sm font-bold mt-2" style={{ color: C.charcoal }}>
        Per frame: {flagged.length} of {verdicts.length} flagged
      </h4>
      {verdicts.map((v) => <Verdict key={v.index} verdict={v} url={urlFor(v.index)} />)}

      <h4 className="text-sm font-bold mt-5" style={{ color: C.charcoal }}>
        Across the sequence: {issues.length} issue{issues.length === 1 ? '' : 's'}
        {typeof after === 'number' && <span style={{ color: C.muted }}> ({after} left after fixes)</span>}
      </h4>
      {issues.length === 0 && <p className="text-sm py-2" style={{ color: C.muted }}>Nothing found.</p>}
      {issues.map((i, n) => (
        <div key={n} className="py-2" style={{ borderTop: `1px solid ${C.faint}` }}>
          <div className="flex items-center gap-2 mb-1">
            <Pill tone="red">{i.kind}</Pill>
            <span className="text-xs" style={{ color: C.muted }}>frames {i.frames.join(', ')}</span>
          </div>
          <p className="text-sm" style={{ color: C.charcoal }}>{i.problem}</p>
        </div>
      ))}

      {fixes.length > 0 && (
        <>
          <h4 className="text-sm font-bold mt-5 mb-1" style={{ color: C.charcoal }}>
            Redraws: {fixes.filter((f) => f.kept).length} kept, {fixes.filter((f) => !f.kept).length} reverted
          </h4>
          {fixes.map((f, n) => (
            <div key={n} className="flex items-start gap-2 py-2 text-sm" style={{ borderTop: `1px solid ${C.faint}` }}>
              {f.kept
                ? <Check size={15} className="mt-0.5 shrink-0" style={{ color: C.green }} />
                : <Undo2 size={15} className="mt-0.5 shrink-0" style={{ color: C.muted }} />}
              <div>
                <span style={{ color: C.charcoal }}>Frame {f.index}</span>{' '}
                <Pill>{f.kind}</Pill>{' '}
                <span style={{ color: C.muted }}>{f.kept ? 'kept' : 'reverted, original restored'}</span>
                <p className="text-xs mt-0.5" style={{ color: C.muted }}>{f.feedback}</p>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/**
 * Storyboard critic runs.
 *
 * This page exists to answer one question before the critic is trusted to spend on
 * customers: do you agree with it? Every verdict is shown next to the frame it is
 * about, so a claim can be checked rather than taken on faith.
 */
export default function AdminAgentRunsPage() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    listAgentRuns({ limit: 50 })
      .then((d) => { setRuns(d); setError(''); })
      .catch((e) => setError(describeError(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: C.charcoal }}>Storyboard critic</h1>
          <p className="text-sm" style={{ color: C.muted }}>
            What the agent saw in each storyboard, and what it changed.
          </p>
        </div>
        <button onClick={load} className="px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
          style={{ color: C.terra, background: C.terraSoft }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg px-3 py-2 mb-3 text-sm" style={{ color: C.red, background: C.redBg }}>{error}</div>
      )}

      {!loading && runs.length === 0 && (
        <div className="rounded-2xl p-8 text-center" style={cardStyle}>
          <Bot size={28} className="mx-auto mb-2" style={{ color: C.muted }} />
          <p className="text-sm" style={{ color: C.muted }}>
            No runs yet. One is queued whenever a references-mode session finishes generating its scene frames.
          </p>
        </div>
      )}

      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        {runs.map((r, n) => {
          const state = r.state || {};
          const flagged = (state.verdicts || []).filter((v) => !v.ok).length;
          const issues = (state.consistency?.issues || []).length;
          const kept = (state.fixes || []).filter((f) => f.kept).length;
          const isOpen = open === r.id;
          return (
            <div key={r.id} style={n ? { borderTop: `1px solid ${C.faint}` } : undefined}>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-left"
                onClick={() => setOpen(isOpen ? null : r.id)}>
                {isOpen ? <ChevronDown size={16} style={{ color: C.muted }} />
                  : <ChevronRight size={16} style={{ color: C.muted }} />}
                <span className="px-2 py-0.5 rounded-md text-xs font-semibold" style={pill(r.status)}>
                  {r.status}
                </span>
                <span className="font-mono text-xs" style={{ color: C.muted }}>{r.session_id}</span>
                <span className="ml-auto flex items-center gap-3 text-xs" style={{ color: C.muted }}>
                  {flagged > 0 && <span style={{ color: C.red }}>{flagged} flagged</span>}
                  {issues > 0 && <span style={{ color: C.red }}>{issues} sequence</span>}
                  {kept > 0 && <span style={{ color: C.green }}>{kept} fixed</span>}
                  <span>${Number(r.spent_usd).toFixed(3)}</span>
                  <span>{fmtRelative(r.created_at)}</span>
                </span>
              </button>
              {isOpen && <RunDetail runId={r.id} />}
            </div>
          );
        })}
      </div>
    </AdminShell>
  );
}
