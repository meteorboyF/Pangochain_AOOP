import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore, isClient } from './store/authStore'
import { MainLayout } from './layout/MainLayout'
import { Suspense } from 'react'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Cases from './pages/Cases'
import CaseDetail from './pages/CaseDetail'
import NewCase from './pages/NewCase'
import Documents from './pages/Documents'
import AuditTrail from './pages/AuditTrail'
import Messages from './pages/Messages'
import Profile from './pages/Profile'
import AdminPanel from './pages/AdminPanel'
import NotFound from './pages/NotFound'
import HearingManager from './pages/HearingManager'
import LedgerExplorer from './pages/LedgerExplorer'
import ClientPortal from './pages/client/ClientPortal'
import ClientDocuments from './pages/client/ClientDocuments'
import ClientCase from './pages/client/ClientCase'

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
      <div className="w-6 h-6 border-2 border-[#1d6464] border-t-transparent rounded-full animate-spin" />
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

        {/* Protected — all inside MainLayout */}
        <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>

          {/* ── Legal Professional ──────────────────────────────────────────── */}
          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/cases" element={<Cases />} />
          <Route path="/cases/new" element={<NewCase />} />
          <Route path="/cases/:id" element={<CaseDetail />} />

          <Route path="/documents" element={<Documents />} />
          <Route path="/documents/:id" element={<Documents />} />

          <Route path="/audit" element={<AuditTrail />} />
          <Route path="/audit/ledger" element={<AuditTrail />} />

          <Route path="/messages" element={<Messages />} />

          <Route path="/hearings" element={<HearingManager />} />

          <Route path="/ledger" element={<LedgerExplorer />} />

          {/* ── Admin ──────────────────────────────────────────────────────── */}
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/admin/users" element={<AdminPanel />} />
          <Route path="/admin/keys" element={<AdminPanel />} />

          {/* ── Profile ────────────────────────────────────────────────────── */}
          <Route path="/profile" element={<Profile />} />

          {/* ── Client Portal ──────────────────────────────────────────────── */}
          <Route path="/client/portal" element={<ClientPortal />} />
          <Route path="/client/documents" element={<ClientDocuments />} />
          <Route path="/client/case" element={<ClientCase />} />
          <Route path="/client/portal/sign/:docId" element={
            <div className="card">
              <p className="text-text-muted text-sm">E-Signature — Phase 7</p>
            </div>
          } />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
