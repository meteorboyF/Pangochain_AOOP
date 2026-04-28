import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore, isClient } from './store/authStore'
import { MainLayout } from './layout/MainLayout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Cases from './pages/Cases'
import Documents from './pages/Documents'
import AuditTrail from './pages/AuditTrail'
import NotFound from './pages/NotFound'
import { Suspense } from 'react'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <>{children}</>
  return <Navigate to={user && isClient(user.role) ? '/client/portal' : '/dashboard'} replace />
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<PublicOnly><Landing /></PublicOnly>} />
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />

        {/* Protected — authenticated users */}
        <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/cases" element={<Cases />} />
          <Route path="/cases/new" element={<div className="card"><p className="text-text-muted">New Case — Phase 2</p></div>} />
          <Route path="/cases/:id" element={<div className="card"><p className="text-text-muted">Case Detail — Phase 2</p></div>} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/documents/:id" element={<div className="card"><p className="text-text-muted">Document Detail — Phase 3</p></div>} />
          <Route path="/messages" element={<div className="card"><p className="text-text-muted">Messages — Phase 5</p></div>} />
          <Route path="/audit" element={<AuditTrail />} />
          <Route path="/audit/ledger" element={<div className="card"><p className="text-text-muted">Ledger Explorer — Phase 5</p></div>} />
          <Route path="/admin" element={<div className="card"><p className="text-text-muted">Admin Panel — Phase 5</p></div>} />
          <Route path="/admin/users" element={<div className="card"><p className="text-text-muted">User Management — Phase 5</p></div>} />
          <Route path="/admin/keys" element={<div className="card"><p className="text-text-muted">Key Rotation — Phase 4</p></div>} />
          <Route path="/profile" element={<div className="card"><p className="text-text-muted">Profile — Phase 2</p></div>} />
          <Route path="/client/portal" element={<div className="card"><p className="text-text-muted">Client Portal — Phase 5</p></div>} />
          <Route path="/client/portal/sign/:docId" element={<div className="card"><p className="text-text-muted">E-Signature — Phase 5</p></div>} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
