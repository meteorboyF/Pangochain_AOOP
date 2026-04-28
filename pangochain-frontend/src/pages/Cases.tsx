import { useState, useMemo } from 'react'
import { FolderOpen, Plus, Search, Clock, FileText, Filter } from 'lucide-react'
import { Link } from 'react-router-dom'
import { MOCK_CASES } from '../lib/mockData'

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  CLOSED: 'bg-gray-100 text-gray-600 border border-gray-200',
  ARCHIVED: 'bg-amber-50 text-amber-700 border border-amber-200',
}

const TYPE_COLORS: Record<string, string> = {
  'Corporate M&A':       'bg-blue-50 text-blue-700',
  'Commercial Litigation':'bg-red-50 text-red-700',
  'Intellectual Property':'bg-purple-50 text-purple-700',
  'Real Estate':         'bg-amber-50 text-amber-700',
  'Regulatory':          'bg-teal-50 text-teal-700',
  'Employment Law':      'bg-orange-50 text-orange-700',
  'Contract Dispute':    'bg-pink-50 text-pink-700',
  'Corporate':           'bg-indigo-50 text-indigo-700',
  'Fintech Regulatory':  'bg-cyan-50 text-cyan-700',
}

export default function Cases() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CLOSED'>('ALL')

  const filtered = useMemo(() => {
    return MOCK_CASES.filter((c) => {
      const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.caseType.toLowerCase().includes(search.toLowerCase()) ||
        c.clientName.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [search, statusFilter])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Cases</h1>
          <p className="text-text-muted text-sm mt-0.5">{MOCK_CASES.filter(c => c.status === 'ACTIVE').length} active · {MOCK_CASES.length} total</p>
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
            placeholder="Search by title, type, or client…"
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

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="font-heading font-semibold text-text-primary">No cases found</p>
          <p className="text-text-muted text-sm mt-1">Try adjusting your search or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c, i) => (
            <Link
              key={c.id}
              to={`/cases/${c.id}`}
              className="card hover:shadow-card-hover transition-all hover:-translate-y-1 group"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {/* Top row */}
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#1d6464]/10 flex items-center justify-center group-hover:bg-[#1d6464] transition-colors">
                  <FolderOpen className="w-5 h-5 text-[#1d6464] group-hover:text-white transition-colors" />
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[c.status]}`}>
                  {c.status}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-heading font-semibold text-text-primary text-sm leading-snug mb-2 line-clamp-2 group-hover:text-[#1d6464] transition-colors">
                {c.title}
              </h3>

              {/* Type badge */}
              <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-md mb-3 ${TYPE_COLORS[c.caseType] ?? 'bg-gray-100 text-gray-600'}`}>
                {c.caseType}
              </span>

              {/* Client */}
              <p className="text-xs text-text-muted truncate mb-3">
                <span className="font-medium text-text-secondary">Client:</span> {c.clientName}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-border text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> {c.documents} docs
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(c.lastActivity).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
