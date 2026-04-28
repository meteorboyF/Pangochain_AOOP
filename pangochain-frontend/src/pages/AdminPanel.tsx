import { useState, useEffect } from 'react'
import { Users, CheckCircle, Ban, Loader2, AlertCircle, Shield } from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'

interface UserSummary {
  id: string
  email: string
  fullName: string
  role: string
  status: string
  firmName: string | null
  mfaEnabled: boolean
}

interface Page<T> { content: T[]; totalElements: number }

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:           'bg-emerald-50 text-emerald-700',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700',
  SUSPENDED:        'bg-red-50 text-red-700',
  DEACTIVATED:      'bg-gray-100 text-gray-600',
}

export default function AdminPanel() {
  const [page, setPage] = useState<Page<UserSummary> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [acting, setActing] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get<Page<UserSummary>>('/admin/users')
        setPage(data)
      } catch (err: any) {
        setError(err.response?.data?.detail ?? 'Failed to load users')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const activate = async (id: string, email: string) => {
    setActing(id)
    try {
      await api.post(`/admin/users/${id}/activate`)
      setPage((prev) => prev ? {
        ...prev,
        content: prev.content.map((u) => u.id === id ? { ...u, status: 'ACTIVE' } : u)
      } : prev)
      toast.success(`${email} activated`)
    } catch {
      toast.error('Failed to activate user')
    } finally {
      setActing(null)
    }
  }

  const suspend = async (id: string, email: string) => {
    setActing(id)
    try {
      await api.post(`/admin/users/${id}/suspend`)
      setPage((prev) => prev ? {
        ...prev,
        content: prev.content.map((u) => u.id === id ? { ...u, status: 'SUSPENDED' } : u)
      } : prev)
      toast.success(`${email} suspended`)
    } catch {
      toast.error('Failed to suspend user')
    } finally {
      setActing(null)
    }
  }

  const users = page?.content ?? []

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Admin Panel</h1>
          {!loading && <p className="text-text-muted text-sm mt-0.5">{page?.totalElements ?? 0} users</p>}
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1d6464]/10 text-[#1d6464] text-xs font-semibold">
          <Shield className="w-3.5 h-3.5" /> Managing Partner / IT Admin only
        </div>
      </div>

      {loading && <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1d6464]" /></div>}

      {error && !loading && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-error">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {!loading && !error && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                <th className="text-left px-4 py-3 font-medium text-text-muted text-xs uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted text-xs uppercase tracking-wide hidden md:table-cell">Role</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted text-xs uppercase tracking-wide hidden lg:table-cell">Firm</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted text-xs uppercase tracking-wide hidden md:table-cell">MFA</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-surface-muted transition-colors">
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-text-primary text-sm">{u.fullName}</p>
                    <p className="text-text-muted text-xs">{u.email}</p>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <span className="text-text-secondary text-xs">{u.role.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell">
                    <span className="text-text-secondary text-xs">{u.firmName ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[u.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {u.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <span className={`text-xs font-medium ${u.mfaEnabled ? 'text-success' : 'text-text-muted'}`}>
                      {u.mfaEnabled ? '✓ On' : 'Off'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      {u.status !== 'ACTIVE' && (
                        <button
                          onClick={() => activate(u.id, u.email)}
                          disabled={acting === u.id}
                          className="p-1.5 rounded-lg hover:bg-emerald-50 text-text-muted hover:text-success transition-colors"
                          title="Activate"
                        >
                          {acting === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      {u.status === 'ACTIVE' && (
                        <button
                          onClick={() => suspend(u.id, u.email)}
                          disabled={acting === u.id}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-text-muted hover:text-error transition-colors"
                          title="Suspend"
                        >
                          {acting === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
