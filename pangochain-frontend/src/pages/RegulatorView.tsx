import { useState, useEffect } from 'react'
import { Search, Filter, ChevronDown, ChevronRight, Shield, AlertCircle, Loader2 } from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { Navigate } from 'react-router-dom'

interface AuditEntry {
  id: number
  eventType: string
  actorId: string
  actorRole: string
  resourceType: string
  resourceId: string
  fabricTxId: string | null
  timestamp: string
  metadataJson: string | null
  ipAddress: string | null
}

interface PagedResponse {
  content: AuditEntry[]
  totalElements: number
  totalPages: number
  number: number
}

const EVENT_TYPES = [
  'DOC_REGISTERED', 'DOC_VIEWED', 'ACCESS_GRANTED', 'ACCESS_REVOKED',
  'DOCUMENT_SIGNED', 'KEY_ROTATION_TRIGGERED', 'KEY_ROTATION_COMPLETED',
  'USER_LOGIN', 'USER_REGISTERED', 'ACL_FABRIC_FALLBACK',
]

export default function RegulatorView() {
  const { user } = useAuthStore()

  // Guard: only REGULATOR role
  if (user?.role !== 'REGULATOR') return <Navigate to="/dashboard" replace />

  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const [resourceId, setResourceId] = useState('')
  const [eventType, setEventType] = useState('')

  const load = async (pg = 0) => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, string | number> = { page: pg, size: 50 }
      if (resourceId.trim()) params.resourceId = resourceId.trim()
      if (eventType) params.eventType = eventType
      const { data } = await api.get<PagedResponse>('/audit/regulator', { params })
      setEntries(data.content)
      setTotal(data.totalElements)
      setPage(pg)
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Failed to load audit trail')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(0) }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    load(0)
  }

  const eventBadgeColor = (type: string) => {
    if (type.includes('REVOK') || type.includes('FALLBACK')) return 'bg-red-100 text-red-700'
    if (type.includes('SIGNED') || type.includes('ROTATION_COMPLETED')) return 'bg-green-100 text-green-700'
    if (type.includes('GRANT') || type.includes('REGISTER')) return 'bg-blue-100 text-blue-700'
    if (type.includes('LOGIN')) return 'bg-purple-100 text-purple-700'
    return 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-[#1d6464]" />
        <div>
          <h1 className="font-heading font-bold text-2xl text-text-primary">Regulatory Audit View</h1>
          <p className="text-text-muted text-sm">Cross-firm audit trail — read-only visibility, no document content access</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2 text-sm text-amber-800">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          <strong>Regulator access:</strong> You can view audit metadata and blockchain transaction IDs
          for all firms. Document ciphertext and encryption key tokens are NOT accessible to this role.
        </span>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            className="input pl-9"
            placeholder="Resource ID (case ID, document ID, user ID…)"
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <select
            className="input pl-9 pr-8 appearance-none min-w-[200px]"
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
          >
            <option value="">All Event Types</option>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary px-5 py-2 justify-center">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-2 text-sm text-error bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="text-sm text-text-muted">
        {total > 0 ? `${total.toLocaleString()} audit events` : 'No results'}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                <th className="text-left px-4 py-3 text-text-muted font-semibold text-xs uppercase tracking-wide w-8"></th>
                <th className="text-left px-4 py-3 text-text-muted font-semibold text-xs uppercase tracking-wide">Event</th>
                <th className="text-left px-4 py-3 text-text-muted font-semibold text-xs uppercase tracking-wide">Resource</th>
                <th className="text-left px-4 py-3 text-text-muted font-semibold text-xs uppercase tracking-wide">Actor Role</th>
                <th className="text-left px-4 py-3 text-text-muted font-semibold text-xs uppercase tracking-wide">Timestamp</th>
                <th className="text-left px-4 py-3 text-text-muted font-semibold text-xs uppercase tracking-wide">Fabric TxID</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-text-muted">
                    <Loader2 className="w-6 h-6 animate-spin inline-block" />
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-text-muted text-sm">No audit events found</td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <>
                    <tr
                      key={entry.id}
                      className="border-b border-border hover:bg-surface-muted/50 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    >
                      <td className="px-4 py-3">
                        {expandedId === entry.id
                          ? <ChevronDown className="w-4 h-4 text-text-muted" />
                          : <ChevronRight className="w-4 h-4 text-text-muted" />}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${eventBadgeColor(entry.eventType)}`}>
                          {entry.eventType}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-text-secondary max-w-[180px] truncate">
                        {entry.resourceId ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{entry.actorRole ?? '—'}</td>
                      <td className="px-4 py-3 text-text-secondary text-xs">
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-text-muted max-w-[140px] truncate">
                        {entry.fabricTxId ?? '—'}
                      </td>
                    </tr>
                    {expandedId === entry.id && (
                      <tr key={`${entry.id}-detail`} className="bg-surface-muted/30">
                        <td />
                        <td colSpan={5} className="px-4 py-3">
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="text-text-muted font-semibold mb-0.5">Actor ID</p>
                              <code className="font-mono text-text-secondary">{entry.actorId ?? '—'}</code>
                            </div>
                            <div>
                              <p className="text-text-muted font-semibold mb-0.5">Fabric TxID (full)</p>
                              <code className="font-mono text-text-secondary break-all">{entry.fabricTxId ?? '—'}</code>
                            </div>
                            {entry.metadataJson && (
                              <div className="col-span-2">
                                <p className="text-text-muted font-semibold mb-0.5">Metadata</p>
                                <pre className="bg-white border border-border rounded-lg p-2 text-text-secondary overflow-x-auto">
                                  {JSON.stringify(JSON.parse(entry.metadataJson), null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 50 && (
          <div className="flex justify-between items-center px-4 py-3 border-t border-border">
            <button
              onClick={() => load(page - 1)}
              disabled={page === 0 || loading}
              className="btn border border-border py-1.5 px-3 text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-text-muted">Page {page + 1} of {Math.ceil(total / 50)}</span>
            <button
              onClick={() => load(page + 1)}
              disabled={page >= Math.ceil(total / 50) - 1 || loading}
              className="btn border border-border py-1.5 px-3 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
