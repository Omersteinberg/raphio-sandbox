import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { createCheckoutSession } from '../services/credits';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

const TIERS = [
  { id: 10, credits: 10, price: 10, label: 'Starter' },
  { id: 30, credits: 30, price: 28, label: 'Popular', popular: true },
  { id: 50, credits: 50, price: 45, label: 'Best Value' },
];

export default function BuyCreditsPage() {
  const { credits, refreshCredits } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loadingTier, setLoadingTier] = useState(null);
  const [error, setError] = useState('');

  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  // Poll for credit update after successful payment
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
      <div className="h-full flex items-center justify-center py-12 px-4">
        <Card className="max-w-md w-full p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Successful!</h2>
          <p className="text-gray-600 mb-2">Your credits have been added to your account.</p>
          <p className="text-lg font-semibold text-primary mb-6">
            Current balance: {credits ?? '...'} credits
          </p>
          <Button onClick={() => navigate('/create')} className="w-full">
            Start Creating
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center py-12 px-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {canceled === 'true' ? 'Checkout Canceled' : 'Buy Credits'}
      </h2>
      <p className="text-gray-600 mb-1">
        You need credits to generate videos. Each video costs 10 credits.
      </p>
      <p className="text-lg font-semibold text-gray-900 mb-8">
        Current balance: <span className="text-primary">{credits ?? 0}</span> credits
      </p>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 max-w-2xl w-full">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full mb-6">
        {TIERS.map((tier) => (
          <Card
            key={tier.id}
            className={`p-6 text-center relative flex flex-col ${
              tier.popular ? 'border-primary border-2 shadow-lg' : ''
            }`}
          >
            {tier.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                Most Popular
              </span>
            )}
            <h3 className="text-lg font-semibold text-gray-900 mt-2">{tier.label}</h3>
            <p className="text-4xl font-bold text-gray-900 my-3">
              ${tier.price}
            </p>
            <p className="text-gray-600 mb-1">
              {tier.credits} credits
            </p>
            <p className="text-sm text-gray-400 mb-4">
              {tier.credits / 10} video{tier.credits / 10 > 1 ? 's' : ''}
            </p>
            <Button
              onClick={() => handleBuyCredits(tier.id)}
              disabled={loadingTier !== null}
              className="w-full mt-auto"
              variant={tier.popular ? 'default' : 'outline'}
            >
              {loadingTier === tier.id ? 'Redirecting...' : 'Buy Now'}
            </Button>
          </Card>
        ))}
      </div>

      {credits > 0 && (
        <Button
          variant="outline"
          onClick={() => navigate('/create')}
        >
          Back to Creator
        </Button>
      )}
    </div>
  );
}
