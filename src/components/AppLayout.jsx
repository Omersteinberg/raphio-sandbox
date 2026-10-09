import { Outlet, useLocation, matchPath } from 'react-router-dom';
import AppHeader from './AppHeader';
import ProtectedRoute from './ProtectedRoute';
import MockDevPanel from './MockDevPanel';

// The timeline editor builds its own unified header (logo, breadcrumb, undo,
// export, avatar) to match its reference design, so the global AppHeader
// would otherwise stack a second bar above it. Matched by exact route
// pattern, not a broader "looks like an editor" heuristic, so no other route
// is ever affected by this.
const NO_GLOBAL_HEADER_ROUTES = ['/video/:id/edit'];

export default function AppLayout() {
  const location = useLocation();
  const hideGlobalHeader = NO_GLOBAL_HEADER_ROUTES.some((pattern) =>
    matchPath(pattern, location.pathname)
  );

  return (
    <ProtectedRoute>
      {/* h-[100dvh] (dynamic viewport height) not h-screen: on mobile 100vh is
          taller than the visible area, which pushed the editor's pinned bottom
          action bar below the browser chrome (you had to scroll to reach it). */}
      <div className="flex flex-col h-[100dvh]">
        {!hideGlobalHeader && <AppHeader />}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>
      <MockDevPanel />
    </ProtectedRoute>
  );
}
