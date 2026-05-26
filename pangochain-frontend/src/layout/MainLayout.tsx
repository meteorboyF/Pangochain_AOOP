import { lazy, Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

// Lazy-loaded so particles do not block initial page render
const ParticlesBackground = lazy(() => import('../components/ParticlesBackground'))

export function MainLayout() {
  return (
    <div className="flex h-screen bg-surface overflow-hidden relative">
      <Suspense fallback={null}>
        <ParticlesBackground variant="app" />
      </Suspense>
      <Sidebar />
      <main className="flex-1 overflow-y-auto scrollbar-thin relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
