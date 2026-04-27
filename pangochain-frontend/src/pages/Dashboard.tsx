import { useQuery } from '@tanstack/react-query'
import { FolderOpen, FileText, MessageSquare, Activity, Plus, Shield, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore, roleLabel } from '../store/authStore'
import api from '../lib/api'

function StatCard({ icon, label, value, to }: { icon: React.ReactNode; label: string; value: string | number; to: string }) {
  return (
    <Link to={to} className="card flex items-center gap-4 hover:shadow-card-hover transition-shadow group">
      <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center text-primary flex-shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-text-muted text-sm">{label}</p>
        <p className="font-heading font-bold text-2xl text-text-primary">{value}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
    </Link>
  )
}

export default function Dashboard() {
  const { user } = useAuthStore()

  const { data: cases } = useQuery({
    queryKey: ['cases'],
    queryFn: () => api.get('/cases').then((r) => r.data),
  })

  const { data: auditRecent } = useQuery({
    queryKey: ['audit-recent'],
    queryFn: () => api.get('/audit?size=5').then((r) => r.data),
  })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            Good {getGreeting()}, {user?.fullName.split(' ')[0]}
          </h1>
          <p className="text-text-muted text-sm mt-0.5">{roleLabel(user?.role ?? 'ASSOCIATE_JUNIOR')}</p>
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
          value={cases?.totalElements ?? '—'} to="/cases" />
        <StatCard icon={<FileText className="w-5 h-5" />} label="Documents"
          value="—" to="/documents" />
        <StatCard icon={<MessageSquare className="w-5 h-5" />} label="Messages"
          value="—" to="/messages" />
        <StatCard icon={<Activity className="w-5 h-5" />} label="Audit Events"
          value={auditRecent?.totalElements ?? '—'} to="/audit" />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Cases */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold text-text-primary">Recent Cases</h2>
            <Link to="/cases" className="text-sm text-accent hover:underline">View all</Link>
          </div>
          {cases?.content?.length ? (
            <div className="divide-y divide-border">
              {cases.content.slice(0, 5).map((c: any) => (
                <Link key={c.id} to={`/cases/${c.id}`}
                  className="flex items-center justify-between py-3 hover:bg-surface-muted rounded-lg px-2 -mx-2 transition-colors group">
                  <div>
                    <p className="font-medium text-text-primary text-sm group-hover:text-primary transition-colors">{c.title}</p>
                    <p className="text-xs text-text-muted mt-0.5">{c.caseType} · {new Date(c.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`badge ${c.status === 'ACTIVE' ? 'badge-green' : c.status === 'CLOSED' ? 'badge-gray' : 'badge-amber'}`}>
                    {c.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<FolderOpen className="w-8 h-8 text-text-muted" />}
              text="No cases yet"
              action={<Link to="/cases/new" className="btn-primary text-sm">Create first case</Link>}
            />
          )}
        </div>

        {/* Security status */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="font-heading font-semibold text-text-primary mb-3">Security Status</h2>
            <div className="space-y-3">
              <SecurityItem label="Client-Side Encryption" status="active" />
              <SecurityItem label="Blockchain ACL" status="active" />
              <SecurityItem label="IPFS Storage" status="active" />
              <SecurityItem label="MFA" status={user?.mfaEnabled ? 'active' : 'warning'} />
              <SecurityItem label="Encryption Keys" status="active" />
            </div>
          </div>

          <div className="card bg-primary text-white">
            <Shield className="w-6 h-6 mb-3 opacity-80" />
            <p className="font-heading font-semibold text-sm mb-1">All encryption is client-side</p>
            <p className="text-xs text-primary-200 leading-relaxed">
              Your documents are encrypted with AES-256-GCM before upload. The server only receives ciphertext.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function SecurityItem({ label, status }: { label: string; status: 'active' | 'warning' | 'error' }) {
  const colors = { active: 'text-success', warning: 'text-warning', error: 'text-error' }
  const dots = { active: 'bg-success', warning: 'bg-warning', error: 'bg-error' }
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className={`flex items-center gap-1.5 font-medium ${colors[status]}`}>
        <span className={`w-2 h-2 rounded-full ${dots[status]}`} />
        {status === 'active' ? 'Active' : status === 'warning' ? 'Recommended' : 'Issue'}
      </span>
    </div>
  )
}

function EmptyState({ icon, text, action }: { icon: React.ReactNode; text: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-10">
      <div className="flex justify-center mb-3">{icon}</div>
      <p className="text-text-muted text-sm mb-3">{text}</p>
      {action}
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
