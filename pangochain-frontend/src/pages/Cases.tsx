import { useQuery } from '@tanstack/react-query'
import { FolderOpen, Plus, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import api from '../lib/api'

export default function Cases() {
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['cases', search],
    queryFn: () => api.get(`/cases${search ? `?search=${search}` : ''}`).then((r) => r.data),
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-text-primary">Cases</h1>
        <Link to="/cases/new" className="btn-primary">
          <Plus className="w-4 h-4" /> New Case
        </Link>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          className="input pl-9"
          placeholder="Search cases…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && data?.content?.length === 0 && (
        <div className="text-center py-16">
          <FolderOpen className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="font-heading font-semibold text-text-primary">No cases found</p>
          <p className="text-text-muted text-sm mt-1">Create your first case to get started.</p>
          <Link to="/cases/new" className="btn-primary mt-4 inline-flex">
            <Plus className="w-4 h-4" /> Create Case
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.content?.map((c: any) => (
          <Link
            key={c.id}
            to={`/cases/${c.id}`}
            className="card hover:shadow-card-hover transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-primary" />
              </div>
              <span className={`badge ${c.status === 'ACTIVE' ? 'badge-green' : c.status === 'CLOSED' ? 'badge-gray' : 'badge-amber'}`}>
                {c.status}
              </span>
            </div>
            <h3 className="font-heading font-semibold text-text-primary text-sm mb-1 line-clamp-2">{c.title}</h3>
            <p className="text-xs text-text-muted">{c.caseType ?? 'General'} · {new Date(c.createdAt).toLocaleDateString()}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
