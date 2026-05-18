import { useState } from 'react'
import { X, PenTool, Shield, Loader2, CheckCircle, AlertCircle, Key, FileCheck } from 'lucide-react'
import {
  decryptDocument, eciesUnwrapKey, base64ToBytes, bufferToHex,
  loadWrappedPrivateKey, unwrapPrivateKey, bytesToBase64,
  loadWrappedEcdsaKey, unwrapEcdsaPrivateKey, signDocumentHash,
} from '../lib/crypto'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'
import toast from 'react-hot-toast'

interface Props {
  docId: string
  fileName: string
  onClose: () => void
  onSigned?: () => void
}

type Stage = 'idle' | 'fetching' | 'unwrapping' | 'decrypting' | 'confirm' | 'signing' | 'done' | 'error'

export function SignDocumentModal({ docId, fileName, onClose, onSigned }: Props) {
  const { user } = useAuthStore()
  const [stage, setStage] = useState<Stage>('idle')
  const [password, setPassword] = useState('')
  const [docHash, setDocHash] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handlePrepare = async () => {
    setStage('fetching')
    setErrorMsg('')
    try {
      // Fetch ciphertext + wrapped key
      const [ciphertextRes, wrappedKeyRes] = await Promise.all([
        api.get(`/documents/${docId}/ciphertext`, { responseType: 'arraybuffer' }),
        api.get(`/documents/${docId}/wrapped-key`),
      ])

      setStage('unwrapping')
      const storedKey = loadWrappedPrivateKey(user!.id)
      if (!storedKey) throw new Error('Private key not found — re-login required')

      const privateKey = await unwrapPrivateKey(password, storedKey.saltB64, storedKey.ivB64, storedKey.encryptedB64)
      const docKeyB64 = await eciesUnwrapKey(privateKey, wrappedKeyRes.data as string)

      setStage('decrypting')
      const fullBytes = new Uint8Array(ciphertextRes.data as ArrayBuffer)
      const iv = fullBytes.slice(0, 12)
      const ciphertext = fullBytes.slice(12)
      const docKey = base64ToBytes(docKeyB64)

      const cryptoKey = await window.crypto.subtle.importKey(
        'raw', docKey.buffer as ArrayBuffer, { name: 'AES-GCM', length: 256 }, false, ['decrypt'],
      )
      const plaintext = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer }, cryptoKey, ciphertext.buffer as ArrayBuffer,
      )

      // Compute SHA-256 of plaintext for display and signing
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', plaintext)
      const hashHex = bufferToHex(hashBuffer)
      const hashB64 = bytesToBase64(new Uint8Array(hashBuffer))
      setDocHash(hashB64)

      setStage('confirm')
    } catch (err: any) {
      setStage('error')
      setErrorMsg(err.message ?? 'Failed to prepare document for signing')
    }
  }

  const handleSign = async () => {
    setStage('signing')
    try {
      // Load and unwrap ECDSA signing key (separate from ECIES encryption key)
      const storedSigningKey = loadWrappedEcdsaKey(user!.id)
      if (!storedSigningKey) {
        throw new Error('Signing key not found — your account may have been registered before ECDSA was enabled. Please re-register.')
      }

      const ecdsaPrivateKey = await unwrapEcdsaPrivateKey(
        password,
        storedSigningKey.saltB64,
        storedSigningKey.ivB64,
        storedSigningKey.encryptedB64,
      )

      // Sign the document hash with ECDSA P-256 — SHA-256 is applied to docHash bytes internally
      const signatureB64 = await signDocumentHash(docHash, ecdsaPrivateKey)

      await api.post(`/signatures/${docId}/sign`, {
        documentHashB64: docHash,
        signatureB64,
      })

      setStage('done')
      toast.success(`${fileName} signed and anchored on blockchain`)
      onSigned?.()
    } catch (err: any) {
      setStage('error')
      setErrorMsg(err.message ?? 'Signing failed')
    }
  }

  const isProcessing = ['fetching', 'unwrapping', 'decrypting', 'signing'].includes(stage)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <PenTool className="w-5 h-5 text-[#1d6464]" />
            <h2 className="font-heading font-semibold text-text-primary">Sign Document</h2>
          </div>
          <button onClick={onClose} disabled={isProcessing} className="p-1.5 hover:bg-surface-muted rounded-lg">
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-surface-muted rounded-xl px-4 py-3 flex items-center gap-3">
            <FileCheck className="w-4 h-4 text-[#1d6464] shrink-0" />
            <div>
              <p className="font-medium text-text-primary text-sm">{fileName}</p>
              <p className="text-text-muted text-xs">Signature anchored on Hyperledger Fabric</p>
            </div>
          </div>

          {stage === 'idle' && (
            <div className="space-y-3">
              <p className="text-sm text-text-secondary leading-relaxed">
                Signing decrypts the document in your browser, computes its SHA-256 hash, and signs it
                with your ECDSA P-256 private key. The server verifies the signature before anchoring
                it on Hyperledger Fabric. Enter your password to unlock your signing key.
              </p>
              <div>
                <label className="label flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" /> Account Password
                </label>
                <input
                  type="password"
                  className="input"
                  placeholder="To unlock your ECDSA signing key"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-text-muted text-xs mt-1">Used only in-browser. Never sent to server.</p>
              </div>
              <button
                onClick={handlePrepare}
                disabled={!password}
                className="btn-primary w-full justify-center py-2.5 disabled:opacity-50"
              >
                <Shield className="w-4 h-4" /> Decrypt & Preview Hash
              </button>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center justify-center gap-2 py-6 text-text-muted text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-[#1d6464]" />
              {stage === 'fetching' && 'Fetching encrypted document…'}
              {stage === 'unwrapping' && 'Unwrapping document key (ECIES)…'}
              {stage === 'signing' && 'Signing with ECDSA P-256 and anchoring on Fabric…'}
              {stage === 'decrypting' && 'Decrypting (AES-256-GCM)…'}
            </div>
          )}

          {stage === 'confirm' && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
                <p className="text-xs font-semibold text-amber-800">Document SHA-256 Hash</p>
                <code className="text-[10px] break-all text-amber-700 font-mono leading-relaxed">
                  {docHash}
                </code>
              </div>
              <div className="flex items-start gap-2 text-sm text-text-secondary">
                <Shield className="w-4 h-4 mt-0.5 shrink-0 text-[#1d6464]" />
                <span>
                  By clicking <strong>Confirm & Sign</strong>, you confirm that you have reviewed this document
                  and the hash above matches the document you intend to sign.
                </span>
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 btn border border-border text-text-secondary hover:bg-surface-muted py-2.5">
                  Cancel
                </button>
                <button onClick={handleSign} className="flex-1 btn-primary py-2.5 justify-center">
                  <PenTool className="w-4 h-4" /> Confirm & Sign
                </button>
              </div>
            </div>
          )}

          {stage === 'done' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle className="w-10 h-10 text-success" />
              <p className="font-semibold text-text-primary">Document signed successfully</p>
              <p className="text-sm text-text-muted text-center">Signature anchored on Hyperledger Fabric</p>
              <button onClick={onClose} className="btn-primary px-8 py-2.5 justify-center">Close</button>
            </div>
          )}

          {stage === 'error' && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-3 text-sm text-error">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {errorMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
