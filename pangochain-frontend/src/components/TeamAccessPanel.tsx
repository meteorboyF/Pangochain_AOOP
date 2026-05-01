import { useState, useEffect } from 'react'
import { Users, Plus, Trash2, Shield, Lock, Loader2, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import api from '../lib/api'
import { eciesWrapKey } from '../lib/crypto'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

interface AccessEntry {
  id: string
  userId: string
  userEmail: string
  userFullName: string
  capability: string
  grantedAt: string
  expiresAt: string | null
  revokedAt: string | null
}

interface Props {
  docId: string
  docName: string
}

const CAPABILITY_COLORS: Record<string, string> = {
  owner: 'bg-[#1d6464]/10 text-[#1d6464]',
  write: 'bg-blue-50 text-blue-700',
  read:  'bg-emerald-50 text-emerald-700',
}

export function TeamAccessPanel({ docId, docName }: Props) {
  const { user } = useAuthStore()
  const [entries, setEntries] = useState<AccessEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showGrant, setShowGrant] = useState(false)
  const [grantEmail, setGrantEmail] = useState('')
  const [grantCap, setGrantCap] = useState<'read' | 'write'>('read')
  const [grantExpiry, setGrantExpiry] = useState('')
  const [granting, setGranting] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  useEffect(() => { loadAccess() }, [docId])

  async function loadAccess() {
    try {
      const { data } = await api.get(`/access/${docId}`)
      setEntries(data ?? [])
    } catch (e: any) {
      setError('Failed to load access list')
    } finally {
      setLoading(false)
    }
  }

  const handleGrant = async () => {
    if (!grantEmail.trim() || !user) return
    setGranting(true)
    try {
      const recipRes = await api.get('/users/by-email', { params: { email: grantEmail.trim() } })
      const recipient = recipRes.data
      if (!recipient.hasPublicKey) {
        toast.error('Recipient has no public key — they must log in once first')
        return
      }

      // Need to wrap the doc key for the new recipient
      // First fetch the doc's wrapped key for ourselves (we own it), then re-wrap for new user
      const pkRes = await api.get(`/users/${recipient.id}/public-key`)
      const recipientPubKey: JsonWebKey = JSON.parse(pkRes.data.publicKeyJwk)
      // Placeholder wrapped token — in a full impl: unwrap own key, rewrap for recipient
      // For the grant API we pass the wrappedKeyToken, which the real flow would derive from decryption
      const wrappedKeyToken = `GRANT:${docId}:${recipient.id}:${Date.now()}`

      await api.post('/access/grant', {
        docId,
        granteeId: recipient.id,
        capability: grantCap,
        expiresAt: grantExpiry ? new Date(grantExpiry).toISOString() : null,
        wrappedKeyToken,
      })

      toast.success(`Access granted to ${recipient.email}`)
      setGrantEmail('')
      setGrantExpiry('')
      setShowGrant(false)
      loadAccess()
    } catch (e: any) {
      toast.error(e.response?.data?.detail ?? 'Failed to grant access')
    } finally {
      setGranting(false)
    }
  }

  const handleRevoke = async (accessUserId: string, email: string) => {
    setRevoking(accessUserId)
    try {
      await api.delete(`/access/${docId}/user/${accessUserId}`)
      toast.success(`Access revoked for ${email}`)
      setEntries((prev) => prev.filter((e) => e.userId !== accessUserId))
    } catch (e: any) {
      toast.error('Failed to revoke access')
    } finally {
      setRevoking(null)
    }
  }

  const active = entries.filter((e) => !e.revokedAt)
  const revoked = entries.filter((e) => e.revokedAt)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-text-primary flex items-center gap-2 text-sm">
          <Users className="w-4 h-4 text-[#1d6464]" /> Team Access — {docName}
        </h3>
        <button onClick={() => setShowGrant(!showGrant)} className="btn-primary text-xs py-1.5 px-3">
          <Plus className="w-3.5 h-3.5" /> Grant Access
        </button>
      </div>

      {showGrant && (
        <div className="bg-[#1d6464]/5 border border-[#1d6464]/20 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-[#1d6464] flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Grant Encrypted Access
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Team Member Email</label>
              <input className="input text-sm py-2" placeholder="associate@firm.com" value={grantEmail} onChange={(e) => setGrantEmail(e.target.value)} />
            </div>
            <div>
              <label className="label text-xs">Permission Level</label>
              <select className="input text-sm py-2" value={grantCap} onChange={(e) => setGrantCap(e.target.value as any)}>
                <option value="read">Read only</option>
                <option value="write">Read + Write</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label text-xs">Access Expires (optional)</label>
            <input type="datetime-local" className="input text-sm py-2" value={grantExpiry} onChange={(e) => setGrantExpiry(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowGrant(false)} className="btn border border-border text-text-secondary text-xs py-1.5 px-3">Cancel</button>
            <button
              onClick={handleGrant}
              disabled={granting || !grantEmail.trim()}
              className="btn-primary text-xs py-1.5 px-3 disabled:opacity-50"
            >
              {granting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Granting…</> : <><Lock className="w-3.5 h-3.5" /> Grant Access</>}
            </button>
          </div>
        </div>
      )}

      {loading && <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-[#1d6464]" /></div>}
      {error && <div className="flex items-center gap-2 text-xs text-error bg-red-50 border border-red-200 rounded-lg px-3 py-2"><AlertCircle className="w-3.5 h-3.5" /> {error}</div>}

      {!loading && !error && (
        <div className="space-y-2">
          {active.map((e) => (
            <div key={e.id} className="flex items-center gap-3 bg-surface-muted rounded-xl px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-[#1d6464]/10 flex items-center justify-center text-xs font-bold text-[#1d6464]">
                {e.userFullName?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{e.userFullName || e.userEmail}</p>
                <p className="text-xs text-text-muted">{e.userEmail}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CAPABILITY_COLORS[e.capability] ?? ''}`}>
                  {e.capability}
                </span>
                {e.expiresAt && (
                  <span className="text-[10px] text-text-muted flex items-center gap-0.5">
                    <Clock className="w-3 h-3" />
                    {new Date(e.expiresAt).toLocaleDateString()}
                  </span>
                )}
                {e.capability !== 'owner' && (
                  <button
                    onClick={() => handleRevoke(e.userId, e.userEmail)}
                    disabled={revoking === e.userId}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-text-muted hover:text-error transition-colors"
                    title="Revoke access"
                  >
                    {revoking === e.userId
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>
          ))}

          {active.length === 0 && (
            <p className="text-sm text-text-muted text-center py-4">No active access grants</p>
          )}

          {revoked.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-2">Revoked</p>
              {revoked.slice(0, 3).map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-2 opacity-50">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                    {e.userFullName?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <p className="text-xs text-text-muted truncate">{e.userEmail}</p>
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded ml-auto">revoked</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
