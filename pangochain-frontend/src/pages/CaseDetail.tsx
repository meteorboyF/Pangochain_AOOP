import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, FolderOpen, FileText, Clock, Shield, Plus,
  Download, Eye, Users, Lock, ExternalLink
} from 'lucide-react'
import { MOCK_CASES, MOCK_DOCUMENTS } from '../lib/mockData'
import { DocumentUploadDropzone } from '../components/DocumentUploadDropzone'
import { SecureDownloadModal } from '../components/SecureDownloadModal'
import api from '../lib/api'

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  CLOSED:   'bg-gray-100 text-gray-600 border border-gray-200',
  ARCHIVED: 'bg-amber-50 text-amber-700 border border-amber-200',
}

interface DocItem {
  id: string
  fileName: string
  ipfsCid?: string
  documentHash?: string
  fabricTxId?: string
  ownerEmail?: string
  version?: number
  status?: string
  createdAt?: string
  // mock-only fields
  type?: string
  size?: string
  uploadedAt?: string
  uploadedBy?: string
}

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>()
  const [legalCase, setLegalCase] = useState<(typeof MOCK_CASES)[0] | null>(null)
  const [documents, setDocuments] = useState<DocItem[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [downloadTarget, setDownloadTarget] = useState<DocItem | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    // Try mock data first
    const mockCase = MOCK_CASES.find((c) => c.id === id)
    if (mockCase) {
      setLegalCase(mockCase)
      const mockDocs = MOCK_DOCUMENTS.filter((d) => d.caseId === id)
      setDocuments(mockDocs.map((d) => ({
        id: d.id, fileName: d.name, type: d.type, size: d.size,
        uploadedAt: d.uploadedAt, uploadedBy: d.uploadedBy,
        ownerEmail: d.uploadedBy, status: 'ACTIVE',
      })))
      setLoading(false)
      return
    }
    // Live backend
    try {
      const [caseRes, docsRes] = await Promise.all([
        api.get(`/cases/${id}`),
        api.get(`/documents/by-case/${id}`),
      ])
      setLegalCase(caseRes.data)
      setDocuments(docsRes.data)
    } catch {
      // ignore — shows empty
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#1d6464] border-t-transparent rounded-full animate-spin" />
      </div>
    )
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/cases" className="mt-1 p-2 rounded-lg hover:bg-surface-muted transition-colors text-text-muted hover:text-text-primary">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="font-heading text-2xl font-bold text-text-primary">{legalCase.title}</h1>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[legalCase.status]}`}>
              {legalCase.status}
            </span>
          </div>
          <p className="text-text-muted text-sm">{legalCase.caseType} · Client: {legalCase.clientName}</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="btn-primary shrink-0"
        >
          <Plus className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {/* Case metadata cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Lead Attorney',    value: legalCase.leadAttorney, icon: <Users className="w-4 h-4" /> },
          { label: 'Matter Value',     value: legalCase.matterValue,  icon: <FileText className="w-4 h-4" /> },
          { label: 'Counterparty',     value: legalCase.counterparty, icon: <ExternalLink className="w-4 h-4" /> },
          { label: 'Last Activity',    value: new Date(legalCase.lastActivity).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), icon: <Clock className="w-4 h-4" /> },
        ].map((item) => (
          <div key={item.label} className="card py-3">
            <div className="flex items-center gap-2 text-text-muted text-xs mb-1">
              {item.icon} {item.label}
            </div>
            <p className="font-medium text-text-primary text-sm truncate">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Description */}
      {legalCase.description && (
        <div className="card">
          <h2 className="font-heading font-semibold text-text-primary mb-2">Description</h2>
          <p className="text-text-secondary text-sm leading-relaxed">{legalCase.description}</p>
          {legalCase.tags && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {legalCase.tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-md bg-[#1d6464]/10 text-[#1d6464] font-medium">{tag}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Documents */}
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
                  <div className="w-9 h-9 rounded-lg bg-[#1d6464]/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-[#1d6464]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-text-primary text-sm truncate">{doc.fileName}</p>
                    <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                      {doc.type && <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">{doc.type}</span>}
                      {doc.size && <span>{doc.size}</span>}
                      {doc.ownerEmail && <span>· {doc.ownerEmail}</span>}
                      {doc.uploadedAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 ml-3 shrink-0">
                  <div className="flex items-center gap-1 text-[10px] text-[#1d6464] font-semibold mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Shield className="w-3 h-3" /> Verified
                  </div>
                  <button
                    onClick={() => setDownloadTarget(doc)}
                    className="p-1.5 rounded-lg hover:bg-[#1d6464]/10 text-text-muted hover:text-[#1d6464] transition-colors"
                    title="Secure Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    className="p-1.5 rounded-lg hover:bg-[#1d6464]/10 text-text-muted hover:text-[#1d6464] transition-colors"
                    title="View Details"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
          onClose={() => setDownloadTarget(null)}
        />
      )}
    </div>
  )
}
