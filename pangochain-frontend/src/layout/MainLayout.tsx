import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { NotificationBell } from '../components/NotificationBell'

export function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    // Transparent chrome so the global fixed particle canvas (App.tsx, z-0) shows
    // through the page gutters. The sidebar and cards keep solid surfaces for readability.
    <div className="flex h-screen overflow-hidden">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main className="flex-1 overflow-y-auto scrollbar-thin relative z-10">
        {/* Mobile header bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-white/95 backdrop-blur-sm sticky top-0 z-20">
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
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
