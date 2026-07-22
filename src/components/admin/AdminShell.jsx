import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Ticket } from 'lucide-react';
import { C } from '../../lib/adminTheme';

const TABS = [
  { label: 'Overview', to: '/admin/overview', match: '/admin/overview', Icon: LayoutDashboard },
  { label: 'Users',    to: '/admin/users',    match: '/admin/users',    Icon: Users },
  { label: 'Promo Codes', to: '/admin/promos', match: '/admin/promos',  Icon: Ticket },
];

/**
 * Shared chrome for every admin page: the warm gradient background, a centered
 * container, and the Overview / Users / Promo Codes tab strip. Children render
 * below the tabs.
 */
export default function AdminShell({ children, maxWidth = 'max-w-6xl' }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-full font-figtree py-8 px-4" style={{ background: C.bg }}>
      <div className={`${maxWidth} w-full mx-auto`}>
        {/* Tab strip */}
        <div className="flex items-center gap-1.5 mb-6 flex-wrap">
          {TABS.map((tab) => {
            const { label, to, match } = tab;
            const Icon = tab.Icon;
            const active = location.pathname.startsWith(match);
            return (
              <button
                key={to}
                onClick={() => navigate(to)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all"
                style={
                  active
                    ? { background: C.terraSoft, color: C.terra, border: `1px solid ${C.cardBorder}` }
                    : { background: 'transparent', color: C.muted, border: '1px solid transparent' }
                }
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = C.terra; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = C.muted; }}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>

        {children}
      </div>
    </div>
  );
}
