import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FolderOpen, FileText, MessageSquare,
  Shield, ClipboardList, Settings, LogOut, Users,
  Activity, Key, Home, ChevronRight,
} from 'lucide-react'
import { useAuthStore, isClient, isPartnerOrAbove, roleLabel } from '../store/authStore'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
}

export function Sidebar() {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  if (!user) return null

  const legalItems: NavItem[] = [
    { to: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard' },
    { to: '/cases', icon: <FolderOpen className="w-4 h-4" />, label: 'Cases' },
    { to: '/documents', icon: <FileText className="w-4 h-4" />, label: 'Documents' },
    { to: '/messages', icon: <MessageSquare className="w-4 h-4" />, label: 'Messages' },
    { to: '/audit', icon: <ClipboardList className="w-4 h-4" />, label: 'Audit Trail' },
  ]

  const clientItems: NavItem[] = [
    { to: '/client/portal', icon: <Home className="w-4 h-4" />, label: 'My Portal' },
    { to: '/messages', icon: <MessageSquare className="w-4 h-4" />, label: 'Messages' },
    { to: '/documents', icon: <FileText className="w-4 h-4" />, label: 'My Documents' },
  ]

  const adminItems: NavItem[] = [
    { to: '/admin', icon: <Settings className="w-4 h-4" />, label: 'Admin Panel' },
    { to: '/admin/users', icon: <Users className="w-4 h-4" />, label: 'Users' },
    { to: '/admin/keys', icon: <Key className="w-4 h-4" />, label: 'Key Rotation' },
    { to: '/audit/ledger', icon: <Activity className="w-4 h-4" />, label: 'Ledger Explorer' },
  ]

  const showAdmin =
    user.role === 'MANAGING_PARTNER' ||
    user.role === 'IT_ADMIN' ||
    user.role === 'REGULATOR'

  const navItems = isClient(user.role) ? clientItems : legalItems

  const handleLogout = () => {
    clearAuth()
    toast.success('Logged out')
    navigate('/login')
  }

  return (
    <aside className="w-60 flex-shrink-0 bg-white border-r border-border flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="font-heading font-bold text-primary text-base leading-none">PangoChain</span>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary font-semibold text-sm">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">{user.fullName}</p>
            <p className="text-xs text-text-muted truncate">{roleLabel(user.role)}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-text-muted ml-auto flex-shrink-0" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-3 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx('sidebar-link', isActive && 'active')
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}

        {showAdmin && (
          <>
            <div className="pt-3 pb-1 px-3">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Admin</p>
            </div>
            {adminItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  clsx('sidebar-link', isActive && 'active')
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border space-y-0.5">
        <NavLink
          to="/profile"
          className={({ isActive }) => clsx('sidebar-link', isActive && 'active')}
        >
          <Settings className="w-4 h-4" />
          Profile & Keys
        </NavLink>
        <button onClick={handleLogout} className="sidebar-link w-full text-left text-error hover:text-error hover:bg-red-50">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
