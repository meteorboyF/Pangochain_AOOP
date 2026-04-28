import { useState, useMemo } from 'react'
import { FileText, Search, Download, Shield, Clock, Eye, Filter } from 'lucide-react'
import { MOCK_DOCUMENTS, MOCK_CASES } from '../lib/mockData'

const TYPE_COLORS: Record<string, string> = {
  Agreement:  'bg-blue-50 text-blue-700',
  Report:     'bg-purple-50 text-purple-700',
  Statement:  'bg-amber-50 text-amber-700',
  Financial:  'bg-green-50 text-green-700',
  Evidence:   'bg-red-50 text-red-700',
  Contract:   'bg-teal-50 text-teal-700',
}

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return '📄'
  if (ext === 'docx') return '📝'
  if (ext === 'xlsx') return '📊'
  if (ext === 'zip')  return '🗜️'
  return '📎'
}

export default function Documents() {
  const [search, setSearch] = useState('')
  const [caseFilter, setCaseFilter] = useState('ALL')

  const cases = useMemo(() => [
    { id: 'ALL', title: 'All Cases' },
    ...MOCK_CASES.map((c) => ({ id: c.id, title: c.title.split('—')[0].trim() })),
  ], [])

  const filtered = useMemo(() => {
    return MOCK_DOCUMENTS.filter((d) => {
      const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.type.toLowerCase().includes(search.toLowerCase()) ||
        d.uploadedBy.toLowerCase().includes(search.toLowerCase())
      const matchCase = caseFilter === 'ALL' || d.caseId === caseFilter
      return matchSearch && matchCase
    })
  }, [search, caseFilter])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Documents</h1>
          <p className="text-text-muted text-sm mt-0.5">{MOCK_DOCUMENTS.length} documents · blockchain-verified</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1d6464]/10 text-[#1d6464] text-xs font-semibold">
          <Shield className="w-3.5 h-3.5" /> IPFS + Hyperledger Fabric
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            className="input pl-9"
            placeholder="Search documents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-muted" />
          <select
            className="input py-2 pr-8 text-sm"
            value={caseFilter}
            onChange={(e) => setCaseFilter(e.target.value)}
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="font-heading font-semibold text-text-primary">No documents found</p>
          <p className="text-text-muted text-sm mt-1">Try adjusting your search or filter.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                <th className="text-left px-4 py-3 font-medium text-text-muted text-xs uppercase tracking-wide">Document</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted text-xs uppercase tracking-wide hidden md:table-cell">Case</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted text-xs uppercase tracking-wide hidden lg:table-cell">Type</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted text-xs uppercase tracking-wide hidden xl:table-cell">Uploaded By</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted text-xs uppercase tracking-wide hidden lg:table-cell">Date</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted text-xs uppercase tracking-wide">Size</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((doc) => (
                <tr key={doc.id} className="hover:bg-surface-muted transition-colors group">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="text-lg leading-none">{fileIcon(doc.name)}</span>
                      <div className="min-w-0">
                        <p className="font-medium text-text-primary truncate max-w-[200px] group-hover:text-[#1d6464] transition-colors">
                          {doc.name}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
                          <Shield className="w-3 h-3 text-[#1d6464]" /> Blockchain-verified
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <span className="text-text-secondary text-xs">{doc.caseTitle}</span>
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${TYPE_COLORS[doc.type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {doc.type}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 hidden xl:table-cell">
                    <span className="text-text-secondary text-xs">{doc.uploadedBy}</span>
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell">
                    <span className="text-text-muted text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-text-muted text-xs">{doc.size}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 rounded-lg hover:bg-[#1d6464]/10 text-text-muted hover:text-[#1d6464] transition-colors" title="View">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-[#1d6464]/10 text-text-muted hover:text-[#1d6464] transition-colors" title="Download">
                        <Download className="w-3.5 h-3.5" />
                      </button>
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
