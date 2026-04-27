import { useRef, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useInView } from 'react-intersection-observer'
import { ChevronRight, Shield, Lock, FileCheck, Users, BarChart3, MessageSquare, ArrowRight } from 'lucide-react'
import { ParticleCanvas } from '../components/ParticleCanvas'

// ── Animated section hook ──────────────────────────────────────────────────
function useFadeIn(threshold = 0.15) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold })
  return { ref, inView }
}

// ── Navbar ─────────────────────────────────────────────────────────────────
function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm border-b border-border' : 'bg-transparent'
    }`}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className={`font-heading font-bold text-lg transition-colors ${scrolled ? 'text-primary' : 'text-primary'}`}>
            PangoChain
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          {['Technology', 'How It Works', 'For Law Firms'].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`}
              className="text-sm font-medium text-text-secondary hover:text-primary transition-colors">
              {l}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-text-secondary hover:text-primary transition-colors">
            Sign In
          </Link>
          <Link to="/register" className="btn-primary text-sm px-4 py-2">
            Get Started <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </nav>
  )
}

// ── Hero ───────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center text-center px-6 pt-16">
      <div className="relative z-10 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-primary text-sm font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Trusted by leading law firms worldwide
        </div>

        <h1 className="font-heading text-5xl md:text-6xl font-extrabold text-text-primary leading-tight mb-6">
          Your Blockchain-Powered{' '}
          <span className="text-primary">Shield</span> for Legal Data Integrity
        </h1>

        <p className="text-xl text-text-secondary leading-relaxed mb-10 max-w-2xl mx-auto">
          PangoChain gives law firms and their clients a secure, verifiable platform for managing legal documents — with immutable audit trails and blockchain-enforced access control.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/register" className="btn-primary text-base px-8 py-3 gap-2">
            Start Free Trial <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/login" className="btn-secondary text-base px-8 py-3">
            Sign In to Portal
          </Link>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-text-muted">
          {['No credit card required', 'SOC 2 compliant', 'End-to-end encrypted', '99.9% uptime SLA'].map(t => (
            <span key={t} className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-success" />
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Subtle bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent pointer-events-none" />
    </section>
  )
}

// ── Logo Cloud ─────────────────────────────────────────────────────────────
const firms = [
  'Kirkland & Ellis', 'Skadden', 'Freshfields', 'Linklaters',
  'Allen & Overy', 'Latham & Watkins', 'Clifford Chance', 'Baker McKenzie',
]

function LogoCloud() {
  const repeated = [...firms, ...firms]
  return (
    <section className="py-14 bg-surface-muted border-y border-border overflow-hidden">
      <p className="text-center text-sm font-semibold text-text-muted uppercase tracking-widest mb-8">
        Trusted by industry leaders
      </p>
      <div className="logo-scroller">
        <div className="logo-scroller-inner">
          {repeated.map((name, i) => (
            <div key={i} className="logo-item">
              <span className="font-heading font-bold text-text-muted text-sm whitespace-nowrap">
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Features ───────────────────────────────────────────────────────────────
const features = [
  {
    icon: <FileCheck className="w-6 h-6 text-primary" />,
    title: 'Immutable Document Vault',
    desc: 'Every document is cryptographically registered on the blockchain, creating a permanent, verifiable record that cannot be altered or disputed.',
  },
  {
    icon: <Lock className="w-6 h-6 text-primary" />,
    title: 'Dynamic Access Control',
    desc: 'Manage precisely who can view, edit, or share documents. Role-based permissions and time-limited access rules are enforced automatically.',
  },
  {
    icon: <BarChart3 className="w-6 h-6 text-primary" />,
    title: 'Unbreakable Audit Trail',
    desc: 'A live, unchangeable log records every action — who, what, and when. Complete transparency for compliance and litigation support.',
  },
  {
    icon: <MessageSquare className="w-6 h-6 text-primary" />,
    title: 'Secure Collaboration',
    desc: 'Share files and communicate through encrypted channels. Collect legally binding e-signatures directly within the platform.',
  },
]

function Features() {
  const { ref, inView } = useFadeIn()
  return (
    <section id="technology" className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-heading text-4xl font-bold text-text-primary mb-4">
            A New Standard for Legal Security
          </h2>
          <p className="text-text-secondary text-lg max-w-xl mx-auto">
            Built from the ground up for law firms that can't afford to compromise on security or compliance.
          </p>
        </div>

        <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(24px)',
                transition: `opacity 0.5s ease ${i * 0.1 + 0.05}s, transform 0.5s ease ${i * 0.1 + 0.05}s, box-shadow 0.2s ease`,
              }}
            >
              <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center mb-4">
                {f.icon}
              </div>
              <h3 className="font-heading font-semibold text-text-primary text-lg mb-2">{f.title}</h3>
              <p className="text-text-secondary leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── How It Works ───────────────────────────────────────────────────────────
const steps = [
  {
    num: '01',
    icon: <Shield className="w-8 h-8 text-primary" />,
    title: 'Register & Verify',
    desc: 'Securely register your legal documents. A unique, permanent fingerprint is generated on the PangoChain ledger for irrefutable proof of existence.',
  },
  {
    num: '02',
    icon: <Lock className="w-8 h-8 text-primary" />,
    title: 'Control & Govern',
    desc: 'Your documents are securely stored. Govern exactly who has access with dynamic, role-based permission controls — automatically enforced at every request.',
  },
  {
    num: '03',
    icon: <FileCheck className="w-8 h-8 text-primary" />,
    title: 'Transact & Enforce',
    desc: 'Share documents, collaborate with clients, and collect legally binding e-signatures. Verify any document\'s authenticity in seconds.',
  },
]

function HowItWorks() {
  const { ref, inView } = useFadeIn(0.1)
  return (
    <section id="how-it-works" className="py-24 px-6 bg-surface-muted">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-heading text-4xl font-bold text-text-primary mb-4">
            A Seamless Workflow for Unbreakable Trust
          </h2>
          <p className="text-text-secondary text-lg max-w-xl mx-auto">
            Three simple steps to transform how your firm manages and protects legal documents.
          </p>
        </div>

        <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <div
              key={s.num}
              className="bg-white rounded-xl border border-border p-8 relative overflow-hidden hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(24px)',
                transition: `opacity 0.5s ease ${i * 0.15}s, transform 0.5s ease ${i * 0.15}s, box-shadow 0.2s ease`,
              }}
            >
              <span className="absolute top-4 right-5 font-heading font-bold text-5xl text-gray-100 select-none">
                {s.num}
              </span>
              <div className="w-14 h-14 rounded-xl bg-primary-50 flex items-center justify-center mb-5">
                {s.icon}
              </div>
              <h3 className="font-heading font-semibold text-text-primary text-lg mb-2">{s.title}</h3>
              <p className="text-text-secondary leading-relaxed text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── For Law Firms stats strip ──────────────────────────────────────────────
function Stats() {
  const { ref, inView } = useFadeIn()
  const stats = [
    { value: '50,000+', label: 'Documents secured' },
    { value: '300+', label: 'Law firms onboarded' },
    { value: '99.9%', label: 'Platform uptime' },
    { value: '<2s', label: 'Avg. verification time' },
  ]
  return (
    <section id="for-law-firms" className="py-20 px-6 bg-primary">
      <div ref={ref} className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {stats.map((s, i) => (
          <div
            key={s.label}
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateY(0)' : 'translateY(20px)',
              transition: `opacity 0.5s ease ${i * 0.1}s, transform 0.5s ease ${i * 0.1}s`,
            }}
          >
            <p className="font-heading text-4xl font-extrabold text-white mb-1">{s.value}</p>
            <p className="text-primary-200 text-sm">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── CTA ────────────────────────────────────────────────────────────────────
function CTA() {
  const { ref, inView } = useFadeIn()
  return (
    <section className="py-24 px-6 bg-white">
      <div
        ref={ref}
        className="max-w-3xl mx-auto text-center"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}
      >
        <h2 className="font-heading text-4xl font-bold text-text-primary mb-4">
          Ready to Secure Your Practice?
        </h2>
        <p className="text-text-secondary text-lg mb-8 max-w-xl mx-auto">
          Join hundreds of law firms using PangoChain to protect their clients and their reputation.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/register" className="btn-primary text-base px-8 py-3">
            Access the Portal <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/login" className="btn-secondary text-base px-8 py-3">
            Sign In
          </Link>
        </div>
      </div>
    </section>
  )
}

// ── Footer ─────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-border bg-surface-muted py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-heading font-bold text-primary">PangoChain</span>
        </div>
        <p className="text-sm text-text-muted">
          © {new Date().getFullYear()} PangoChain. All rights reserved.
        </p>
        <div className="flex items-center gap-6 text-sm text-text-muted">
          <a href="#" className="hover:text-primary transition-colors">Privacy</a>
          <a href="#" className="hover:text-primary transition-colors">Terms</a>
          <a href="#" className="hover:text-primary transition-colors">Security</a>
        </div>
      </div>
    </footer>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <ParticleCanvas />
      <div className="relative" style={{ zIndex: 1 }}>
        <LandingNav />
        <Hero />
        <LogoCloud />
        <Features />
        <HowItWorks />
        <Stats />
        <CTA />
        <Footer />
      </div>
    </div>
  )
}
