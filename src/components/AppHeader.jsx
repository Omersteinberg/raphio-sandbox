import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { Plus, Video, Zap, CreditCard, LogOut, ChevronDown } from 'lucide-react';

export default function AppHeader() {
  const { user, credits, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!user) return null;

  const initials = (user.username || user.email || '?').charAt(0).toUpperCase();
  const isLow = (credits ?? 0) < 20;
  const isActive = (path) => location.pathname === path;

  // Start a fresh creation. navigate('/create') is a no-op when already on
  // /create (the route doesn't change, so the wizard keeps its session state),
  // so force a clean reload — same intentional reset ResultStep uses.
  const goToCreate = () => {
    if (location.pathname === '/create') {
      window.location.href = '/create';
    } else {
      navigate('/create');
    }
  };

  return (
    <header
      className="h-14 flex items-center justify-between px-5 shrink-0 z-50 relative font-figtree"
      style={{
        background: 'rgba(255,250,247,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(193,68,14,0.10)',
      }}
    >
      {/* Left: Logo + nav */}
      <div className="flex items-center gap-6">
        <button
          onClick={goToCreate}
          className="flex items-center shrink-0 hover:opacity-80 transition-opacity"
          aria-label="Go to home"
        >
          <img src="/Logo.svg" alt="Raphio" className="h-7" />
        </button>

        <div style={{ width: 1, height: 20, background: 'rgba(193,68,14,0.15)' }} />

        <nav className="flex items-center gap-1">
          <button
            onClick={goToCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
            style={
              isActive('/create')
                ? { background: 'rgba(193,68,14,0.08)', color: '#C1440E' }
                : { color: '#2C2420', background: 'transparent' }
            }
            onMouseEnter={e => {
              if (!isActive('/create')) {
                e.currentTarget.style.background = 'rgba(193,68,14,0.06)';
                e.currentTarget.style.color = '#C1440E';
              }
            }}
            onMouseLeave={e => {
              if (!isActive('/create')) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#2C2420';
              }
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            Create
          </button>

          <button
            onClick={() => navigate('/videos')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
            style={
              isActive('/videos')
                ? { background: 'rgba(193,68,14,0.08)', color: '#C1440E' }
                : { color: '#7A6A62', background: 'transparent' }
            }
            onMouseEnter={e => {
              if (!isActive('/videos')) {
                e.currentTarget.style.background = 'rgba(193,68,14,0.06)';
                e.currentTarget.style.color = '#C1440E';
              }
            }}
            onMouseLeave={e => {
              if (!isActive('/videos')) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#7A6A62';
              }
            }}
          >
            <Video className="w-3.5 h-3.5" />
            My Videos
          </button>
        </nav>
      </div>

      {/* Right: Credits + Avatar */}
      <div className="flex items-center gap-2.5" ref={dropdownRef}>

        {/* Credits pill */}
        <button
          onClick={() => navigate('/buy-credits')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
          style={{
            background: isLow ? 'rgba(193,68,14,0.10)' : 'rgba(240,234,229,0.8)',
            color: isLow ? '#C1440E' : '#7A6A62',
            border: isLow ? '1px solid rgba(193,68,14,0.25)' : '1px solid rgba(193,68,14,0.12)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = isLow ? 'rgba(193,68,14,0.16)' : 'rgba(193,68,14,0.08)';
            e.currentTarget.style.color = '#C1440E';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = isLow ? 'rgba(193,68,14,0.10)' : 'rgba(240,234,229,0.8)';
            e.currentTarget.style.color = isLow ? '#C1440E' : '#7A6A62';
          }}
          title={isLow ? 'Running low, top up credits' : 'Buy more credits'}
        >
          <Zap className="w-3 h-3" style={{ color: isLow ? '#C1440E' : '#E8603C' }} />
          <span>{credits ?? '...'}</span>
          <span style={{ color: isLow ? '#C1440E' : '#9B8B83', fontWeight: 500 }}>credits</span>
          {isLow && (
            <span
              className="ml-0.5 px-1.5 py-0.5 rounded-full text-white"
              style={{ fontSize: '9px', background: '#C1440E', lineHeight: 1 }}
            >
              Low
            </span>
          )}
        </button>

        {/* Avatar button */}
        <button
          onClick={() => setDropdownOpen(v => !v)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-full transition-all"
          style={{
            background: dropdownOpen ? 'rgba(193,68,14,0.08)' : 'transparent',
            border: '1px solid rgba(193,68,14,0.15)',
          }}
          onMouseEnter={e => { if (!dropdownOpen) e.currentTarget.style.background = 'rgba(193,68,14,0.06)'; }}
          onMouseLeave={e => { if (!dropdownOpen) e.currentTarget.style.background = 'transparent'; }}
          aria-label="Account menu"
          aria-expanded={dropdownOpen}
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #C1440E, #E8603C)' }}
          >
            {initials}
          </div>
          <ChevronDown
            className={`w-3 h-3 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : 'rotate-0'}`}
            style={{ color: '#7A6A62' }}
          />
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div
            className="absolute right-4 top-[58px] w-56 rounded-2xl overflow-hidden z-50"
            style={{
              background: 'rgba(255,250,247,0.98)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(193,68,14,0.12)',
              boxShadow: '0 8px 32px rgba(44,36,32,0.12), 0 2px 8px rgba(44,36,32,0.06)',
            }}
          >
            {/* User info */}
            <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(193,68,14,0.08)' }}>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg, #C1440E, #E8603C)' }}
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#2C2420' }}>
                    {user.username || 'Account'}
                  </p>
                  {user.email && (
                    <p className="text-xs truncate" style={{ color: '#9B8B83' }}>{user.email}</p>
                  )}
                </div>
              </div>

              {/* Credit summary inside dropdown */}
              <div
                className="mt-2.5 flex items-center justify-between px-2.5 py-1.5 rounded-xl"
                style={{ background: 'rgba(193,68,14,0.06)' }}
              >
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3 h-3" style={{ color: '#E8603C' }} />
                  <span className="text-xs font-semibold" style={{ color: '#2C2420' }}>
                    {credits ?? '...'} credits
                  </span>
                </div>
                {isLow && (
                  <span className="text-xs font-semibold" style={{ color: '#C1440E' }}>
                    Running low
                  </span>
                )}
              </div>
            </div>

            {/* Top up */}
            <div className="py-1.5">
              <button
                onClick={() => { setDropdownOpen(false); navigate('/buy-credits'); }}
                className="w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors"
                style={{ color: '#2C2420' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(193,68,14,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <CreditCard className="w-4 h-4 shrink-0" style={{ color: '#9B8B83' }} />
                <span className="text-sm font-medium">Top up credits</span>
              </button>
            </div>

            {/* Sign out */}
            <div className="py-1.5" style={{ borderTop: '1px solid rgba(193,68,14,0.08)' }}>
              <button
                onClick={() => { setDropdownOpen(false); logout(); }}
                className="w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors"
                style={{ color: '#9B8B83' }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(185,28,28,0.05)';
                  e.currentTarget.style.color = '#B91C1C';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#9B8B83';
                }}
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">Sign out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}