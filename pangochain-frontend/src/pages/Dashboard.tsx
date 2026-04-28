import { FolderOpen, FileText, MessageSquare, Activity, Plus, Shield, ChevronRight, Clock, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore, roleLabel } from '../store/authStore'
import { MOCK_CASES, MOCK_AUDIT, MOCK_STATS } from '../lib/mockData'

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

function SecurityItem({ label, status }: { label: string; status: 'active' | 'warning' | 'error' }) {
  const colors = { active: 'text-success', warning: 'text-amber-500', error: 'text-error' }
  const dots = { active: 'bg-success', warning: 'bg-amber-400', error: 'bg-error' }
  const labels = { active: 'Active', warning: 'Recommended', error: 'Issue' }
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className={`flex items-center gap-1.5 font-medium ${colors[status]}`}>
        <span className={`w-2 h-2 rounded-full ${dots[status]} ${status === 'active' ? 'animate-pulse' : ''}`} />
        {labels[status]}
      </span>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  CLOSED: 'bg-gray-100 text-gray-600 border border-gray-200',
  ARCHIVED: 'bg-amber-50 text-amber-700 border border-amber-200',
}

const AUDIT_COLORS: Record<string, string> = {
  DOC_REGISTERED: 'bg-blue-50 text-blue-700',
  ACCESS_GRANTED: 'bg-emerald-50 text-emerald-700',
  ACCESS_REVOKED: 'bg-red-50 text-red-700',
  DOC_VIEWED: 'bg-purple-50 text-purple-700',
  CASE_REGISTERED: 'bg-teal-50 text-teal-700',
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const recentCases = MOCK_CASES.slice(0, 5)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            Good {getGreeting()}, {user?.fullName.split(' ')[0]}
          </h1>
          <p className="text-text-muted text-sm mt-0.5">{roleLabel(user?.role ?? 'ASSOCIATE_JUNIOR')} · FirmA Law Group</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/cases/new" className="btn-primary">
            <Plus className="w-4 h-4" /> New Case
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<FolderOpen className="w-5 h-5" />} label="Active Cases"
          value={MOCK_STATS.activeCases} to="/cases" trend="+2 this month" />
        <StatCard icon={<FileText className="w-5 h-5" />} label="Documents"
          value={MOCK_STATS.totalDocuments} to="/documents" trend="+18 this week" />
        <StatCard icon={<MessageSquare className="w-5 h-5" />} label="Unread Messages"
          value={MOCK_STATS.unreadMessages} to="/messages" />
        <StatCard icon={<Activity className="w-5 h-5" />} label="Audit Events"
          value={MOCK_STATS.auditEvents.toLocaleString()} to="/audit" trend="All verified" />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Cases */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading font-semibold text-text-primary">Recent Cases</h2>
            <Link to="/cases" className="text-sm text-[#1d6464] hover:underline font-medium">View all →</Link>
          </div>
          <div className="divide-y divide-border">
            {recentCases.map((c) => (
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
                      <span>{c.caseType}</span>
                      <span>·</span>
                      <Clock className="w-3 h-3" />
                      <span>{new Date(c.lastActivity).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      <span>·</span>
                      <span>{c.documents} docs</span>
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ml-3 flex-shrink-0 ${STATUS_COLORS[c.status]}`}>
                  {c.status}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Security Status */}
          <div className="card">
            <h2 className="font-heading font-semibold text-text-primary mb-4">Security Status</h2>
            <div className="space-y-3.5">
              <SecurityItem label="Document Encryption" status="active" />
              <SecurityItem label="Blockchain ACL" status="active" />
              <SecurityItem label="IPFS Storage" status="active" />
              <SecurityItem label="Audit Integrity" status="active" />
              <SecurityItem label="MFA" status={user?.mfaEnabled ? 'active' : 'warning'} />
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
              Channel: legal-channel · {MOCK_STATS.auditEvents.toLocaleString()} events
            </div>
          </div>

          {/* Recent Audit */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-semibold text-text-primary">Recent Activity</h2>
              <Link to="/audit" className="text-xs text-[#1d6464] hover:underline">View log →</Link>
            </div>
            <div className="space-y-2.5">
              {MOCK_AUDIT.slice(0, 4).map((a) => (
                <div key={a.id} className="flex items-start gap-2">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0 ${AUDIT_COLORS[a.eventType] ?? 'bg-gray-100 text-gray-600'}`}>
                    {a.eventType.replace(/_/g, ' ')}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-text-secondary truncate">{a.resource}</p>
                    <p className="text-[10px] text-text-muted">{a.actor} · {new Date(a.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
