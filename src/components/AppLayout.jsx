import { Outlet } from 'react-router-dom';
import AppHeader from './AppHeader';
import MobileTabBar from './MobileTabBar';
import ProtectedRoute from './ProtectedRoute';

export default function AppLayout() {
  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen">
        <AppHeader />
        <div className="flex-1 overflow-auto pb-14 md:pb-0">
          <Outlet />
        </div>
        <MobileTabBar />
      </div>
    </ProtectedRoute>
  );
}
