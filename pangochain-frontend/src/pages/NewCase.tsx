import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, FolderOpen, Loader2 } from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'

const CASE_TYPES = [
  'Corporate M&A', 'Commercial Litigation', 'Intellectual Property',
  'Real Estate', 'Regulatory', 'Employment Law', 'Contract Dispute',
  'Corporate', 'Fintech Regulatory', 'Criminal Defense', 'Family Law', 'Other',
]

export default function NewCase() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [caseType, setCaseType] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/cases', { title, description, caseType: caseType || null })
      toast.success('Case created and registered on blockchain')
      navigate(`/cases/${data.id}`)
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Failed to create case')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/cases" className="p-2 rounded-lg hover:bg-surface-muted text-text-muted hover:text-text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">New Case</h1>
          <p className="text-text-muted text-sm">Registered on Hyperledger Fabric</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-5 pb-5 border-b border-border">
          <div className="w-10 h-10 rounded-xl bg-[#1d6464]/10 flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-[#1d6464]" />
          </div>
          <div>
            <p className="font-medium text-text-primary text-sm">Case Registration</p>
            <p className="text-text-muted text-xs">A blockchain transaction will be created for this case</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Case Title *</label>
            <input
              className="input"
              placeholder="e.g. Meridian Capital Partners — Series C Acquisition"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={500}
            />
          </div>

          <div>
            <label className="label">Case Type</label>
            <select
              className="input"
              value={caseType}
              onChange={(e) => setCaseType(e.target.value)}
            >
              <option value="">— Select type —</option>
              {CASE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="input min-h-[100px] resize-y"
              placeholder="Brief description of the matter…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
            />
          </div>

          {error && (
            <p className="text-sm text-error bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Link to="/cases" className="flex-1 btn border border-border text-text-secondary hover:bg-surface-muted py-2.5 justify-center">
              Cancel
            </Link>
            <button type="submit" disabled={loading || !title.trim()} className="flex-1 btn-primary py-2.5 justify-center disabled:opacity-50">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : 'Create Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
