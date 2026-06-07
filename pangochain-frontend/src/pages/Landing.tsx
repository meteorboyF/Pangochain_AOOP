import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useInView } from 'react-intersection-observer'
import { ChevronRight, Shield, Lock, FileCheck, BarChart3, MessageSquare, ArrowRight, Layers, Cpu, Globe } from 'lucide-react'

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
      scrolled
        ? 'bg-white/95 backdrop-blur-xl shadow-sm border-b border-stone-200/80'
        : 'bg-transparent'
    }`}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="PangoChain" className="h-9 w-auto" />
        </div>
        <div className="hidden md:flex items-center gap-8">
          {['Technology', 'How It Works', 'For Law Firms'].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`}
              className={`text-sm font-medium transition-colors ${scrolled ? 'text-stone-700 hover:text-amber-800' : 'text-white/75 hover:text-amber-300'}`}>
              {l}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className={`text-sm font-medium transition-colors ${scrolled ? 'text-stone-700 hover:text-amber-800' : 'text-white/80 hover:text-amber-300'}`}>
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
    <section className="relative min-h-screen flex items-center px-6 pt-16 overflow-hidden bg-black">
      <img
        src="/legal/lady-justice.png"
        alt="Lady Justice statue"
        className="absolute inset-0 h-full w-full object-cover opacity-60"
      />
      {/* Rich overlay with subtle gold radial */}
      <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(0,0,0,0.97)_0%,rgba(10,10,12,0.88)_50%,rgba(30,25,20,0.55)_100%),radial-gradient(ellipse_at_70%_30%,rgba(212,175,55,0.28),transparent_40%)]" />
      {/* Subtle horizontal rule */}
      <div className="absolute inset-x-0 top-16 h-px bg-gradient-to-r from-transparent via-amber-200/20 to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto w-full py-24">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/[0.12] text-amber-200 text-xs font-semibold mb-10 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
            Trusted legal data command center
          </div>

          <h1 className="font-heading text-6xl md:text-7xl font-extrabold text-white leading-[0.92] tracking-tight mb-6">
            Pango<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500">Chain</span>
          </h1>

          <p className="text-lg text-white/65 leading-relaxed mb-10 max-w-xl">
            A modern legal workspace for encrypted evidence, blockchain audit trails, client collaboration, and courtroom-ready document custody.
          </p>

          <div className="flex flex-col sm:flex-row items-start gap-4 mb-16">
            <Link to="/register" className="btn-primary text-base px-7 py-3 gap-2 shadow-lg shadow-black/40">
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.08] px-7 py-3 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/[0.12] hover:border-white/30">
              Sign In to Portal
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-x-7 gap-y-3 text-sm text-white/45">
            {['No credit card required', 'SOC 2 compliant', 'End-to-end encrypted', '99.9% uptime SLA'].map(t => (
              <span key={t} className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-amber-400" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats strip at bottom of hero */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <div className="max-w-6xl mx-auto px-6 pb-12 hidden lg:grid grid-cols-4 gap-px">
          {[
            { value: '50k+', label: 'Documents secured' },
            { value: '300+', label: 'Law firms' },
            { value: '99.9%', label: 'Uptime SLA' },
            { value: '<2s', label: 'Verification' },
          ].map((s) => (
            <div key={s.label} className="text-center px-6 py-4 bg-white/[0.04] border-x border-white/[0.06] first:border-l-0 last:border-r-0 backdrop-blur-sm">
              <p className="font-heading text-2xl font-bold text-amber-300">{s.value}</p>
              <p className="text-xs text-white/45 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="h-24 bg-gradient-to-t from-[#f3f1ed] to-transparent pointer-events-none" />
      </div>
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
    <section className="py-12 bg-[#f3f1ed] border-y border-stone-200/60">
      <p className="text-center text-[11px] font-bold text-stone-400 uppercase tracking-[0.22em] mb-7">
        Trusted by industry leaders
      </p>
      <div className="logo-scroller">
        <div className="logo-scroller-inner">
          {repeated.map((name, i) => (
            <div key={i} className="logo-item">
              <span className="font-heading font-bold text-stone-400 text-sm whitespace-nowrap tracking-tight">
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
    icon: FileCheck,
    title: 'Immutable Document Vault',
    desc: 'Every document is cryptographically registered on the blockchain, creating a permanent, verifiable record that cannot be altered or disputed.',
    accent: 'from-amber-500 to-amber-800',
  },
  {
    icon: Lock,
    title: 'Dynamic Access Control',
    desc: 'Manage precisely who can view, edit, or share documents. Role-based permissions and time-limited access rules are enforced automatically.',
    accent: 'from-slate-600 to-slate-900',
  },
  {
    icon: BarChart3,
    title: 'Unbreakable Audit Trail',
    desc: 'A live, unchangeable log records every action — who, what, and when. Complete transparency for compliance and litigation support.',
    accent: 'from-stone-500 to-stone-900',
  },
  {
    icon: MessageSquare,
    title: 'Secure Collaboration',
    desc: 'Share files and communicate through encrypted channels. Collect legally binding e-signatures directly within the platform.',
    accent: 'from-zinc-500 to-zinc-900',
  },
]

function Features() {
  const { ref, inView } = useFadeIn()
  return (
    <section id="technology" className="relative py-28 px-6 bg-[#f3f1ed] overflow-hidden">
      {/* Decorative grid */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] bg-[linear-gradient(rgba(0,0,0,1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,1)_1px,transparent_1px)] bg-[size:60px_60px]" />

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="max-w-2xl mb-16">
          <p className="text-[11px] font-bold text-amber-700 uppercase tracking-[0.22em] mb-4">Platform Technology</p>
          <h2 className="font-heading text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-5">
            A New Standard for<br />Legal Security
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed">
            Built from the ground up for law firms that can't afford to compromise on security or compliance.
          </p>
        </div>

        <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {features.map((f, i) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/90 p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_8px_24px_-10px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-amber-200/60 hover:shadow-[0_4px_24px_-6px_rgba(15,23,42,0.14)]"
                style={{
                  opacity: inView ? 1 : 0,
                  transform: inView ? 'translateY(0)' : 'translateY(28px)',
                  transition: `opacity 0.55s ease ${i * 0.1}s, transform 0.55s ease ${i * 0.1}s, box-shadow 0.2s ease, border-color 0.2s ease`,
                }}
              >
                {/* Subtle corner accent */}
                <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-[4rem] bg-gradient-to-bl from-amber-50/60 to-transparent pointer-events-none" />
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.accent} flex items-center justify-center mb-5 shadow-lg`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-heading font-bold text-slate-900 text-lg mb-2">{f.title}</h3>
                <p className="text-slate-500 leading-relaxed text-sm">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ── How It Works ───────────────────────────────────────────────────────────
const steps = [
  {
    num: '01',
    icon: Shield,
    title: 'Register & Verify',
    desc: 'Securely register your legal documents. A unique, permanent fingerprint is generated on the PangoChain ledger for irrefutable proof of existence.',
  },
  {
    num: '02',
    icon: Lock,
    title: 'Control & Govern',
    desc: 'Your documents are securely stored. Govern exactly who has access with dynamic, role-based permission controls — automatically enforced at every request.',
  },
  {
    num: '03',
    icon: FileCheck,
    title: 'Transact & Enforce',
    desc: 'Share documents, collaborate with clients, and collect legally binding e-signatures. Verify any document\'s authenticity in seconds.',
  },
]

function HowItWorks() {
  const { ref, inView } = useFadeIn(0.1)
  return (
    <section id="how-it-works" className="relative py-28 px-6 bg-[#0e0e0f] overflow-hidden">
      {/* Gold dot grid */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] bg-[radial-gradient(rgba(212,175,55,1)_1px,transparent_1px)] bg-[size:28px_28px]" />
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#0e0e0f] to-transparent" />

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="max-w-2xl mb-16">
          <p className="text-[11px] font-bold text-amber-400 uppercase tracking-[0.22em] mb-4">Workflow</p>
          <h2 className="font-heading text-4xl md:text-5xl font-extrabold text-white leading-tight mb-5">
            A Seamless Workflow<br />for Unbreakable Trust
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed">
            Three simple steps to transform how your firm manages and protects legal documents.
          </p>
        </div>

        <div ref={ref} className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.06] rounded-2xl overflow-hidden border border-white/[0.06]">
          {steps.map((s, i) => {
            const Icon = s.icon
            return (
              <div
                key={s.num}
                className="relative bg-[#0e0e0f] p-8 overflow-hidden group hover:bg-[#141415] transition-colors duration-200"
                style={{
                  opacity: inView ? 1 : 0,
                  transform: inView ? 'translateY(0)' : 'translateY(28px)',
                  transition: `opacity 0.55s ease ${i * 0.15}s, transform 0.55s ease ${i * 0.15}s`,
                }}
              >
                <span className="absolute top-5 right-6 font-heading font-extrabold text-6xl text-white/[0.04] select-none leading-none">
                  {s.num}
                </span>
                <div className="w-12 h-12 rounded-xl border border-amber-400/25 bg-amber-400/10 flex items-center justify-center mb-6 group-hover:border-amber-400/40 group-hover:bg-amber-400/15 transition-all">
                  <Icon className="w-5 h-5 text-amber-400" />
                </div>
                <p className="text-[10px] font-bold text-amber-400/60 uppercase tracking-[0.18em] mb-2">Step {s.num}</p>
                <h3 className="font-heading font-bold text-white text-lg mb-3">{s.title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">{s.desc}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
    </section>
  )
}

// ── Tech Pillars ───────────────────────────────────────────────────────────
function TechPillars() {
  const { ref, inView } = useFadeIn()
  const pillars = [
    { icon: Layers, label: 'Hyperledger Fabric', desc: 'Permissioned ledger for tamper-proof audit records' },
    { icon: Cpu, label: 'AES-256-GCM', desc: 'Military-grade encryption on every document at rest' },
    { icon: Globe, label: 'IPFS Storage', desc: 'Decentralised content-addressed document pinning' },
    { icon: Shield, label: 'Role-Based ACL', desc: 'Granular access down to individual document fields' },
  ]
  return (
    <section className="py-20 px-6 bg-white border-y border-slate-100">
      <div ref={ref} className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {pillars.map((p, i) => {
          const Icon = p.icon
          return (
            <div
              key={p.label}
              className="text-center"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(20px)',
                transition: `opacity 0.5s ease ${i * 0.1}s, transform 0.5s ease ${i * 0.1}s`,
              }}
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-slate-950/10">
                <Icon className="w-5 h-5 text-amber-400" />
              </div>
              <p className="font-heading font-bold text-slate-900 text-sm mb-1">{p.label}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{p.desc}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── CTA ────────────────────────────────────────────────────────────────────
function CTA() {
  const { ref, inView } = useFadeIn()
  return (
    <section className="py-28 px-6 bg-[#f3f1ed]">
      <div
        ref={ref}
        className="max-w-4xl mx-auto rounded-[2rem] overflow-hidden relative"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}
      >
        <div className="bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.30),transparent_55%),linear-gradient(135deg,#0c0c0d,#1c1a18)] px-10 py-16 text-center">
          {/* Gold line accents */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />

          <p className="text-[11px] font-bold text-amber-400 uppercase tracking-[0.22em] mb-5">Get Started</p>
          <h2 className="font-heading text-4xl md:text-5xl font-extrabold text-white leading-tight mb-5">
            Ready to Secure<br />Your Practice?
          </h2>
          <p className="text-slate-400 text-lg mb-10 max-w-lg mx-auto leading-relaxed">
            Join hundreds of law firms using PangoChain to protect their clients and their reputation.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="btn-primary text-base px-8 py-3.5 shadow-lg shadow-black/40">
              Access the Portal <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.08] px-8 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/[0.12]">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Footer ─────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-[#0e0e0f] border-t border-white/[0.07] py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="PangoChain" className="h-8 w-auto brightness-0 invert opacity-80" />
        </div>
        <p className="text-sm text-slate-600">
          © {new Date().getFullYear()} PangoChain. All rights reserved.
        </p>
        <div className="flex items-center gap-6 text-sm text-slate-600">
          <a href="#" className="hover:text-amber-400 transition-colors">Privacy</a>
          <a href="#" className="hover:text-amber-400 transition-colors">Terms</a>
          <a href="#" className="hover:text-amber-400 transition-colors">Security</a>
        </div>
      </div>
    </footer>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />
      <Hero />
      <LogoCloud />
      <Features />
      <HowItWorks />
      <TechPillars />
      <CTA />
      <Footer />
    </div>
  )
}
