import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { createCheckoutSession } from '../services/credits';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

export default function BuyCreditsPage() {
  const { credits, refreshCredits } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
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

  const handleBuyCredits = async () => {
    setLoading(true);
    setError('');
    try {
      const { url } = await createCheckoutSession();
      window.location.href = url;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start checkout');
    } finally {
      setLoading(false);
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
    <div className="h-full flex items-center justify-center py-12 px-4">
      <Card className="max-w-md w-full p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {canceled === 'true' ? 'Checkout Canceled' : 'Buy Credits'}
        </h2>

        <p className="text-gray-600 mb-2">
          You need credits to generate videos. Each video costs 10 credits.
        </p>
        <p className="text-lg font-semibold text-gray-900 mb-6">
          Current balance: <span className="text-primary">{credits ?? 0}</span> credits
        </p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <Button
          onClick={handleBuyCredits}
          disabled={loading}
          className="w-full mb-3"
        >
          {loading ? 'Redirecting...' : 'Buy Credits'}
        </Button>

        {credits > 0 && (
          <Button
            variant="outline"
            onClick={() => navigate('/create')}
            className="w-full"
          >
            Back to Creator
          </Button>
        )}
      </Card>
    </div>
  );
}
