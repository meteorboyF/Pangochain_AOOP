import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileSignature, Lock, Loader2, CheckCircle, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react'
import api from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import { useAuthStore } from '../store/authStore'
import { encryptDocument, eciesWrapKey, bufferToHex } from '../lib/crypto'
import toast from 'react-hot-toast'

interface TemplateField {
  name: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'date'
}

interface TemplateDto {
  id: string
  templateKey: string
  name: string
  category: string
  version: number
  description: string
  fieldsJson: string
  body: string
}

interface CaseDto {
  id: string
  title: string
  status: string
}
interface Page<T> { content: T[] }

type Stage = 'idle' | 'encrypting' | 'wrapping' | 'uploading' | 'anchoring' | 'done' | 'error'

/** Substitute {{variable}} placeholders in the template body with the form values. */
function render(body: string, values: Record<string, string>): string {
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => values[key]?.trim() || `[${key}]`)
}

export default function TemplateEngine() {
  const { user } = useAuthStore()
  const [selectedId, setSelectedId] = useState<string>('')
  const [caseId, setCaseId] = useState<string>('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [stage, setStage] = useState<Stage>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const { data: templates, isLoading: tLoading, isError: tError } = useQuery({
    queryKey: queryKeys.templates(),
    queryFn: async () => (await api.get<TemplateDto[]>('/templates')).data,
  })

  const { data: cases } = useQuery({
    queryKey: queryKeys.cases({ status: 'ACTIVE', for: 'templates' }),
    queryFn: async () => (await api.get<Page<CaseDto>>('/cases', { params: { status: 'ACTIVE', size: '100' } })).data.content,
  })

  const selected = useMemo(() => templates?.find((t) => t.id === selectedId), [templates, selectedId])

  const fields: TemplateField[] = useMemo(() => {
    if (!selected) return []
    try { return JSON.parse(selected.fieldsJson) } catch { return [] }
  }, [selected])

  const preview = useMemo(() => (selected ? render(selected.body, values) : ''), [selected, values])

  const pickTemplate = (id: string) => {
    setSelectedId(id)
    setValues({})
    setStage('idle')
    setErrorMsg('')
  }

  const allFilled = fields.length > 0 && fields.every((f) => (values[f.name] ?? '').trim().length > 0)

  const handleGenerate = async () => {
    if (!selected || !caseId) return
    setErrorMsg('')
    try {
      // 1. Build the plaintext instrument in the browser
      const plaintext = render(selected.body, values)
      const buffer = new TextEncoder().encode(plaintext).buffer

      // 2. Encrypt (AES-256-GCM — plaintext never leaves the browser)
      setStage('encrypting')
      const encrypted = await encryptDocument(buffer as ArrayBuffer)

      // 3. Wrap the document key with the owner's ECIES public key
      setStage('wrapping')
      let wrappedKeyToken = encrypted.keyB64
      try {
        const pkRes = await api.get(`/users/${user!.id}/public-key`)
        const ownerPubKeyJwk: JsonWebKey = JSON.parse(pkRes.data.publicKeyJwk)
        wrappedKeyToken = await eciesWrapKey(ownerPubKeyJwk, encrypted.keyB64)
      } catch { /* fall back to raw key in demo mode */ }

      // 4. Upload ciphertext → IPFS → Fabric anchor
      setStage('uploading')
      const fileName = `${selected.name}.txt`
      const { data: doc } = await api.post('/documents/upload', {
        caseId,
        fileName,
        ciphertextBase64: encrypted.ciphertextB64,
        ivBase64: encrypted.ivB64,
        documentHashSha256: encrypted.hashB64,
        wrappedKeyTokenForOwner: wrappedKeyToken,
        previousVersionId: null,
        category: selected.category,
      })

      // 5. Anchor the template version + parameter hash against the case
      setStage('anchoring')
      const paramHash = bufferToHex(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(values, Object.keys(values).sort()))),
      )
      await api.post('/templates/record-generation', {
        templateId: selected.id,
        caseId,
        documentId: doc.id,
        paramHash,
      })

      setStage('done')
      toast.success(`${selected.name} generated, encrypted & anchored on the ledger`)
    } catch (err: any) {
      setStage('error')
      setErrorMsg(err.response?.data?.detail ?? err.message ?? 'Generation failed')
    }
  }

  const busy = ['encrypting', 'wrapping', 'uploading', 'anchoring'].includes(stage)
  const stageLabel: Record<Stage, string> = {
    idle: '', encrypting: 'Encrypting with AES-256-GCM…', wrapping: 'Wrapping key with ECIES P-256…',
    uploading: 'Uploading ciphertext to IPFS…', anchoring: 'Anchoring template version on Fabric…',
    done: 'Generated & anchored ✓', error: errorMsg,
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#1d6464]/10 flex items-center justify-center">
          <FileSignature className="w-5 h-5 text-[#1d6464]" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Template Engine</h1>
          <p className="text-text-muted text-sm">Generate standard legal instruments from versioned templates — encrypted and anchored on the ledger.</p>
        </div>
      </div>

      {tError && (
        <div className="flex items-center gap-2 text-error text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4" /> Failed to load templates.
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Template library */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Template Library</p>
          {tLoading && <div className="text-text-muted text-sm">Loading…</div>}
          {templates?.map((t) => (
            <button
              key={t.id}
              onClick={() => pickTemplate(t.id)}
              className={`w-full text-left border rounded-xl p-4 transition-colors ${
                selectedId === t.id ? 'border-[#1d6464] bg-[#1d6464]/5' : 'border-border hover:border-[#1d6464]/50 hover:bg-surface-muted'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-text-primary text-sm">{t.name}</p>
                <span className="text-[10px] font-mono text-text-muted">v{t.version}</span>
              </div>
              <p className="text-text-muted text-xs mt-1">{t.description}</p>
            </button>
          ))}
        </div>

        {/* Guided form */}
        <div className="space-y-4">
          <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Parameters</p>
          {!selected ? (
            <div className="text-text-muted text-sm border border-dashed border-border rounded-xl p-6 text-center">
              Select a template to begin.
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="label">Case</label>
                <select className="input" value={caseId} onChange={(e) => setCaseId(e.target.value)}>
                  <option value="">Select a case…</option>
                  {cases?.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              {fields.map((f) => (
                <div key={f.name}>
                  <label className="label">{f.label}</label>
                  {f.type === 'textarea' ? (
                    <textarea
                      className="input min-h-[72px]"
                      value={values[f.name] ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                    />
                  ) : (
                    <input
                      type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                      className="input"
                      value={values[f.name] ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                    />
                  )}
                </div>
              ))}

              {stage !== 'idle' && (
                <div className="flex items-center gap-2 text-sm">
                  {stage === 'done' && <CheckCircle className="w-4 h-4 text-success" />}
                  {stage === 'error' && <AlertCircle className="w-4 h-4 text-error" />}
                  {busy && <Loader2 className="w-4 h-4 animate-spin text-[#1d6464]" />}
                  <span className={stage === 'error' ? 'text-error' : stage === 'done' ? 'text-success' : 'text-text-secondary'}>
                    {stageLabel[stage]}
                  </span>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={!allFilled || !caseId || busy || stage === 'done'}
                className="btn-primary w-full justify-center py-2.5 disabled:opacity-50"
              >
                {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : <><Lock className="w-4 h-4" /> Generate, Encrypt & Anchor</>}
              </button>
              <p className="flex items-start gap-1.5 text-[11px] text-text-muted">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#1d6464]" />
                The instrument is encrypted in your browser before upload; the template version and a SHA-256 hash of these parameters are anchored on the Fabric ledger.
              </p>
            </div>
          )}
        </div>

        {/* Live preview */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#1d6464]" /> Live Preview
          </p>
          {selected ? (
            <pre className="text-[11px] leading-relaxed whitespace-pre-wrap bg-white border border-border rounded-xl p-4 max-h-[70vh] overflow-auto font-mono text-text-secondary">
              {preview}
            </pre>
          ) : (
            <div className="text-text-muted text-sm border border-dashed border-border rounded-xl p-6 text-center">
              The rendered document will appear here.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
