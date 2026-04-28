import { useState, useEffect, useCallback } from 'react'
import { FolderOpen, Plus, Search, Clock, FileText, Filter, Loader2, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../lib/api'

interface CaseDto {
  id: string
  title: string
  caseType: string
  status: 'ACTIVE' | 'CLOSED' | 'ARCHIVED'
  firmName: string
  createdByEmail: string
  documentCount: number
  createdAt: string
  closedAt: string | null
}

interface Page<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  CLOSED:   'bg-gray-100 text-gray-600 border border-gray-200',
  ARCHIVED: 'bg-amber-50 text-amber-700 border border-amber-200',
}

export default function Cases() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CLOSED'>('ALL')
  const [page, setPage] = useState<Page<CaseDto> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, string> = { page: '0', size: '30' }
      if (statusFilter !== 'ALL') params.status = statusFilter
      if (search.trim()) params.q = search.trim()
      const { data } = await api.get<Page<CaseDto>>('/cases', { params })
      setPage(data)
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Failed to load cases')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  const cases = page?.content ?? []
  const total = page?.totalElements ?? 0
  const active = cases.filter((c) => c.status === 'ACTIVE').length

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Cases</h1>
          {!loading && !error && (
            <p className="text-text-muted text-sm mt-0.5">{active} active · {total} total</p>
          )}
        </div>
        <Link to="/cases/new" className="btn-primary">
          <Plus className="w-4 h-4" /> New Case
        </Link>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            className="input pl-9"
            placeholder="Search by title or type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(['ALL', 'ACTIVE', 'CLOSED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                statusFilter === s
                  ? 'bg-[#1d6464] text-white border-[#1d6464]'
                  : 'bg-white text-text-secondary border-border hover:border-[#1d6464]/40'
              }`}
            >
              {s === 'ALL' ? <><Filter className="w-3.5 h-3.5 inline mr-1" />All</> : s}
            </button>
          ))}
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
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && cases.length === 0 && (
        <div className="text-center py-16">
          <FolderOpen className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="font-heading font-semibold text-text-primary">No cases found</p>
          <p className="text-text-muted text-sm mt-1">Try adjusting your search or filter.</p>
        </div>
      )}

      {!loading && !error && cases.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cases.map((c) => (
            <Link
              key={c.id}
              to={`/cases/${c.id}`}
              className="card hover:shadow-card-hover transition-all hover:-translate-y-1 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#1d6464]/10 flex items-center justify-center group-hover:bg-[#1d6464] transition-colors">
                  <FolderOpen className="w-5 h-5 text-[#1d6464] group-hover:text-white transition-colors" />
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[c.status]}`}>
                  {c.status}
                </span>
              </div>
              <h3 className="font-heading font-semibold text-text-primary text-sm leading-snug mb-2 line-clamp-2 group-hover:text-[#1d6464] transition-colors">
                {c.title}
              </h3>
              {c.caseType && (
                <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-md mb-3 bg-[#1d6464]/10 text-[#1d6464]">
                  {c.caseType}
                </span>
              )}
              <p className="text-xs text-text-muted truncate mb-3">
                <span className="font-medium text-text-secondary">Firm:</span> {c.firmName}
              </p>
              <div className="flex items-center justify-between pt-3 border-t border-border text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> {c.documentCount} docs
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
