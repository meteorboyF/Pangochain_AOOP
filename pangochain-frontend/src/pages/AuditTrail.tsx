import { useState, useMemo } from 'react'
import { Activity, Search, Shield, ExternalLink, Filter } from 'lucide-react'
import { MOCK_AUDIT } from '../lib/mockData'

// Extend mock audit with more events for a richer demo
const EXTENDED_AUDIT = [
  ...MOCK_AUDIT,
  { id: 'aud-006', eventType: 'DOC_REGISTERED',  actor: 'David Kim',       resource: 'Axiom_FDA_Response_Draft.pdf',         timestamp: '2026-04-24T09:18:44Z', txId: '0x3d9c...b771', org: 'FirmAMSP' },
  { id: 'aud-007', eventType: 'ACCESS_GRANTED',   actor: 'Amanda Patel',    resource: 'BlueRock_Lease_Matrix_Q2.xlsx',        timestamp: '2026-04-23T11:05:22Z', txId: '0x5f2e...c990', org: 'FirmAMSP' },
  { id: 'aud-008', eventType: 'DOC_VIEWED',        actor: 'Sarah Chen',      resource: 'Meridian_APA_Draft_v3.pdf',           timestamp: '2026-04-22T14:30:10Z', txId: '0x9a1b...d440', org: 'FirmAMSP' },
  { id: 'aud-009', eventType: 'CASE_REGISTERED',  actor: 'David Kim',       resource: 'Nexus Fintech Regulatory',            timestamp: '2026-03-20T08:05:00Z', txId: '0x6c8d...f112', org: 'FirmAMSP' },
  { id: 'aud-010', eventType: 'ACCESS_REVOKED',   actor: 'Michael Torres',  resource: 'GlobalNet_Employee_Records_Redacted.zip', timestamp: '2026-04-15T17:22:33Z', txId: '0x2e7a...a330', org: 'FirmAMSP' },
  { id: 'aud-011', eventType: 'DOC_REGISTERED',  actor: 'Amanda Patel',    resource: 'ClearPath_JV_Agreement_Final.pdf',    timestamp: '2025-12-20T12:10:00Z', txId: '0x7b5c...e881', org: 'FirmAMSP' },
  { id: 'aud-012', eventType: 'ACCESS_GRANTED',   actor: 'Sarah Chen',      resource: 'Solaris_Patent_Valuation_2026.xlsx',  timestamp: '2026-04-10T11:05:00Z', txId: '0x4d3f...c221', org: 'FirmAMSP' },
]

const EVENT_COLORS: Record<string, string> = {
  DOC_REGISTERED:  'bg-blue-50 text-blue-700 border border-blue-200',
  ACCESS_GRANTED:  'bg-emerald-50 text-emerald-700 border border-emerald-200',
  ACCESS_REVOKED:  'bg-red-50 text-red-700 border border-red-200',
  DOC_VIEWED:      'bg-purple-50 text-purple-700 border border-purple-200',
  CASE_REGISTERED: 'bg-teal-50 text-teal-700 border border-teal-200',
}

const EVENT_LABELS: Record<string, string> = {
  DOC_REGISTERED:  'Registered',
  ACCESS_GRANTED:  'Access Granted',
  ACCESS_REVOKED:  'Access Revoked',
  DOC_VIEWED:      'Viewed',
  CASE_REGISTERED: 'Case Created',
}

const ALL_TYPES = ['ALL', ...Object.keys(EVENT_LABELS)]

export default function AuditTrail() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')

  const filtered = useMemo(() => {
    return EXTENDED_AUDIT.filter((e) => {
      const matchSearch = e.resource.toLowerCase().includes(search.toLowerCase()) ||
        e.actor.toLowerCase().includes(search.toLowerCase()) ||
        e.txId.toLowerCase().includes(search.toLowerCase())
      const matchType = typeFilter === 'ALL' || e.eventType === typeFilter
      return matchSearch && matchType
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [search, typeFilter])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Audit Trail</h1>
          <p className="text-text-muted text-sm mt-0.5">{EXTENDED_AUDIT.length} events · immutable blockchain ledger</p>
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
            placeholder="Search resource, actor, or tx hash…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-muted" />
          <select
            className="input py-2 pr-8 text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            {ALL_TYPES.map((t) => (
              <option key={t} value={t}>{t === 'ALL' ? 'All Events' : EVENT_LABELS[t]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Activity className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="font-heading font-semibold text-text-primary">No events found</p>
          <p className="text-text-muted text-sm mt-1">Try adjusting your search or filter.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                <th className="text-left px-4 py-3 font-medium text-text-muted text-xs uppercase tracking-wide">Event</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted text-xs uppercase tracking-wide">Resource</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted text-xs uppercase tracking-wide hidden md:table-cell">Actor</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted text-xs uppercase tracking-wide hidden lg:table-cell">Tx Hash</th>
                <th className="text-left px-4 py-3 font-medium text-text-muted text-xs uppercase tracking-wide">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((event) => (
                <tr key={event.id} className="hover:bg-surface-muted transition-colors group">
                  <td className="px-4 py-3.5">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap ${EVENT_COLORS[event.eventType] ?? 'bg-gray-100 text-gray-600'}`}>
                      {EVENT_LABELS[event.eventType] ?? event.eventType}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 max-w-[200px]">
                    <p className="text-text-primary text-xs font-medium truncate">{event.resource}</p>
                    <p className="text-text-muted text-[10px]">{event.org}</p>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <span className="text-text-secondary text-xs">{event.actor}</span>
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell">
                    <div className="flex items-center gap-1.5">
                      <code className="text-[11px] text-[#1d6464] font-mono">{event.txId}</code>
                      <ExternalLink className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="text-xs text-text-muted">
                      <p>{new Date(event.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      <p className="font-mono text-[10px]">{new Date(event.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
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
