import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, Search, Download, Shield, Clock, History, PenTool, Network, Filter, AlertCircle, Plus } from 'lucide-react'
import { DocumentUploadDropzone } from '../components/DocumentUploadDropzone'
import { SecureDownloadModal } from '../components/SecureDownloadModal'
import { SignDocumentModal } from '../components/SignDocumentModal'
import { VersionHistoryPanel } from '../components/VersionHistoryPanel'
import { ChainOfCustodyModal } from '../components/ChainOfCustodyModal'
import { ListSkeleton } from '../components/ui/Skeleton'
import api from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import { EmptyState, PageHero, QuickActionGrid } from '../components/ui/PageChrome'
import { Tooltip } from '../components/ui/Tooltip'

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
  const [custodyTarget, setCustodyTarget] = useState<DocumentDto | null>(null)

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
      <PageHero
        eyebrow="Encrypted evidence vault"
        title="Documents"
        description="Find, sign, verify, and download legal documents with visible custody, version history, IPFS CIDs, and Fabric transaction references."
        icon={FileText}
        actions={(
          <>
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
              <Shield className="w-3.5 h-3.5" /> AES-256-GCM + IPFS
            </div>
            <button onClick={() => setShowUpload(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Upload
            </button>
          </>
        )}
      >
        <QuickActionGrid
          actions={[
            { label: 'Upload encrypted file', description: 'Add a document, encrypt it client-side, and refresh this vault.', onClick: () => setShowUpload(true), icon: Plus, tone: 'cyan' },
            { label: 'Review custody', description: 'Use the custody action on any row to inspect access and provenance.', to: '/audit', icon: Network, tone: 'emerald' },
            { label: 'Version history', description: 'Track document revisions and integrity over time.', to: '/documents', icon: History, tone: 'amber' },
            { label: 'Secure download', description: 'Decrypt authorized documents through the secure download flow.', to: '/documents', icon: Download, tone: 'violet' },
          ]}
        />
      </PageHero>

      {/* Search + Category Filter */}
      <div className="glass-panel flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            className="input pl-9"
            placeholder="Search documents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {CATEGORIES.map((cat) => (
            <Tooltip key={cat} content={cat === 'ALL' ? 'Show all document categories.' : `Show ${cat.toLowerCase()} documents only.`} side="bottom">
              <button
                onClick={() => setCategory(cat)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                  category === cat
                    ? 'bg-slate-950 text-white border-slate-950 shadow-md'
                    : 'bg-white text-text-secondary border-border hover:border-cyan-300 hover:bg-cyan-50'
                }`}
              >
                {cat === 'ALL' ? <><Filter className="w-3 h-3" />All</> : cat}
              </button>
            </Tooltip>
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
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Upload a document from within a case, or directly here. Uploaded files can be encrypted, pinned to IPFS, signed, and audited."
          action={<button onClick={() => setShowUpload(true)} className="btn-primary"><Plus className="w-4 h-4" /> Upload Document</button>}
        />
      )}

      {!loading && !error && docs.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="flex flex-col gap-1 border-b border-border bg-white/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-heading text-sm font-bold text-slate-950">{page?.totalElements ?? 0} secured documents</p>
              <p className="text-xs text-slate-500">Hover row actions to see what each tool does.</p>
            </div>
            <p className="text-xs font-mono text-cyan-700">Fabric + IPFS evidence layer</p>
          </div>
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
                    <div className="flex items-center gap-1 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                      <Tooltip content="Create or verify an ECDSA signature for this document." side="left">
                        <button
                          onClick={() => setSignTarget(doc)}
                          className="p-1.5 rounded-lg hover:bg-cyan-50 text-text-muted hover:text-cyan-700 transition-colors"
                          aria-label="Sign document"
                        >
                          <PenTool className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                      <Tooltip content="Open previous document versions and integrity metadata." side="left">
                        <button
                          onClick={() => setHistoryTarget(doc)}
                          className="p-1.5 rounded-lg hover:bg-cyan-50 text-text-muted hover:text-cyan-700 transition-colors"
                          aria-label="Version history"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                      <Tooltip content="Trace access, custody, and provenance for this file." side="left">
                        <button
                          onClick={() => setCustodyTarget(doc)}
                          className="p-1.5 rounded-lg hover:bg-cyan-50 text-text-muted hover:text-cyan-700 transition-colors"
                          aria-label="Chain of custody"
                        >
                          <Network className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                      <Tooltip content="Download through the secure authorization and decrypt flow." side="left">
                        <button
                          onClick={() => setDownloadTarget(doc)}
                          className="p-1.5 rounded-lg hover:bg-cyan-50 text-text-muted hover:text-cyan-700 transition-colors"
                          aria-label="Secure download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
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
      {custodyTarget && (
        <ChainOfCustodyModal
          docId={custodyTarget.id}
          fileName={custodyTarget.fileName}
          onClose={() => setCustodyTarget(null)}
        />
      )}
    </div>
  )
}
