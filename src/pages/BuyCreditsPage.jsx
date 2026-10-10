import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion,  AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth.jsx';
import { createCheckoutSession, getTransactions } from '../services/credits';
import { applyCode } from '../services/promo';
import { takeReturnTo } from '../lib/returnTo';
import { describeError } from '../lib/errorDetail';
import { PACKS, savePct } from '../lib/pricing';
import { DURATION_CREDIT_TIERS } from '../lib/limits';
import { Button } from '../components/ui/button';
import {
  CheckCircle, ArrowLeft,
  Zap, Layers, Crown, Infinity, Clock, Ticket, Receipt,
} from 'lucide-react';

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
  red:        '#B91C1C',
  redBg:      'rgba(185,28,28,0.07)',
};

const PACK_UI = {
  starter: { icon: Zap, cta: 'Buy Starter' },
  creator: { icon: Layers, cta: 'Buy Creator Pack' },
  studio: { icon: Crown, cta: 'Buy Studio Pack' },
};

const TIERS = PACKS.map((p) => {
  const pct = savePct(p);
  return {
    ...p,
    popular: !!p.popular,
    save: pct > 0 ? `Save ${pct}%` : null,
    icon: PACK_UI[p.id]?.icon || Zap,
    cta: PACK_UI[p.id]?.cta || `Buy ${p.label}`,
  };
});

const COST_TABLE = DURATION_CREDIT_TIERS.map((t) => ({ label: `${t.maxSeconds}s`, credits: t.credits }));

const TX_LABELS = {
  PURCHASE: 'Purchase',
  VIDEO_GENERATION: 'Video',
  REFUND: 'Refund',
  CLIP_REGENERATION: 'Clip redo',
  CLIP_REFUND: 'Clip refund',
  SHARE_BONUS: 'Share bonus',
  PROMO_REDEMPTION: 'Promo code',
  SIGNUP_BONUS: 'Welcome credits',
  ADMIN_ADJUSTMENT: 'Adjustment',
};

const HISTORY_PAGE = 20;

// Short date for a history row.
function fmtTxDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const TRUST = [
  { icon: Infinity,    text: 'Credits never expire' },
  { icon: Clock,       text: 'No subscription required' },
];

// Human label for an applied discount: "20% off" or "$10 off".
function formatDiscount(d) {
  if (!d) return '';
  if (d.discountType === 'PERCENT') return `${d.discountValue}% off`;
  const dollars = (Number(d.discountValue) || 0) / 100;
  return `$${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)} off`;
}

// A tier's dollar price after applying the discount (never below 0). PERCENT is a
// whole percent; AMOUNT is cents.
function discountedPrice(price, d) {
  if (!d) return price;
  if (d.discountType === 'PERCENT') return Math.max(0, price * (1 - d.discountValue / 100));
  return Math.max(0, price - d.discountValue / 100);
}

// Trim a price for display: whole dollars as-is, otherwise two decimals.
function fmtMoney(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export default function BuyCreditsPage() {
  const { credits, refreshCredits } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loadingTier, setLoadingTier] = useState(null);
  const [hoveredTier, setHoveredTier] = useState(null);
  const [error, setError] = useState('');
  const [returnPath, setReturnPath] = useState(null);
  const [promoCode, setPromoCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [promoMsg, setPromoMsg] = useState(null); // { type: 'success' | 'error', text }
  const [appliedDiscount, setAppliedDiscount] = useState(null); // { code, discountType, discountValue }
  const [history, setHistory] = useState(null);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyError, setHistoryError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const success  = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  // Loads the latest credit transactions for the history table.
  const loadHistory = useCallback(async () => {
    try {
      const res = await getTransactions({ limit: HISTORY_PAGE });
      setHistory(res?.data?.transactions || []);
      setHistoryTotal(Number(res?.data?.total) || 0);
      setHistoryError(false);
    } catch {
      setHistoryError(true);
    }
  }, []);

  // Appends the next page of transactions. On failure the rows stay and the button allows a retry.
  const loadMoreHistory = async () => {
    if (!history || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await getTransactions({ limit: HISTORY_PAGE, offset: history.length });
      const seen = new Set(history.map((tx) => tx.id));
      setHistory([...history, ...(res?.data?.transactions || []).filter((tx) => !seen.has(tx.id))]);
      setHistoryTotal(Number(res?.data?.total) || 0);
    } catch {
      return;
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (success === 'true') return;
    loadHistory();
  }, [success, loadHistory]);

  useEffect(() => {
    if (success !== 'true') return;
    setReturnPath(takeReturnTo());
    let attempts = 0;
    const poll = setInterval(async () => {
      await refreshCredits();
      if (++attempts >= 10) clearInterval(poll);
    }, 2000);
    return () => clearInterval(poll);
  }, [success, refreshCredits]);

  const handleBuy = async (tier) => {
    setLoadingTier(tier.id);
    setError('');
    try {
      const { url } = await createCheckoutSession(tier.stripeId, appliedDiscount?.code);
      window.location.href = url;
    } catch (err) {
      setError(describeError(err, "We couldn't start checkout. Please try again.").userMessage);
    } finally {
      setLoadingTier(null);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    const code = promoCode.trim();
    if (!code || redeeming) return;
    setRedeeming(true);
    setPromoMsg(null);
    try {
      const result = await applyCode(code);
      if (result.kind === 'DISCOUNT') {
        setAppliedDiscount(result);
        setPromoMsg({ type: 'success', text: `${formatDiscount(result)} applied at checkout.` });
      } else {
        await refreshCredits();
        loadHistory();
        setPromoMsg({ type: 'success', text: `You got ${result.creditsAdded} credit${result.creditsAdded === 1 ? '' : 's'}!${Number.isFinite(result.credits) ? ` You now have ${result.credits} credits.` : ''}` });
      }
      setPromoCode('');
    } catch (err) {
      setPromoMsg({
        type: 'error',
        text: describeError(err, "That code didn't work. Please try again.").userMessage,
      });
    } finally {
      setRedeeming(false);
    }
  };

  const clearDiscount = () => {
    setAppliedDiscount(null);
    setPromoMsg(null);
  };

  if (success === 'true') {
    return (
      <div className="h-full flex items-center justify-center py-12 px-4 font-figtree"
        style={{ background: C.bg }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full rounded-3xl p-10 text-center"
          style={{ background: C.card, border: `1.5px solid ${C.cardBorder}`, boxShadow: '0 24px 64px rgba(193,68,14,0.10)' }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'rgba(21,128,61,0.08)' }}>
            <CheckCircle className="w-8 h-8" style={{ color: C.green }} />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: C.charcoal }}>Credits Added!</h2>
          <p className="text-sm mb-1" style={{ color: C.muted }}>Time to create something great.</p>
          <Button onClick={() => navigate(returnPath || '/create')}
            className="w-full text-white rounded-xl py-6 text-base font-bold border-0 mt-4"
            style={{ background: `linear-gradient(135deg, ${C.terra}, ${C.terraLight})` }}>
            {returnPath ? 'Continue where you left off' : 'Start Creating'}
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-full font-figtree py-10 px-4 flex flex-col justify-center" style={{ background: C.bg }}>

      <div className="max-w-5xl w-full mx-auto pt-6">

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
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-4">
          <h1 className="text-4xl font-extrabold mb-3 leading-tight" style={{ color: C.charcoal }}>
            {canceled === 'true' ? 'Pick up where you left off' : 'Top up your credits'}
          </h1>
          <p className="text-sm mb-3" style={{ color: C.muted }}>
            Buy once. Create whenever you want.
          </p>
          {credits != null && (
            <p className="inline-block text-sm font-bold px-4 py-1.5 rounded-full mb-2"
              style={{ background: C.faint, color: C.charcoal, border: `1px solid ${C.cardBorder}` }}>
              You have <span style={{ color: C.terra }}>{credits}</span> credit{credits === 1 ? '' : 's'}
            </p>
          )}
        </motion.div>

        {/* Trust strip */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="flex flex-wrap justify-center gap-3 mb-8">
          {TRUST.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.text} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background: '#fff', border: `1px solid ${C.cardBorder}` }}>
                <Icon className="w-3.5 h-3.5" style={{ color: C.terra }} />
                <span className="text-xs font-semibold" style={{ color: C.charcoal }}>{t.text}</span>
              </div>
            );
          })}
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-sm font-medium mb-5 px-4 py-3 rounded-xl text-center max-w-lg mx-auto"
              style={{ background: C.redBg, color: C.red, border: `1px solid rgba(185,28,28,0.15)` }}>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pricing cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 items-stretch max-w-4xl mx-auto">
          {TIERS.map((tier, i) => {
            const Icon = tier.icon;
            const isLoading = loadingTier === tier.id;
            const isHovered = hoveredTier === tier.id;
            const dPrice = discountedPrice(tier.price, appliedDiscount);
            const isDiscounted = !!appliedDiscount && dPrice !== tier.price;

            return (
              <motion.div key={tier.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                onMouseEnter={() => setHoveredTier(tier.id)}
                onMouseLeave={() => setHoveredTier(null)}
                className="relative flex flex-col rounded-3xl h-full"
                style={{
                  background: C.card,
                  // Extra margin-top to give the floating badge breathing room so it doesn't clip
                  marginTop: '16px', 
                  border: tier.popular
                    ? `2px solid ${C.terra}`
                    : `1.5px solid ${C.cardBorder}`,
                  boxShadow: isHovered
                    ? tier.popular
                      ? `0 24px 56px ${C.terraGlow}`
                      : '0 16px 40px rgba(193,68,14,0.10)'
                    : tier.popular
                      ? `0 8px 32px ${C.terraGlow}`
                      : '0 4px 16px rgba(193,68,14,0.04)',
                  transform: isHovered ? 'translateY(-5px)' : 'translateY(0)',
                  transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                }}>

                {/* Floating Most Popular Badge, pulled out of DOM flow via absolute positioning */}
                {tier.popular && (
                  <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2 z-10 whitespace-nowrap">
                    <span
                      className="text-xs font-extrabold px-4 py-1.5 text-white shadow-sm uppercase tracking-wider"
                      style={{
                        background: `linear-gradient(90deg, ${C.terra}, ${C.terraLight})`,
                        borderRadius: '999px',
                        boxShadow: `0 4px 12px ${C.terraGlow}`,
                      }}>
                      Most Popular
                    </span>
                  </div>
                )}

                {/* The internal container structure is now 100% identical across ALL cards */}
                <div className="flex flex-col flex-1 p-6 pt-7 justify-between">
                  <div>
                    {/* Icon + Name */}
                    <div className="flex items-center gap-2 mb-6">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: C.faint }}>
                        <Icon className="w-4 h-4" style={{ color: C.terra }} />
                      </div>
                      <h3 className="text-base font-bold" style={{ color: C.charcoal }}>
                        {tier.label}
                      </h3>
                    </div>

                    {/* Price row */}
                    <div className="flex flex-wrap items-end gap-1.5 mb-4">
                      <span className="text-base font-bold self-start mt-1" style={{ color: C.muted }}>$</span>
                      <span className="text-4xl font-extrabold leading-none" style={{ color: C.charcoal }}>
                        {fmtMoney(isDiscounted ? dPrice : tier.price)}
                      </span>
                      {isDiscounted && (
                        <span className="text-base font-semibold self-start mt-1 line-through" style={{ color: C.muted }}>
                          ${tier.price}
                        </span>
                      )}
                      <span className="text-xs font-semibold self-end mb-0.5" style={{ color: C.muted }}>
                        one-time
                      </span>
                      {tier.save && !isDiscounted && (
                        <span className="self-end mb-0.5 text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: 'rgba(21,128,61,0.10)',
                            color: C.green,
                            border: '1px solid rgba(21,128,61,0.18)',
                          }}>
                          {tier.save}
                        </span>
                      )}
                    </div>

                    {/* Credits */}
                    <p className="text-sm font-bold mt-3 mb-6" style={{ color: C.terra }}>
                      {tier.credits} credits
                    </p>

                    {/* Example */}
                    <div className="flex items-start gap-2 mb-7">
                      <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: C.green }} />
                      <span className="text-xs leading-snug" style={{ color: C.charcoal }}>
                        Enough for {tier.example}
                      </span>
                    </div>
                  </div>

                  {/* CTA Wrapper */}
                  <div>
                    <button
                      onClick={() => handleBuy(tier)}
                      disabled={loadingTier !== null}
                      className="w-full rounded-xl py-3 text-sm font-bold"
                      style={{
                        transition: 'background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease',
                        transform: isHovered && !isLoading ? 'scale(1.02)' : 'scale(1)',
                        opacity: isLoading ? 0.7 : 1,
                        ...(tier.popular
                          ? {
                              // Creator (popular): always terra gradient, lightens slightly on hover
                              background: isHovered
                                ? `linear-gradient(135deg, #CE5520, ${C.terraLight})`
                                : `linear-gradient(135deg, ${C.terra}, ${C.terraLight})`,
                              color: '#fff',
                              border: 'none',
                              boxShadow: `0 4px 16px ${C.terraGlow}`,
                            }
                          : {
                              // Starter + Studio, resting: white with terra border. Hover: very light terra tint
                              background: isHovered ? 'rgba(193,68,14,0.06)' : '#fff',
                              color: C.terra,
                              border: `1.5px solid rgba(193,68,14,0.28)`,
                            }
                        ),
                      }}
                    >
                      {isLoading ? 'Opening checkout…' : tier.cta}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Promo code */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-2xl p-5 mb-6 mx-auto max-w-sm"
          style={{ background: C.card, border: `1.5px solid ${C.cardBorder}` }}>
          <div className="flex items-center justify-center gap-1.5 mb-3">
            <Ticket className="w-3.5 h-3.5" style={{ color: C.terra }} />
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: C.muted }}>
              Have a promo code?
            </p>
          </div>
          {appliedDiscount ? (
            <div className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5"
              style={{ background: 'rgba(21,128,61,0.08)', border: '1px solid rgba(21,128,61,0.18)' }}>
              <span className="text-sm font-bold uppercase tracking-wide" style={{ color: C.green }}>
                {appliedDiscount.code} · {formatDiscount(appliedDiscount)}
              </span>
              <button
                type="button"
                onClick={clearDiscount}
                className="text-xs font-semibold underline underline-offset-2"
                style={{ color: C.muted }}
              >
                Remove
              </button>
            </div>
          ) : (
            <form onSubmit={handleApply} className="flex gap-2">
              <input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Enter code"
                autoCapitalize="characters"
                className="flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold uppercase tracking-wide outline-none"
                style={{
                  background: '#fff',
                  color: C.charcoal,
                  border: `1.5px solid ${C.cardBorder}`,
                }}
              />
              <button
                type="submit"
                disabled={redeeming || !promoCode.trim()}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-white border-0"
                style={{
                  background: `linear-gradient(135deg, ${C.terra}, ${C.terraLight})`,
                  opacity: redeeming || !promoCode.trim() ? 0.6 : 1,
                  boxShadow: `0 4px 12px ${C.terraGlow}`,
                }}
              >
                {redeeming ? 'Applying…' : 'Apply'}
              </button>
            </form>
          )}
          <AnimatePresence>
            {promoMsg && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-xs font-semibold text-center mt-3"
                style={{ color: promoMsg.type === 'success' ? C.green : C.red }}>
                {promoMsg.text}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Credit cost reference */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="rounded-2xl p-5 mb-6 mx-auto max-w-sm"
          style={{ background: C.card, border: `1.5px solid ${C.cardBorder}` }}>
          <p className="text-xs font-bold text-center mb-3 uppercase tracking-wider" style={{ color: C.muted }}>
            Credits per video
          </p>
          <div className="flex justify-around">
            {COST_TABLE.map((row) => (
              <div key={row.label} className="text-center">
                <p className="text-2xl font-extrabold" style={{ color: C.terra }}>{row.credits}</p>
                <p className="text-xs font-semibold" style={{ color: C.charcoal }}>credits</p>
                <p className="text-xs mt-0.5" style={{ color: C.muted }}>{row.label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-center mt-3" style={{ color: C.muted }}>
            Credits are based on the video length you choose, not the number of clips.
          </p>
        </motion.div>

        {/* Credit history */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-2xl p-5 mx-auto max-w-2xl"
          style={{ background: C.card, border: `1.5px solid ${C.cardBorder}` }}>
          <div className="flex items-center justify-center gap-1.5 mb-3">
            <Receipt className="w-3.5 h-3.5" style={{ color: C.terra }} />
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: C.muted }}>
              Credit history
            </p>
          </div>
          {historyError ? (
            <p className="text-xs text-center py-3" style={{ color: C.muted }}>
              We couldn't load your history. Please refresh to try again.
            </p>
          ) : history === null ? (
            <p className="text-xs text-center py-3" style={{ color: C.muted }}>Loading…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-center py-3" style={{ color: C.muted }}>No credit activity yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ color: C.muted }}>
                    <th className="text-left font-semibold py-2 pr-3">Date</th>
                    <th className="text-left font-semibold py-2 pr-3">Description</th>
                    <th className="text-right font-semibold py-2 pr-3">Credits</th>
                    <th className="text-right font-semibold py-2">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((tx) => {
                    const amount = Number(tx.amount) || 0;
                    return (
                      <tr key={tx.id} style={{ borderTop: `1px solid ${C.faint}`, color: C.charcoal }}>
                        <td className="py-2 pr-3 whitespace-nowrap">{fmtTxDate(tx.created_at)}</td>
                        <td className="py-2 pr-3">
                          {TX_LABELS[tx.type] || 'Credit change'}
                          {tx.video_title && (
                            <span className="block truncate max-w-[220px]" style={{ color: C.muted }} title={tx.video_title}>
                              {tx.video_title}
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-right font-bold whitespace-nowrap"
                          style={{ color: amount >= 0 ? C.green : C.charcoal }}>
                          {amount > 0 ? `+${amount}` : amount}
                        </td>
                        <td className="py-2 text-right whitespace-nowrap">{tx.balance_after}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {history.length < historyTotal && (
                <div className="text-center mt-3">
                  <button type="button" onClick={loadMoreHistory} disabled={loadingMore}
                    className="text-xs font-semibold disabled:opacity-60" style={{ color: C.terra }}>
                    {loadingMore ? 'Loading…' : 'Show more'}
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}