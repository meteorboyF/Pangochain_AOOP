import { useState } from 'react'
import { X, Download, Shield, Lock, Loader2, CheckCircle, AlertCircle, Key } from 'lucide-react'
import { decryptDocument, eciesUnwrapKey, base64ToBytes, verifyIntegrity, loadWrappedPrivateKey, unwrapPrivateKey } from '../lib/crypto'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'
import toast from 'react-hot-toast'

interface Props {
  docId: string
  fileName: string
  expectedHash?: string
  onClose: () => void
}

type Stage = 'idle' | 'fetching' | 'unwrapping' | 'decrypting' | 'verifying' | 'done' | 'error'

export function SecureDownloadModal({ docId, fileName, expectedHash, onClose }: Props) {
  const { user } = useAuthStore()
  const [stage, setStage] = useState<Stage>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [password, setPassword] = useState('')
  const [needsPassword, setNeedsPassword] = useState(true)

  const handleDownload = async () => {
    setStage('fetching')
    setErrorMsg('')

    try {
      const isDemoMode = user?.id === 'demo-user-001'

      // Demo: simulate the full flow without backend
      if (isDemoMode) {
        setStage('unwrapping')
        await new Promise((r) => setTimeout(r, 400))
        setStage('decrypting')
        await new Promise((r) => setTimeout(r, 600))
        setStage('verifying')
        await new Promise((r) => setTimeout(r, 400))
        setStage('done')
        // Trigger a fake download
        const a = document.createElement('a')
        a.href = 'data:application/octet-stream;base64,SGVsbG8gV29ybGQ='
        a.download = fileName
        a.click()
        toast.success(`${fileName} decrypted and downloaded`)
        return
      }

      // Stage 1: Fetch ciphertext + wrapped key from backend
      const [ciphertextRes, wrappedKeyRes] = await Promise.all([
        api.get(`/documents/${docId}/ciphertext`, { responseType: 'arraybuffer' }),
        api.get(`/documents/${docId}/wrapped-key`),
      ])
      const ciphertextBytes: ArrayBuffer = ciphertextRes.data
      const wrappedKeyToken: string = wrappedKeyRes.data

      // Stage 2: Unwrap the AES doc key using ECDH private key
      setStage('unwrapping')
      const storedKey = loadWrappedPrivateKey(user!.id)
      if (!storedKey) throw new Error('Private key not found — re-login required')

      const privateKey = await unwrapPrivateKey(password, storedKey.saltB64, storedKey.ivB64, storedKey.encryptedB64)
      const docKeyB64 = await eciesUnwrapKey(privateKey, wrappedKeyToken)

      // Stage 3: Decrypt ciphertext with AES-256-GCM
      setStage('decrypting')
      // First 12 bytes are the IV (as per encryptDocument convention — server packs IV+ciphertext)
      const fullBytes = new Uint8Array(ciphertextBytes)
      const iv = fullBytes.slice(0, 12)
      const ciphertext = fullBytes.slice(12)
      const docKey = base64ToBytes(docKeyB64)

      const cryptoKey = await window.crypto.subtle.importKey(
        'raw', docKey.buffer as ArrayBuffer, { name: 'AES-GCM', length: 256 }, false, ['decrypt'],
      )
      const plaintext = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer }, cryptoKey, ciphertext.buffer as ArrayBuffer,
      )

      // Stage 4: Integrity verification
      setStage('verifying')
      const hashRes = await api.get(`/documents/${docId}`)
      const expectedHash: string = hashRes.data.documentHash
      const valid = await verifyIntegrity(plaintext, expectedHash)
      if (!valid) throw new Error('Integrity check failed — document may have been tampered')

      setStage('done')

      // Trigger download
      const blob = new Blob([plaintext])
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${fileName} verified and downloaded`)
    } catch (err: any) {
      setStage('error')
      setErrorMsg(err.message ?? 'Download failed')
    }
  }

  const stageInfo: Record<Stage, { label: string; detail: string }> = {
    idle:       { label: 'Ready',                        detail: 'Enter your password to decrypt' },
    fetching:   { label: 'Fetching ciphertext…',         detail: 'Retrieving encrypted file from IPFS' },
    unwrapping: { label: 'Unwrapping document key…',     detail: 'ECDH P-256 key derivation' },
    decrypting: { label: 'Decrypting…',                  detail: 'AES-256-GCM in browser (offline)' },
    verifying:  { label: 'Verifying integrity…',         detail: 'SHA-256 hash against blockchain anchor' },
    done:       { label: 'Download complete',            detail: 'Integrity verified ✓' },
    error:      { label: 'Error',                        detail: errorMsg },
  }

  const isProcessing = ['fetching', 'unwrapping', 'decrypting', 'verifying'].includes(stage)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#1d6464]" />
            <h2 className="font-heading font-semibold text-text-primary">Secure Download</h2>
          </div>
          <button onClick={onClose} disabled={isProcessing} className="p-1.5 hover:bg-surface-muted rounded-lg transition-colors">
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* File name */}
          <div className="bg-surface-muted rounded-xl px-4 py-3 flex items-center gap-3">
            <Lock className="w-4 h-4 text-[#1d6464] shrink-0" />
            <div>
              <p className="font-medium text-text-primary text-sm">{fileName}</p>
              <p className="text-text-muted text-xs">AES-256-GCM encrypted · IPFS stored</p>
            </div>
          </div>

          {/* Password field (for ECIES unwrap) */}
          {needsPassword && stage === 'idle' && user?.id !== 'demo-user-001' && (
            <div>
              <label className="label flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" /> Account Password
              </label>
              <input
                type="password"
                className="input"
                placeholder="To decrypt your private key"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-text-muted text-xs mt-1">Used only in-browser for PBKDF2 key derivation. Never sent to the server.</p>
            </div>
          )}

          {/* Progress stages */}
          <div className="space-y-2">
            {(['fetching', 'unwrapping', 'decrypting', 'verifying'] as Stage[]).map((s) => {
              const isActive = stage === s
              const isDone = ['fetching', 'unwrapping', 'decrypting', 'verifying', 'done']
                .indexOf(stage) > ['fetching', 'unwrapping', 'decrypting', 'verifying'].indexOf(s)
              const stageLabels: Record<string, string> = {
                fetching:   'Fetch from IPFS',
                unwrapping: 'Unwrap key (ECIES)',
                decrypting: 'Decrypt (AES-GCM)',
                verifying:  'Verify integrity',
              }
              return (
                <div key={s} className={`flex items-center gap-2.5 text-sm transition-opacity ${
                  isActive || isDone ? 'opacity-100' : 'opacity-30'
                }`}>
                  {isDone ? (
                    <CheckCircle className="w-4 h-4 text-success shrink-0" />
                  ) : isActive ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#1d6464] shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-border shrink-0" />
                  )}
                  <span className={isActive ? 'text-[#1d6464] font-medium' : isDone ? 'text-text-secondary' : 'text-text-muted'}>
                    {stageLabels[s]}
                  </span>
                  {isActive && <span className="text-text-muted text-xs">— {stageInfo[s].detail}</span>}
                </div>
              )
            })}
          </div>

          {stage === 'error' && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-3 text-sm text-error">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {errorMsg}
            </div>
          )}

          {stage === 'done' && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-3 text-sm text-success font-medium">
              <CheckCircle className="w-4 h-4 shrink-0" />
              Download complete — integrity verified against blockchain
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onClose} className="flex-1 btn border border-border text-text-secondary hover:bg-surface-muted py-2.5">
            {stage === 'done' ? 'Close' : 'Cancel'}
          </button>
          {stage !== 'done' && (
            <button
              onClick={handleDownload}
              disabled={isProcessing || (user?.id !== 'demo-user-001' && !password)}
              className="flex-1 btn-primary py-2.5 justify-center disabled:opacity-50"
            >
              {isProcessing
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Decrypting…</>
                : <><Download className="w-4 h-4" /> Decrypt & Download</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
