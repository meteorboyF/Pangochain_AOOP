import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ParticlesBackground } from '../components/ParticlesBackground'

export function MainLayout() {
  return (
    <div className="flex h-screen bg-surface overflow-hidden relative">
      <ParticlesBackground variant="app" />
      <Sidebar />
      <main className="flex-1 overflow-y-auto scrollbar-thin relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
