import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shield, Key, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react'
import api from '../lib/api'
import { useAuthStore, roleLabel, type UserRole, LEGAL_ROLES, CLIENT_ROLES } from '../store/authStore'
import {
  generateEciesKeypair, storeWrappedPrivateKey,
} from '../lib/crypto'
import toast from 'react-hot-toast'

type Step = 'account' | 'keypair' | 'role' | 'review'

const ROLE_OPTIONS: UserRole[] = [...LEGAL_ROLES, ...CLIENT_ROLES]

export default function Register() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const [step, setStep] = useState<Step>('account')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Form fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole>('ASSOCIATE_JUNIOR')

  // Keypair state
  const [keypairStatus, setKeypairStatus] = useState<'idle' | 'generating' | 'done'>('idle')
  const [generatedPubKeyJwk, setGeneratedPubKeyJwk] = useState<string>('')
  const [encryptedPrivKey, setEncryptedPrivKey] = useState<{ enc: string; salt: string; iv: string } | null>(null)

  const generateKeypair = async () => {
    if (!password) {
      setError('Please enter your password before generating keys.')
      return
    }
    setKeypairStatus('generating')
    setError('')
    try {
      const result = await generateEciesKeypair(password)
      setGeneratedPubKeyJwk(JSON.stringify(result.publicKeyJwk))
      setEncryptedPrivKey({
        enc: result.privateKeyEncryptedB64,
        salt: result.saltB64,
        iv: result.ivB64,
      })
      setKeypairStatus('done')
    } catch (e) {
      setError('Key generation failed. Please try again.')
      setKeypairStatus('idle')
    }
  }

  const handleSubmit = async () => {
    if (!encryptedPrivKey) {
      setError('Please generate your encryption keypair first.')
      return
    }
    setLoading(true)
    setError('')

    try {
      const { data } = await api.post('/auth/register', {
        email,
        password,
        fullName,
        role,
        publicKeyJwk: generatedPubKeyJwk,
      })

      // Store encrypted private key in localStorage (client-only)
      storeWrappedPrivateKey(data.userId, {
        encryptedB64: encryptedPrivKey.enc,
        saltB64: encryptedPrivKey.salt,
        ivB64: encryptedPrivKey.iv,
      })

      setAuth(data.accessToken, data.refreshToken, {
        id: data.userId,
        email: data.email,
        fullName: data.fullName,
        role: data.role,
        firmId: data.firmId,
        mfaEnabled: data.mfaEnabled,
      })

      toast.success('Account created! Your encryption keys are ready.')
      navigate(data.role.startsWith('CLIENT') ? '/client/portal' : '/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const steps: Step[] = ['account', 'keypair', 'role', 'review']
  const stepIdx = steps.indexOf(step)

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-heading font-bold text-primary text-xl">PangoChain</span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold
                ${i < stepIdx ? 'bg-success text-white' : i === stepIdx ? 'bg-primary text-white' : 'bg-gray-200 text-text-muted'}`}>
                {i < stepIdx ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 w-20 mx-1 ${i < stepIdx ? 'bg-success' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="card animate-fade-in">
          {/* Step: Account Info */}
          {step === 'account' && (
            <div className="space-y-4">
              <div>
                <h2 className="font-heading text-xl font-bold text-text-primary">Create your account</h2>
                <p className="text-text-muted text-sm mt-1">Basic account information.</p>
              </div>
              <div>
                <label className="label">Full Name</label>
                <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Smith" />
              </div>
              <div>
                <label className="label">Email Address</label>
                <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@firm.com" />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} className="input pr-10"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters" />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                className="btn-primary w-full justify-center"
                disabled={!email || !password || !fullName || password.length < 8}
                onClick={() => setStep('keypair')}
              >
                Next →
              </button>
            </div>
          )}

          {/* Step: Keypair Generation */}
          {step === 'keypair' && (
            <div className="space-y-5">
              <div>
                <h2 className="font-heading text-xl font-bold text-text-primary">Generate Encryption Keys</h2>
                <p className="text-text-muted text-sm mt-1">
                  Your ECIES P-256 keypair is generated in your browser. The private key is encrypted
                  with your password and stored locally — we never see it.
                </p>
              </div>

              <div className="bg-primary-50 rounded-lg border border-primary-100 p-4">
                <div className="flex items-start gap-3">
                  <Key className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-primary-700 space-y-1">
                    <p className="font-semibold">What happens here:</p>
                    <ul className="space-y-0.5 text-primary-600">
                      <li>• ECDH P-256 keypair generated via WebCrypto API</li>
                      <li>• Private key wrapped with PBKDF2 (600k iterations)</li>
                      <li>• Encrypted private key stored in your browser only</li>
                      <li>• Public key sent to server for key wrapping by others</li>
                    </ul>
                  </div>
                </div>
              </div>

              {keypairStatus === 'idle' && (
                <button className="btn-primary w-full justify-center" onClick={generateKeypair}>
                  <Key className="w-4 h-4" /> Generate My Encryption Keypair
                </button>
              )}

              {keypairStatus === 'generating' && (
                <div className="flex items-center justify-center gap-3 py-6 text-primary">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-medium">Generating P-256 keypair (PBKDF2 600k iterations)…</span>
                </div>
              )}

              {keypairStatus === 'done' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-success bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">Keypair generated successfully. Private key encrypted locally.</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 border border-border">
                    <p className="text-xs text-text-muted font-mono break-all">
                      Public Key (JWK): {generatedPubKeyJwk.slice(0, 80)}…
                    </p>
                  </div>
                  <button className="btn-primary w-full justify-center" onClick={() => setStep('role')}>
                    Next →
                  </button>
                </div>
              )}

              {error && <p className="text-sm text-error">{error}</p>}
            </div>
          )}

          {/* Step: Role */}
          {step === 'role' && (
            <div className="space-y-4">
              <div>
                <h2 className="font-heading text-xl font-bold text-text-primary">Select Your Role</h2>
                <p className="text-text-muted text-sm mt-1">
                  Legal professional accounts require Managing Partner approval before activation.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto scrollbar-thin">
                {ROLE_OPTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`text-left px-3 py-2.5 rounded-lg border text-sm font-medium transition-all
                      ${role === r
                        ? 'border-primary bg-primary-50 text-primary'
                        : 'border-border bg-white text-text-secondary hover:border-primary-200'}`}
                  >
                    {roleLabel(r)}
                  </button>
                ))}
              </div>
              <button className="btn-primary w-full justify-center" onClick={() => setStep('review')}>
                Next →
              </button>
            </div>
          )}

          {/* Step: Review */}
          {step === 'review' && (
            <div className="space-y-4">
              <div>
                <h2 className="font-heading text-xl font-bold text-text-primary">Review & Confirm</h2>
                <p className="text-text-muted text-sm mt-1">Confirm your details before creating the account.</p>
              </div>
              <div className="bg-surface-muted rounded-lg border border-border p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Name</span>
                  <span className="font-medium">{fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Email</span>
                  <span className="font-medium">{email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Role</span>
                  <span className="font-medium">{roleLabel(role)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Encryption Keys</span>
                  <span className="font-medium text-success flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Ready
                  </span>
                </div>
              </div>

              {error && (
                <p className="text-sm text-error bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                className="btn-primary w-full justify-center py-2.5"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Create Account
              </button>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-sm text-text-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-accent font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
