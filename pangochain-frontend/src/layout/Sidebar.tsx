import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FolderOpen, FileText, MessageSquare,
  ClipboardList, Settings, LogOut, Users,
  Activity, Key, Home, ChevronRight, Scale,
  Gavel, Bell, Shield, Calendar, Search,
} from 'lucide-react'
import { useAuthStore, isClient, isPartnerOrAbove, roleLabel } from '../store/authStore'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
  end?: boolean
}

export function Sidebar() {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  if (!user) return null

  const legalItems: NavItem[] = [
    { to: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard', end: true },
    { to: '/cases', icon: <FolderOpen className="w-4 h-4" />, label: 'Cases' },
    { to: '/documents', icon: <FileText className="w-4 h-4" />, label: 'Documents' },
    { to: '/messages', icon: <MessageSquare className="w-4 h-4" />, label: 'Messages' },
    { to: '/hearings', icon: <Gavel className="w-4 h-4" />, label: 'Hearings' },
    { to: '/audit', icon: <ClipboardList className="w-4 h-4" />, label: 'Audit Trail' },
  ]

  const clientItems: NavItem[] = [
    { to: '/client/portal', icon: <Home className="w-4 h-4" />, label: 'My Portal', end: true },
    { to: '/client/documents', icon: <Shield className="w-4 h-4" />, label: 'Document Vault' },
    { to: '/client/case', icon: <Scale className="w-4 h-4" />, label: 'My Case' },
    { to: '/messages', icon: <MessageSquare className="w-4 h-4" />, label: 'Messages' },
  ]

  const adminItems: NavItem[] = [
    { to: '/admin', icon: <Settings className="w-4 h-4" />, label: 'Admin Panel' },
    { to: '/admin/users', icon: <Users className="w-4 h-4" />, label: 'Users' },
    { to: '/admin/keys', icon: <Key className="w-4 h-4" />, label: 'Key Rotation' },
    { to: '/ledger', icon: <Activity className="w-4 h-4" />, label: 'Ledger Explorer' },
  ]

  const showAdmin =
    user.role === 'MANAGING_PARTNER' ||
    user.role === 'IT_ADMIN' ||
    user.role === 'REGULATOR'

  const showRegulator = user.role === 'REGULATOR'
  const showMfa = user.role === 'MANAGING_PARTNER' || user.role === 'IT_ADMIN' || user.role === 'PARTNER_SENIOR' || user.role === 'PARTNER_JUNIOR'

  const navItems = isClient(user.role) ? clientItems : legalItems

  const handleLogout = () => {
    clearAuth()
    toast.success('Logged out')
    navigate('/login')
  }

  return (
    <aside className="w-60 flex-shrink-0 bg-white/95 backdrop-blur-sm border-r border-border flex flex-col h-screen sticky top-0 z-20">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-border">
        <img src="/logo.png" alt="PangoChain" className="h-9 w-auto" onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none'
        }} />
        <span className="font-heading font-bold text-[#1d6464] text-lg ml-1">PangoChain</span>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#1d6464]/10 flex items-center justify-center text-[#1d6464] font-semibold text-sm">
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
        {isClient(user.role) && (
          <div className="pb-2 mb-1">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-3 mb-1">Client Portal</p>
          </div>
        )}

        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              clsx('sidebar-link', isActive && 'active')
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}

        {showRegulator && (
          <>
            <div className="pt-3 pb-1 px-3">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Regulatory View</p>
            </div>
            <NavLink
              to="/regulator"
              className={({ isActive }) => clsx('sidebar-link', isActive && 'active')}
            >
              <Search className="w-4 h-4" />
              Cross-Firm Audit
            </NavLink>
            <NavLink
              to="/ledger"
              className={({ isActive }) => clsx('sidebar-link', isActive && 'active')}
            >
              <Activity className="w-4 h-4" />
              Ledger Explorer
            </NavLink>
          </>
        )}

        {showAdmin && !showRegulator && (
          <>
            <div className="pt-3 pb-1 px-3">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Administration</p>
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

        {showMfa && (
          <>
            <div className="pt-3 pb-1 px-3">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Security</p>
            </div>
            <NavLink
              to="/profile/mfa"
              className={({ isActive }) => clsx('sidebar-link', isActive && 'active')}
            >
              <Shield className="w-4 h-4" />
              {user.mfaEnabled ? 'MFA Enabled ✓' : 'Enable MFA'}
            </NavLink>
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
        <button onClick={handleLogout} className="sidebar-link w-full text-left !text-error hover:!text-error hover:!bg-red-50">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {/* Footer branding */}
      <div className="px-5 py-2 border-t border-border">
        <p className="text-[9px] text-text-muted font-mono">Hyperledger Fabric 2.4 · AES-256-GCM</p>
      </div>
    </aside>
  )
}
