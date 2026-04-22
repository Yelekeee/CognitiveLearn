import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

/* ── Icons ── */
const Icon = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  courses: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  path: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <circle cx="6" cy="19" r="2.5"/>
      <path d="M8.5 19h7a3.5 3.5 0 0 0 0-7h-9a3.5 3.5 0 0 1 0-7H15"/>
      <circle cx="17.5" cy="5" r="2.5"/>
    </svg>
  ),
  analytics: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
      <line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  ),
  ai: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M12 3c.4 3.2 1.8 5.6 4.5 6-2.7.4-4.1 2.8-4.5 6-.4-3.2-1.8-5.6-4.5-6 2.7-.4 4.1-2.8 4.5-6z"/>
      <path d="M5 9c.2 1.6.9 2.8 2 3.2-1.1.4-1.8 1.6-2 3.2-.2-1.6-.9-2.8-2-3.2 1.1-.4 1.8-1.6 2-3.2z"/>
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
}

interface NavItem {
  to: string
  label: string
  short: string   // short label for mobile bottom nav
  icon: React.ReactNode
}

const studentNav: NavItem[] = [
  { to: '/dashboard',  label: 'Дашборд',       short: 'Главная', icon: Icon.dashboard },
  { to: '/courses',    label: 'Курсы',          short: 'Курсы',   icon: Icon.courses   },
  { to: '/path',       label: 'Путь обучения',  short: 'Путь',    icon: Icon.path      },
  { to: '/analytics',  label: 'Аналитика',      short: 'Статы',   icon: Icon.analytics },
  { to: '/assistant',  label: 'ИИ-Ассистент',   short: 'ИИ',      icon: Icon.ai        },
]

const teacherNav: NavItem[] = [
  { to: '/teacher/class',     label: 'Класс',     short: 'Класс',  icon: Icon.users     },
  { to: '/teacher/analytics', label: 'Аналитика', short: 'Статы',  icon: Icon.analytics },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const nav = user?.role === 'teacher' || user?.role === 'admin' ? teacherNav : studentNav

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  return (
    <div className="flex min-h-screen bg-surface">

      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <aside
        className="hidden md:flex w-[240px] flex-shrink-0 flex-col"
        style={{ background: 'var(--sidebar-bg)' }}
      >
        {/* Logo */}
        <div className="px-5 py-5" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #4f6ef7 0%, #6366f1 100%)' }}
            >
              <span className="text-white font-bold text-sm tracking-tight">C</span>
            </div>
            <div>
              <div className="text-white font-semibold text-sm leading-none tracking-tight">CogniLearn</div>
              <div className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Adaptive Platform
              </div>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                  isActive ? 'text-white' : 'hover:text-white/75'
                }`
              }
              style={({ isActive }) => isActive
                ? { background: 'var(--sidebar-active)', color: 'rgba(255,255,255,0.95)' }
                : { color: 'rgba(255,255,255,0.45)' }
              }
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div className="p-3" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
          <div className="flex items-center gap-3 px-3 py-2 mb-1 rounded-lg">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #4f6ef7, #8b5cf6)' }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-medium truncate" style={{ color: 'rgba(255,255,255,0.80)' }}>
                {user?.name}
              </div>
              <div className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.30)' }}>
                {user?.email}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-150"
            style={{ color: 'rgba(255,255,255,0.35)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
          >
            {Icon.logout}
            Выйти
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 min-w-0 overflow-auto pb-20 md:pb-0">
        {children}
      </main>

      {/* ── Mobile bottom navigation ── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 flex z-50 border-t"
        style={{
          background: 'var(--sidebar-bg)',
          borderColor: 'var(--sidebar-border)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors"
            style={({ isActive }) => ({
              color: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.35)',
            })}
          >
            {item.icon}
            <span className="text-[9px] font-medium">{item.short}</span>
          </NavLink>
        ))}
        {/* Logout on far right for mobile */}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center py-2.5 gap-0.5 px-2 transition-colors"
          style={{ color: 'rgba(255,255,255,0.25)' }}
        >
          {Icon.logout}
          <span className="text-[9px] font-medium">Выйти</span>
        </button>
      </nav>
    </div>
  )
}
