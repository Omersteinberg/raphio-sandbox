import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { Plus, Video, Zap, CreditCard, LogOut, ChevronDown, Menu, X, Settings, Ticket } from 'lucide-react';

export default function AppHeader() {
  const { user, credits, logout, isAdmin } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

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
  // so force a clean reload, same intentional reset ResultStep uses.
  const goToCreate = () => {
    if (location.pathname === '/create') {
      window.location.href = '/create';
    } else {
      navigate('/create');
    }
  };

  return (
    <>
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

        <div className="hidden md:block" style={{ width: 1, height: 20, background: 'rgba(193,68,14,0.15)' }} />

        <nav className="hidden md:flex items-center gap-1">
          <button
            data-tour="nav-create"
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
            data-tour="nav-videos"
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

          {isAdmin && (
            <button
              onClick={() => navigate('/admin/promos')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
              style={
                isActive('/admin/promos')
                  ? { background: 'rgba(193,68,14,0.08)', color: '#C1440E' }
                  : { color: '#7A6A62', background: 'transparent' }
              }
              onMouseEnter={e => {
                if (!isActive('/admin/promos')) {
                  e.currentTarget.style.background = 'rgba(193,68,14,0.06)';
                  e.currentTarget.style.color = '#C1440E';
                }
              }}
              onMouseLeave={e => {
                if (!isActive('/admin/promos')) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#7A6A62';
                }
              }}
            >
              <Ticket className="w-3.5 h-3.5" />
              Promo Codes
            </button>
          )}
        </nav>
      </div>

      {/* Right: Credits + Avatar (desktop only) */}
      <div className="hidden md:flex items-center gap-2.5" ref={dropdownRef}>

        {/* Credits pill */}
        <button
          data-tour="nav-credits"
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
          data-tour="nav-account"
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

            {/* Settings */}
            <div className="py-1.5">
              <button
                onClick={() => { setDropdownOpen(false); navigate('/settings'); }}
                className="w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors"
                style={{ color: '#2C2420' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(193,68,14,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Settings className="w-4 h-4 shrink-0" style={{ color: '#9B8B83' }} />
                <span className="text-sm font-medium">Settings</span>
              </button>
            </div>

            {/* Promo codes (admin only) */}
            {isAdmin && (
              <div className="py-1.5">
                <button
                  onClick={() => { setDropdownOpen(false); navigate('/admin/promos'); }}
                  className="w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors"
                  style={{ color: '#2C2420' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(193,68,14,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Ticket className="w-4 h-4 shrink-0" style={{ color: '#9B8B83' }} />
                  <span className="text-sm font-medium">Promo Codes</span>
                </button>
              </div>
            )}

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

      {/* Mobile: hamburger button (replaces the right cluster below md) */}
      <button
        data-tour="nav-menu"
        onClick={() => setMobileOpen(true)}
        className="md:hidden flex items-center justify-center w-11 h-11 -mr-2 rounded-xl"
        style={{ color: '#2C2420' }}
        aria-label="Open menu"
        aria-expanded={mobileOpen}
      >
        <Menu className="w-6 h-6" />
      </button>
    </header>

      {/* Mobile drawer - rendered as a SIBLING of <header>, not a child:
          the header's backdrop-filter makes position:fixed descendants anchor
          to the header box (56px tall) instead of the viewport, which crammed
          the whole drawer into the header bar. */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 animate-in fade-in duration-200"
            style={{ background: 'rgba(44,36,32,0.45)' }}
            onClick={() => setMobileOpen(false)}
          />

          {/* Panel */}
          <div
            className="absolute right-0 top-0 h-full w-[82%] max-w-xs flex flex-col animate-in slide-in-from-right duration-200"
            style={{
              background: 'rgba(255,250,247,0.99)',
              backdropFilter: 'blur(16px)',
              borderLeft: '1px solid rgba(193,68,14,0.12)',
              boxShadow: '-8px 0 32px rgba(44,36,32,0.14)',
            }}
          >
            {/* Drawer header: avatar + name on the left, close on the right */}
            <div className="flex items-center justify-between gap-3 px-5 h-14 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg, #C1440E, #E8603C)' }}
                >
                  {initials}
                </div>
                <p className="text-sm font-semibold truncate" style={{ color: '#2C2420' }}>
                  {user.username || 'Account'}
                </p>
              </div>
              <button
                data-tour="drawer-close"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center w-10 h-10 -mr-2 rounded-xl shrink-0"
                style={{ color: '#7A6A62' }}
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Page links - top */}
            <nav className="flex flex-col px-3 pt-2 gap-1">
              <button
                data-tour="drawer-create"
                onClick={goToCreate}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm font-semibold"
                style={
                  isActive('/create')
                    ? { background: 'rgba(193,68,14,0.08)', color: '#C1440E' }
                    : { color: '#2C2420', background: 'transparent' }
                }
              >
                <Plus className="w-5 h-5 shrink-0" />
                Create
              </button>
              <button
                data-tour="drawer-videos"
                onClick={() => navigate('/videos')}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm font-semibold"
                style={
                  isActive('/videos')
                    ? { background: 'rgba(193,68,14,0.08)', color: '#C1440E' }
                    : { color: '#2C2420', background: 'transparent' }
                }
              >
                <Video className="w-5 h-5 shrink-0" />
                My Videos
              </button>
              <button
                data-tour="drawer-settings"
                onClick={() => navigate('/settings')}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm font-semibold"
                style={
                  isActive('/settings')
                    ? { background: 'rgba(193,68,14,0.08)', color: '#C1440E' }
                    : { color: '#2C2420', background: 'transparent' }
                }
              >
                <Settings className="w-5 h-5 shrink-0" />
                Settings
              </button>
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin/promos')}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm font-semibold"
                  style={
                    isActive('/admin/promos')
                      ? { background: 'rgba(193,68,14,0.08)', color: '#C1440E' }
                      : { color: '#2C2420', background: 'transparent' }
                  }
                >
                  <Ticket className="w-5 h-5 shrink-0" />
                  Promo Codes
                </button>
              )}
            </nav>

            {/* Bottom: credits + sign out (pinned, no dividers) */}
            <div
              className="mt-auto px-3 py-3 flex flex-col gap-2"
              style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
            >
              <button
                data-tour="drawer-credits"
                onClick={() => navigate('/buy-credits')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl"
                style={{
                  background: isLow ? 'rgba(193,68,14,0.10)' : 'rgba(193,68,14,0.06)',
                  border: isLow ? '1px solid rgba(193,68,14,0.25)' : '1px solid rgba(193,68,14,0.10)',
                }}
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" style={{ color: isLow ? '#C1440E' : '#E8603C' }} />
                  <span className="text-sm font-semibold" style={{ color: '#2C2420' }}>
                    {credits ?? '...'} credits
                  </span>
                </div>
                <span className="text-xs font-bold" style={{ color: '#C1440E' }}>
                  {isLow ? 'Running low' : 'Top up'}
                </span>
              </button>
              <button
                data-tour="drawer-signout"
                onClick={() => { setMobileOpen(false); logout(); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm font-medium"
                style={{ color: '#9B8B83' }}
              >
                <LogOut className="w-5 h-5 shrink-0" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}