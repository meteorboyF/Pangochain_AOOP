import { useState } from 'react'
import { Shield, QrCode, Loader2, CheckCircle, AlertCircle, Copy } from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

type Stage = 'idle' | 'loading' | 'scan' | 'verify' | 'done' | 'error'

export default function MfaSetup() {
  const { user, updateUser } = useAuthStore()
  const [stage, setStage] = useState<Stage>('idle')
  const [qrUri, setQrUri] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  const handleSetup = async () => {
    setStage('loading')
    setError('')
    try {
      const { data } = await api.post('/auth/mfa/setup')
      setQrUri(data.qrUri)
      setSecret(data.secret)
      setStage('scan')
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Setup failed')
      setStage('error')
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setStage('loading')
    setError('')
    try {
      await api.post('/auth/mfa/verify', { code })
      updateUser({ mfaEnabled: true })
      setStage('done')
      toast.success('Two-factor authentication enabled!')
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Invalid code')
      setStage('scan')
    }
  }

  const copySecret = () => {
    navigator.clipboard.writeText(secret)
    toast.success('Secret copied to clipboard')
  }

  if (user?.mfaEnabled && stage !== 'done') {
    return (
      <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded-2xl shadow border border-border">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-6 h-6 text-[#1d6464]" />
          <h2 className="font-heading font-bold text-xl text-text-primary">Two-Factor Authentication</h2>
        </div>
        <div className="flex items-center gap-2 text-success bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">MFA is already enabled on this account.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-2xl shadow border border-border space-y-5">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-[#1d6464]" />
        <div>
          <h2 className="font-heading font-bold text-xl text-text-primary">Enable Two-Factor Auth</h2>
          <p className="text-text-muted text-sm">Required for Managing Partner and IT Admin roles</p>
        </div>
      </div>

      {stage === 'idle' && (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary leading-relaxed">
            Secure your account with TOTP-based two-factor authentication (RFC 6238).
            You'll need Google Authenticator, Authy, or any compatible TOTP app.
          </p>
          <button
            onClick={handleSetup}
            className="btn-primary w-full justify-center py-2.5"
          >
            <QrCode className="w-4 h-4" />
            Generate QR Code
          </button>
        </div>
      )}

      {stage === 'loading' && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-[#1d6464]" />
        </div>
      )}

      {(stage === 'scan' || stage === 'error') && (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Scan the QR code below with your authenticator app, then enter the 6-digit code to confirm.
          </p>

          {qrUri && (
            <div className="flex flex-col items-center gap-3 bg-surface-muted rounded-xl p-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrUri)}`}
                alt="TOTP QR Code"
                className="rounded-lg border border-border"
                width={180}
                height={180}
              />
              <div className="w-full">
                <p className="text-xs text-text-muted mb-1">Manual entry key:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-white border border-border rounded-lg px-2 py-1.5 font-mono break-all">
                    {secret}
                  </code>
                  <button onClick={copySecret} className="p-1.5 hover:bg-white rounded-lg border border-border">
                    <Copy className="w-3.5 h-3.5 text-text-muted" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-3">
            <div>
              <label className="label">Enter 6-digit code from app</label>
              <input
                type="text"
                className="input text-center text-2xl tracking-widest"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                autoFocus
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-error bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={code.length < 6}
              className="btn-primary w-full justify-center py-2.5 disabled:opacity-50"
            >
              Verify & Enable MFA
            </button>
          </form>
        </div>
      )}

      {stage === 'done' && (
        <div className="flex flex-col items-center gap-3 py-4">
          <CheckCircle className="w-12 h-12 text-success" />
          <p className="font-semibold text-text-primary">MFA enabled successfully!</p>
          <p className="text-sm text-text-muted text-center">
            You'll be asked for a 6-digit code from your authenticator app each time you log in.
          </p>
        </div>
      )}
    </div>
  )
}
