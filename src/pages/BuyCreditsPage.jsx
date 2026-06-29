import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion,  AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth.jsx';
import { createCheckoutSession } from '../services/credits';
import { takeReturnTo } from '../lib/returnTo';
import { Button } from '../components/ui/button';
import {
  CheckCircle, XCircle, ArrowLeft, Sparkles,
  Zap, Layers, Crown, Infinity, ShieldCheck, Clock,
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

const TIERS = [
  {
    id: 'free', stripeId: null, label: 'Free', price: 0, credits: 3,
    save: null, icon: Sparkles,
    features: [
      { text: '1 short video (≤15s)',    ok: true },
    ],
    cta: 'Start Free', popular: false,
  },
  {
    id: 'starter', stripeId: 6, label: 'Starter', price: 29, credits: 6,
    save: null, icon: Zap,
    features: [
      { text: '2 short videos (≤15s)',        ok: true },
    ],
    cta: 'Buy Starter', popular: false,
  },
  {
    id: 'creator', stripeId: 12, label: 'Creator', price: 55, credits: 12,
    save: 'Save 8%', icon: Layers,
    features: [
      { text: '2 medium videos (≤30s)',  ok: true },
    ],
    cta: 'Buy Creator Pack', popular: true,
  },
  {
    id: 'studio', stripeId: 24, label: 'Studio', price: 99, credits: 24,
    save: 'Save 17%', icon: Crown,
    features: [
      { text: '2 long videos (≤60s)',        ok: true },
    ],
    cta: 'Buy Studio Pack', popular: false,
  },
];

const COST_TABLE = [
  { label: '15s', credits: 3 },
  { label: '30s', credits: 6 },
  { label: '45s', credits: 9 },
  { label: '60s', credits: 12 },
];

const TRUST = [
  { icon: Infinity,    text: 'Credits never expire' },
  { icon: ShieldCheck, text: '30-day money back on Starter' },
  { icon: Clock,       text: 'No subscription required' },
];

export default function BuyCreditsPage() {
  const { credits, refreshCredits } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loadingTier, setLoadingTier] = useState(null);
  const [hoveredTier, setHoveredTier] = useState(null);
  const [error, setError] = useState('');
  const [returnPath, setReturnPath] = useState(null);

  const success  = searchParams.get('success');
  const canceled = searchParams.get('canceled');

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
    if (!tier.stripeId) { navigate('/create'); return; }
    setLoadingTier(tier.id);
    setError('');
    try {
      const { url } = await createCheckoutSession(tier.stripeId);
      window.location.href = url;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start checkout');
    } finally {
      setLoadingTier(null);
    }
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

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-4">
          <h1 className="text-4xl font-extrabold mb-3 leading-tight" style={{ color: C.charcoal }}>
            {canceled === 'true' ? 'Pick up where you left off' : 'Top up your credits'}
          </h1>
          <p className="text-sm mb-5" style={{ color: C.muted }}>
            Buy once. Create whenever you want.
          </p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 items-stretch">
          {TIERS.map((tier, i) => {
            const Icon = tier.icon;
            const isLoading = loadingTier === tier.id;
            const isHovered = hoveredTier === tier.id;

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

                {/* Floating Most Popular Badge — Pulled out of DOM flow via absolute positioning */}
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
                <div className="flex flex-col flex-1 p-6 pt-4 justify-between">
                  <div>
                    {/* Badge row */}
                    {tier.badge && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full inline-block mb-3"
                        style={{ background: C.faint, color: C.muted }}>
                        {tier.badge}
                      </span>
                    )}
                    {!tier.badge && <div className="mb-3" style={{ height: '28px' }} />}

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
                    <div className="flex items-end gap-1.5 mb-4">
                      {tier.price === 0
                        ? <span className="text-4xl font-extrabold leading-none" style={{ color: C.charcoal }}>
                            Free
                          </span>
                        : <>
                            <span className="text-base font-bold self-start mt-1" style={{ color: C.muted }}>$</span>
                            <span className="text-4xl font-extrabold leading-none" style={{ color: C.charcoal }}>
                              {tier.price}
                            </span>
                            <span className="text-xs font-semibold self-end mb-0.5" style={{ color: C.muted }}>
                              one-time
                            </span>
                            {tier.save && (
                              <span className="self-end mb-0.5 text-xs font-bold px-2 py-0.5 rounded-full"
                                style={{
                                  background: 'rgba(21,128,61,0.10)',
                                  color: C.green,
                                  border: '1px solid rgba(21,128,61,0.18)',
                                }}>
                                {tier.save}
                              </span>
                            )}
                          </>
                      }
                    </div>

                    {/* Credits */}
                    <p className="text-sm font-bold mt-3 mb-6" style={{ color: C.terra }}>
                      {tier.credits} credits
                    </p>

                    {/* Feature list */}
                    <ul className="flex flex-col gap-3 mb-7">
                      {tier.features.map((f) => (
                        <li key={f.text} className="flex items-start gap-2">
                          {f.ok
                            ? <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                                style={{ color: C.green }} />
                            : <XCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                                style={{ color: 'rgba(193,68,14,0.35)' }} />
                          }
                          <span className="text-xs leading-snug" style={{ color: C.charcoal }}>
                            {f.text}
                          </span>
                        </li>
                      ))}
                    </ul>
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
                              // Creator (popular) — always terra gradient, lightens slightly on hover
                              background: isHovered
                                ? `linear-gradient(135deg, #CE5520, ${C.terraLight})`
                                : `linear-gradient(135deg, ${C.terra}, ${C.terraLight})`,
                              color: '#fff',
                              border: 'none',
                              boxShadow: `0 4px 16px ${C.terraGlow}`,
                            }
                          : tier.price === 0
                          ? {
                              // Free — resting: faint beige. Hover: slightly lighter warm grey
                              background: isHovered ? '#EDE8E2' : C.faint,
                              color: C.charcoal,
                              border: `1.5px solid ${C.cardBorder}`,
                            }
                          : {
                              // Starter + Studio — resting: white with terra border. Hover: very light terra tint
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

        {/* Bottom CTA */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
          className="text-center py-4 rounded-2xl"
          style={{ background: C.faint, border: `1px solid ${C.cardBorder}` }}>
          <p className="text-sm font-semibold mb-1" style={{ color: C.charcoal }}>Not sure yet?</p>
          <p className="text-xs mb-3" style={{ color: C.muted }}>Start with free credits to explore the platform. No card needed.</p>
          <button onClick={() => navigate('/create')}
            className="text-sm font-bold underline underline-offset-2 transition-opacity hover:opacity-60"
            style={{ color: C.terra }}>
            Try it free →
          </button>
        </motion.div>

      </div>
    </div>
  );
}