import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FolderOpen, Plus, Search, Clock, FileText, Filter, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import { StatusBadge } from '../components/ui/StatusBadge'
import { CardGridSkeleton } from '../components/ui/Skeleton'
import { EmptyState, PageHero, QuickActionGrid } from '../components/ui/PageChrome'
import { Tooltip } from '../components/ui/Tooltip'

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

export default function Cases() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CLOSED'>('ALL')
  // Debounce the search term so typing doesn't fire a request per keystroke; the
  // debounced value becomes part of the query key, so React Query handles caching,
  // dedup and refetch automatically.
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), search ? 300 : 0)
    return () => clearTimeout(t)
  }, [search])

  const { data: page, isLoading, isError } = useQuery({
    queryKey: queryKeys.cases({ status: statusFilter, q: debouncedSearch }),
    queryFn: async () => {
      const params: Record<string, string> = { page: '0', size: '30' }
      if (statusFilter !== 'ALL') params.status = statusFilter
      if (debouncedSearch) params.q = debouncedSearch
      const { data } = await api.get<Page<CaseDto>>('/cases', { params })
      return data
    },
    placeholderData: (prev) => prev, // keep showing prior results while refetching on filter change
  })

  const loading = isLoading
  const error = isError ? 'Failed to load cases' : ''
  const cases = page?.content ?? []
  const total = page?.totalElements ?? 0
  const active = cases.filter((c) => c.status === 'ACTIVE').length
  const closed = cases.filter((c) => c.status === 'CLOSED').length

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHero
        eyebrow="Matter workspace"
        title="Cases"
        description="Search legal matters, jump into evidence, and keep active work visible without scrolling through unrelated tools."
        icon={FolderOpen}
        actions={(
          <Link to="/cases/new" className="btn-primary">
            <Plus className="w-4 h-4" /> New Case
          </Link>
        )}
      >
        <QuickActionGrid
          actions={[
            { label: 'New matter intake', description: 'Start a case with title, parties, type, and initial ownership.', to: '/cases/new', icon: Plus, tone: 'cyan' },
            { label: 'Document vault', description: 'Open encrypted case documents and evidence files.', to: '/documents', icon: FileText, tone: 'emerald' },
            { label: 'Audit review', description: 'Check who accessed or changed case resources.', to: '/audit', icon: AlertCircle, tone: 'amber' },
            { label: 'Hearings', description: 'Review court dates and upcoming case appearances.', to: '/hearings', icon: Clock, tone: 'violet' },
          ]}
        />
      </PageHero>

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: 'Active', value: active, help: 'Cases currently in progress.' },
            { label: 'Closed', value: closed, help: 'Cases marked complete or no longer active.' },
            { label: 'Total', value: total, help: 'All cases returned by the current filters.' },
          ].map((item) => (
            <Tooltip key={item.label} content={item.help} side="bottom" className="w-full">
              <div className="glass-panel w-full px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className="mt-1 font-heading text-2xl font-bold text-slate-950">{item.value}</p>
              </div>
            </Tooltip>
          ))}
        </div>
      )}

      {/* Search + Filter */}
      <div className="glass-panel flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            className="input pl-9"
            placeholder="Search by title or type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
          {(['ALL', 'ACTIVE', 'CLOSED'] as const).map((s) => (
            <Tooltip key={s} content={s === 'ALL' ? 'Show every case.' : `Show only ${s.toLowerCase()} cases.`} side="bottom">
              <button
                onClick={() => setStatusFilter(s)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${
                  statusFilter === s
                    ? 'bg-slate-950 text-white border-slate-950 shadow-md'
                    : 'bg-white text-text-secondary border-border hover:border-cyan-300 hover:bg-cyan-50'
                }`}
              >
                {s === 'ALL' ? <><Filter className="w-3.5 h-3.5" />All</> : s}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* States */}
      {loading && <CardGridSkeleton />}

      {error && !loading && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-error">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && cases.length === 0 && (
        <EmptyState
          icon={FolderOpen}
          title="No cases found"
          description="Try adjusting the search or filter. If this is a new workspace, create the first matter to unlock documents, audit, deadlines, and client collaboration."
          action={<Link to="/cases/new" className="btn-primary"><Plus className="w-4 h-4" /> New Case</Link>}
        />
      )}

      {!loading && !error && cases.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cases.map((c) => (
            <Link
              key={c.id}
              to={`/cases/${c.id}`}
              className="card group relative overflow-hidden transition-all hover:-translate-y-1 hover:border-cyan-200 hover:shadow-card-hover"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-emerald-400 to-amber-400 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-slate-900 flex items-center justify-center shadow-md">
                  <FolderOpen className="w-5 h-5 text-white" />
                </div>
                <StatusBadge status={c.status} />
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
                  <FileText className="w-3.5 h-3.5" /> {c.documentCount >= 0 ? `${c.documentCount} docs` : 'Open for docs'}
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
