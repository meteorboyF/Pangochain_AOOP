import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, ShieldCheck, FileCheck, BarChart3 } from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import { ParticlesBackground } from '../components/ParticlesBackground'

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
    <div className="min-h-screen flex">
      {/* ── Left panel ─────────────────────────────────────────────────── */}
      <div className="hidden lg:flex w-[52%] bg-[#0f3d3d] relative flex-col items-center justify-center p-14 overflow-hidden">
        <ParticlesBackground variant="auth" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-md">
          <img src="/logo.png" alt="PangoChain" className="h-24 w-auto mb-8 brightness-0 invert" />

          <h2 className="font-heading text-3xl font-bold text-white mb-4 leading-snug">
            Secure Legal Document Management
          </h2>
          <p className="text-white/60 leading-relaxed mb-10">
            Your documents are protected before they ever leave your device.
            Blockchain-verified, always.
          </p>

          <div className="w-full space-y-3">
            {[
              { icon: <ShieldCheck className="w-4 h-4" />, text: 'End-to-end document security' },
              { icon: <FileCheck className="w-4 h-4" />, text: 'Immutable blockchain audit trail' },
              { icon: <BarChart3 className="w-4 h-4" />, text: 'Role-based access control' },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 text-sm text-white/80">
                <div className="text-[#4ab8b8]">{f.icon}</div>
                {f.text}
              </div>
            ))}
          </div>
        </div>

        {/* Decorative teal ring */}
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full border border-white/5" />
        <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full border border-white/5" />
      </div>

      {/* ── Right panel ─────────────────────────────────────────────────── */}
      <div className="flex-1 relative flex items-center justify-center p-8 bg-surface overflow-hidden">
        <ParticlesBackground variant="app" />

        <div className="relative z-10 w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <img src="/logo.png" alt="PangoChain" className="h-9 w-auto" />
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
            <Link to="/register" className="text-[#1d6464] font-medium hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
