import { Link } from 'react-router-dom'
import {
  Shield, Lock, FileText, Users, Activity,
  ChevronRight, CheckCircle, Layers,
} from 'lucide-react'

const features = [
  {
    icon: <Lock className="w-6 h-6 text-primary" />,
    title: 'Client-Side AES-256-GCM Encryption',
    desc: 'Documents are encrypted in your browser before upload. Plaintext never reaches our servers.',
  },
  {
    icon: <Layers className="w-6 h-6 text-primary" />,
    title: 'Hyperledger Fabric ACL',
    desc: 'Every document access invokes a chaincode CheckAccess call — blockchain-authoritative, not just RBAC.',
  },
  {
    icon: <Shield className="w-6 h-6 text-primary" />,
    title: 'ECIES P-256 Key Wrapping',
    desc: 'Document keys are wrapped with recipients\' public keys so only authorised parties can decrypt.',
  },
  {
    icon: <Activity className="w-6 h-6 text-primary" />,
    title: 'Immutable Audit Trail',
    desc: 'Every action is SHA-256 chained on Fabric with a parallel PostgreSQL append-only shadow log.',
  },
  {
    icon: <FileText className="w-6 h-6 text-primary" />,
    title: 'IPFS Document Storage',
    desc: 'Ciphertext is stored on a private IPFS swarm. CID + hash anchored immutably on-chain.',
  },
  {
    icon: <Users className="w-6 h-6 text-primary" />,
    title: 'Role Hierarchy & Multi-Firm',
    desc: '12 granular roles across law firms and clients. Cross-firm sharing requires dual-org endorsement.',
  },
]

const claims = [
  'Plaintext never leaves the browser',
  'Blockchain-authoritative access control',
  'PBKDF2 · 600,000 iterations',
  'Time-bounded capability tokens',
  'Key rotation on revocation',
  'Non-repudiation e-signatures',
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-border bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-heading font-bold text-primary text-lg">PangoChain</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-secondary text-sm">Sign In</Link>
            <Link to="/register" className="btn-primary text-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary text-sm font-medium mb-6 border border-primary-100">
          <Shield className="w-3.5 h-3.5" />
          IEEE Access Research Prototype — v2.0
        </div>
        <h1 className="font-heading text-5xl font-extrabold text-text-primary leading-tight mb-5">
          Secure Legal Document<br />Management on the Blockchain
        </h1>
        <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-8 leading-relaxed">
          Client-side encrypted document storage with Hyperledger Fabric access control,
          IPFS distribution, and a cryptographically verifiable audit trail.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/register" className="btn-primary text-base px-6 py-3">
            Start Free Trial <ChevronRight className="w-4 h-4" />
          </Link>
          <Link to="/login" className="btn-secondary text-base px-6 py-3">
            Sign In
          </Link>
        </div>

        {/* Security claims strip */}
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          {claims.map((c) => (
            <span key={c} className="flex items-center gap-1.5 text-sm text-text-secondary">
              <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
              {c}
            </span>
          ))}
        </div>
      </section>

      {/* Architecture diagram placeholder */}
      <section className="bg-surface-muted py-12 border-y border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-white rounded-2xl border border-border shadow-card p-8">
            <div className="flex items-center justify-around text-center gap-4 flex-wrap">
              {[
                { label: 'Browser', sub: 'AES-256-GCM\nECIES P-256', color: 'bg-primary-50 text-primary border-primary-200' },
                { label: '→', sub: '', color: 'bg-transparent border-transparent text-text-muted text-2xl' },
                { label: 'Spring Boot', sub: 'JWT · PBKDF2\nNo plaintext', color: 'bg-gray-50 text-gray-700 border-gray-200' },
                { label: '→', sub: '', color: 'bg-transparent border-transparent text-text-muted text-2xl' },
                { label: 'Hyperledger Fabric', sub: 'ACL · Audit\nImmutable', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
                { label: '+', sub: '', color: 'bg-transparent border-transparent text-text-muted text-2xl' },
                { label: 'IPFS', sub: 'Ciphertext\nPrivate swarm', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
              ].map((item, i) => (
                item.sub === '' ? (
                  <span key={i} className="text-text-muted text-2xl font-light">{item.label}</span>
                ) : (
                  <div key={i} className={`rounded-xl border px-5 py-4 ${item.color}`}>
                    <p className="font-heading font-semibold text-sm">{item.label}</p>
                    <p className="text-xs mt-1 whitespace-pre-line opacity-80">{item.sub}</p>
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="font-heading text-3xl font-bold text-center text-text-primary mb-10">
          Security at Every Layer
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="card hover:shadow-card-hover transition-shadow duration-200">
              <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center mb-4">
                {f.icon}
              </div>
              <h3 className="font-heading font-semibold text-text-primary mb-2">{f.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface-muted py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-text-muted">
          PangoChain v2.0 · United International University · IEEE Access Research Prototype
        </div>
      </footer>
    </div>
  )
}
