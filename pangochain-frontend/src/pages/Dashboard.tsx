import { useEffect, useState } from 'react'
import { FolderOpen, FileText, MessageSquare, Activity, Plus, Shield, ChevronRight, Clock, TrendingUp, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore, roleLabel } from '../store/authStore'
import api from '../lib/api'

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

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  CLOSED:   'bg-gray-100 text-gray-600 border border-gray-200',
  ARCHIVED: 'bg-amber-50 text-amber-700 border border-amber-200',
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
    <Link to={to} className="card flex items-center gap-4 hover:shadow-card-hover transition-all group hover:-translate-y-0.5">
      <div className="w-12 h-12 rounded-xl bg-[#1d6464]/10 flex items-center justify-center text-[#1d6464] flex-shrink-0 group-hover:bg-[#1d6464] group-hover:text-white transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-text-muted text-sm">{label}</p>
        <p className="font-heading font-bold text-2xl text-text-primary">{value}</p>
        {trend && <p className="text-xs text-success flex items-center gap-0.5 mt-0.5"><TrendingUp className="w-3 h-3" />{trend}</p>}
      </div>
      <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
    </Link>
  )
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<Stats | null>(null)
  const [cases, setCases] = useState<RecentCase[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, casesRes, auditRes] = await Promise.allSettled([
          api.get<Stats>('/dashboard/stats'),
          api.get('/cases', { params: { size: 5 } }),
          api.get('/audit', { params: { size: 4 } }),
        ])
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)
        if (casesRes.status === 'fulfilled') setCases(casesRes.value.data.content ?? [])
        if (auditRes.status === 'fulfilled') setAudit(auditRes.value.data.content ?? [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            Good {getGreeting()}, {user?.fullName.split(' ')[0]}
          </h1>
          <p className="text-text-muted text-sm mt-0.5">{roleLabel(user?.role ?? 'ASSOCIATE_JUNIOR')} · {user?.firmId ?? 'PangoChain'}</p>
        </div>
        <Link to="/cases/new" className="btn-primary">
          <Plus className="w-4 h-4" /> New Case
        </Link>
      </div>

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<FolderOpen className="w-5 h-5" />} label="Active Cases"
            value={stats?.activeCases ?? 0} to="/cases" />
          <StatCard icon={<FileText className="w-5 h-5" />} label="Documents"
            value={stats?.totalDocuments ?? 0} to="/documents" />
          <StatCard icon={<MessageSquare className="w-5 h-5" />} label="Unread Messages"
            value={stats?.unreadMessages ?? 0} to="/messages" />
          <StatCard icon={<Activity className="w-5 h-5" />} label="Audit Events"
            value={(stats?.auditEvents ?? 0).toLocaleString()} to="/audit" />
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Cases */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading font-semibold text-text-primary">Recent Cases</h2>
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
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ml-3 flex-shrink-0 ${STATUS_COLORS[c.status] ?? ''}`}>
                    {c.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Security Status */}
          <div className="card">
            <h2 className="font-heading font-semibold text-text-primary mb-4">Security Status</h2>
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
          <div className="card bg-[#0f3d3d] text-white">
            <Shield className="w-6 h-6 mb-3 text-[#4ab8b8]" />
            <p className="font-heading font-semibold text-sm mb-1">Blockchain-Verified</p>
            <p className="text-xs text-white/60 leading-relaxed">
              Every document access, upload and permission change is immutably recorded on Hyperledger Fabric.
            </p>
            <div className="mt-3 pt-3 border-t border-white/10 text-xs text-white/50 font-mono">
              Channel: legal-channel · {(stats?.auditEvents ?? 0).toLocaleString()} events
            </div>
          </div>

          {/* Recent Audit */}
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
                      <p className="text-[10px] text-text-muted">{new Date(a.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
