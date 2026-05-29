import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  GitBranch, Plus, Loader2, AlertCircle, ArrowLeft, X, FileText, User as UserIcon, Calendar,
} from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'

interface Node {
  id: string
  caseId: string
  parentId: string | null
  mergeIntoId: string | null
  authorId: string | null
  authorName: string
  nodeType: string
  title: string
  description: string | null
  linkedDocId: string | null
  nodeDate: string
  createdAt: string
}

const TYPE_STYLE: Record<string, { dot: string; chip: string }> = {
  ROOT:     { dot: '#1E3A5F', chip: 'bg-[#1E3A5F]/10 text-[#1E3A5F]' },
  FINDING:  { dot: '#1d6464', chip: 'bg-[#1d6464]/10 text-[#1d6464]' },
  EVIDENCE: { dot: '#2563EB', chip: 'bg-blue-50 text-blue-700' },
  RESEARCH: { dot: '#6366F1', chip: 'bg-indigo-50 text-indigo-700' },
  LOOPHOLE: { dot: '#D97706', chip: 'bg-amber-50 text-amber-700' },
  HEARING:  { dot: '#DC2626', chip: 'bg-red-50 text-red-700' },
  FILING:   { dot: '#059669', chip: 'bg-emerald-50 text-emerald-700' },
}
const TYPES = ['FINDING', 'EVIDENCE', 'RESEARCH', 'LOOPHOLE', 'HEARING', 'FILING']

const NW = 210, NH = 76, GAP_X = 36, ROW = 150, PAD = 24

export default function CaseJourney() {
  const { id: caseId } = useParams<{ id: string }>()
  const [nodes, setNodes] = useState<Node[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Node | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  // add-node form
  const [title, setTitle] = useState('')
  const [nodeType, setNodeType] = useState('FINDING')
  const [description, setDescription] = useState('')
  const [parentId, setParentId] = useState('')
  const [mergeIntoId, setMergeIntoId] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    if (!caseId) return
    api.get<Node[]>(`/cases/${caseId}/nodes`)
      .then((r) => setNodes(r.data))
      .catch((e) => setError(e.response?.data?.detail ?? 'Failed to load journey'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [caseId])

  // ── Layout: assign each node a depth level (BFS via parentId), lay levels top→bottom.
  const { positions, width, height } = useMemo(() => {
    const byId = new Map(nodes.map((n) => [n.id, n]))
    const depth = new Map<string, number>()
    const getDepth = (n: Node, guard = 0): number => {
      if (depth.has(n.id)) return depth.get(n.id)!
      if (!n.parentId || !byId.has(n.parentId) || guard > 100) { depth.set(n.id, 0); return 0 }
      const d = getDepth(byId.get(n.parentId)!, guard + 1) + 1
      depth.set(n.id, d); return d
    }
    nodes.forEach((n) => getDepth(n))

    const levels = new Map<number, Node[]>()
    nodes.forEach((n) => {
      const d = depth.get(n.id) ?? 0
      if (!levels.has(d)) levels.set(d, [])
      levels.get(d)!.push(n)
    })

    const pos = new Map<string, { x: number; y: number }>()
    let maxCols = 0
    for (const [d, ns] of levels) {
      ns.sort((a, b) => new Date(a.nodeDate).getTime() - new Date(b.nodeDate).getTime())
      ns.forEach((n, i) => pos.set(n.id, { x: PAD + i * (NW + GAP_X), y: PAD + d * ROW }))
      maxCols = Math.max(maxCols, ns.length)
    }
    return {
      positions: pos,
      width: Math.max(maxCols * (NW + GAP_X) + PAD, 600),
      height: (levels.size || 1) * ROW + PAD,
    }
  }, [nodes])

  const center = (id: string) => {
    const p = positions.get(id)
    return p ? { x: p.x + NW / 2, y: p.y + NH / 2 } : null
  }

  const handleAdd = async () => {
    if (!title.trim() || !caseId) return
    setSaving(true)
    try {
      await api.post(`/cases/${caseId}/nodes`, {
        title: title.trim(), nodeType, description: description.trim() || null,
        parentId: parentId || null, mergeIntoId: mergeIntoId || null,
      })
      toast.success('Added to case journey')
      setShowAdd(false); setTitle(''); setDescription(''); setParentId(''); setMergeIntoId(''); setNodeType('FINDING')
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Could not add node')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#1d6464]" /></div>
  if (error) return (
    <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-error">
      <AlertCircle className="w-4 h-4" /> {error}
    </div>
  )

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <Link to={`/cases/${caseId}`} className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-[#1d6464] mb-2">
            <ArrowLeft className="w-4 h-4" /> Back to case
          </Link>
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-[#1d6464]" />
            <h1 className="font-heading text-2xl font-bold text-text-primary">Case Journey</h1>
          </div>
          <p className="text-text-muted text-sm mt-0.5">
            The branching record of findings, evidence and research — from case opening, converging on the hearing.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary shrink-0">
          <Plus className="w-4 h-4" /> Add Finding
        </button>
      </div>

      <div className="flex gap-4">
        {/* Graph */}
        <div className="card flex-1 overflow-auto">
          <div className="relative" style={{ width, height, minWidth: '100%' }}>
            <svg className="absolute inset-0 pointer-events-none" width={width} height={height}>
              {nodes.map((n) => {
                const c = center(n.id)
                if (!c) return null
                const elems = []
                if (n.parentId && center(n.parentId)) {
                  const p = center(n.parentId)!
                  elems.push(<line key={`p-${n.id}`} x1={p.x} y1={p.y + NH / 2} x2={c.x} y2={c.y - NH / 2}
                    stroke="#94a3b8" strokeWidth={1.5} />)
                }
                if (n.mergeIntoId && center(n.mergeIntoId)) {
                  const m = center(n.mergeIntoId)!
                  elems.push(<line key={`m-${n.id}`} x1={c.x} y1={c.y} x2={m.x} y2={m.y}
                    stroke="#DC2626" strokeWidth={1.5} strokeDasharray="5 4" opacity={0.6} />)
                }
                return elems
              })}
            </svg>
            {nodes.map((n) => {
              const p = positions.get(n.id)!
              const style = TYPE_STYLE[n.nodeType] ?? TYPE_STYLE.FINDING
              return (
                <button key={n.id} onClick={() => setSelected(n)}
                  className={`absolute text-left bg-white border rounded-xl p-3 shadow-card hover:shadow-card-hover transition-all hover:-translate-y-0.5 ${
                    selected?.id === n.id ? 'border-[#1d6464] ring-2 ring-[#1d6464]/20' : 'border-border'
                  }`}
                  style={{ left: p.x, top: p.y, width: NW, height: NH }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: style.dot }} />
                    <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${style.chip}`}>{n.nodeType}</span>
                  </div>
                  <p className="text-sm font-medium text-text-primary truncate">{n.title}</p>
                  <p className="text-[10px] text-text-muted truncate">{n.authorName} · {new Date(n.nodeDate).toLocaleDateString()}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="card w-80 shrink-0 self-start">
            <div className="flex items-start justify-between mb-2">
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${(TYPE_STYLE[selected.nodeType] ?? TYPE_STYLE.FINDING).chip}`}>{selected.nodeType}</span>
              <button onClick={() => setSelected(null)} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-text-muted flex items-center gap-1 mb-1"><Calendar className="w-3 h-3" /> {new Date(selected.nodeDate).toLocaleString()}</p>
            <h2 className="font-heading font-semibold text-text-primary">{selected.title}</h2>
            <p className="text-xs text-text-muted flex items-center gap-1 mt-1"><UserIcon className="w-3 h-3" /> {selected.authorName}</p>
            {selected.description && <p className="text-sm text-text-secondary mt-3 whitespace-pre-wrap">{selected.description}</p>}
            {selected.linkedDocId && (
              <Link to={`/documents/${selected.linkedDocId}`} className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#1d6464] hover:underline">
                <FileText className="w-3.5 h-3.5" /> Linked document
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold text-text-primary">Add to Case Journey</h2>
              <button onClick={() => setShowAdd(false)} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="label">Title *</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Found inconsistency in lease clause 7" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Type</label>
                <select className="input" value={nodeType} onChange={(e) => setNodeType(e.target.value)}>
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Branch from</label>
                <select className="input" value={parentId} onChange={(e) => setParentId(e.target.value)}>
                  <option value="">(root)</option>
                  {nodes.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Converges into (optional — draws a dashed merge edge)</label>
              <select className="input" value={mergeIntoId} onChange={(e) => setMergeIntoId(e.target.value)}>
                <option value="">(none)</option>
                {nodes.filter((n) => n.nodeType === 'HEARING' || n.nodeType === 'FILING').map((n) => (
                  <option key={n.id} value={n.id}>{n.title} ({n.nodeType})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Details</label>
              <textarea className="input min-h-[90px] resize-y" value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Finding, research note, evidence reference…" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowAdd(false)} className="btn border border-border text-text-secondary py-2 px-4">Cancel</button>
              <button onClick={handleAdd} disabled={saving || !title.trim()} className="btn-primary py-2 px-4 disabled:opacity-50">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</> : <><Plus className="w-4 h-4" /> Add</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
