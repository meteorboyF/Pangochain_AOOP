import { useQuery } from '@tanstack/react-query'
import { FolderOpen, FileText, MessageSquare, Activity, Plus, Shield, ChevronRight, Clock, TrendingUp, Gavel, Calendar, FileSignature, DoorOpen, Bot, Search } from 'lucide-react'
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
  DOC_REGISTERED:  'bg-blue-50 text-blue-700',
  ACCESS_GRANTED:  'bg-emerald-50 text-emerald-700',
  ACCESS_REVOKED:  'bg-red-50 text-red-700',
  DOC_VIEWED:      'bg-purple-50 text-purple-700',
  CASE_REGISTERED: 'bg-teal-50 text-teal-700',
  USER_REGISTERED: 'bg-indigo-50 text-indigo-700',
  USER_LOGIN:      'bg-gray-50 text-gray-600',
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function StatCard({ icon, label, value, to, trend }: {
  icon: React.ReactNode; label: string; value: string | number; to: string; trend?: string
}) {
  return (
    <Tooltip content={`Open ${label.toLowerCase()} and continue work from there.`} side="bottom" className="w-full">
      <Link to={to} className="card group flex items-center gap-4 transition-all hover:-translate-y-1 hover:border-cyan-200 hover:shadow-card-hover">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-slate-900 flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-cyan-950/10">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-text-muted text-sm">{label}</p>
          <p className="font-heading font-bold text-2xl text-text-primary">{value}</p>
          {trend && <p className="text-xs text-success flex items-center gap-0.5 mt-0.5"><TrendingUp className="w-3 h-3" />{trend}</p>}
        </div>
        <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0 transition-transform group-hover:translate-x-1 group-hover:text-cyan-700" />
      </Link>
    </Tooltip>
  )
}

function HearingCountdown({ date }: { date: string }) {
  const now = new Date()
  const hearing = new Date(date)
  const diffMs = hearing.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (diffMs < 0) return <span className="text-error font-bold">Past due</span>
  if (diffDays === 0) return <span className="text-amber-600 font-bold text-lg">Today — in {diffHours}h</span>
  if (diffDays === 1) return <span className="text-amber-500 font-bold text-lg">Tomorrow</span>
  return <span className="text-[#1d6464] font-bold text-2xl">{diffDays} days</span>
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const showGlobalAudit = user ? canViewGlobalAudit(user.role) : false

  // Four independent queries — each tolerates its own failure (mirrors the old
  // Promise.allSettled behaviour), so one endpoint being down never blanks the page.
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
  // Show the page once the primary (stats) query settles; secondary panels fill in as they resolve.
  const loading = statsQuery.isLoading

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHero
        eyebrow="Today in PangoChain"
        title={`Good ${getGreeting()}, ${user?.fullName.split(' ')[0]}`}
        description={`${roleLabel(user?.role ?? 'ASSOCIATE_JUNIOR')} at ${user?.firmId ?? 'PangoChain'} - review matters, documents, hearings, and secure legal workflows from one command center.`}
        icon={Gavel}
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
            { label: 'Register a case', description: 'Create a new matter with blockchain-ready document controls.', to: '/cases/new', icon: FolderOpen, tone: 'cyan' },
            { label: 'Upload evidence', description: 'Encrypt a document, pin it to IPFS, and register its hash on Fabric.', to: '/documents', icon: FileText, tone: 'emerald' },
            { label: 'Prepare templates', description: 'Open reusable legal templates for faster drafting.', to: '/templates', icon: FileSignature, tone: 'amber' },
            { label: 'Ask assistant', description: 'Use the assistant workspace for guided legal workflow support.', to: '/assistant', icon: Bot, tone: 'violet' },
          ]}
        />
      </PageHero>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card flex items-center gap-4 animate-pulse">
              <div className="w-12 h-12 rounded-xl bg-surface-muted" />
              <div className="flex-1">
                <div className="h-3 bg-surface-muted rounded w-24 mb-2" />
                <div className="h-6 bg-surface-muted rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${showGlobalAudit ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
          <StatCard icon={<FolderOpen className="w-5 h-5" />} label="Active Cases"
            value={stats?.activeCases ?? 0} to="/cases" />
          <StatCard icon={<FileText className="w-5 h-5" />} label="Documents"
            value={stats?.totalDocuments ?? 0} to="/documents" />
          <StatCard icon={<MessageSquare className="w-5 h-5" />} label="Unread Messages"
            value={stats?.unreadMessages ?? 0} to="/messages" />
          {showGlobalAudit && (
            <StatCard icon={<Activity className="w-5 h-5" />} label="Audit Events"
              value={(stats?.auditEvents ?? 0).toLocaleString()} to="/audit" />
          )}
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Cases */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-heading font-semibold text-text-primary">Recent Cases</h2>
              <p className="text-xs text-slate-500 mt-1">Open a matter to manage files, access, deadlines, and audit history.</p>
            </div>
            <Link to="/cases" className="text-sm text-[#1d6464] hover:underline font-medium">View all →</Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2 animate-pulse">
                  <div className="w-9 h-9 rounded-lg bg-surface-muted shrink-0" />
                  <div className="flex-1">
                    <div className="h-3 bg-surface-muted rounded w-3/4 mb-1.5" />
                    <div className="h-2.5 bg-surface-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : cases.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="w-8 h-8 text-text-muted mx-auto mb-2" />
              <p className="text-text-muted text-sm">No cases yet</p>
              <Link to="/cases/new" className="btn-primary mt-3 text-sm inline-flex">
                <Plus className="w-3.5 h-3.5" /> Create First Case
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {cases.map((c) => (
                <Link key={c.id} to={`/cases/${c.id}`}
                  className="flex items-center justify-between py-3.5 hover:bg-surface-muted rounded-lg px-3 -mx-3 transition-colors group">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[#1d6464]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FolderOpen className="w-4 h-4 text-[#1d6464]" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-text-primary text-sm group-hover:text-[#1d6464] transition-colors truncate">
                        {c.title}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1.5">
                        {c.caseType && <span>{c.caseType}</span>}
                        <span>·</span>
                        <Clock className="w-3 h-3" />
                        <span>{new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        <span>·</span>
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
        <div className="space-y-5">
          {/* Next Hearing */}
          {nextHearing !== undefined && (
            <div className="card border border-[#1d6464]/20">
              <div className="flex items-center gap-2 mb-3">
                <Gavel className="w-4 h-4 text-[#1d6464]" />
                <h2 className="font-heading font-semibold text-text-primary text-sm">Next Hearing</h2>
              </div>
              {nextHearing === null ? (
                <p className="text-text-muted text-sm text-center py-2">No upcoming hearings</p>
              ) : (
                <div className="space-y-2">
                  <HearingCountdown date={nextHearing.hearingDate} />
                  <p className="font-medium text-text-primary text-sm truncate">{nextHearing.title}</p>
                  <p className="text-text-muted text-xs truncate">{nextHearing.caseTitle}</p>
                  <div className="flex items-center gap-1.5 text-xs text-text-muted pt-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(nextHearing.hearingDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  {nextHearing.courtName && (
                    <p className="text-xs text-text-muted truncate">{nextHearing.courtName}</p>
                  )}
                  <Link to="/hearings" className="text-xs text-[#1d6464] hover:underline font-medium">View all hearings →</Link>
                </div>
              )}
            </div>
          )}

          {/* Security Status */}
          <div className="card">
            <h2 className="font-heading font-semibold text-text-primary mb-1">Security Status</h2>
            <p className="mb-4 text-xs text-slate-500">Hover each control in the app for what it protects.</p>
            <div className="space-y-3.5">
              {[
                { label: 'Document Encryption', active: true },
                { label: 'Blockchain ACL', active: true },
                { label: 'IPFS Storage', active: true },
                { label: 'Audit Integrity', active: true },
                { label: 'MFA', active: user?.mfaEnabled ?? false },
              ].map(({ label, active }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">{label}</span>
                  <span className={`flex items-center gap-1.5 font-medium ${active ? 'text-success' : 'text-amber-500'}`}>
                    <span className={`w-2 h-2 rounded-full ${active ? 'bg-success animate-pulse' : 'bg-amber-400'}`} />
                    {active ? 'Active' : 'Recommended'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Blockchain card */}
          <div className="card bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.35),transparent_35%),linear-gradient(135deg,#0f172a,#0f3d3d)] text-white">
            <Shield className="w-6 h-6 mb-3 text-cyan-200" />
            <p className="font-heading font-semibold text-sm mb-1">Blockchain-Verified</p>
            <p className="text-xs text-white/60 leading-relaxed">
              Every document access, upload and permission change is immutably recorded on Hyperledger Fabric.
            </p>
            <div className="mt-3 pt-3 border-t border-white/10 text-xs text-white/50 font-mono">
              Channel: legal-channel · {showGlobalAudit ? `${(stats?.auditEvents ?? 0).toLocaleString()} events` : 'admin audit restricted'}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <DoorOpen className="h-4 w-4 text-cyan-700" />
              <h2 className="font-heading font-semibold text-text-primary text-sm">Feature Finder</h2>
            </div>
            <p className="text-xs leading-5 text-slate-600">
              Use the sidebar search to find features by purpose: type "client", "video", "keys", "cases", or "documents".
            </p>
          </div>

          {/* Recent Audit */}
          {showGlobalAudit && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-semibold text-text-primary">Recent Activity</h2>
              <Link to="/audit" className="text-xs text-[#1d6464] hover:underline">View log →</Link>
            </div>
            {audit.length === 0 ? (
              <p className="text-text-muted text-xs text-center py-4">No activity yet</p>
            ) : (
              <div className="space-y-2.5">
                {audit.map((a) => (
                  <div key={a.id} className="flex items-start gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0 ${AUDIT_COLORS[a.eventType] ?? 'bg-gray-100 text-gray-600'}`}>
                      {a.eventType.replace(/_/g, ' ')}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-text-secondary truncate">{a.resourceId}</p>
                      {a.fabricTxId && (
                        <code className="text-[9px] text-[#1d6464] font-mono">{a.fabricTxId.slice(0, 8)}…</code>
                      )}
                      <p className="text-[10px] text-text-muted">{new Date(a.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
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
