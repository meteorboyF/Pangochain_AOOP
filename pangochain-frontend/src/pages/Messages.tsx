import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Send, Lock, Loader2, AlertCircle, Search } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { encryptDocument, eciesWrapKey, bytesToBase64 } from '../lib/crypto'
import api from '../lib/api'
import toast from 'react-hot-toast'

interface MessageDto {
  id: string
  senderId: string
  senderEmail: string
  recipientId: string
  encryptedPayload: string
  wrappedKeyToken: string
  readAt: string | null
  createdAt: string
}

export default function Messages() {
  const { user } = useAuthStore()
  const [messages, setMessages] = useState<MessageDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [composeTo, setComposeTo] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [sending, setSending] = useState(false)
  const [showCompose, setShowCompose] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get('/messages')
        setMessages(data.content ?? [])
        // Mark all as read
        await api.post('/messages/mark-read').catch(() => {})
      } catch (err: any) {
        setError(err.response?.data?.detail ?? 'Failed to load messages')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSend = async () => {
    if (!composeTo.trim() || !composeBody.trim()) return
    setSending(true)
    try {
      // Lookup recipient
      const recipientRes = await api.get('/users/by-email', { params: { email: composeTo.trim() } })
      const recipient = recipientRes.data
      if (!recipient.hasPublicKey) {
        toast.error('Recipient has no public key — they must log in once first')
        return
      }

      // Encrypt message body in browser
      const enc = new TextEncoder()
      const plainBytes = enc.encode(composeBody.trim()).buffer as ArrayBuffer
      const encrypted = await encryptDocument(plainBytes)

      // Wrap key with recipient's public key
      const pkRes = await api.get(`/users/${recipient.id}/public-key`)
      const recipientPubKey: JsonWebKey = JSON.parse(pkRes.data.publicKeyJwk)
      const wrappedKeyToken = await eciesWrapKey(recipientPubKey, encrypted.keyB64)

      // Combine IV + ciphertext for payload
      const ivBytes = atob(encrypted.ivB64).split('').map((c) => c.charCodeAt(0))
      const ctBytes = atob(encrypted.ciphertextB64).split('').map((c) => c.charCodeAt(0))
      const combined = new Uint8Array([...ivBytes, ...ctBytes])
      const encryptedPayload = bytesToBase64(combined)

      await api.post('/messages', {
        recipientId: recipient.id,
        encryptedPayload,
        wrappedKeyToken,
      })

      toast.success('Encrypted message sent')
      setComposeTo('')
      setComposeBody('')
      setShowCompose(false)
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? err.message ?? 'Send failed')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Messages</h1>
          <p className="text-text-muted text-sm mt-0.5">End-to-end encrypted · AES-256-GCM + ECIES P-256</p>
        </div>
        <button onClick={() => setShowCompose(!showCompose)} className="btn-primary">
          <MessageSquare className="w-4 h-4" /> New Message
        </button>
      </div>

      {/* Compose */}
      {showCompose && (
        <div className="card border-2 border-[#1d6464]/20">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-[#1d6464]" />
            <p className="font-medium text-text-primary text-sm">Compose Encrypted Message</p>
          </div>
          <div className="space-y-3">
            <div>
              <label className="label">To (email)</label>
              <input className="input" placeholder="colleague@firm.com" value={composeTo} onChange={(e) => setComposeTo(e.target.value)} />
            </div>
            <div>
              <label className="label">Message</label>
              <textarea
                className="input min-h-[100px] resize-y"
                placeholder="Your message is encrypted in this browser before sending…"
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCompose(false)} className="btn border border-border text-text-secondary py-2 px-4">Cancel</button>
              <button
                onClick={handleSend}
                disabled={sending || !composeTo.trim() || !composeBody.trim()}
                className="btn-primary py-2 px-4 disabled:opacity-50"
              >
                {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Encrypting…</> : <><Send className="w-4 h-4" /> Send</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message list */}
      {loading && (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1d6464]" /></div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-error">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {!loading && !error && messages.length === 0 && (
        <div className="text-center py-16">
          <Lock className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="font-heading font-semibold text-text-primary">No messages yet</p>
          <p className="text-text-muted text-sm mt-1">All messages are end-to-end encrypted.</p>
        </div>
      )}

      {!loading && !error && messages.length > 0 && (
        <div className="space-y-3">
          {messages.map((m) => {
            const isOwn = m.senderId === user?.id
            return (
              <div key={m.id} className={`card ${isOwn ? 'border-[#1d6464]/20' : ''}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isOwn ? 'bg-[#1d6464] text-white' : 'bg-surface-muted text-text-secondary'}`}>
                      {m.senderEmail[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{m.senderEmail}</p>
                      <p className="text-[10px] text-text-muted">{new Date(m.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-[#1d6464] font-semibold bg-[#1d6464]/10 px-2 py-0.5 rounded">
                    <Lock className="w-3 h-3" /> Encrypted
                  </div>
                </div>
                <div className="bg-surface-muted rounded-lg px-3 py-2 font-mono text-xs text-text-muted break-all">
                  {m.encryptedPayload.slice(0, 64)}…
                  <span className="ml-1 text-[10px] text-[#1d6464]">[decrypt with private key to read]</span>
                </div>
                {!m.readAt && !isOwn && (
                  <div className="mt-2">
                    <span className="text-[10px] bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded">Unread</span>
                  </div>
                )}
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}
