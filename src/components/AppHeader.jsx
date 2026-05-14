import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

export default function AppHeader() {
  const { user, credits, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!user) return null;

  const initials = (user.username || user.email || '?').charAt(0).toUpperCase();

  return (
    <header className="h-14 flex items-center justify-between px-4 bg-white shrink-0 z-50 relative">
      {/* Left: Logo / brand */}
      <button
        onClick={() => navigate('/create')}
        className="text-lg font-bold text-gray-900 hover:opacity-80 transition-opacity"
      >
        <img src="/Logo.svg" alt="Raphio" className="h-7" />
      </button>

      {/* Right: Credits + Avatar */}
      <div className="flex items-center gap-3" ref={menuRef}>
        {/* Credits pill */}
        <button
          onClick={() => navigate('/buy-credits')}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4 text-[#6691FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v12M6 12h12" strokeLinecap="round" />
          </svg>
          <span className="font-bold text-[#6691FF]">{credits ?? '...'}</span>
          <span className="hidden sm:inline">credits</span>
        </button>

        {/* Avatar button */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-9 h-9 rounded-full bg-[#4F46E5] text-white flex items-center justify-center text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          {initials}
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-4 top-12 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
            {/* User info */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user.username}</p>
                  {user.email && (
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  )}
                </div>
              </div>
            </div>

            {/* My Videos */}
            <button
              onClick={() => { setOpen(false); navigate('/videos'); }}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              My Videos
            </button>

            {/* Buy Credits */}
            <button
              onClick={() => { setOpen(false); navigate('/buy-credits'); }}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Buy Credits
            </button>

            {/* Sign Out */}
            <button
              onClick={() => { setOpen(false); logout(); }}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
