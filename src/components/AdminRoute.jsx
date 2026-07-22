import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

// UI convenience gate only - the real authorization is requireAdmin on the backend.
// AppLayout already enforces auth; this additionally keeps non-admins out of the page.
function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/create" replace />;

  return children;
}

export default AdminRoute;
