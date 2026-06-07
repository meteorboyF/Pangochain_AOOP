import { useQuery } from '@tanstack/react-query'
import { FolderOpen, FileText, MessageSquare, Activity, Plus, Shield, ChevronRight, Clock, TrendingUp, Gavel, Calendar, FileSignature, DoorOpen, Bot, Search, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore, roleLabel, canViewGlobalAudit } from '../store/authStore'
import api from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PageHero, QuickActionGrid } from '../components/ui/PageChrome'
import { Tooltip } from '../components/ui/Tooltip'

interface NextHearing {
  id: string
  title: string
  hearingDate: string
  location: string | null
  courtName: string | null
  hearingType: string
  caseTitle: string
}

interface Stats {
  activeCases: number
  totalDocuments: number
  unreadMessages: number
  auditEvents: number
}

interface RecentCase {
  id: string
  title: string
  caseType: string
  status: string
  documentCount: number
  createdAt: string
}

interface AuditEntry {
  id: number
  eventType: string
  resourceType: string
  resourceId: string
  fabricTxId: string
  timestamp: string
  metadataJson: string
}

const AUDIT_COLORS: Record<string, string> = {
  DOC_REGISTERED:  'bg-slate-100 text-slate-700',
  ACCESS_GRANTED:  'bg-amber-50 text-amber-800 ring-1 ring-amber-200/60',
  ACCESS_REVOKED:  'bg-red-50 text-red-600 ring-1 ring-red-100',
  DOC_VIEWED:      'bg-stone-100 text-stone-700',
  CASE_REGISTERED: 'bg-zinc-100 text-zinc-700',
  USER_REGISTERED: 'bg-neutral-100 text-neutral-700',
  USER_LOGIN:      'bg-gray-50 text-gray-500',
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

const STAT_CONFIGS = [
  {
    key: 'activeCases',
    label: 'Active Cases',
    icon: FolderOpen,
    to: '/cases',
    gradient: 'from-slate-800 to-slate-950',
    ring: 'ring-slate-700/30',
    glow: 'shadow-slate-900/20',
  },
  {
    key: 'totalDocuments',
    label: 'Documents',
    icon: FileText,
    to: '/documents',
    gradient: 'from-amber-500 to-amber-800',
    ring: 'ring-amber-600/30',
    glow: 'shadow-amber-900/20',
  },
  {
    key: 'unreadMessages',
    label: 'Unread Messages',
    icon: MessageSquare,
    to: '/messages',
    gradient: 'from-stone-600 to-stone-900',
    ring: 'ring-stone-700/30',
    glow: 'shadow-stone-900/20',
  },
  {
    key: 'auditEvents',
    label: 'Audit Events',
    icon: Activity,
    to: '/audit',
    gradient: 'from-zinc-600 to-zinc-900',
    ring: 'ring-zinc-700/30',
    glow: 'shadow-zinc-900/20',
    adminOnly: true,
  },
]

function StatCard({ icon: Icon, label, value, to, gradient, ring, glow }: {
  icon: React.ElementType
  label: string
  value: string | number
  to: string
  gradient: string
  ring: string
  glow: string
}) {
  return (
    <Tooltip content={`Open ${label.toLowerCase()} and continue work from there.`} side="bottom" className="w-full">
      <Link to={to} className="card group flex items-center gap-4 transition-all duration-200 hover:-translate-y-1 hover:border-amber-200/60 hover:shadow-[0_4px_20px_-6px_rgba(15,23,42,0.18)]">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white flex-shrink-0 shadow-lg ${glow} ring-1 ${ring}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="font-heading font-bold text-2xl text-slate-900 mt-0.5">{value}</p>
        </div>
        <ArrowUpRight className="w-4 h-4 text-slate-300 flex-shrink-0 transition-all duration-150 group-hover:text-amber-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </Link>
    </Tooltip>
  )
}

function SkeletonStatCard() {
  return (
    <div className="card flex items-center gap-4 animate-pulse">
      <div className="w-11 h-11 rounded-xl bg-slate-100 flex-shrink-0" />
      <div className="flex-1">
        <div className="h-2.5 bg-slate-100 rounded w-20 mb-2" />
        <div className="h-6 bg-slate-100 rounded w-12" />
      </div>
    </div>
  )
}

function HearingCountdown({ date }: { date: string }) {
  const now = new Date()
  const hearing = new Date(date)
  const diffMs = hearing.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (diffMs < 0) return <span className="text-red-500 font-bold text-lg">Past due</span>
  if (diffDays === 0) return <span className="text-amber-600 font-bold text-lg">Today — in {diffHours}h</span>
  if (diffDays === 1) return <span className="text-amber-500 font-bold text-lg">Tomorrow</span>
  return <span className="font-heading font-extrabold text-3xl text-slate-900">{diffDays}<span className="text-base font-medium text-slate-400 ml-1">days</span></span>
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const showGlobalAudit = user ? canViewGlobalAudit(user.role) : false

  const statsQuery = useQuery({
    queryKey: queryKeys.dashboardStats(),
    queryFn: async () => (await api.get<Stats>('/dashboard/stats')).data,
  })
  const casesQuery = useQuery({
    queryKey: [...queryKeys.cases(), 'recent'],
    queryFn: async () => (await api.get('/cases', { params: { size: 5 } })).data.content ?? [],
  })
  const auditQuery = useQuery({
    queryKey: [...queryKeys.audit(), 'recent'],
    queryFn: async () => (await api.get('/audit', { params: { size: 4 } })).data.content ?? [],
    enabled: showGlobalAudit,
  })
  const lawyerQuery = useQuery({
    queryKey: queryKeys.dashboardLawyer(),
    queryFn: async () => (await api.get('/dashboard/lawyer')).data,
  })

  const stats: Stats | null = statsQuery.data ?? null
  const cases: RecentCase[] = casesQuery.data ?? []
  const audit: AuditEntry[] = auditQuery.data ?? []
  const nextHearing: NextHearing | null | undefined =
    lawyerQuery.isSuccess ? (lawyerQuery.data?.nextHearing ?? null)
    : lawyerQuery.isError ? null : undefined
  const loading = statsQuery.isLoading

  const visibleStats = STAT_CONFIGS.filter(s => !s.adminOnly || showGlobalAudit)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page hero */}
      <PageHero
        eyebrow="Today in PangoChain"
        title={`Good ${getGreeting()}, ${user?.fullName.split(' ')[0]}`}
        description={`${roleLabel(user?.role ?? 'ASSOCIATE_JUNIOR')} at ${user?.firmId ?? 'PangoChain'} — review matters, documents, hearings, and secure legal workflows from one command center.`}
        icon={Gavel}
        image="/legal/lady-justice.png"
        actions={(
          <>
            <Link to="/cases/new" className="btn-primary">
              <Plus className="w-4 h-4" /> New Case
            </Link>
            <Link to="/documents" className="btn-secondary">
              <Search className="w-4 h-4" /> Find Evidence
            </Link>
          </>
        )}
      >
        <QuickActionGrid
          actions={[
            { label: 'Register a case', description: 'Create a new matter with blockchain-ready document controls.', to: '/cases/new', icon: FolderOpen, tone: 'black' },
            { label: 'Upload evidence', description: 'Encrypt a document, pin it to IPFS, and register its hash on Fabric.', to: '/documents', icon: FileText, tone: 'gold' },
            { label: 'Prepare templates', description: 'Open reusable legal templates for faster drafting.', to: '/templates', icon: FileSignature, tone: 'stone' },
            { label: 'Ask assistant', description: 'Use the assistant workspace for guided legal workflow support.', to: '/assistant', icon: Bot, tone: 'silver' },
          ]}
        />
      </PageHero>

      {/* Stats row */}
      {loading ? (
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${showGlobalAudit ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
          {visibleStats.map((_, i) => <SkeletonStatCard key={i} />)}
        </div>
      ) : (
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${showGlobalAudit ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
          {visibleStats.map((cfg) => (
            <StatCard
              key={cfg.key}
              icon={cfg.icon}
              label={cfg.label}
              value={cfg.key === 'auditEvents'
                ? (stats?.auditEvents ?? 0).toLocaleString()
                : (stats?.[cfg.key as keyof Stats] ?? 0)}
              to={cfg.to}
              gradient={cfg.gradient}
              ring={cfg.ring}
              glow={cfg.glow}
            />
          ))}
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Cases — takes 2/3 */}
        <div className="lg:col-span-2 card overflow-hidden !p-0">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
            <div>
              <h2 className="font-heading font-semibold text-slate-900">Recent Cases</h2>
              <p className="text-xs text-slate-400 mt-0.5">Manage files, access controls, and audit history for each matter.</p>
            </div>
            <Link to="/cases" className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors">
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="px-6 py-4 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 shrink-0" />
                  <div className="flex-1">
                    <div className="h-3 bg-slate-100 rounded w-3/4 mb-1.5" />
                    <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : cases.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                <FolderOpen className="w-6 h-6 text-slate-400" />
              </div>
              <p className="font-medium text-slate-700 mb-1">No cases yet</p>
              <p className="text-xs text-slate-400 mb-4">Create your first matter to get started.</p>
              <Link to="/cases/new" className="btn-primary text-sm inline-flex">
                <Plus className="w-3.5 h-3.5" /> Create First Case
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {cases.map((c) => (
                <Link key={c.id} to={`/cases/${c.id}`}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-amber-50/40 transition-colors group">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-amber-100 transition-colors">
                      <FolderOpen className="w-4 h-4 text-slate-600 group-hover:text-amber-700 transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 text-sm group-hover:text-amber-900 transition-colors truncate">
                        {c.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                        {c.caseType && <span>{c.caseType}</span>}
                        <span className="opacity-50">·</span>
                        <Clock className="w-3 h-3" />
                        <span>{new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        <span className="opacity-50">·</span>
                        <span>{c.documentCount} docs</span>
                      </p>
                    </div>
                  </div>
                  <span className="ml-3 flex-shrink-0"><StatusBadge status={c.status} /></span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Next Hearing */}
          {nextHearing !== undefined && (
            <div className="card border-l-4 border-l-amber-400 !border-amber-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Gavel className="w-3.5 h-3.5 text-amber-700" />
                </div>
                <h2 className="font-heading font-semibold text-slate-800 text-sm">Next Hearing</h2>
              </div>
              {nextHearing === null ? (
                <p className="text-slate-400 text-sm text-center py-3">No upcoming hearings</p>
              ) : (
                <div className="space-y-2">
                  <HearingCountdown date={nextHearing.hearingDate} />
                  <p className="font-semibold text-slate-800 text-sm truncate mt-1">{nextHearing.title}</p>
                  <p className="text-slate-400 text-xs truncate">{nextHearing.caseTitle}</p>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(nextHearing.hearingDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {nextHearing.courtName && (
                    <p className="text-xs text-slate-400 truncate">{nextHearing.courtName}</p>
                  )}
                  <Link to="/hearings" className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-semibold mt-1 transition-colors">
                    All hearings <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Security Status */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-slate-700" />
              </div>
              <h2 className="font-heading font-semibold text-slate-800 text-sm">Security Status</h2>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Document Encryption', active: true },
                { label: 'Blockchain ACL', active: true },
                { label: 'IPFS Storage', active: true },
                { label: 'Audit Integrity', active: true },
                { label: 'MFA', active: user?.mfaEnabled ?? false },
              ].map(({ label, active }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className={`flex items-center gap-1.5 text-xs font-semibold ${active ? 'text-slate-800' : 'text-amber-600'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]'}`} />
                    {active ? 'Active' : 'Recommended'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Blockchain card */}
          <div className="card !p-0 overflow-hidden">
            <div className="bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.22),transparent_60%),linear-gradient(135deg,#0c0c0d,#1a1a1c)] p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center ring-1 ring-white/10">
                  <Shield className="w-3.5 h-3.5 text-amber-300" />
                </div>
                <p className="font-heading font-semibold text-white text-sm">Blockchain-Verified</p>
              </div>
              <p className="text-xs text-white/55 leading-relaxed">
                Every document access, upload and permission change is immutably recorded on Hyperledger Fabric.
              </p>
              <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center gap-2 text-[10px] text-white/35 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]" />
                legal-channel · {showGlobalAudit ? `${(stats?.auditEvents ?? 0).toLocaleString()} events` : 'audit restricted'}
              </div>
            </div>
          </div>

          {/* Feature Finder */}
          <div className="card">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                <DoorOpen className="w-3.5 h-3.5 text-slate-600" />
              </div>
              <h2 className="font-heading font-semibold text-slate-800 text-sm">Feature Finder</h2>
            </div>
            <p className="text-xs leading-5 text-slate-500">
              Use sidebar search to find features by purpose — try "client", "video", "keys", "cases", or "templates".
            </p>
          </div>

          {/* Recent Audit */}
          {showGlobalAudit && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Activity className="w-3.5 h-3.5 text-slate-600" />
                  </div>
                  <h2 className="font-heading font-semibold text-slate-800 text-sm">Recent Activity</h2>
                </div>
                <Link to="/audit" className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-semibold transition-colors">
                  View log <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              {audit.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-4">No activity yet</p>
              ) : (
                <div className="space-y-2.5">
                  {audit.map((a) => (
                    <div key={a.id} className="flex items-start gap-2.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0 ${AUDIT_COLORS[a.eventType] ?? 'bg-gray-100 text-gray-500'}`}>
                        {a.eventType.replace(/_/g, ' ')}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-600 truncate">{a.resourceId}</p>
                        {a.fabricTxId && (
                          <code className="text-[9px] text-amber-700 font-mono">{a.fabricTxId.slice(0, 8)}…</code>
                        )}
                        <p className="text-[10px] text-slate-400">{new Date(a.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
