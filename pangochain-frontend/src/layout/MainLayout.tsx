import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { NotificationBell } from '../components/NotificationBell'

export function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Subtle ambient glow behind content area */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_8%,rgba(212,175,55,0.10),transparent_32rem),radial-gradient(circle_at_80%_0%,rgba(15,23,42,0.06),transparent_28rem)]" />
      </div>

      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <main className="flex-1 overflow-y-auto scrollbar-thin relative z-10">
        {/* Mobile header bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-slate-200/60 bg-white/95 backdrop-blur-xl sticky top-0 z-20 shadow-sm">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <img src="/logo-mark.png" alt="PangoChain" className="h-8 w-auto" />
          <div className="ml-auto"><NotificationBell /></div>
        </div>

        {/* Floating notification bell for desktop */}
        <div className="hidden lg:block fixed top-5 right-6 z-30">
          <NotificationBell />
        </div>

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
