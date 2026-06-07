import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, Search, Shield, ExternalLink, Filter, Loader2, AlertCircle } from 'lucide-react'
import api from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import { useAuthStore, canViewGlobalAudit } from '../store/authStore'

interface AuditLog {
  id: number
  eventType: string
  actorId: string | null
  resourceType: string
  resourceId: string
  fabricTxId: string | null
  timestamp: string
  metadataJson: string | null
}

interface Page<T> { content: T[]; totalElements: number; totalPages: number }

const EVENT_COLORS: Record<string, string> = {
  DOC_REGISTERED:      'bg-blue-50 text-blue-700 border border-blue-200',
  ACCESS_GRANTED:      'bg-emerald-50 text-emerald-700 border border-emerald-200',
  ACCESS_REVOKED:      'bg-red-50 text-red-700 border border-red-200',
  DOC_VIEWED:          'bg-purple-50 text-purple-700 border border-purple-200',
  CASE_REGISTERED:     'bg-teal-50 text-teal-700 border border-teal-200',
  USER_REGISTERED:     'bg-indigo-50 text-indigo-700 border border-indigo-200',
  USER_LOGIN:          'bg-gray-50 text-gray-500 border border-gray-200',
  CASE_CLOSED:         'bg-amber-50 text-amber-700 border border-amber-200',
  ACL_FABRIC_FALLBACK: 'bg-amber-100 text-amber-800 border border-amber-400',
}

const EVENT_LABEL: Record<string, string> = {
  DOC_REGISTERED:      'Doc Registered',
  ACCESS_GRANTED:      'Access Granted',
  ACCESS_REVOKED:      'Access Revoked',
  DOC_VIEWED:          'Doc Viewed',
  CASE_REGISTERED:     'Case Created',
  USER_REGISTERED:     'User Registered',
  USER_LOGIN:          'User Login',
  CASE_CLOSED:         'Case Closed',
  ACL_FABRIC_FALLBACK: 'ACL Fabric Fallback',
}

const EVENT_TYPES = ['ALL', 'DOC_REGISTERED', 'ACCESS_GRANTED', 'ACCESS_REVOKED', 'DOC_VIEWED', 'CASE_REGISTERED', 'ACL_FABRIC_FALLBACK']

export default function AuditTrail() {
  const user = useAuthStore((s) => s.user)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(0)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const allowed = user ? canViewGlobalAudit(user.role) : false

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), search ? 300 : 0)
    return () => clearTimeout(t)
  }, [search])

  const { data: page, isLoading: loading, isError } = useQuery({
    queryKey: queryKeys.audit({ typeFilter, resourceId: debouncedSearch, currentPage }),
    queryFn: async () => {
      const params: Record<string, string> = { page: String(currentPage), size: '25' }
      if (typeFilter !== 'ALL') params.eventType = typeFilter
      if (debouncedSearch) params.resourceId = debouncedSearch
      const { data } = await api.get<Page<AuditLog>>('/audit', { params })
      return data
    },
    placeholderData: (prev) => prev,
    enabled: allowed,
  })
  const error = isError ? 'Failed to load audit log' : ''

  const entries = page?.content ?? []

  if (!allowed) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Audit Trail</h1>
          <p className="text-text-muted text-sm mt-0.5">Restricted administrative audit area</p>
        </div>
        <div className="card border-amber-200 bg-amber-50/80">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="font-heading font-semibold text-amber-900">Global audit access is restricted</p>
              <p className="mt-1 text-sm leading-6 text-amber-800">
                Only Managing Partners, IT Admins, and Regulators can view the global audit trail.
                Case and document activity remains protected through role-based access controls.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Audit Trail</h1>
          {!loading && page && (
            <p className="text-text-muted text-sm mt-0.5">{page.totalElements} events · immutable blockchain ledger</p>
          )}
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0f3d3d] text-white text-xs font-semibold">
          <Shield className="w-3.5 h-3.5 text-[#4ab8b8]" />
          Channel: legal-channel
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            className="input pl-9"
            placeholder="Search by resource ID…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(0) }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-muted" />
          <select
            className="input py-2 pr-8 text-sm"
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(0) }}
          >
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{t === 'ALL' ? 'All Events' : (EVENT_LABEL[t] ?? t)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* States */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#1d6464]" />
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-error">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className="text-center py-16">
          <Activity className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="font-heading font-semibold text-text-primary">No audit events yet</p>
          <p className="text-text-muted text-sm mt-1">Events are recorded as you use the system.</p>
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted">
                  <th className="text-left px-4 py-3 font-medium text-text-muted text-xs uppercase tracking-wide">Event</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted text-xs uppercase tracking-wide">Resource</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted text-xs uppercase tracking-wide hidden lg:table-cell">Fabric Tx</th>
                  <th className="text-left px-4 py-3 font-medium text-text-muted text-xs uppercase tracking-wide">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((e) => (
                  <tr key={e.id} className={`hover:bg-surface-muted transition-colors group ${e.eventType === 'ACL_FABRIC_FALLBACK' ? 'bg-amber-50/50' : ''}`}>
                    <td className="px-4 py-3.5">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap ${EVENT_COLORS[e.eventType] ?? 'bg-gray-100 text-gray-600'}`}>
                        {EVENT_LABEL[e.eventType] ?? e.eventType}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 max-w-[200px]">
                      <p className="text-text-primary text-xs font-medium truncate">{e.resourceId}</p>
                      <p className="text-text-muted text-[10px]">{e.resourceType}</p>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      {e.fabricTxId ? (
                        <div className="flex items-center gap-1.5">
                          <code className="text-[11px] text-[#1d6464] font-mono">{e.fabricTxId.slice(0, 14)}…</code>
                          <ExternalLink className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ) : (
                        <span className="text-text-muted text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-xs text-text-muted">
                        <p>{new Date(e.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        <p className="font-mono text-[10px]">{new Date(e.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(page?.totalPages ?? 0) > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                disabled={currentPage === 0}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-3 py-1.5 text-sm rounded-lg border border-border disabled:opacity-40 hover:bg-surface-muted transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-text-muted">Page {currentPage + 1} of {page?.totalPages}</span>
              <button
                disabled={currentPage + 1 >= (page?.totalPages ?? 1)}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1.5 text-sm rounded-lg border border-border disabled:opacity-40 hover:bg-surface-muted transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
