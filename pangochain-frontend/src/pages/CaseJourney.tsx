import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitBranch, Plus, Loader2, AlertCircle, ArrowLeft, X, FileText, User as UserIcon, Calendar,
  GitMerge, Check
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
  merged: boolean
  mergedAt: string | null
}

interface Doc { id: string; fileName: string }

const TYPE_STYLE: Record<string, { dot: string; chip: string }> = {
  ROOT:     { dot: '#C9A84C', chip: 'bg-gold-500/10 text-gold-300 border border-gold-500/20' },
  FINDING:  { dot: '#1A5C4A', chip: 'bg-success/10 text-emerald-400 border border-success/30' },
  EVIDENCE: { dot: '#C9A84C', chip: 'bg-gold-500/10 text-gold-300 border border-gold-500/20' },
  RESEARCH: { dot: '#8A9BB0', chip: 'bg-slate-800/50 text-text-secondary border border-gold-500/10' },
  LOOPHOLE: { dot: '#8B1A1A', chip: 'bg-error/10 text-rose-400 border border-error/30' },
  HEARING:  { dot: '#C9A84C', chip: 'bg-gold-500/10 text-gold-300 border border-gold-500/20' },
  FILING:   { dot: '#1A5C4A', chip: 'bg-success/10 text-emerald-400 border border-success/30' },
}

const TYPES = ['FINDING', 'EVIDENCE', 'RESEARCH', 'LOOPHOLE', 'HEARING', 'FILING']

const toRoman = (num: number) => {
  const romanArray = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
  return romanArray[num] || (num + 1).toString()
}

export default function CaseJourney() {
  const { id: caseId } = useParams<{ id: string }>()
  const [nodes, setNodes] = useState<Node[]>([])
  const [docs, setDocs] = useState<Doc[]>([])
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
  const [linkedDocId, setLinkedDocId] = useState('')
  const [saving, setSaving] = useState(false)
  const [merging, setMerging] = useState(false)

  const load = () => {
    if (!caseId) return
    api.get<Node[]>(`/cases/${caseId}/nodes`)
      .then((r) => {
        // Sort chronologically
        const sorted = r.data.sort((a, b) => new Date(a.nodeDate).getTime() - new Date(b.nodeDate).getTime())
        setNodes(sorted)
      })
      .catch((e) => setError(e.response?.data?.detail ?? 'Failed to load journey'))
      .finally(() => setLoading(false))
  }
  
  useEffect(load, [caseId])

  useEffect(() => {
    if (!caseId) return
    api.get<Doc[]>(`/documents/by-case/${caseId}`)
      .then((r) => setDocs(r.data))
      .catch(() => setDocs([]))
  }, [caseId])

  const docName = (id: string | null) => (id ? docs.find((d) => d.id === id)?.fileName ?? 'document' : null)

  const handleConsolidate = async (target: Node) => {
    setMerging(true)
    try {
      const { data } = await api.post<Node[]>(`/cases/${caseId}/nodes/${target.id}/merge`)
      setNodes(data.sort((a, b) => new Date(a.nodeDate).getTime() - new Date(b.nodeDate).getTime()))
      setSelected(data.find((n) => n.id === target.id) ?? null)
      toast.success('Branch consolidated into ' + target.title)
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Could not consolidate')
    } finally {
      setMerging(false)
    }
  }

  const handleAdd = async () => {
    if (!title.trim() || !caseId) return
    setSaving(true)
    try {
      await api.post(`/cases/${caseId}/nodes`, {
        title: title.trim(),
        nodeType,
        description: description.trim() || null,
        parentId: parentId || null,
        mergeIntoId: mergeIntoId || null,
        linkedDocId: linkedDocId || null,
      })
      toast.success('Added to case journey')
      setShowAdd(false); setTitle(''); setDescription(''); setParentId(''); setMergeIntoId(''); setNodeType('FINDING'); setLinkedDocId('')
      load()
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Could not add node')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-gold-300">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 bg-error/10 border border-error/30 rounded-xl px-4 py-3 text-xs text-rose-400">
        <AlertCircle className="w-4 h-4 shrink-0" /> {error}
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in text-text-primary">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gold-500/10 pb-6">
        <div>
          <Link to={`/cases/${caseId}`} className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-gold-300 mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Return to Matter
          </Link>
          <div className="flex items-center gap-3">
            <GitBranch className="w-6 h-6 text-gold-400" />
            <h1 className="font-serif text-3xl font-bold tracking-wide text-gold-300">Evidentiary Journey</h1>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Chronological audit of findings, court filings, and milestones verified on Hyperledger.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-xs uppercase tracking-wider font-bold px-4 py-2.5">
          <Plus className="w-4 h-4" /> Add Milestone
        </button>
      </div>

      {/* Main timeline canvas */}
      <div className="card bg-navy-900/60 p-6 border-gold-500/10 relative overflow-hidden">
        
        {/* Horizontal timeline on Desktop, vertical on Mobile */}
        <div className="relative flex flex-col md:flex-row items-stretch md:items-center gap-12 md:gap-16 py-10 overflow-x-auto scrollbar-thin px-4">
          
          {/* Animated path line (Desktop) */}
          <div className="hidden md:block absolute left-8 right-8 top-1/2 h-0.5 bg-gold-500/10 -translate-y-1/2 z-0" />
          
          {/* Animated path line (Mobile) */}
          <div className="block md:hidden absolute left-10 top-8 bottom-8 w-0.5 bg-gold-500/10 z-0" />

          {nodes.map((node, index) => {
            const completed = !node.merged
            const typeStyle = TYPE_STYLE[node.nodeType] || TYPE_STYLE.FINDING
            const isSelected = selected?.id === node.id

            return (
              <div
                key={node.id}
                className="relative flex flex-col md:items-center z-10 shrink-0 cursor-pointer group"
                onClick={() => setSelected(node)}
              >
                {/* Milestone Node Badge */}
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-serif text-sm font-bold transition-all duration-300 select-none ${
                    completed
                      ? 'bg-gradient-to-br from-gold-600 via-gold-500 to-gold-400 text-navy-950 shadow-gold-md'
                      : 'bg-navy-950 border-2 border-gold-500/30 text-gold-300/60 hover:border-gold-500'
                  } ${isSelected ? 'ring-4 ring-gold-500/30 border-gold-400' : ''}`}
                >
                  {toRoman(index)}
                </motion.div>

                {/* Micro pulse indicator for active node */}
                {!node.merged && (
                  <span className="absolute top-0 right-0 md:right-1/3 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-gold-500"></span>
                  </span>
                )}

                {/* Node info box */}
                <div className="mt-4 md:text-center max-w-[150px] pl-16 md:pl-0">
                  <p className="font-serif text-xs font-bold text-gold-300 truncate group-hover:text-gold-100 transition-colors">
                    {node.title}
                  </p>
                  <p className="text-[9px] font-mono text-text-secondary mt-1">
                    {new Date(node.nodeDate).toLocaleDateString()}
                  </p>
                  <span className={`inline-block text-[8px] font-bold px-1.5 py-0.5 rounded uppercase mt-2 ${typeStyle.chip}`}>
                    {node.nodeType}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Expanded detail panel with Framer Motion */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="card bg-navy-900/60 border-gold-500/20 p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-[radial-gradient(circle_at_top_right,rgba(201,168,76,0.04),transparent_10rem)]" />
            
            <div className="flex items-start justify-between mb-4 border-b border-gold-500/5 pb-4">
              <div>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${(TYPE_STYLE[selected.nodeType] || TYPE_STYLE.FINDING).chip}`}>
                  {selected.nodeType}
                </span>
                <h2 className="font-serif text-2xl font-bold text-gold-300 mt-2">{selected.title}</h2>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-xl border border-gold-500/10 hover:border-gold-500/30 text-text-secondary hover:text-text-primary transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div className="md:col-span-2 space-y-4">
                <div className="text-xs text-text-secondary font-mono flex flex-wrap items-center gap-4">
                  <span className="flex items-center gap-1">
                    <UserIcon className="w-3.5 h-3.5 text-gold-400" /> Lodged by: {selected.authorName}
                  </span>
                  <span className="opacity-30">|</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gold-400" /> Event Date: {new Date(selected.nodeDate).toLocaleString()}
                  </span>
                </div>

                {selected.description && (
                  <p className="text-sm text-text-secondary leading-relaxed bg-navy-950/40 p-4 rounded-xl border border-gold-500/5 whitespace-pre-wrap">
                    {selected.description}
                  </p>
                )}

                {selected.linkedDocId && (
                  <div className="pt-2">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-2">LINKED EVIDENTIARY DEED</span>
                    <Link
                      to={`/documents`}
                      className="inline-flex items-center gap-2 rounded-xl border border-gold-500/15 bg-navy-950/60 px-4 py-2.5 text-xs text-gold-300 font-semibold hover:border-gold-500/30 hover:text-gold-200 transition-all"
                    >
                      <FileText className="w-4 h-4 text-gold-400" />
                      {docName(selected.linkedDocId)}
                    </Link>
                  </div>
                )}
              </div>

              {/* Merge / Consolidation utilities (Hearing/Filing specific) */}
              {(selected.nodeType === 'HEARING' || selected.nodeType === 'FILING') && (
                <div className="card bg-navy-950/40 border-gold-500/10 p-5 space-y-4">
                  <div className="flex items-center gap-1.5 pb-2 border-b border-gold-500/5">
                    <GitMerge className="w-4 h-4 text-gold-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-gold-300">Consolidation Matrix</span>
                  </div>
                  {(() => {
                    const contributors = nodes.filter((n) => n.mergeIntoId === selected.id)
                    const unmerged = contributors.filter((c) => !c.merged)
                    return (
                      <>
                        {contributors.length === 0 ? (
                          <p className="text-[10px] text-text-muted leading-relaxed italic">
                            No branches converge into this node yet. Connect findings to this target when adding milestones.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            <ul className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin pr-1">
                              {contributors.map((c) => (
                                <li key={c.id} className="flex items-center justify-between text-xs font-mono">
                                  <span className="truncate max-w-[140px] text-text-secondary">{c.title}</span>
                                  {c.merged ? (
                                    <span className="text-[9px] text-emerald-400 bg-success/15 px-1.5 py-0.5 rounded border border-success/30">CONSOLIDATED</span>
                                  ) : (
                                    <span className="text-[9px] text-gold-300 bg-gold-500/10 px-1.5 py-0.5 rounded border border-gold-500/20">PENDING</span>
                                  )}
                                </li>
                              ))}
                            </ul>

                            <button
                              onClick={() => handleConsolidate(selected)}
                              disabled={merging || unmerged.length === 0}
                              className="btn-primary w-full py-2.5 text-xs font-bold uppercase tracking-wider shrink-0"
                            >
                              {merging ? (
                                <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Consolidating...</>
                              ) : unmerged.length === 0 ? (
                                <><Check className="w-3.5 h-3.5 mr-1" /> Bound Consolidated</>
                              ) : (
                                <><GitMerge className="w-3.5 h-3.5 mr-1.5" /> Consolidate {unmerged.length} Nodes</>
                              )}
                            </button>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add milestone Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-lg bg-navy-900 border-gold-500/20 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gold-500/10 pb-3">
              <h2 className="font-serif text-xl font-bold text-gold-300">Add Milestone Entry</h2>
              <button
                onClick={() => setShowAdd(false)}
                className="p-1 rounded-lg border border-gold-500/10 text-text-secondary hover:text-text-primary hover:border-gold-500/30 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="label">Milestone Title *</label>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Discovered evidence chain breach in server logs" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Milestone Classification</label>
                  <select className="input" value={nodeType} onChange={(e) => setNodeType(e.target.value)}>
                    {TYPES.map((t) => <option key={t} value={t} className="bg-navy-950">{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Branch From node</label>
                  <select className="input" value={parentId} onChange={(e) => setParentId(e.target.value)}>
                    <option value="" className="bg-navy-950">(root mat)</option>
                    {nodes.map((n) => <option key={n.id} value={n.id} className="bg-navy-950">{n.title}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Merge Into target (optional)</label>
                  <select className="input" value={mergeIntoId} onChange={(e) => setMergeIntoId(e.target.value)}>
                    <option value="" className="bg-navy-950">(none)</option>
                    {nodes.filter((n) => n.nodeType === 'HEARING' || n.nodeType === 'FILING').map((n) => (
                      <option key={n.id} value={n.id} className="bg-navy-950">{n.title} ({n.nodeType})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Evidentiary doc link (optional)</label>
                  <select className="input" value={linkedDocId} onChange={(e) => setLinkedDocId(e.target.value)}>
                    <option value="" className="bg-navy-950">(none)</option>
                    {docs.map((d) => <option key={d.id} value={d.id} className="bg-navy-950">{d.fileName}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Briefing / Audit Notes</label>
                <textarea className="input min-h-[90px] resize-y" value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Record summary of evidence, depositions details..." />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-gold-500/10">
              <button onClick={() => setShowAdd(false)} className="btn-secondary text-xs uppercase tracking-wider py-2 px-4">Cancel</button>
              <button onClick={handleAdd} disabled={saving || !title.trim()} className="btn-primary text-xs uppercase tracking-wider font-bold py-2.5 px-4 disabled:opacity-50">
                {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Submitting...</> : 'Log Milestone'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
