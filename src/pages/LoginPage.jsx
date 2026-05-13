import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Play } from 'lucide-react';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/videos');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center font-figtree py-12 px-4 sm:px-6 lg:px-8"
      style={{ background: "linear-gradient(180deg, #FFF8F5 0%, #FFFFFF 60%, #F8F7FF 100%)" }}
    >
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #F97066, #FB923C)" }}
          >
            <Play className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="text-2xl font-bold" style={{ color: "#2D2235" }}>Raphio</span>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-8 sm:p-10 border border-white/60 shadow-lg"
          style={{ background: "rgba(255, 255, 255, 0.75)", backdropFilter: "blur(20px)" }}
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2" style={{ color: "#2D2235" }}>
              Welcome back
            </h2>
            <p style={{ color: "#6B5E7B" }}>
              Sign in to keep creating videos
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div
                className="px-4 py-3 rounded-xl text-sm font-medium"
                style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}
              >
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-semibold mb-2" style={{ color: "#2D2235" }}>
                Username
              </label>
              <Input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username"
                className="w-full rounded-xl border-gray-200 focus:border-orange-300 focus:ring-orange-200 py-3"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold mb-2" style={{ color: "#2D2235" }}>
                Password
              </label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="w-full rounded-xl border-gray-200 focus:border-orange-300 focus:ring-orange-200 py-3"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full text-white rounded-xl py-6 text-base font-bold border-0 shadow-md shadow-orange-200/50 hover:shadow-lg hover:shadow-orange-200/60 transition-all"
              style={{ background: "linear-gradient(135deg, #F97066, #FB923C)" }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>

            <p className="text-center text-sm pt-2" style={{ color: "#6B5E7B" }}>
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-semibold hover:underline"
                style={{ color: "#F97066" }}
              >
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
