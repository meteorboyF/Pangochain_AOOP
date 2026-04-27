import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mfaStep, setMfaStep] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data } = await api.post('/auth/login', {
        email,
        password,
        totpCode: mfaStep ? totpCode : undefined,
      })

      if (data.mfaRequired && !mfaStep) {
        setMfaStep(true)
        setLoading(false)
        return
      }

      setAuth(data.accessToken, data.refreshToken, {
        id: data.userId,
        email: data.email,
        fullName: data.fullName,
        role: data.role,
        firmId: data.firmId,
        mfaEnabled: data.mfaEnabled,
      })

      toast.success(`Welcome back, ${data.fullName.split(' ')[0]}!`)
      navigate(data.role.startsWith('CLIENT') ? '/client/portal' : '/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-primary flex-col items-center justify-center p-12 text-white">
        <Shield className="w-16 h-16 mb-6 opacity-90" />
        <h2 className="font-heading text-3xl font-bold mb-4 text-center">
          Secure Legal Document Management
        </h2>
        <p className="text-primary-200 text-center leading-relaxed max-w-sm">
          Client-side encryption ensures your documents are protected before they ever leave your browser.
        </p>
        <div className="mt-10 space-y-3 w-full max-w-sm">
          {['AES-256-GCM client-side encryption', 'Hyperledger Fabric audit trail', 'ECIES P-256 key wrapping'].map((f) => (
            <div key={f} className="flex items-center gap-2 text-sm text-primary-100">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-300 flex-shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-heading font-bold text-primary text-lg">PangoChain</span>
          </div>

          <h1 className="font-heading text-2xl font-bold text-text-primary mb-1">
            {mfaStep ? 'Two-Factor Authentication' : 'Welcome back'}
          </h1>
          <p className="text-text-muted text-sm mb-6">
            {mfaStep
              ? 'Enter the 6-digit code from your authenticator app.'
              : 'Sign in to your secure workspace.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!mfaStep ? (
              <>
                <div>
                  <label className="label">Email address</label>
                  <input
                    type="email"
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@firm.com"
                    required
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="label">Authenticator Code</label>
                <input
                  type="text"
                  className="input text-center text-2xl tracking-widest"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-error bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {mfaStep ? 'Verify Code' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            Don't have an account?{' '}
            <Link to="/register" className="text-accent font-medium hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
