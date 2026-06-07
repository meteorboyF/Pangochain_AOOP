import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, Loader2, ShieldCheck, FileCheck, BarChart3, Zap } from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import { DEMO_USER } from '../lib/mockData'
import { ensureUserKeys } from '../lib/provisionKeys'

type LoginStage = 'password' | 'mfa_code' | 'mfa_setup_required'

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [useRecovery, setUseRecovery] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loginStage, setLoginStage] = useState<LoginStage>('password')
  const [challengeToken, setChallengeToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const mfaStep = loginStage === 'mfa_code'

  const handleDemo = () => {
    setAuth('demo-access-token', 'demo-refresh-token', DEMO_USER)
    toast.success('Welcome to the demo, Sarah!')
    navigate('/dashboard')
  }

  const storeAndRedirect = async (data: any) => {
    setAuth(data.accessToken, data.refreshToken, {
      id: data.userId,
      email: data.email,
      fullName: data.fullName,
      role: data.role,
      firmId: data.firmId,
      mfaEnabled: data.mfaEnabled,
    })
    // First-login key provisioning — makes the account E2E-capable on this device.
    // Never block login on failure; provisioning retries on the next login.
    try {
      const provisioned = await ensureUserKeys(data.userId, password)
      if (provisioned) toast.success('Security keys generated for this device')
    } catch { /* non-fatal */ }
    toast.success(`Welcome back, ${data.fullName.split(' ')[0]}!`)
    navigate(data.role.startsWith('CLIENT') ? '/client/portal' : '/dashboard')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Demo shortcut — works without backend
    if (email === 'demo@pangochain.com' && password === 'demo123') {
      setAuth('demo-access-token', 'demo-refresh-token', DEMO_USER)
      toast.success('Welcome to the demo!')
      navigate('/dashboard')
      return
    }

    try {
      if (loginStage === 'mfa_code') {
        // Stage 2: submit TOTP code — or a single-use recovery code — against the challenge token
        if (useRecovery) {
          const { data } = await api.post('/auth/mfa/recovery', { challengeToken, recoveryCode })
          toast('Recovery code used — please set up MFA again from your profile', { icon: '🔑' })
          await storeAndRedirect(data)
          return
        }
        const { data } = await api.post('/auth/mfa/challenge', { challengeToken, totpCode })
        await storeAndRedirect(data)
        return
      }

      // Stage 1: password login
      const { data } = await api.post('/auth/login', { email, password })

      if (data.requiresMfaCode) {
        // HTTP 202 — challenge token issued, need TOTP code
        setChallengeToken(data.challengeToken)
        setLoginStage('mfa_code')
        setTotpCode('')
        return
      }

      await storeAndRedirect(data)
    } catch (err: any) {
      const status = err.response?.status
      const body = err.response?.data

      if (status === 403 && body?.requiresMfaSetup) {
        setLoginStage('mfa_setup_required')
        return
      }
      if (status === 401 && loginStage === 'mfa_code') {
        setError(useRecovery ? 'Invalid or already-used recovery code' : 'Invalid code — try again')
        setTotpCode('')
        setRecoveryCode('')
        return
      }
      setError(body?.error ?? body?.detail ?? body?.message ?? 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-stone-100">
      {/* ── Left panel ─────────────────────────────────────────────────── */}
      <div className="hidden lg:flex w-[52%] relative flex-col justify-between p-14 overflow-hidden bg-black">
        <img
          src="/legal/law-library-gavel.png"
          alt="Legal library and gavel"
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(0,0,0,0.96),rgba(24,24,27,0.82)_46%,rgba(41,37,36,0.46)),radial-gradient(circle_at_74%_18%,rgba(212,175,55,0.30),transparent_28rem)]" />
        <div className="absolute inset-x-14 top-10 h-px bg-gradient-to-r from-amber-200/80 via-white/20 to-transparent" />

        <div className="relative z-10">
          <Link to="/" className="inline-flex rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 focus:ring-offset-black">
            <img src="/logo.png" alt="PangoChain" className="h-16 w-auto brightness-0 invert" />
          </Link>
        </div>

        <div className="relative z-10 max-w-lg">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-amber-200">Secure legal command</p>
          <h2 className="font-heading text-5xl font-extrabold text-white leading-tight">
            Evidence, access, and audit in one polished workspace.
          </h2>
          <p className="mt-5 max-w-md text-base leading-7 text-white/75">
            PangoChain protects legal documents client-side, records critical events on Fabric, and keeps case teams moving without losing custody context.
          </p>

          <div className="mt-10 grid gap-3">
            {[
              { icon: <ShieldCheck className="w-4 h-4" />, text: 'End-to-end document security' },
              { icon: <FileCheck className="w-4 h-4" />, text: 'Immutable blockchain audit trail' },
              { icon: <BarChart3 className="w-4 h-4" />, text: 'Role-based access control' },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm text-white/85 backdrop-blur-md">
                <div className="text-amber-200">{f.icon}</div>
                {f.text}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3 text-xs font-mono text-white/50">
          <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.75)]" />
          AES-256-GCM · IPFS · Hyperledger Fabric
        </div>
      </div>

      {/* ── Right panel ─────────────────────────────────────────────────── */}
      <div className="flex-1 relative flex items-center justify-center p-8 bg-[radial-gradient(circle_at_20%_10%,rgba(212,175,55,0.16),transparent_32rem),linear-gradient(160deg,#f3f1ed,#e8e6e1)] overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          {/* Subtle dot grid */}
          <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(rgba(0,0,0,1)_1px,transparent_1px)] bg-[size:24px_24px]" />
          {/* Elegant geometric accents */}
          <div className="absolute right-0 top-0 w-64 h-64 rounded-bl-[8rem] bg-gradient-to-bl from-amber-100/40 to-transparent" />
          <div className="absolute left-0 bottom-0 w-48 h-48 rounded-tr-[6rem] bg-gradient-to-tr from-stone-200/30 to-transparent" />
          <div className="absolute left-1/2 top-[15%] h-px w-32 -translate-x-1/2 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
          <div className="absolute right-[20%] bottom-[20%] h-2 w-2 rounded-full bg-amber-400/50 shadow-[0_0_20px_rgba(217,119,6,0.3)]" />
        </div>

        <Link
          to="/"
          className="absolute left-8 top-8 z-20 inline-flex items-center gap-2 rounded-full border border-stone-300/60 bg-white/70 px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 hover:text-stone-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Landing page
        </Link>

        <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200/70 bg-white/[0.92] p-7 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_16px_48px_-12px_rgba(15,23,42,0.16)] backdrop-blur-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <img src="/logo.png" alt="PangoChain" className="h-9 w-auto" />
          </div>

          <h1 className="font-heading text-2xl font-bold text-text-primary mb-1">
            {loginStage === 'mfa_code' ? 'Two-Factor Authentication'
              : loginStage === 'mfa_setup_required' ? 'MFA Required'
              : 'Welcome back'}
          </h1>
          <p className="text-text-muted text-sm mb-6">
            {loginStage === 'mfa_code'
              ? 'Enter the 6-digit code from your authenticator app.'
              : loginStage === 'mfa_setup_required'
              ? 'Your role requires multi-factor authentication before you can log in.'
              : 'Sign in to your secure workspace.'}
          </p>

          {loginStage === 'mfa_setup_required' ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
                For security, Managing Partners and IT Admins must enroll in Google Authenticator before accessing the system.
              </div>
              <button
                type="button"
                onClick={() => navigate('/mfa/setup')}
                className="btn-primary w-full justify-center py-2.5"
              >
                Set up MFA now
              </button>
              <button
                type="button"
                onClick={() => setLoginStage('password')}
                className="w-full text-sm text-text-muted hover:text-text-primary text-center"
              >
                Back to login
              </button>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {loginStage === 'password' ? (
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
            ) : useRecovery ? (
              <div>
                <label className="label">Recovery Code</label>
                <input
                  type="text"
                  className="input text-center text-lg tracking-widest font-mono"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value.toUpperCase().slice(0, 16))}
                  placeholder="XXXXX-XXXXX"
                  autoFocus
                  autoComplete="one-time-code"
                />
                <button
                  type="button"
                  onClick={() => { setUseRecovery(false); setError(''); setRecoveryCode('') }}
                  className="mt-2 text-xs text-amber-800 hover:underline"
                >
                  Use authenticator code instead
                </button>
              </div>
            ) : (
              <div>
                <label className="label">Authenticator Code</label>
                <input
                  type="text"
                  className="input text-center text-2xl tracking-widest"
                  value={totpCode}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setTotpCode(v)
                  }}
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => { setUseRecovery(true); setError(''); setTotpCode('') }}
                  className="mt-2 text-xs text-amber-800 hover:underline"
                >
                  Lost your device? Use a recovery code
                </button>
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
          )}

          <div className="mt-6 pt-5 border-t border-slate-100">
            <button
              type="button"
              onClick={handleDemo}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-900 text-sm font-semibold hover:bg-amber-100 hover:border-amber-300 transition-all"
            >
              <Zap className="w-4 h-4 text-amber-600" />
              Demo Login
            </button>
          </div>

          <p className="mt-4 text-center text-sm text-text-muted">
            Don't have an account?{' '}
            <Link to="/register" className="text-amber-800 font-medium hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
