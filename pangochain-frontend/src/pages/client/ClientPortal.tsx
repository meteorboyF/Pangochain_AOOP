import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar, Bell, FileText, MessageSquare, Clock, Shield,
  AlertTriangle, ChevronRight, Upload, Download, Lock,
  CheckCircle, Loader2, AlertCircle, Scale, Gavel,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import api from '../../lib/api'

interface NextHearing {
  id: string
  title: string
  hearingDate: string
  location: string
  courtName: string
  hearingType: string
  caseTitle: string
}

interface Reminder {
  id: string
  title: string
  body: string
  dueAt: string | null
  priority: string
  read: boolean
  senderName: string
  createdAt: string
}

interface Stats {
  totalDocuments: number
  unreadMessages: number
  unreadReminders: number
  auditEvents: number
  nextHearing: NextHearing | null
}

function HearingCountdown({ date }: { date: string }) {
  const now = new Date()
  const hearing = new Date(date)
  const diffMs = hearing.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (diffMs < 0) return <span className="text-error text-sm font-semibold">Past</span>
  if (diffDays === 0) return (
    <span className="text-amber-600 font-bold text-lg">Today — in {diffHours}h</span>
  )
  if (diffDays === 1) return <span className="text-amber-500 font-bold text-lg">Tomorrow</span>
  return <span className="text-[#1d6464] font-bold text-2xl">{diffDays} days</span>
}

export default function ClientPortal() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<Stats | null>(null)
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, remindersRes] = await Promise.allSettled([
          api.get('/dashboard/stats'),
          api.get('/reminders'),
        ])

        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)
        if (remindersRes.status === 'fulfilled') setReminders(remindersRes.value.data?.slice(0, 5) ?? [])
      } catch (e: any) {
        setError('Failed to load portal data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const markReminderRead = async (id: string) => {
    await api.patch(`/reminders/${id}/read`).catch(() => {})
    setReminders((prev) => prev.map((r) => r.id === id ? { ...r, read: true } : r))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-7 h-7 animate-spin text-[#1d6464]" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">

      {/* ── Welcome Hero ─────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#1d6464] to-[#155050] rounded-2xl px-6 py-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold">
              Welcome back, {user?.fullName.split(' ')[0]}
            </h1>
            <p className="text-white/70 text-sm mt-1 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" />
              Your communications are end-to-end encrypted and secured on blockchain
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2">
            <Scale className="w-5 h-5" />
            <span className="text-sm font-medium">Secure Legal Portal</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-error">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* ── Next Hearing (prominent) ──────────────────────────────────────────── */}
      {stats?.nextHearing ? (
        <div className="card border-2 border-[#1d6464]/20 bg-gradient-to-br from-[#1d6464]/5 to-transparent">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#1d6464]/10 flex items-center justify-center flex-shrink-0">
              <Gavel className="w-6 h-6 text-[#1d6464]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#1d6464] bg-[#1d6464]/10 px-2 py-0.5 rounded">
                  Next Hearing
                </span>
                <span className="text-[11px] text-text-muted">{stats.nextHearing.hearingType?.replace(/_/g, ' ')}</span>
              </div>
              <h2 className="font-heading font-bold text-text-primary text-lg">{stats.nextHearing.title}</h2>
              <p className="text-text-secondary text-sm">{stats.nextHearing.caseTitle}</p>
              {stats.nextHearing.courtName && (
                <p className="text-text-muted text-xs mt-0.5 flex items-center gap-1">
                  <Scale className="w-3 h-3" /> {stats.nextHearing.courtName}
                  {stats.nextHearing.location && ` · ${stats.nextHearing.location}`}
                </p>
              )}
              <p className="text-text-muted text-xs mt-1">
                {new Date(stats.nextHearing.hearingDate).toLocaleDateString('en-US', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-text-muted mb-1">Time until hearing</p>
              <HearingCountdown date={stats.nextHearing.hearingDate} />
            </div>
          </div>
        </div>
      ) : (
        <div className="card border border-dashed border-border">
          <div className="flex items-center gap-3 text-text-muted">
            <Calendar className="w-5 h-5" />
            <p className="text-sm">No upcoming hearings scheduled · your lawyer will notify you</p>
          </div>
        </div>
      )}

      {/* ── Stats Row ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            icon: <FileText className="w-5 h-5 text-[#1d6464]" />,
            label: 'My Documents', value: stats?.totalDocuments ?? 0,
            bg: 'bg-[#1d6464]/10', link: '/client/documents',
          },
          {
            icon: <MessageSquare className="w-5 h-5 text-blue-600" />,
            label: 'Unread Messages', value: stats?.unreadMessages ?? 0,
            bg: 'bg-blue-50', link: '/messages',
          },
          {
            icon: <Bell className="w-5 h-5 text-amber-600" />,
            label: 'Reminders', value: stats?.unreadReminders ?? 0,
            bg: 'bg-amber-50', link: '#reminders',
          },
          {
            icon: <Shield className="w-5 h-5 text-emerald-600" />,
            label: 'Audit Events', value: stats?.auditEvents ?? 0,
            bg: 'bg-emerald-50', link: '/client/case',
          },
        ].map(({ icon, label, value, bg, link }) => (
          <Link key={label} to={link} className="card hover:shadow-md transition-shadow">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              {icon}
            </div>
            <p className="text-2xl font-bold text-text-primary">{value}</p>
            <p className="text-xs text-text-muted mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Reminders from Lawyer ────────────────────────────────────────────── */}
        <div className="card space-y-3" id="reminders">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-semibold text-text-primary flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#1d6464]" /> Reminders from Your Lawyer
            </h2>
            {reminders.filter((r) => !r.read).length > 0 && (
              <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">
                {reminders.filter((r) => !r.read).length} unread
              </span>
            )}
          </div>

          {reminders.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-6">No reminders yet</p>
          ) : (
            <div className="space-y-2">
              {reminders.map((r) => (
                <div
                  key={r.id}
                  onClick={() => !r.read && markReminderRead(r.id)}
                  className={`rounded-xl px-4 py-3 cursor-pointer transition-colors border ${
                    r.read ? 'bg-surface-muted border-transparent' : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {!r.read && <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />}
                        <p className={`text-sm font-medium truncate ${r.read ? 'text-text-secondary' : 'text-text-primary'}`}>
                          {r.title}
                        </p>
                        {r.priority === 'HIGH' && (
                          <span className="text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded flex-shrink-0">URGENT</span>
                        )}
                      </div>
                      {r.body && <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{r.body}</p>}
                      <p className="text-[10px] text-text-muted mt-1">
                        From {r.senderName}
                        {r.dueAt && ` · Due ${new Date(r.dueAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    {r.read && <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Quick Actions ─────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <h2 className="font-heading font-semibold text-text-primary">Quick Actions</h2>
          <div className="space-y-3">
            {[
              {
                icon: <Upload className="w-5 h-5 text-[#1d6464]" />,
                title: 'Upload Secure Document',
                desc: 'Share evidence, contracts, or sensitive disclosures with your lawyer. Encrypted before leaving your device.',
                to: '/client/documents',
                bg: 'bg-[#1d6464]/10',
                badge: null,
              },
              {
                icon: <MessageSquare className="w-5 h-5 text-blue-600" />,
                title: 'Message Your Lawyer',
                desc: 'Send an encrypted message. Neither the server nor any third party can read your communication.',
                to: '/messages',
                bg: 'bg-blue-50',
                badge: stats?.unreadMessages ? `${stats.unreadMessages} unread` : null,
              },
              {
                icon: <Download className="w-5 h-5 text-emerald-600" />,
                title: 'My Document Vault',
                desc: 'View and download all your documents. Decryption happens locally — only you can read them.',
                to: '/client/documents',
                bg: 'bg-emerald-50',
                badge: null,
              },
              {
                icon: <Clock className="w-5 h-5 text-purple-600" />,
                title: 'Case Timeline',
                desc: 'View your case history, blockchain audit trail, and upcoming hearings.',
                to: '/client/case',
                bg: 'bg-purple-50',
                badge: null,
              },
            ].map(({ icon, title, desc, to, bg, badge }) => (
              <Link key={title} to={to}
                className="card hover:shadow-md transition-all hover:border-[#1d6464]/30 flex items-center gap-4 group"
              >
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-text-primary text-sm">{title}</p>
                    {badge && <span className="text-[10px] bg-blue-100 text-blue-600 font-bold px-1.5 py-0.5 rounded-full">{badge}</span>}
                  </div>
                  <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-[#1d6464] transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>

          {/* Encryption notice */}
          <div className="bg-[#1d6464]/5 border border-[#1d6464]/20 rounded-xl px-4 py-3">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-[#1d6464] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-[#1d6464]">Your Privacy is Protected</p>
                <p className="text-[11px] text-text-muted leading-relaxed mt-0.5">
                  All documents are encrypted with AES-256-GCM in your browser before upload.
                  Every access is recorded on Hyperledger Fabric blockchain. Your lawyer's team
                  can only access documents you explicitly share with them.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
