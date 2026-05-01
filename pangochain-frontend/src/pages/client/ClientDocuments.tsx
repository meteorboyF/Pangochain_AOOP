import { useState, useEffect, useCallback } from 'react'
import {
  FileText, Upload, Download, Lock, Shield, AlertCircle,
  Loader2, Eye, Trash2, CheckCircle, AlertTriangle, Search, Filter,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import api from '../../lib/api'
import { encryptDocument, eciesWrapKey, bytesToBase64 } from '../../lib/crypto'
import { SecureDownloadModal } from '../../components/SecureDownloadModal'
import toast from 'react-hot-toast'

interface DocumentDto {
  id: string
  fileName: string
  ipfsCid: string
  documentHashSha256: string
  fabricTxId: string | null
  category: string
  confidential: boolean
  createdAt: string
  caseTitle?: string
}

const CATEGORIES = ['ALL', 'GENERAL', 'EVIDENCE', 'CONTRACT', 'CORRESPONDENCE', 'CONFESSION', 'MEDICAL', 'FINANCIAL']
const CATEGORY_COLORS: Record<string, string> = {
  EVIDENCE: 'bg-blue-50 text-blue-700',
  CONTRACT: 'bg-purple-50 text-purple-700',
  CORRESPONDENCE: 'bg-gray-100 text-gray-700',
  CONFESSION: 'bg-red-50 text-red-700',
  MEDICAL: 'bg-emerald-50 text-emerald-700',
  FINANCIAL: 'bg-amber-50 text-amber-700',
  GENERAL: 'bg-gray-100 text-gray-600',
}

export default function ClientDocuments() {
  const { user } = useAuthStore()
  const [documents, setDocuments] = useState<DocumentDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeCategory, setActiveCategory] = useState('ALL')
  const [search, setSearch] = useState('')
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [downloadDoc, setDownloadDoc] = useState<DocumentDto | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStage, setUploadStage] = useState('')

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadCategory, setUploadCategory] = useState('GENERAL')
  const [uploadConfidential, setUploadConfidential] = useState(false)
  const [uploadNote, setUploadNote] = useState('')

  useEffect(() => { loadDocs() }, [])

  async function loadDocs() {
    try {
      const { data } = await api.get('/documents')
      setDocuments(data ?? [])
    } catch (e: any) {
      setError(e.response?.data?.detail ?? 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async () => {
    if (!uploadFile || !user) return
    setUploading(true)
    try {
      setUploadStage('Reading file…')
      const buffer = await uploadFile.arrayBuffer()

      setUploadStage('Encrypting with AES-256-GCM…')
      const { keyB64, ivB64, ciphertextB64, hashB64 } = await encryptDocument(buffer)

      setUploadStage('Fetching your public key…')
      const pkRes = await api.get(`/users/${user.id}/public-key`)
      const pubKey: JsonWebKey = JSON.parse(pkRes.data.publicKeyJwk)

      setUploadStage('Wrapping encryption key with ECIES P-256…')
      const wrappedKeyToken = await eciesWrapKey(pubKey, keyB64)

      setUploadStage('Uploading encrypted ciphertext…')
      await api.post('/documents/upload', {
        fileName: uploadFile.name,
        ciphertextBase64: ciphertextB64,
        ivBase64: ivB64,
        documentHashSha256: hashB64,
        wrappedKeyTokenForOwner: wrappedKeyToken,
        category: uploadCategory,
        confidential: uploadConfidential,
      })

      toast.success('Document encrypted and uploaded to IPFS · anchored on blockchain')
      setUploadModalOpen(false)
      setUploadFile(null)
      setUploadNote('')
      loadDocs()
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? e.message ?? 'Upload failed')
    } finally {
      setUploading(false)
      setUploadStage('')
    }
  }

  const filtered = documents.filter((d) => {
    const matchCat = activeCategory === 'ALL' || d.category === activeCategory
    const matchSearch = !search || d.fileName.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">My Document Vault</h1>
          <p className="text-text-muted text-sm mt-0.5">
            End-to-end encrypted · stored on IPFS · anchored on Hyperledger Fabric
          </p>
        </div>
        <button onClick={() => setUploadModalOpen(true)} className="btn-primary">
          <Upload className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeCategory === cat
                ? 'bg-[#1d6464] text-white'
                : 'bg-surface-muted text-text-secondary hover:bg-[#1d6464]/10'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          className="input pl-9"
          placeholder="Search documents…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1d6464]" /></div>}
      {error && !loading && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-error">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16">
          <Lock className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="font-heading font-semibold text-text-primary">No documents yet</p>
          <p className="text-text-muted text-sm mt-1">Upload your first document — it will be encrypted before leaving your device.</p>
          <button onClick={() => setUploadModalOpen(true)} className="btn-primary mt-4 inline-flex">
            <Upload className="w-4 h-4" /> Upload First Document
          </button>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((doc) => (
            <div key={doc.id} className={`card ${doc.confidential ? 'border-red-200 bg-red-50/30' : ''}`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  doc.confidential ? 'bg-red-100' : 'bg-[#1d6464]/10'
                }`}>
                  {doc.confidential
                    ? <Shield className="w-5 h-5 text-red-600" />
                    : <FileText className="w-5 h-5 text-[#1d6464]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-text-primary text-sm truncate">{doc.fileName}</p>
                    {doc.confidential && (
                      <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded">
                        CONFIDENTIAL
                      </span>
                    )}
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${CATEGORY_COLORS[doc.category] ?? 'bg-gray-100 text-gray-600'}`}>
                      {doc.category}
                    </span>
                  </div>
                  <p className="text-text-muted text-xs mt-0.5">
                    Uploaded {new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {doc.fabricTxId && (
                      <span className="ml-2 text-[#1d6464]">· Blockchain: {doc.fabricTxId.slice(0, 8)}…</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setDownloadDoc(doc)}
                    className="p-2 rounded-lg hover:bg-[#1d6464]/10 text-text-muted hover:text-[#1d6464] transition-colors"
                    title="Decrypt and download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Upload Modal ───────────────────────────────────────────────────────── */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1d6464]/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-[#1d6464]" />
              </div>
              <div>
                <h2 className="font-heading font-bold text-text-primary">Secure Document Upload</h2>
                <p className="text-xs text-text-muted">Encrypted in your browser · server never sees plaintext</p>
              </div>
            </div>

            <div>
              <label className="label">Select File</label>
              <input
                type="file"
                className="input"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <div>
              <label className="label">Category</label>
              <select className="input" value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}>
                {CATEGORIES.filter((c) => c !== 'ALL').map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <input
                type="checkbox"
                id="confidential"
                checked={uploadConfidential}
                onChange={(e) => setUploadConfidential(e.target.checked)}
                className="w-4 h-4 accent-red-600"
              />
              <label htmlFor="confidential" className="text-sm font-medium text-red-800 cursor-pointer">
                Mark as Confidential
              </label>
              <Shield className="w-4 h-4 text-red-600 ml-auto" />
            </div>

            {uploadConfidential && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800">
                  Confidential documents are encrypted with highest priority. Only your assigned lawyer
                  can be granted access. This upload will be flagged in the blockchain audit trail.
                </p>
              </div>
            )}

            {uploading && (
              <div className="bg-[#1d6464]/5 rounded-xl px-4 py-3 flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-[#1d6464]" />
                <p className="text-sm text-[#1d6464] font-medium">{uploadStage}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setUploadModalOpen(false); setUploadFile(null) }}
                disabled={uploading}
                className="flex-1 btn border border-border text-text-secondary py-2.5 justify-center"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadFile || uploading}
                className="flex-1 btn-primary py-2.5 justify-center disabled:opacity-50"
              >
                {uploading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Encrypting…</>
                  : <><Lock className="w-4 h-4" /> Encrypt & Upload</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secure Download Modal */}
      {downloadDoc && (
        <SecureDownloadModal
          docId={downloadDoc.id}
          fileName={downloadDoc.fileName}
          expectedHash={downloadDoc.documentHashSha256}
          onClose={() => setDownloadDoc(null)}
        />
      )}
    </div>
  )
}
