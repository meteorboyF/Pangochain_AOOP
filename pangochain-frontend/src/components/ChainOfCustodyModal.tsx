import { useEffect, useState } from 'react'
import { Network, X, Loader2, Upload, Eye, Share2, PenTool, GitBranch, KeyRound, Dot } from 'lucide-react'
import api from '../lib/api'

interface CustodyEvent {
  category: string
  eventType: string
  actorEmail: string
  timestamp: string
  fabricTxId: string | null
  detail: string | null
}
interface CustodyGraph {
  docId: string
  fileName: string
  events: CustodyEvent[]
}

interface Props { docId: string; fileName: string; onClose: () => void }

const CAT: Record<string, { color: string; ring: string; Icon: typeof Upload }> = {
  UPLOAD:   { color: 'bg-[#1d6464]', ring: 'ring-[#1d6464]/20', Icon: Upload },
  ACCESS:   { color: 'bg-blue-500', ring: 'ring-blue-200', Icon: Eye },
  SHARE:    { color: 'bg-indigo-500', ring: 'ring-indigo-200', Icon: Share2 },
  SIGN:     { color: 'bg-emerald-600', ring: 'ring-emerald-200', Icon: PenTool },
  VERSION:  { color: 'bg-amber-500', ring: 'ring-amber-200', Icon: GitBranch },
  ROTATION: { color: 'bg-red-500', ring: 'ring-red-200', Icon: KeyRound },
  OTHER:    { color: 'bg-slate-400', ring: 'ring-slate-200', Icon: Dot },
}

export function ChainOfCustodyModal({ docId, fileName, onClose }: Props) {
  const [graph, setGraph] = useState<CustodyGraph | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<CustodyEvent | null>(null)

  useEffect(() => {
    api.get<CustodyGraph>(`/documents/${docId}/custody`)
      .then((r) => setGraph(r.data))
      .catch(() => setGraph(null))
      .finally(() => setLoading(false))
  }, [docId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <Network className="w-5 h-5 text-[#1d6464] shrink-0" />
            <div className="min-w-0">
              <h2 className="font-heading font-semibold text-text-primary truncate">Chain of Custody</h2>
              <p className="text-xs text-text-muted truncate">{fileName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-muted rounded-lg"><X className="w-4 h-4 text-text-muted" /></button>
        </div>

        <div className="p-5 overflow-y-auto scrollbar-thin flex-1">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#1d6464]" /></div>
          ) : !graph || graph.events.length === 0 ? (
            <p className="text-sm text-text-muted py-6 text-center">No custody events recorded yet.</p>
          ) : (
            <div className="flex gap-4">
              <ol className="relative border-l-2 border-border ml-2 space-y-3 flex-1">
                {graph.events.map((e, i) => {
                  const c = CAT[e.category] ?? CAT.OTHER
                  const Icon = c.Icon
                  return (
                    <li key={i} className="ml-5">
                      <span className={`absolute -left-[13px] w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white ${c.color}`}>
                        <Icon className="w-3.5 h-3.5 text-white" />
                      </span>
                      <button onClick={() => setSelected(e)}
                        className={`text-left w-full rounded-xl border px-3 py-2 hover:border-[#1d6464]/40 ${selected === e ? 'border-[#1d6464] ring-2 ring-[#1d6464]/20' : 'border-border'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-text-primary">{e.eventType.replace(/_/g, ' ')}</span>
                          <span className="text-[10px] text-text-muted">{new Date(e.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-text-muted">{e.actorEmail}{e.fabricTxId && <span className="ml-2 font-mono text-[#1d6464]">tx {e.fabricTxId.slice(0, 10)}…</span>}</p>
                      </button>
                    </li>
                  )
                })}
              </ol>
              {selected && (
                <div className="w-64 shrink-0 self-start rounded-xl border border-border p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">{selected.category}</p>
                  <p className="font-medium text-text-primary text-sm mt-0.5">{selected.eventType.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-text-muted mt-1">{selected.actorEmail}</p>
                  <p className="text-xs text-text-muted">{new Date(selected.timestamp).toLocaleString()}</p>
                  {selected.fabricTxId && <p className="text-[11px] font-mono text-[#1d6464] mt-1 break-all">tx {selected.fabricTxId}</p>}
                  {selected.detail && <pre className="text-[10px] text-text-secondary mt-2 whitespace-pre-wrap break-all bg-surface-muted rounded-lg p-2">{selected.detail}</pre>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
