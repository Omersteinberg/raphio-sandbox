import { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { Users, Film, CheckCircle2, XCircle, Zap, Activity } from 'lucide-react';
import { getStats } from '../services/admin';
import { describeError } from '../lib/errorDetail';
import AdminShell from '../components/admin/AdminShell';
import { C, cardStyle, zeroFillDays } from '../lib/adminTheme';

const RANGES = [7, 30, 90];

const MODE_LABELS = { image: 'Image', prompt: 'Prompt', references: 'References', intro: 'Intro' };

function StatCard({ icon, label, value, tint = C.terra, tintBg = C.terraSoft }) {
  const Icon = icon;
  return (
    <div className="rounded-2xl p-4 flex items-center gap-3" style={cardStyle}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: tintBg }}>
        <Icon className="w-5 h-5" style={{ color: tint }} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-extrabold leading-tight" style={{ color: C.charcoal }}>{value}</p>
        <p className="text-xs font-semibold truncate" style={{ color: C.muted }}>{label}</p>
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: C.card,
  border: `1px solid ${C.cardBorder}`,
  borderRadius: 12,
  fontSize: 12,
  color: C.charcoal,
};

function ChartCard({ title, children }) {
  return (
    <div className="rounded-2xl p-5" style={cardStyle}>
      <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: C.muted }}>{title}</p>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (windowDays) => {
    setLoading(true);
    setError('');
    try {
      setStats(await getStats(windowDays));
    } catch (err) {
      setError(describeError(err, 'Could not load dashboard stats.').userMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(days); }, [load, days]);

  const totals = stats?.totals;
  const signups = stats ? zeroFillDays(stats.series.signups, days) : [];
  const sessions = stats ? zeroFillDays(stats.series.sessions, days) : [];
  const videos = stats ? zeroFillDays(stats.series.completedVideos, days) : [];
  const modeData = (stats?.byPipelineMode || []).map((m) => ({
    mode: MODE_LABELS[m.mode] || m.mode || 'Unknown',
    count: m.count,
  }));

  return (
    <AdminShell>
      {/* Header + range toggle */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold leading-tight" style={{ color: C.charcoal }}>Dashboard</h1>
          <p className="text-sm" style={{ color: C.muted }}>User activity and platform stats.</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: C.faint }}>
          {RANGES.map((r) => {
            const active = days === r;
            return (
              <button
                key={r}
                onClick={() => setDays(r)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={active
                  ? { background: '#fff', color: C.terra, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
                  : { background: 'transparent', color: C.muted }}
              >
                {r}d
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="text-sm font-medium mb-4 px-3 py-2 rounded-lg" style={{ background: C.redBg, color: C.red }}>
          {error}
        </p>
      )}

      {loading && !stats ? (
        <p className="text-sm py-16 text-center" style={{ color: C.muted }}>Loading…</p>
      ) : totals ? (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
            <StatCard icon={Users} label="Total users" value={totals.totalUsers} />
            <StatCard icon={Activity} label="Sessions" value={totals.totalSessions} tint={C.violet} tintBg="rgba(124,58,237,0.08)" />
            <StatCard icon={CheckCircle2} label="Videos done" value={totals.completedVideos} tint={C.green} tintBg={C.greenBg} />
            <StatCard icon={XCircle} label="Videos failed" value={totals.failedVideos} tint={C.red} tintBg={C.redBg} />
            <StatCard icon={Zap} label="Credits granted" value={totals.creditsGranted} tint={C.blue} tintBg={C.blueBg} />
            <StatCard icon={Film} label="Credits used" value={totals.creditsConsumed} tint={C.terraLight} tintBg={C.terraSoft} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <ChartCard title={`New signups (last ${days}d)`}>
              <AreaChart data={signups} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradSignups" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.terra} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={C.terra} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.faint} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.muted }} interval="preserveStartEnd" minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: C.muted }} width={32} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="count" stroke={C.terra} strokeWidth={2} fill="url(#gradSignups)" name="Signups" />
              </AreaChart>
            </ChartCard>

            <ChartCard title={`Sessions started (last ${days}d)`}>
              <LineChart data={sessions} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.faint} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.muted }} interval="preserveStartEnd" minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: C.muted }} width={32} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="count" stroke={C.violet} strokeWidth={2} dot={false} name="Sessions" />
              </LineChart>
            </ChartCard>

            <ChartCard title={`Videos completed (last ${days}d)`}>
              <LineChart data={videos} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.faint} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.muted }} interval="preserveStartEnd" minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: C.muted }} width={32} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="count" stroke={C.green} strokeWidth={2} dot={false} name="Completed" />
              </LineChart>
            </ChartCard>

            <ChartCard title="Sessions by mode">
              <BarChart data={modeData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.faint} vertical={false} />
                <XAxis dataKey="mode" tick={{ fontSize: 11, fill: C.muted }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: C.muted }} width={32} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: C.terraSoft }} />
                <Bar dataKey="count" fill={C.terra} radius={[6, 6, 0, 0]} name="Sessions" />
              </BarChart>
            </ChartCard>
          </div>
        </>
      ) : null}
    </AdminShell>
  );
}
