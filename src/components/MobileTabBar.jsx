import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Video } from 'lucide-react';

// Primary nav for small screens — the top header drops these labels below `md`
// (ui-ux-pro-max: bottom nav for top-level destinations, icon + label, max 5 items).
export default function MobileTabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  const goToCreate = () => {
    if (location.pathname === '/create') {
      window.location.href = '/create';
    } else {
      navigate('/create');
    }
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch font-figtree"
      style={{
        height: 56,
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'rgba(255,250,247,0.96)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(193,68,14,0.10)',
      }}
    >
      <button
        onClick={goToCreate}
        className="flex-1 flex flex-col items-center justify-center gap-0.5"
        style={{ color: isActive('/create') ? '#C1440E' : '#7A6A62' }}
        aria-label="Create a video"
        aria-current={isActive('/create') ? 'page' : undefined}
      >
        <Plus className="w-5 h-5" />
        <span className="text-[11px] font-semibold">Create</span>
      </button>
      <button
        onClick={() => navigate('/videos')}
        className="flex-1 flex flex-col items-center justify-center gap-0.5"
        style={{ color: isActive('/videos') ? '#C1440E' : '#7A6A62' }}
        aria-label="My videos"
        aria-current={isActive('/videos') ? 'page' : undefined}
      >
        <Video className="w-5 h-5" />
        <span className="text-[11px] font-semibold">My Videos</span>
      </button>
    </nav>
  );
}
