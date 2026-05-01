import { useState, useEffect } from 'react'
import {
  Gavel, Calendar, Plus, Trash2, Bell, Loader2, AlertCircle,
  MapPin, Scale, Clock, Users, ChevronDown, Send,
} from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'

interface CaseDto { id: string; title: string; status: string }
interface Hearing {
  id: string
  caseId: string
  caseTitle: string
  title: string
  hearingDate: string
  location: string
  courtName: string
  hearingType: string
  notes: string
  createdAt: string
}

const HEARING_TYPES = [
  'COURT_HEARING', 'PRETRIAL_CONFERENCE', 'MEDIATION', 'ARBITRATION',
  'DEPOSITION', 'MOTION_HEARING', 'STATUS_CONFERENCE', 'SENTENCING', 'APPEAL', 'OTHER',
]

export default function HearingManager() {
  const [hearings, setHearings] = useState<Hearing[]>([])
  const [cases, setCases] = useState<CaseDto[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // New hearing form
  const [caseId, setCaseId] = useState('')
  const [title, setTitle] = useState('')
  const [hearingDate, setHearingDate] = useState('')
  const [location, setLocation] = useState('')
  const [courtName, setCourtName] = useState('')
  const [hearingType, setHearingType] = useState('COURT_HEARING')
  const [notes, setNotes] = useState('')

  // Reminder
  const [reminderHearing, setReminderHearing] = useState<Hearing | null>(null)
  const [reminderRecipient, setReminderRecipient] = useState('')
  const [reminderBody, setReminderBody] = useState('')
  const [sendingReminder, setSendingReminder] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [hRes, cRes] = await Promise.allSettled([
          api.get('/hearings/upcoming'),
          api.get('/cases', { params: { size: 100 } }),
        ])
        if (hRes.status === 'fulfilled') setHearings(hRes.value.data ?? [])
        if (cRes.status === 'fulfilled') setCases(cRes.value.data?.content ?? [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!caseId || !title || !hearingDate) return
    setSubmitting(true)
    try {
      const { data } = await api.post('/hearings', {
        caseId,
        title,
        hearingDate: new Date(hearingDate).toISOString(),
        location: location || null,
        courtName: courtName || null,
        hearingType,
        notes: notes || null,
      })
      toast.success('Hearing scheduled')
      setHearings((prev) => [data, ...prev])
      setShowForm(false)
      setTitle(''); setHearingDate(''); setLocation(''); setCourtName(''); setNotes('')
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Failed to schedule hearing')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    await api.delete(`/hearings/${id}`).catch(() => {})
    setHearings((prev) => prev.filter((h) => h.id !== id))
    toast.success('Hearing removed')
  }

  const handleSendReminder = async () => {
    if (!reminderHearing || !reminderRecipient.trim()) return
    setSendingReminder(true)
    try {
      const recipRes = await api.get('/users/by-email', { params: { email: reminderRecipient.trim() } })
      await api.post('/reminders', {
        recipientId: recipRes.data.id,
        caseId: reminderHearing.caseId,
        title: `Hearing Reminder: ${reminderHearing.title}`,
        body: reminderBody || `You have a hearing scheduled: ${reminderHearing.title} on ${new Date(reminderHearing.hearingDate).toLocaleDateString()}${reminderHearing.courtName ? ` at ${reminderHearing.courtName}` : ''}. ${reminderHearing.notes ?? ''}`,
        dueAt: reminderHearing.hearingDate,
        priority: 'HIGH',
      })
      toast.success('Reminder sent to client')
      setReminderHearing(null)
      setReminderRecipient('')
      setReminderBody('')
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Failed to send reminder')
    } finally {
      setSendingReminder(false)
    }
  }

  const upcoming = hearings.filter((h) => new Date(h.hearingDate) >= new Date())
  const past = hearings.filter((h) => new Date(h.hearingDate) < new Date())

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Hearing Manager</h1>
          <p className="text-text-muted text-sm mt-0.5">Schedule hearings and send reminders to clients</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus className="w-4 h-4" /> Schedule Hearing
        </button>
      </div>

      {/* ── Create Form ───────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="card border-2 border-[#1d6464]/20">
          <h2 className="font-heading font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Gavel className="w-4 h-4 text-[#1d6464]" /> New Hearing
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Case *</label>
                <select className="input" value={caseId} onChange={(e) => setCaseId(e.target.value)} required>
                  <option value="">— Select case —</option>
                  {cases.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Hearing Type</label>
                <select className="input" value={hearingType} onChange={(e) => setHearingType(e.target.value)}>
                  {HEARING_TYPES.map((t) => <option key={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="label">Title *</label>
              <input className="input" placeholder="e.g. Motion to Dismiss Hearing" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Date & Time *</label>
                <input type="datetime-local" className="input" value={hearingDate} onChange={(e) => setHearingDate(e.target.value)} required />
              </div>
              <div>
                <label className="label">Court Name</label>
                <input className="input" placeholder="e.g. Superior Court of California" value={courtName} onChange={(e) => setCourtName(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="label">Location / Courtroom</label>
              <input className="input" placeholder="e.g. Room 302, 210 West Temple Street" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>

            <div>
              <label className="label">Notes for Client</label>
              <textarea className="input min-h-[80px] resize-y" placeholder="Instructions, what to bring, dress code…" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 btn border border-border text-text-secondary py-2.5 justify-center">Cancel</button>
              <button type="submit" disabled={submitting || !caseId || !title || !hearingDate} className="flex-1 btn-primary py-2.5 justify-center disabled:opacity-50">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Scheduling…</> : <><Calendar className="w-4 h-4" /> Schedule</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1d6464]" /></div>}

      {/* ── Upcoming ──────────────────────────────────────────────────────────── */}
      {!loading && (
        <>
          <div className="space-y-3">
            <h2 className="font-heading font-semibold text-text-primary text-sm uppercase tracking-wide text-text-muted">
              Upcoming ({upcoming.length})
            </h2>
            {upcoming.length === 0 && (
              <p className="text-sm text-text-muted py-4 text-center">No upcoming hearings scheduled</p>
            )}
            {upcoming.map((h) => (
              <HearingCard
                key={h.id}
                hearing={h}
                onDelete={handleDelete}
                onRemind={() => setReminderHearing(h)}
              />
            ))}
          </div>

          {past.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-heading font-semibold text-sm uppercase tracking-wide text-text-muted">
                Past ({past.length})
              </h2>
              {past.slice(0, 5).map((h) => (
                <HearingCard key={h.id} hearing={h} onDelete={handleDelete} past />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Reminder Modal ────────────────────────────────────────────────────── */}
      {reminderHearing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-heading font-bold text-text-primary">Send Hearing Reminder</h2>
                <p className="text-xs text-text-muted">{reminderHearing.title}</p>
              </div>
            </div>

            <div>
              <label className="label">Client Email</label>
              <input className="input" placeholder="client@example.com" value={reminderRecipient} onChange={(e) => setReminderRecipient(e.target.value)} />
            </div>

            <div>
              <label className="label">Custom Message (optional)</label>
              <textarea
                className="input min-h-[80px] resize-y"
                placeholder="Leave blank to send default hearing details…"
                value={reminderBody}
                onChange={(e) => setReminderBody(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setReminderHearing(null)} className="flex-1 btn border border-border text-text-secondary py-2.5 justify-center">Cancel</button>
              <button
                onClick={handleSendReminder}
                disabled={sendingReminder || !reminderRecipient.trim()}
                className="flex-1 btn-primary py-2.5 justify-center disabled:opacity-50"
              >
                {sendingReminder ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <><Send className="w-4 h-4" /> Send Reminder</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function HearingCard({ hearing, onDelete, onRemind, past }: {
  hearing: Hearing
  onDelete: (id: string) => void
  onRemind?: () => void
  past?: boolean
}) {
  const date = new Date(hearing.hearingDate)
  return (
    <div className={`card ${past ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-4">
        <div className={`w-11 h-11 rounded-xl flex-shrink-0 flex flex-col items-center justify-center text-center ${past ? 'bg-gray-100' : 'bg-[#1d6464]/10'}`}>
          <span className={`text-[10px] font-bold uppercase ${past ? 'text-gray-500' : 'text-[#1d6464]'}`}>
            {date.toLocaleDateString('en-US', { month: 'short' })}
          </span>
          <span className={`text-lg font-bold leading-none ${past ? 'text-gray-600' : 'text-[#1d6464]'}`}>
            {date.getDate()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-text-primary text-sm">{hearing.title}</p>
            <span className="text-[10px] bg-[#1d6464]/10 text-[#1d6464] font-semibold px-1.5 py-0.5 rounded">
              {hearing.hearingType.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            {hearing.caseTitle} · {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </p>
          {hearing.courtName && (
            <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
              <Scale className="w-3 h-3" /> {hearing.courtName}
              {hearing.location && ` · ${hearing.location}`}
            </p>
          )}
          {hearing.notes && <p className="text-xs text-text-muted italic mt-1 line-clamp-2">{hearing.notes}</p>}
        </div>

        <div className="flex items-center gap-1">
          {!past && onRemind && (
            <button
              onClick={onRemind}
              className="p-2 rounded-lg hover:bg-amber-50 text-text-muted hover:text-amber-600 transition-colors"
              title="Send reminder to client"
            >
              <Bell className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onDelete(hearing.id)}
            className="p-2 rounded-lg hover:bg-red-50 text-text-muted hover:text-error transition-colors"
            title="Delete hearing"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
