import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth.jsx';
import { createCheckoutSession } from '../services/credits';
import { Button } from '../components/ui/button';
import { CheckCircle, Sparkles, Zap, Crown, ArrowLeft } from 'lucide-react';

const TIERS = [
  { id: 10, credits: 10, price: 10, label: 'Starter', icon: Sparkles, gradient: 'linear-gradient(135deg, #FFF0E6, #FFE4D6)' },
  { id: 30, credits: 30, price: 28, label: 'Popular', popular: true, icon: Zap, gradient: 'linear-gradient(135deg, #F97066, #FB923C)' },
  { id: 50, credits: 50, price: 45, label: 'Best Value', icon: Crown, gradient: 'linear-gradient(135deg, #EDE9FE, #E0D7FC)' },
];

export default function BuyCreditsPage() {
  const { credits, refreshCredits } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loadingTier, setLoadingTier] = useState(null);
  const [error, setError] = useState('');

  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  useEffect(() => {
    if (success !== 'true') return;

    let attempts = 0;
    const poll = setInterval(async () => {
      await refreshCredits();
      attempts++;
      if (attempts >= 10) clearInterval(poll);
    }, 2000);

    return () => clearInterval(poll);
  }, [success, refreshCredits]);

  const handleBuyCredits = async (tier) => {
    setLoadingTier(tier);
    setError('');
    try {
      const { url } = await createCheckoutSession(tier);
      window.open(url, '_blank');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start checkout');
    } finally {
      setLoadingTier(null);
    }
  };

  if (success === 'true') {
    return (
      <div
        className="h-full flex items-center justify-center py-12 px-4 font-figtree"
        style={{ background: "linear-gradient(180deg, #FFF8F5 0%, #FFFFFF 60%, #F8F7FF 100%)" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full rounded-3xl p-10 text-center border border-white/60 shadow-lg"
          style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)" }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: "rgba(22,163,74,0.1)" }}
          >
            <CheckCircle className="w-8 h-8" style={{ color: "#16A34A" }} />
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: "#2D2235" }}>Payment Successful!</h2>
          <p className="mb-2" style={{ color: "#6B5E7B" }}>Your credits have been added.</p>
          <p className="text-2xl font-bold mb-6" style={{ color: "#F97066" }}>
            {credits ?? '...'} credits
          </p>
          <Button
            onClick={() => navigate('/create')}
            className="w-full text-white rounded-xl py-6 text-base font-bold border-0 shadow-md shadow-orange-200/50 hover:shadow-lg transition-all"
            style={{ background: "linear-gradient(135deg, #F97066, #FB923C)" }}
          >
            Start Creating
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col items-center py-12 px-4 font-figtree"
      style={{ background: "linear-gradient(180deg, #FFF8F5 0%, #FFFFFF 60%, #F8F7FF 100%)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-2" style={{ color: "#2D2235" }}>
            {canceled === 'true' ? 'Checkout Canceled' : 'Get More Credits'}
          </h2>
          <p className="text-base mb-3" style={{ color: "#6B5E7B" }}>
            Each video costs 10 credits. Pick a plan that works for you.
          </p>
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(240,234,255,0.8)" }}
          >
            <span className="text-sm" style={{ color: "#6B5E7B" }}>Your balance:</span>
            <span className="text-lg font-bold" style={{ color: "#F97066" }}>{credits ?? 0}</span>
            <span className="text-sm" style={{ color: "#6B5E7B" }}>credits</span>
          </div>
        </div>

        {error && (
          <div
            className="px-4 py-3 rounded-xl text-sm font-medium mb-6 max-w-2xl mx-auto"
            style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}
          >
            {error}
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {TIERS.map((tier, index) => {
            const Icon = tier.icon;
            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative rounded-3xl p-6 text-center flex flex-col border transition-all hover:shadow-lg ${
                  tier.popular ? 'md:-mt-3 md:mb-0' : ''
                }`}
                style={
                  tier.popular
                    ? { background: "linear-gradient(165deg, #2D2235, #3D2E4A)", border: "1px solid rgba(249,112,102,0.3)" }
                    : { background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", borderColor: "rgba(240,234,255,0.8)" }
                }
              >
                {tier.popular && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-4 py-1 rounded-full"
                    style={{ background: "linear-gradient(135deg, #F97066, #FB923C)" }}
                  >
                    Most Popular
                  </span>
                )}

                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: tier.popular ? "rgba(249,112,102,0.2)" : tier.gradient }}
                >
                  <Icon
                    className="w-6 h-6"
                    style={{ color: tier.popular ? "#FB923C" : "#F97066" }}
                  />
                </div>

                <h3
                  className="text-base font-bold mb-1"
                  style={{ color: tier.popular ? "rgba(255,255,255,0.7)" : "#6B5E7B" }}
                >
                  {tier.label}
                </h3>

                <p
                  className="text-4xl font-extrabold my-3"
                  style={{ color: tier.popular ? "#fff" : "#2D2235" }}
                >
                  ${tier.price}
                </p>

                <p
                  className="text-sm font-medium mb-1"
                  style={{ color: tier.popular ? "rgba(255,255,255,0.6)" : "#6B5E7B" }}
                >
                  {tier.credits} credits
                </p>
                <p
                  className="text-xs mb-5"
                  style={{ color: tier.popular ? "rgba(255,255,255,0.4)" : "#9B8FA8" }}
                >
                  That's {tier.credits / 10} video{tier.credits / 10 > 1 ? 's' : ''}
                </p>

                <Button
                  onClick={() => handleBuyCredits(tier.id)}
                  disabled={loadingTier !== null}
                  className={`w-full mt-auto rounded-xl py-5 text-base font-bold border-0 transition-all ${
                    loadingTier === tier.id ? 'opacity-70' : ''
                  }`}
                  style={
                    tier.popular
                      ? { background: "linear-gradient(135deg, #F97066, #FB923C)", color: "#fff", boxShadow: "0 4px 16px rgba(249,112,102,0.3)" }
                      : { background: "#F0EAFF", color: "#2D2235" }
                  }
                >
                  {loadingTier === tier.id ? 'Opening checkout...' : 'Buy Now'}
                </Button>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center">
          <button
            onClick={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate('/create');
            }}
            className="inline-flex items-center gap-2 text-sm font-semibold transition-colors hover:opacity-70"
            style={{ color: "#6B5E7B" }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </motion.div>
    </div>
  );
}
