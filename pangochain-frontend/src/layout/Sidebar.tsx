import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, FolderOpen, FileText, MessageSquare,
  ClipboardList, Settings, LogOut, Users,
  Activity, Key, Home, ChevronRight, Scale,
  Gavel, Shield, ShieldCheck, Search, X, FileSignature,
  Bot, TrendingUp, DoorOpen, Video, MessagesSquare,
} from 'lucide-react'
import { useAuthStore, isClient, roleLabel, canViewGlobalAudit } from '../store/authStore'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import api from '../lib/api'
import { Tooltip } from '../components/ui/Tooltip'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
  description: string
  end?: boolean
  badge?: number
}

export function Sidebar({ mobileOpen, onClose }: { mobileOpen?: boolean; onClose?: () => void }) {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)
  const [navSearch, setNavSearch] = useState('')

  useEffect(() => {
    if (!user) return
    api.get('/dashboard/stats')
      .then((r) => setUnreadCount(r.data?.unreadMessages ?? 0))
      .catch(() => {})
  }, [user])

  if (!user) return null

  const showGlobalAudit = canViewGlobalAudit(user.role)

  const legalItems: NavItem[] = [
    { to: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard', description: 'Your daily command center: cases, hearings, alerts, audit activity.', end: true },
    { to: '/cases', icon: <FolderOpen className="w-4 h-4" />, label: 'Cases', description: 'Open, search, and manage legal matters and case files.' },
    { to: '/documents', icon: <FileText className="w-4 h-4" />, label: 'Documents', description: 'Encrypted document vault with IPFS storage and Fabric transaction IDs.' },
    { to: '/templates', icon: <FileSignature className="w-4 h-4" />, label: 'Templates', description: 'Create reusable legal document templates and drafting workflows.' },
    { to: '/messages', icon: <MessageSquare className="w-4 h-4" />, label: 'Messages', description: 'Secure collaboration thread for lawyers, clients, and staff.', badge: unreadCount },
    { to: '/hearings', icon: <Gavel className="w-4 h-4" />, label: 'Hearings', description: 'Track hearings, court dates, locations, and preparation tasks.' },
    ...(showGlobalAudit ? [{ to: '/audit', icon: <ClipboardList className="w-4 h-4" />, label: 'Audit Trail', description: 'Review immutable access, upload, signature, and permission events.' }] : []),
  ]

  const clientItems: NavItem[] = [
    { to: '/client/portal', icon: <Home className="w-4 h-4" />, label: 'My Portal', description: 'A simple overview of your case, documents, and next steps.', end: true },
    { to: '/client/documents', icon: <Shield className="w-4 h-4" />, label: 'Document Vault', description: 'Access encrypted documents shared by your legal team.' },
    { to: '/client/case', icon: <Scale className="w-4 h-4" />, label: 'My Case', description: 'Follow milestones, deadlines, and key case updates.' },
    { to: '/client/privacy', icon: <ShieldCheck className="w-4 h-4" />, label: 'Privacy & Data', description: 'Understand consent, data handling, and document privacy controls.' },
    { to: '/messages', icon: <MessageSquare className="w-4 h-4" />, label: 'Messages', description: 'Securely talk with your legal team.', badge: unreadCount },
  ]

  // Planned (Backlog) features — scaffolding pages, role-scoped.
  const plannedLegal: NavItem[] = [
    { to: '/assistant', icon: <Bot className="w-4 h-4" />, label: 'AI Assistant', description: 'Ask case-aware questions and get drafting or research support.' },
    { to: '/insights', icon: <TrendingUp className="w-4 h-4" />, label: 'Case Insights', description: 'See workload, risk, deadlines, and matter intelligence.' },
    { to: '/data-rooms', icon: <DoorOpen className="w-4 h-4" />, label: 'Data Rooms', description: 'Create secure collaboration spaces for opposing counsel or clients.' },
    { to: '/consultations', icon: <Video className="w-4 h-4" />, label: 'Video Consults', description: 'Schedule and join confidential legal consultations.' },
  ]
  const plannedClient: NavItem[] = [
    { to: '/client/assistant', icon: <MessagesSquare className="w-4 h-4" />, label: 'AI Assistant', description: 'Get guided answers about your documents and case steps.' },
    { to: '/consultations', icon: <Video className="w-4 h-4" />, label: 'Video Consults', description: 'Join secure video sessions with your legal team.' },
  ]

  const adminItems: NavItem[] = [
    { to: '/admin', icon: <Settings className="w-4 h-4" />, label: 'Admin Panel', description: 'Manage firm users, roles, security settings, and governance.' },
    { to: '/admin/users', icon: <Users className="w-4 h-4" />, label: 'Users', description: 'Invite, suspend, and review firm member access.' },
    { to: '/admin/keys', icon: <Key className="w-4 h-4" />, label: 'Key Rotation', description: 'Review and rotate cryptographic access material.' },
    { to: '/ledger', icon: <Activity className="w-4 h-4" />, label: 'Ledger Explorer', description: 'Inspect Fabric transaction references and ledger state.' },
  ]

  const showAdmin =
    user.role === 'MANAGING_PARTNER' ||
    user.role === 'IT_ADMIN' ||
    user.role === 'REGULATOR'

  const showRegulator = user.role === 'REGULATOR'
  const showMfa = user.role === 'MANAGING_PARTNER' || user.role === 'IT_ADMIN' || user.role === 'PARTNER_SENIOR' || user.role === 'PARTNER_JUNIOR'

  const navItems = isClient(user.role) ? clientItems : legalItems
  const plannedItems = isClient(user.role) ? plannedClient : plannedLegal
  const searchNeedle = navSearch.trim().toLowerCase()
  const matchesSearch = (item: NavItem) =>
    !searchNeedle ||
    item.label.toLowerCase().includes(searchNeedle) ||
    item.description.toLowerCase().includes(searchNeedle)
  const filteredNavItems = navItems.filter(matchesSearch)
  const filteredPlannedItems = plannedItems.filter(matchesSearch)
  const filteredAdminItems = adminItems.filter(matchesSearch)

  const renderNavItem = (item: NavItem, extra?: React.ReactNode) => (
    <Tooltip key={item.to} content={item.description} side="right" className="w-full">
      <NavLink
        to={item.to}
        end={item.end}
        onClick={onClose}
        className={({ isActive }) => clsx('sidebar-link group/nav w-full', isActive && 'active')}
      >
        <span className="shrink-0">{item.icon}</span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {(item.badge ?? 0) > 0 && (
          <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-slate-950">
            {item.badge! > 99 ? '99+' : item.badge}
          </span>
        )}
        {extra}
      </NavLink>
    </Tooltip>
  )

  const handleLogout = () => {
    clearAuth()
    toast.success('Logged out')
    navigate('/login')
  }

  const sidebarContent = (
    <aside className="w-72 flex-shrink-0 border-r border-white/70 bg-white/90 backdrop-blur-xl flex flex-col h-screen sticky top-0 z-20 shadow-xl shadow-slate-900/5">
      {/* Logo — pangolin mark only (wordmark intentionally omitted) */}
      <div className="h-16 flex items-center px-5 border-b border-border">
        <img src="/logo-mark.png" alt="PangoChain" className="h-11 w-auto" onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none'
        }} />
        <div className="ml-3 min-w-0">
          <p className="font-heading text-sm font-bold text-slate-950">PangoChain</p>
          <p className="text-[11px] font-medium text-cyan-700">Legal data command</p>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-md">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">{user.fullName}</p>
            <p className="text-xs text-text-muted truncate">{roleLabel(user.role)}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-text-muted ml-auto flex-shrink-0" />
        </div>
      </div>

      <div className="px-3 py-3 border-b border-border">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input h-10 pl-9 text-xs"
            placeholder="Find a feature..."
            value={navSearch}
            onChange={(e) => setNavSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-3 space-y-0.5">
        {isClient(user.role) && (
          <div className="pb-2 mb-1">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-3 mb-1">Client Portal</p>
          </div>
        )}

        {filteredNavItems.map((item) => renderNavItem(item))}

        {filteredPlannedItems.length > 0 && (
          <>
            <div className="pt-3 pb-1 px-3">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Coming Soon</p>
            </div>
            {filteredPlannedItems.map((item) => renderNavItem(item, <span className="ml-auto rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-700">Soon</span>))}
          </>
        )}

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
            {filteredAdminItems.map((item) => renderNavItem(item))}
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
        {renderNavItem({ to: '/profile', icon: <Settings className="w-4 h-4" />, label: 'Profile & Keys', description: 'Manage your account, keys, and personal security settings.' })}
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

  return (
    <>
      {/* Desktop — always visible */}
      <div className="hidden lg:flex">{sidebarContent}</div>

      {/* Mobile — overlay drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={onClose}
          />
          <div className="fixed inset-y-0 left-0 z-40 lg:hidden flex">
            {sidebarContent}
            <button
              onClick={onClose}
              className="absolute top-4 right-[-40px] w-9 h-9 rounded-full bg-white/90 flex items-center justify-center text-text-muted shadow-md"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </>
  )
}
