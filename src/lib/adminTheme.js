// Shared brand palette + formatting helpers for the admin dashboard pages.
// Mirrors the inline palette established by AdminPromosPage.jsx so every admin
// surface reads as one consistent (terracotta / warm) theme.

export const C = {
  bg:         'linear-gradient(160deg, #FDF6F0 0%, #FDFAF8 50%, #F7F4FB 100%)',
  card:       '#FFFAF7',
  cardBorder: 'rgba(193,68,14,0.12)',
  terra:      '#C1440E',
  terraLight: '#E8603C',
  terraSoft:  'rgba(193,68,14,0.08)',
  terraGlow:  'rgba(193,68,14,0.18)',
  charcoal:   '#2C2420',
  muted:      '#7A6A62',
  faint:      '#F0EAE5',
  green:      '#15803D',
  greenBg:    'rgba(21,128,61,0.08)',
  red:        '#B91C1C',
  redBg:      'rgba(185,28,28,0.07)',
  blue:       '#1D4ED8',
  blueBg:     'rgba(29,78,216,0.08)',
  violet:     '#7C3AED',
};

// Chart series colors (used with Recharts). Terracotta-led, brand-consistent.
export const CHART_COLORS = ['#C1440E', '#E8603C', '#7C3AED', '#1D4ED8', '#15803D', '#D97706'];

export const primaryBtn = {
  background: `linear-gradient(135deg, ${C.terra}, ${C.terraLight})`,
  color: '#fff',
  border: 'none',
  boxShadow: `0 4px 12px ${C.terraGlow}`,
};

export const inputStyle = {
  background: '#fff',
  color: C.charcoal,
  border: `1.5px solid ${C.cardBorder}`,
};

export const cardStyle = {
  background: C.card,
  border: `1.5px solid ${C.cardBorder}`,
};

/** ISO/datetime -> "Jul 15, 2026" (or "Never"/"-" for empty). */
export function fmtDate(value, empty = '-') {
  if (!value) return empty;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return empty;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** ISO/datetime -> "Jul 15, 2026, 3:40 PM". */
export function fmtDateTime(value, empty = '-') {
  if (!value) return empty;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return empty;
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

/** Relative-ish "time ago" for lastActive columns. */
export function fmtRelative(value) {
  if (!value) return 'Never';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Never';
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(value);
}

/** Seconds -> "1h 4m" / "12m" / "45s". Approximate active time. */
export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  if (s < 60) return `${s}s`;
  const mins = Math.floor(s / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins ? `${hrs}h ${remMins}m` : `${hrs}h`;
}

/**
 * Fill missing days with zero counts so a time-series chart has a continuous
 * x-axis. `series` rows are { day: 'YYYY-MM-DD', count }. Returns the last
 * `days` days ending today, each { day, label, count }.
 */
export function zeroFillDays(series, days) {
  const byDay = new Map((series || []).map((r) => [String(r.day).slice(0, 10), Number(r.count) || 0]));
  const out = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push({
      day: key,
      label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count: byDay.get(key) || 0,
    });
  }
  return out;
}
