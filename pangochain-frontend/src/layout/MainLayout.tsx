import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, Sparkles } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { NotificationBell } from '../components/NotificationBell'

export function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main className="flex-1 overflow-y-auto scrollbar-thin relative z-10">
        {/* Mobile header bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-white/70 bg-white/90 backdrop-blur-xl sticky top-0 z-20">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-text-muted hover:bg-surface-muted transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <img src="/logo-mark.png" alt="PangoChain" className="h-8 w-auto" />
          <div className="ml-auto"><NotificationBell /></div>
        </div>
        {/* Floating bell for desktop (no persistent top bar) */}
        <div className="hidden lg:block fixed top-4 right-6 z-30">
          <NotificationBell />
        </div>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          <div className="mb-5 hidden items-center justify-between rounded-2xl border border-white/70 bg-white/65 px-4 py-3 text-xs text-slate-600 shadow-sm backdrop-blur-xl lg:flex">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-700" />
              <span className="font-semibold text-slate-800">Tip:</span>
              <span>Use sidebar search or hover controls to discover what each legal workflow does.</span>
            </div>
            <span className="font-mono text-[11px] text-cyan-700">Fabric audit + IPFS vault active</span>
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
