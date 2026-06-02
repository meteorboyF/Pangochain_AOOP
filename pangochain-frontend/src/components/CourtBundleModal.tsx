import { useState } from 'react'
import { X, FileStack, Loader2, Lock, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { loadWrappedPrivateKey, unwrapPrivateKey, bytesToBase64 } from '../lib/crypto'
import { decryptDocumentToBytes, bytesToTextIfPrintable } from '../lib/decryptDoc'
import toast from 'react-hot-toast'

interface DocItem {
  id: string
  fileName: string
  documentHashSha256?: string
}

interface Props {
  caseId: string
  documents: DocItem[]
  onClose: () => void
}

const BUNDLE_TYPES = ['Evidence Bundle', 'Discovery Bundle']

export function CourtBundleModal({ caseId, documents, onClose }: Props) {
  const { user } = useAuthStore()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bundleType, setBundleType] = useState(BUNDLE_TYPES[0])
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const generate = async () => {
    if (selected.size === 0) { setError('Select at least one document'); return }
    setBusy(true)
    setError('')
    try {
      // Unlock the ECIES private key once for the whole bundle
      const stored = loadWrappedPrivateKey(user!.id)
      if (!stored) { setError('No private key on this device — log in again to provision your keys.'); setBusy(false); return }
      let privateKey: CryptoKey
      try {
        privateKey = await unwrapPrivateKey(password, stored.saltB64, stored.ivB64, stored.encryptedB64)
      } catch {
        setError('Incorrect password — your private key could not be unlocked.'); setBusy(false); return
      }

      // Decrypt each selected document locally; send plaintext only for textual docs
      const items: { documentId: string; plaintextBase64: string | null }[] = []
      const picks = documents.filter((d) => selected.has(d.id))
      for (let i = 0; i < picks.length; i++) {
        const doc = picks[i]
        setProgress(`Decrypting ${i + 1}/${picks.length}: ${doc.fileName}`)
        const bytes = await decryptDocumentToBytes(doc.id, privateKey, doc.documentHashSha256)
        const text = bytesToTextIfPrintable(bytes)
        items.push({ documentId: doc.id, plaintextBase64: text != null ? bytesToBase64(new Uint8Array(bytes)) : null })
      }

      setProgress('Assembling court-ready PDF…')
      const res = await api.post('/bundles', { caseId, bundleType, items }, { responseType: 'blob' })
      const disposition = res.headers['content-disposition'] as string | undefined
      const fileName = disposition?.match(/filename="?([^"]+)"?/)?.[1] ?? 'bundle.pdf'
      const url = URL.createObjectURL(res.data as Blob)
      const a = document.createElement('a')
      a.href = url; a.download = fileName; a.click()
      URL.revokeObjectURL(url)

      setDone(true)
      toast.success('Court bundle generated')
    } catch (e: any) {
      setError(e.message === 'INTEGRITY_FAILED'
        ? 'A document failed integrity verification against the ledger — bundle aborted.'
        : (e.response?.data?.detail ?? e.message ?? 'Bundle generation failed'))
    } finally {
      setBusy(false)
      setProgress('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <FileStack className="w-5 h-5 text-[#1d6464]" />
            <h2 className="font-heading font-semibold text-text-primary">Court-Ready Bundle</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-muted rounded-lg"><X className="w-4 h-4 text-text-muted" /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="label">Bundle type</label>
            <select className="input" value={bundleType} onChange={(e) => setBundleType(e.target.value)}>
              {BUNDLE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Documents ({selected.size} selected)</label>
            <div className="border border-border rounded-xl divide-y divide-border max-h-52 overflow-y-auto">
              {documents.length === 0 && <p className="text-text-muted text-sm p-3">No documents on this case.</p>}
              {documents.map((d) => (
                <label key={d.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-surface-muted">
                  <input type="checkbox" checked={selected.has(d.id)} onChange={() => toggle(d.id)} />
                  <span className="text-sm text-text-primary truncate">{d.fileName}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Password (to unlock your key for decryption)</label>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>

          <div className="flex items-start gap-1.5 text-[11px] text-text-muted">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#1d6464]" />
            Documents are decrypted in your browser. The integrity appendix lists each document SHA-256 hash and Fabric tx ID for independent ledger verification.
          </div>

          {progress && <div className="flex items-center gap-2 text-sm text-[#1d6464]"><Loader2 className="w-4 h-4 animate-spin" /> {progress}</div>}
          {done && <div className="flex items-center gap-2 text-sm text-success"><CheckCircle className="w-4 h-4" /> Bundle downloaded.</div>}
          {error && <div className="flex items-center gap-2 text-error text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2"><AlertCircle className="w-3.5 h-3.5" /> {error}</div>}
        </div>

        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onClose} className="flex-1 btn border border-border text-text-secondary hover:bg-surface-muted py-2.5">Close</button>
          <button onClick={generate} disabled={busy || selected.size === 0 || !password} className="flex-1 btn-primary py-2.5 justify-center disabled:opacity-50">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Lock className="w-4 h-4" /> Generate Bundle</>}
          </button>
        </div>
      </div>
    </div>
  )
}
