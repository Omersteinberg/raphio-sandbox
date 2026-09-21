import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

const ONBOARDING_PATH = '/welcome';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // One-time onboarding question. Strict `=== null`: the backend sends null for
  // "unanswered" and omits the field entirely until the feature ships, and an
  // undefined useCase must never redirect. /welcome is exempt or it would loop.
  if (user.useCase === null && location.pathname !== ONBOARDING_PATH) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={ONBOARDING_PATH} replace state={{ from }} />;
  }

  return children;
}

export default ProtectedRoute;