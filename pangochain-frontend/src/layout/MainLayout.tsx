import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'

export function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen bg-surface/80 overflow-hidden">
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
          <span className="font-heading font-bold text-[#1d6464] text-base">PangoChain</span>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
