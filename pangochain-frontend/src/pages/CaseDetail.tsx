import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, FolderOpen, FileText, Clock, Shield, Plus,
  Download, Eye, Users, Lock, ExternalLink, Gavel, Activity,
  Calendar, Send, Loader2, AlertCircle, Bell,
} from 'lucide-react'
import { DocumentUploadDropzone } from '../components/DocumentUploadDropzone'
import { SecureDownloadModal } from '../components/SecureDownloadModal'
import { TeamAccessPanel } from '../components/TeamAccessPanel'
import api from '../lib/api'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  CLOSED:   'bg-gray-100 text-gray-600 border border-gray-200',
  ARCHIVED: 'bg-amber-50 text-amber-700 border border-amber-200',
}

const HEARING_TYPES = [
  'COURT_HEARING', 'PRETRIAL_CONFERENCE', 'MEDIATION', 'ARBITRATION',
  'DEPOSITION', 'MOTION_HEARING', 'STATUS_CONFERENCE', 'SENTENCING', 'APPEAL', 'OTHER',
]

interface CaseDto {
  id: string
  title: string
  caseType: string
  status: string
  description?: string
  createdAt?: string
  firmName?: string
  createdByName?: string
}

interface DocItem {
  id: string
  fileName: string
  ipfsCid?: string
  documentHashSha256?: string
  fabricTxId?: string
  ownerEmail?: string
  version?: number
  status?: string
  createdAt?: string
  category?: string
  confidential?: boolean
}

interface Hearing {
  id: string
  title: string
  hearingDate: string
  location?: string
  courtName?: string
  hearingType: string
  notes?: string
}

type Tab = 'documents' | 'hearings' | 'team' | 'timeline'

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>()
  const [legalCase, setLegalCase] = useState<CaseDto | null>(null)
  const [documents, setDocuments] = useState<DocItem[]>([])
  const [hearings, setHearings] = useState<Hearing[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [downloadTarget, setDownloadTarget] = useState<DocItem | null>(null)
  const [accessDocId, setAccessDocId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('documents')
  const [teamDocId, setTeamDocId] = useState<string | null>(null)

  // Hearing form state
  const [showHearingForm, setShowHearingForm] = useState(false)
  const [hearingTitle, setHearingTitle] = useState('')
  const [hearingDate, setHearingDate] = useState('')
  const [hearingLocation, setHearingLocation] = useState('')
  const [hearingCourt, setHearingCourt] = useState('')
  const [hearingType, setHearingType] = useState('COURT_HEARING')
  const [hearingNotes, setHearingNotes] = useState('')
  const [submittingHearing, setSubmittingHearing] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [caseRes, docsRes, hearingsRes] = await Promise.allSettled([
        api.get(`/cases/${id}`),
        api.get(`/documents/by-case/${id}`),
        api.get(`/hearings/by-case/${id}`),
      ])
      if (caseRes.status === 'fulfilled') setLegalCase(caseRes.value.data)
      if (docsRes.status === 'fulfilled') setDocuments(docsRes.value.data ?? [])
      if (hearingsRes.status === 'fulfilled') setHearings(hearingsRes.value.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  const handleAddHearing = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hearingTitle || !hearingDate) return
    setSubmittingHearing(true)
    try {
      const { data } = await api.post('/hearings', {
        caseId: id,
        title: hearingTitle,
        hearingDate: new Date(hearingDate).toISOString(),
        location: hearingLocation || null,
        courtName: hearingCourt || null,
        hearingType,
        notes: hearingNotes || null,
      })
      setHearings((prev) => [...prev, data])
      toast.success('Hearing scheduled')
      setShowHearingForm(false)
      setHearingTitle(''); setHearingDate(''); setHearingLocation(''); setHearingCourt(''); setHearingNotes('')
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Failed to schedule hearing')
    } finally {
      setSubmittingHearing(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-[#1d6464] border-t-transparent rounded-full animate-spin" /></div>
  }

  if (!legalCase) {
    return (
      <div className="text-center py-20">
        <FolderOpen className="w-12 h-12 text-text-muted mx-auto mb-4" />
        <p className="font-heading font-semibold text-text-primary">Case not found</p>
        <Link to="/cases" className="text-[#1d6464] text-sm mt-2 inline-block hover:underline">← Back to cases</Link>
      </div>
    )
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" />, count: documents.length },
    { id: 'hearings', label: 'Hearings', icon: <Gavel className="w-4 h-4" />, count: hearings.length },
    { id: 'team', label: 'Team Access', icon: <Users className="w-4 h-4" /> },
    { id: 'timeline', label: 'Timeline', icon: <Activity className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/cases" className="mt-1 p-2 rounded-lg hover:bg-surface-muted transition-colors text-text-muted hover:text-text-primary">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="font-heading text-2xl font-bold text-text-primary">{legalCase.title}</h1>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[legalCase.status] ?? ''}`}>
              {legalCase.status}
            </span>
          </div>
          <p className="text-text-muted text-sm">
            {legalCase.caseType}
            {legalCase.createdByName && ` · Lead: ${legalCase.createdByName}`}
            {legalCase.firmName && ` · ${legalCase.firmName}`}
          </p>
        </div>
        <button onClick={() => setShowUpload(true)} className="btn-primary shrink-0">
          <Plus className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {/* Description */}
      {legalCase.description && (
        <div className="card">
          <p className="text-text-secondary text-sm leading-relaxed">{legalCase.description}</p>
        </div>
      )}

      {/* ── Tabs ──────────────────────────────────────────────────────────────── */}
      <div className="border-b border-border">
        <div className="flex gap-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.id
                  ? 'border-[#1d6464] text-[#1d6464]'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              {t.icon}
              {t.label}
              {t.count !== undefined && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === t.id ? 'bg-[#1d6464]/10 text-[#1d6464]' : 'bg-gray-100 text-gray-500'
                }`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Documents ────────────────────────────────────────────────────── */}
      {activeTab === 'documents' && (
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-heading font-semibold text-text-primary">Documents</h2>
              <p className="text-text-muted text-xs mt-0.5">{documents.length} files · end-to-end encrypted</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#1d6464] font-semibold bg-[#1d6464]/10 px-2.5 py-1 rounded-lg">
              <Lock className="w-3 h-3" /> AES-256-GCM + IPFS
            </div>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-border rounded-xl">
              <FileText className="w-8 h-8 text-text-muted mx-auto mb-3" />
              <p className="text-text-muted text-sm">No documents yet</p>
              <button onClick={() => setShowUpload(true)} className="btn-primary mt-4 text-sm">
                <Plus className="w-3.5 h-3.5" /> Upload First Document
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between py-3.5 group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      doc.confidential ? 'bg-red-50' : 'bg-[#1d6464]/10'
                    }`}>
                      {doc.confidential
                        ? <Shield className="w-4 h-4 text-red-500" />
                        : <FileText className="w-4 h-4 text-[#1d6464]" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-text-primary text-sm truncate">{doc.fileName}</p>
                        {doc.confidential && <span className="text-[9px] bg-red-100 text-red-600 font-bold px-1 py-0.5 rounded">CONF</span>}
                        {doc.category && doc.category !== 'GENERAL' && (
                          <span className="text-[9px] bg-gray-100 text-gray-600 font-semibold px-1 py-0.5 rounded">{doc.category}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                        {doc.ownerEmail && <span>{doc.ownerEmail}</span>}
                        {doc.createdAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                        {doc.fabricTxId && (
                          <span className="text-[#1d6464] font-mono">· tx: {doc.fabricTxId.slice(0, 8)}…</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-3 shrink-0">
                    <button
                      onClick={() => setTeamDocId(teamDocId === doc.id ? null : doc.id)}
                      className="p-1.5 rounded-lg hover:bg-[#1d6464]/10 text-text-muted hover:text-[#1d6464] transition-colors opacity-0 group-hover:opacity-100"
                      title="Manage team access"
                    >
                      <Users className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDownloadTarget(doc)}
                      className="p-1.5 rounded-lg hover:bg-[#1d6464]/10 text-text-muted hover:text-[#1d6464] transition-colors"
                      title="Secure Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {/* Inline team access panel for this doc */}
                  {teamDocId === doc.id && (
                    <div className="w-full mt-3 border-t border-border pt-3">
                      <TeamAccessPanel docId={doc.id} docName={doc.fileName} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Hearings ─────────────────────────────────────────────────────── */}
      {activeTab === 'hearings' && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-semibold text-text-primary">Case Hearings</h2>
            <button onClick={() => setShowHearingForm(!showHearingForm)} className="btn-primary text-sm">
              <Plus className="w-4 h-4" /> Schedule Hearing
            </button>
          </div>

          {showHearingForm && (
            <form onSubmit={handleAddHearing} className="bg-[#1d6464]/5 border border-[#1d6464]/20 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Title *</label>
                  <input className="input text-sm py-2" placeholder="e.g. Motion Hearing" value={hearingTitle} onChange={(e) => setHearingTitle(e.target.value)} required />
                </div>
                <div>
                  <label className="label text-xs">Type</label>
                  <select className="input text-sm py-2" value={hearingType} onChange={(e) => setHearingType(e.target.value)}>
                    {HEARING_TYPES.map((t) => <option key={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Date & Time *</label>
                  <input type="datetime-local" className="input text-sm py-2" value={hearingDate} onChange={(e) => setHearingDate(e.target.value)} required />
                </div>
                <div>
                  <label className="label text-xs">Court Name</label>
                  <input className="input text-sm py-2" placeholder="Superior Court of…" value={hearingCourt} onChange={(e) => setHearingCourt(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label text-xs">Location / Room</label>
                <input className="input text-sm py-2" placeholder="Room 302, 210 Main St" value={hearingLocation} onChange={(e) => setHearingLocation(e.target.value)} />
              </div>
              <div>
                <label className="label text-xs">Notes for Client</label>
                <textarea className="input text-sm min-h-[60px] resize-y" placeholder="What to bring, dress code, parking…" value={hearingNotes} onChange={(e) => setHearingNotes(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowHearingForm(false)} className="btn border border-border text-text-secondary text-xs py-1.5 px-3">Cancel</button>
                <button type="submit" disabled={submittingHearing} className="btn-primary text-xs py-1.5 px-3 disabled:opacity-50">
                  {submittingHearing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Scheduling…</> : <><Calendar className="w-3.5 h-3.5" /> Schedule</>}
                </button>
              </div>
            </form>
          )}

          {hearings.length === 0 ? (
            <div className="text-center py-10">
              <Gavel className="w-8 h-8 text-text-muted mx-auto mb-3" />
              <p className="text-text-muted text-sm">No hearings scheduled yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {hearings.map((h) => {
                const date = new Date(h.hearingDate)
                const isPast = date < new Date()
                return (
                  <div key={h.id} className={`rounded-xl border px-4 py-3 flex items-start gap-4 ${
                    isPast ? 'border-gray-200 bg-gray-50' : 'border-[#1d6464]/20 bg-[#1d6464]/5'
                  }`}>
                    <div className={`w-11 h-11 rounded-xl flex-shrink-0 flex flex-col items-center justify-center ${isPast ? 'bg-gray-200' : 'bg-[#1d6464]/10'}`}>
                      <span className={`text-[9px] font-bold uppercase ${isPast ? 'text-gray-500' : 'text-[#1d6464]'}`}>{date.toLocaleDateString('en-US', { month: 'short' })}</span>
                      <span className={`text-lg font-bold leading-none ${isPast ? 'text-gray-600' : 'text-[#1d6464]'}`}>{date.getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary text-sm">{h.title}</p>
                      <p className="text-xs text-text-muted">{h.hearingType?.replace(/_/g, ' ')} · {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                      {h.courtName && <p className="text-xs text-text-muted">{h.courtName}{h.location && ` · ${h.location}`}</p>}
                      {h.notes && <p className="text-xs text-text-muted italic mt-1">{h.notes}</p>}
                    </div>
                    {isPast && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Past</span>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Team Access ──────────────────────────────────────────────────── */}
      {activeTab === 'team' && (
        <div className="card">
          {documents.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">Upload documents first to manage team access</p>
          ) : (
            <div className="space-y-6">
              {documents.map((doc) => (
                <div key={doc.id} className="border-b border-border pb-6 last:border-0 last:pb-0">
                  <TeamAccessPanel docId={doc.id} docName={doc.fileName} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Timeline ─────────────────────────────────────────────────────── */}
      {activeTab === 'timeline' && (
        <CaseTimeline caseId={id!} />
      )}

      {/* Modals */}
      {showUpload && (
        <DocumentUploadDropzone
          caseId={id!}
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); loadData() }}
        />
      )}
      {downloadTarget && (
        <SecureDownloadModal
          docId={downloadTarget.id}
          fileName={downloadTarget.fileName}
          expectedHash={downloadTarget.documentHashSha256}
          onClose={() => setDownloadTarget(null)}
        />
      )}
    </div>
  )
}

function CaseTimeline({ caseId }: { caseId: string }) {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/case-events/by-case/${caseId}`)
      .then(({ data }) => setEvents(data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [caseId])

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[#1d6464]" /></div>

  return (
    <div className="card">
      <h2 className="font-heading font-semibold text-text-primary mb-5 flex items-center gap-2">
        <Activity className="w-4 h-4 text-[#1d6464]" /> Case Timeline
        <span className="text-[10px] bg-[#1d6464]/10 text-[#1d6464] px-2 py-0.5 rounded font-normal">Blockchain-anchored</span>
      </h2>
      {events.length === 0 ? (
        <p className="text-sm text-text-muted text-center py-8">No timeline events yet</p>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
          <div className="space-y-4">
            {events.map((e) => (
              <div key={e.id} className="flex gap-4 relative">
                <div className="w-10 h-10 rounded-full bg-[#1d6464]/10 border border-[#1d6464]/20 flex items-center justify-center z-10 flex-shrink-0">
                  <Activity className="w-4 h-4 text-[#1d6464]" />
                </div>
                <div className="pb-4 flex-1">
                  <p className="font-medium text-text-primary text-sm">{e.title}</p>
                  {e.description && <p className="text-xs text-text-muted">{e.description}</p>}
                  <p className="text-[10px] text-text-muted mt-1">
                    {e.actorName} · {new Date(e.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {e.fabricTxId && <p className="text-[10px] font-mono text-[#1d6464] mt-0.5">tx: {e.fabricTxId.slice(0, 16)}…</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
