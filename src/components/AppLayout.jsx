import { Outlet } from 'react-router-dom';
import AppHeader from './AppHeader';
import ProtectedRoute from './ProtectedRoute';

export default function AppLayout() {
  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen">
        <AppHeader />
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>
    </ProtectedRoute>
  );
}
