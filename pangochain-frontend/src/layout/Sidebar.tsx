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
        <span className="shrink-0 opacity-80 group-[.active]/nav:opacity-100">{item.icon}</span>
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

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="pt-4 pb-1.5 px-3">
      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.16em]">{children}</p>
    </div>
  )

  const sidebarContent = (
    <aside className="w-64 flex-shrink-0 border-r border-white/[0.07] bg-[#0e0e0f] flex flex-col h-screen sticky top-0 z-20">

      {/* Logo */}
      <div className="relative h-[68px] overflow-hidden border-b border-white/[0.08] px-5 flex-shrink-0">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.97),rgba(20,18,16,0.90)),url('/legal/providentia-engraving.png')] bg-cover bg-[center_38%]" />
        {/* Gold separator line */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
        <div className="relative flex h-full items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 shadow-lg shadow-black/50 ring-1 ring-white/20">
            <img src="/logo-mark.png" alt="PangoChain" className="h-7 w-auto" onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }} />
          </div>
          <div>
            <p className="font-heading text-[13px] font-bold text-white tracking-tight">PangoChain</p>
            <p className="text-[10px] font-semibold text-amber-400/70 tracking-wide">Legal command</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-3.5 border-b border-white/[0.07]">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 via-amber-600 to-stone-800 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-black/40 ring-1 ring-amber-400/25">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-[1.5px] border-[#0e0e0f]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-white/90 truncate leading-tight">{user.fullName}</p>
            <p className="text-[11px] text-slate-500 truncate">{roleLabel(user.role)}</p>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2.5 border-b border-white/[0.07]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600" />
          <input
            className="w-full h-9 rounded-lg border border-white/[0.08] bg-white/[0.05] pl-8 pr-3 text-xs text-slate-300 placeholder-slate-600
                       focus:border-amber-400/30 focus:bg-white/[0.08] focus:outline-none transition-all"
            placeholder="Find a feature..."
            value={navSearch}
            onChange={(e) => setNavSearch(e.target.value)}
          />
          {navSearch && (
            <button
              onClick={() => setNavSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-2 px-2 space-y-0.5">
        {isClient(user.role) && (
          <SectionLabel>Client Portal</SectionLabel>
        )}

        {filteredNavItems.map((item) => renderNavItem(item))}

        {filteredPlannedItems.length > 0 && (
          <>
            <SectionLabel>Coming Soon</SectionLabel>
            {filteredPlannedItems.map((item) => renderNavItem(item,
              <span className="ml-auto rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-400/70">Soon</span>
            ))}
          </>
        )}

        {showRegulator && (
          <>
            <SectionLabel>Regulatory</SectionLabel>
            <NavLink
              to="/regulator"
              className={({ isActive }) => clsx('sidebar-link', isActive && 'active')}
            >
              <Search className="w-4 h-4 opacity-80" />
              Cross-Firm Audit
            </NavLink>
            <NavLink
              to="/ledger"
              className={({ isActive }) => clsx('sidebar-link', isActive && 'active')}
            >
              <Activity className="w-4 h-4 opacity-80" />
              Ledger Explorer
            </NavLink>
          </>
        )}

        {showAdmin && !showRegulator && (
          <>
            <SectionLabel>Administration</SectionLabel>
            {filteredAdminItems.map((item) => renderNavItem(item))}
          </>
        )}

        {showMfa && (
          <>
            <SectionLabel>Security</SectionLabel>
            <NavLink
              to="/profile/mfa"
              className={({ isActive }) => clsx('sidebar-link', isActive && 'active')}
            >
              <Shield className="w-4 h-4 opacity-80" />
              {user.mfaEnabled ? 'MFA Enabled ✓' : 'Enable MFA'}
            </NavLink>
          </>
        )}
      </nav>

      {/* Footer actions */}
      <div className="p-2 border-t border-white/[0.07] space-y-0.5">
        {renderNavItem({ to: '/profile', icon: <Settings className="w-4 h-4" />, label: 'Profile & Keys', description: 'Manage your account, keys, and personal security settings.' })}
        <button onClick={handleLogout} className="sidebar-link w-full text-left !text-red-400/80 hover:!text-red-300 hover:!bg-red-400/10">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {/* Tech footer */}
      <div className="px-5 py-3 border-t border-white/[0.07]">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0 shadow-[0_0_8px_rgba(251,191,36,0.75)]" />
          <p className="text-[10px] text-slate-600 font-mono">Fabric 2.4 · AES-256-GCM</p>
        </div>
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
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={onClose}
          />
          <div className="fixed inset-y-0 left-0 z-40 lg:hidden flex">
            {sidebarContent}
            <button
              onClick={onClose}
              className="absolute top-4 right-[-40px] w-9 h-9 rounded-full bg-white/90 flex items-center justify-center text-slate-600 shadow-md"
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
