import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, Search, Download, Shield, Clock, History, PenTool, Filter, AlertCircle, Plus } from 'lucide-react'
import { DocumentUploadDropzone } from '../components/DocumentUploadDropzone'
import { SecureDownloadModal } from '../components/SecureDownloadModal'
import { SignDocumentModal } from '../components/SignDocumentModal'
import { VersionHistoryPanel } from '../components/VersionHistoryPanel'
import { ListSkeleton } from '../components/ui/Skeleton'
import api from '../lib/api'
import { queryKeys } from '../lib/queryKeys'

type DocCategory = 'ALL' | 'GENERAL' | 'CONTRACT' | 'EVIDENCE' | 'PLEADING' | 'CORRESPONDENCE'

const CATEGORIES: DocCategory[] = ['ALL', 'GENERAL', 'CONTRACT', 'EVIDENCE', 'PLEADING', 'CORRESPONDENCE']

interface DocumentDto {
  id: string
  caseId: string
  fileName: string
  ipfsCid: string
  documentHash: string
  fabricTxId: string
  ownerEmail: string
  version: number
  status: string
  createdAt: string
  category?: string
}

interface Page<T> { content: T[]; totalElements: number }

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf')  return '📄'
  if (ext === 'docx') return '📝'
  if (ext === 'xlsx') return '📊'
  if (ext === 'zip')  return '🗜️'
  return '📎'
}

export default function Documents() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<DocCategory>('ALL')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [downloadTarget, setDownloadTarget] = useState<DocumentDto | null>(null)
  const [historyTarget, setHistoryTarget] = useState<DocumentDto | null>(null)
  const [signTarget, setSignTarget] = useState<DocumentDto | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), search ? 300 : 0)
    return () => clearTimeout(t)
  }, [search])

  const { data: page, isLoading: loading, isError, refetch } = useQuery({
    queryKey: [...queryKeys.documents('all', category === 'ALL' ? undefined : category), debouncedSearch],
    queryFn: async () => {
      const params: Record<string, string> = { page: '0', size: '50' }
      if (debouncedSearch) params.q = debouncedSearch
      if (category !== 'ALL') params.category = category
      const { data } = await api.get<Page<DocumentDto>>('/documents', { params })
      return data
    },
    placeholderData: (prev) => prev,
  })

  const error = isError ? 'Failed to load documents' : ''
  const docs = page?.content ?? []

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Documents</h1>
          {!loading && !error && (
            <p className="text-text-muted text-sm mt-0.5">{page?.totalElements ?? 0} documents · blockchain-verified</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1d6464]/10 text-[#1d6464] text-xs font-semibold">
            <Shield className="w-3.5 h-3.5" /> AES-256-GCM + IPFS
          </div>
          <button onClick={() => setShowUpload(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Upload
          </button>
        </div>
      </div>

      {/* Search + Category Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            className="input pl-9"
            placeholder="Search documents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                category === cat
                  ? 'bg-[#1d6464] text-white border-[#1d6464]'
                  : 'bg-white text-text-secondary border-border hover:border-[#1d6464]/40'
              }`}
            >
              {cat === 'ALL' ? <><Filter className="w-3 h-3 inline mr-1" />All</> : cat}
            </button>
          ))}
        </div>
      </div>

      {/* States */}
      {loading && <ListSkeleton />}

      {error && !loading && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-error">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {!loading && !error && docs.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
          <FileText className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="font-heading font-semibold text-text-primary">No documents yet</p>
          <p className="text-text-muted text-sm mt-1 mb-4">Upload a document from within a case, or directly here.</p>
          <button onClick={() => setShowUpload(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Upload Document
          </button>
        </div>
      )}

      {!loading && !error && docs.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                <th className="text-left px-4 py-3 font-medium text-text-muted text-xs uppercase tracking-wide">Document</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted text-xs uppercase tracking-wide hidden md:table-cell">IPFS CID</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted text-xs uppercase tracking-wide hidden lg:table-cell">Uploaded By</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted text-xs uppercase tracking-wide hidden lg:table-cell">Date</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted text-xs uppercase tracking-wide hidden xl:table-cell">Fabric Tx</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {docs.map((doc) => (
                <tr key={doc.id} className="hover:bg-surface-muted transition-colors group">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="text-lg leading-none">{fileIcon(doc.fileName)}</span>
                      <div className="min-w-0">
                        <p className="font-medium text-text-primary truncate max-w-[200px] group-hover:text-[#1d6464] transition-colors">
                          {doc.fileName}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
                          <Shield className="w-3 h-3 text-[#1d6464]" /> v{doc.version} · {doc.status}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <code className="text-[11px] text-text-muted font-mono truncate max-w-[120px] block">
                      {doc.ipfsCid.slice(0, 12)}…
                    </code>
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell">
                    <span className="text-text-secondary text-xs">{doc.ownerEmail}</span>
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell">
                    <span className="text-text-muted text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 hidden xl:table-cell">
                    <code className="text-[11px] text-[#1d6464] font-mono">
                      {doc.fabricTxId ? `${doc.fabricTxId.slice(0, 10)}…` : '—'}
                    </code>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setSignTarget(doc)}
                        className="p-1.5 rounded-lg hover:bg-[#1d6464]/10 text-text-muted hover:text-[#1d6464] transition-colors"
                        title="Sign document"
                      >
                        <PenTool className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setHistoryTarget(doc)}
                        className="p-1.5 rounded-lg hover:bg-[#1d6464]/10 text-text-muted hover:text-[#1d6464] transition-colors"
                        title="Version history"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDownloadTarget(doc)}
                        className="p-1.5 rounded-lg hover:bg-[#1d6464]/10 text-text-muted hover:text-[#1d6464] transition-colors"
                        title="Secure Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showUpload && (
        <DocumentUploadDropzone
          caseId=""
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); refetch() }}
        />
      )}
      {downloadTarget && (
        <SecureDownloadModal
          docId={downloadTarget.id}
          fileName={downloadTarget.fileName}
          onClose={() => setDownloadTarget(null)}
        />
      )}
      {historyTarget && (
        <VersionHistoryPanel
          docId={historyTarget.id}
          fileName={historyTarget.fileName}
          onClose={() => setHistoryTarget(null)}
          onChanged={() => refetch()}
        />
      )}
      {signTarget && (
        <SignDocumentModal
          docId={signTarget.id}
          fileName={signTarget.fileName}
          onClose={() => setSignTarget(null)}
        />
      )}
    </div>
  )
}
