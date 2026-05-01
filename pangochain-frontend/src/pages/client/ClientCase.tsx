import { useState, useEffect } from 'react'
import {
  Scale, Gavel, FileText, Calendar, Users, Clock,
  CheckCircle, AlertCircle, Loader2, Lock, ChevronRight,
  Activity, Shield,
} from 'lucide-react'
import api from '../../lib/api'

interface Hearing {
  id: string
  title: string
  hearingDate: string
  location: string
  courtName: string
  hearingType: string
  notes: string
  caseId: string
  caseTitle: string
}

interface CaseEvent {
  id: string
  eventType: string
  title: string
  description: string
  fabricTxId: string
  actorName: string
  createdAt: string
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  CASE_REGISTERED: <Scale className="w-4 h-4" />,
  DOC_UPLOADED: <FileText className="w-4 h-4" />,
  ACCESS_GRANTED: <CheckCircle className="w-4 h-4" />,
  ACCESS_REVOKED: <Shield className="w-4 h-4" />,
  HEARING_SCHEDULED: <Gavel className="w-4 h-4" />,
  DOC_VIEWED: <Activity className="w-4 h-4" />,
  GENERAL: <Clock className="w-4 h-4" />,
}

const EVENT_COLORS: Record<string, string> = {
  CASE_REGISTERED: 'bg-[#1d6464]/10 text-[#1d6464] border-[#1d6464]/20',
  DOC_UPLOADED: 'bg-blue-50 text-blue-600 border-blue-200',
  ACCESS_GRANTED: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  ACCESS_REVOKED: 'bg-red-50 text-red-600 border-red-200',
  HEARING_SCHEDULED: 'bg-purple-50 text-purple-600 border-purple-200',
  DOC_VIEWED: 'bg-amber-50 text-amber-600 border-amber-200',
  GENERAL: 'bg-gray-100 text-gray-600 border-gray-200',
}

export default function ClientCase() {
  const [hearings, setHearings] = useState<Hearing[]>([])
  const [events, setEvents] = useState<CaseEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [hRes, auditRes] = await Promise.allSettled([
          api.get('/hearings/upcoming'),
          api.get('/audit', { params: { size: 20 } }),
        ])
        if (hRes.status === 'fulfilled') setHearings(hRes.value.data ?? [])
        if (auditRes.status === 'fulfilled') {
          const items = auditRes.value.data?.content ?? auditRes.value.data ?? []
          setEvents(items.slice(0, 15).map((a: any) => ({
            id: a.id,
            eventType: a.eventType ?? 'GENERAL',
            title: (a.eventType ?? 'GENERAL').replace(/_/g, ' '),
            description: a.contextJson ?? '',
            fabricTxId: a.fabricTxId ?? '',
            actorName: a.actorEmail ?? 'System',
            createdAt: a.timestamp ?? a.createdAt,
          })))
        }
      } catch (e: any) {
        setError('Failed to load case information')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return <div className="flex justify-center py-32"><Loader2 className="w-7 h-7 animate-spin text-[#1d6464]" /></div>
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">My Case</h1>
        <p className="text-text-muted text-sm mt-0.5">Hearings, timeline, and blockchain audit trail</p>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-error">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Upcoming Hearings ─────────────────────────────────────────────────── */}
        <div className="card space-y-4">
          <h2 className="font-heading font-semibold text-text-primary flex items-center gap-2">
            <Gavel className="w-4 h-4 text-[#1d6464]" /> Upcoming Hearings
          </h2>

          {hearings.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-10 h-10 text-text-muted mx-auto mb-3" />
              <p className="text-sm text-text-muted">No upcoming hearings</p>
            </div>
          ) : (
            <div className="space-y-3">
              {hearings.map((h) => {
                const date = new Date(h.hearingDate)
                const isPast = date < new Date()
                const isToday = date.toDateString() === new Date().toDateString()
                return (
                  <div key={h.id} className={`rounded-xl border px-4 py-3 ${
                    isPast ? 'bg-gray-50 border-gray-200' :
                    isToday ? 'bg-amber-50 border-amber-200' :
                    'bg-[#1d6464]/5 border-[#1d6464]/20'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-text-primary text-sm">{h.title}</p>
                        {h.courtName && (
                          <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
                            <Scale className="w-3 h-3" /> {h.courtName}
                          </p>
                        )}
                        {h.location && (
                          <p className="text-xs text-text-muted">{h.location}</p>
                        )}
                        {h.notes && (
                          <p className="text-xs text-text-muted mt-1 italic line-clamp-2">{h.notes}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-[#1d6464]">
                          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-xs text-text-muted">
                          {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {isToday && (
                          <span className="text-[10px] bg-amber-200 text-amber-800 font-bold px-1.5 py-0.5 rounded mt-1 block">TODAY</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Blockchain Privacy Notice ─────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="card bg-[#1d6464]/5 border-[#1d6464]/20">
            <h2 className="font-heading font-semibold text-[#1d6464] flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4" /> Your Privacy Rights
            </h2>
            <ul className="space-y-2 text-xs text-text-secondary">
              {[
                'All documents are encrypted before leaving your device',
                'Your lawyer team access is controlled by you and anchored on blockchain',
                'Every document access is permanently recorded and cannot be altered',
                'You can revoke access to your documents at any time',
                'Encrypted messages are only readable by intended recipients',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-[#1d6464] mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h2 className="font-heading font-semibold text-text-primary flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-[#1d6464]" /> Encryption Status
            </h2>
            <div className="space-y-2">
              {[
                { label: 'Document Encryption', status: 'AES-256-GCM', ok: true },
                { label: 'Key Exchange', status: 'ECIES P-256', ok: true },
                { label: 'Message Encryption', status: 'AES-256-GCM + ECIES', ok: true },
                { label: 'Blockchain Ledger', status: 'Hyperledger Fabric 2.4', ok: true },
                { label: 'Key Derivation', status: 'PBKDF2 600,000 iterations', ok: true },
              ].map(({ label, status, ok }) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <p className="text-xs text-text-secondary">{label}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Case Timeline ─────────────────────────────────────────────────────── */}
      <div className="card">
        <h2 className="font-heading font-semibold text-text-primary flex items-center gap-2 mb-5">
          <Activity className="w-4 h-4 text-[#1d6464]" /> Blockchain Audit Trail
          <span className="text-[10px] bg-[#1d6464]/10 text-[#1d6464] px-2 py-0.5 rounded ml-1 font-normal">
            Immutable · Tamper-proof
          </span>
        </h2>

        {events.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">No audit events yet</p>
        ) : (
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-4">
              {events.map((e, i) => {
                const color = EVENT_COLORS[e.eventType] ?? EVENT_COLORS.GENERAL
                const icon = EVENT_ICONS[e.eventType] ?? EVENT_ICONS.GENERAL
                return (
                  <div key={e.id} className="relative flex gap-4">
                    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 z-10 ${color}`}>
                      {icon}
                    </div>
                    <div className="flex-1 pb-4 min-w-0">
                      <p className="font-medium text-text-primary text-sm">{e.title}</p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {e.actorName} · {new Date(e.createdAt).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                      {e.fabricTxId && (
                        <p className="text-[10px] font-mono text-[#1d6464] mt-1 truncate">
                          tx: {e.fabricTxId.slice(0, 20)}…
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
