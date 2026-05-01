import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Send, Lock, Loader2, AlertCircle, Eye, EyeOff, Key, CheckCircle, ChevronDown } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { encryptDocument, eciesWrapKey, eciesUnwrapKey, bytesToBase64, base64ToBytes, loadWrappedPrivateKey, unwrapPrivateKey } from '../lib/crypto'
import api from '../lib/api'
import toast from 'react-hot-toast'

interface MessageDto {
  id: string
  senderId: string
  senderEmail: string
  senderName: string
  recipientId: string
  recipientEmail: string
  encryptedPayload: string
  wrappedKeyToken: string
  readAt: string | null
  createdAt: string
}

interface DecryptedState {
  [id: string]: { text: string; loading: boolean; error: string }
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
  const [decrypted, setDecrypted] = useState<DecryptedState>({})
  const [password, setPassword] = useState('')
  const [passwordUnlocked, setPasswordUnlocked] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [showPasswordPanel, setShowPasswordPanel] = useState(false)
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get('/messages')
        setMessages(data.content ?? [])
        await api.post('/messages/mark-read').catch(() => {})
      } catch (err: any) {
        setError(err.response?.data?.detail ?? 'Failed to load messages')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleUnlockKey = async () => {
    if (!password || !user) return
    setUnlocking(true)
    try {
      const stored = loadWrappedPrivateKey(user.id)
      if (!stored) throw new Error('No private key found — please re-register or re-login')
      const key = await unwrapPrivateKey(password, stored.saltB64, stored.ivB64, stored.encryptedB64)
      setPrivateKey(key)
      setPasswordUnlocked(true)
      setShowPasswordPanel(false)
      toast.success('Private key unlocked — messages can now be decrypted')
    } catch {
      toast.error('Wrong password or corrupted key')
    } finally {
      setUnlocking(false)
    }
  }

  const handleDecrypt = async (msg: MessageDto) => {
    if (!privateKey) {
      setShowPasswordPanel(true)
      return
    }
    setDecrypted((d) => ({ ...d, [msg.id]: { text: '', loading: true, error: '' } }))
    try {
      const docKeyB64 = await eciesUnwrapKey(privateKey, msg.wrappedKeyToken)
      const fullBytes = base64ToBytes(msg.encryptedPayload)
      const iv = fullBytes.slice(0, 12)
      const ciphertext = fullBytes.slice(12)
      const cryptoKey = await window.crypto.subtle.importKey(
        'raw', base64ToBytes(docKeyB64).buffer as ArrayBuffer,
        { name: 'AES-GCM', length: 256 }, false, ['decrypt'],
      )
      const plainBuf = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
        cryptoKey,
        ciphertext.buffer as ArrayBuffer,
      )
      const text = new TextDecoder().decode(plainBuf)
      setDecrypted((d) => ({ ...d, [msg.id]: { text, loading: false, error: '' } }))
    } catch (err: any) {
      setDecrypted((d) => ({ ...d, [msg.id]: { text: '', loading: false, error: 'Decryption failed — message not addressed to you?' } }))
    }
  }

  const handleSend = async () => {
    if (!composeTo.trim() || !composeBody.trim()) return
    setSending(true)
    try {
      const recipientRes = await api.get('/users/by-email', { params: { email: composeTo.trim() } })
      const recipient = recipientRes.data
      if (!recipient.hasPublicKey) {
        toast.error('Recipient has no public key — they must log in once first')
        return
      }

      const enc = new TextEncoder()
      const plainBytes = enc.encode(composeBody.trim()).buffer as ArrayBuffer
      const encrypted = await encryptDocument(plainBytes)

      const pkRes = await api.get(`/users/${recipient.id}/public-key`)
      const recipientPubKey: JsonWebKey = JSON.parse(pkRes.data.publicKeyJwk)
      const wrappedKeyToken = await eciesWrapKey(recipientPubKey, encrypted.keyB64)

      const ivBytes = Array.from(base64ToBytes(encrypted.ivB64))
      const ctBytes = Array.from(base64ToBytes(encrypted.ciphertextB64))
      const combined = new Uint8Array([...ivBytes, ...ctBytes])
      const encryptedPayload = bytesToBase64(combined)

      await api.post('/messages', { recipientId: recipient.id, encryptedPayload, wrappedKeyToken })

      // Reload messages
      const { data } = await api.get('/messages')
      setMessages(data.content ?? [])

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

  const grouped = messages.reduce<Record<string, MessageDto[]>>((acc, m) => {
    const other = m.senderId === user?.id ? m.recipientEmail : m.senderEmail
    if (!acc[other]) acc[other] = []
    acc[other].push(m)
    return acc
  }, {})

  const conversations = Object.entries(grouped).sort(
    ([, a], [, b]) => new Date(b[b.length - 1].createdAt).getTime() - new Date(a[a.length - 1].createdAt).getTime()
  )

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Messages</h1>
          <p className="text-text-muted text-sm mt-0.5">End-to-end encrypted · AES-256-GCM + ECIES P-256</p>
        </div>
        <div className="flex items-center gap-2">
          {!passwordUnlocked && (
            <button
              onClick={() => setShowPasswordPanel(!showPasswordPanel)}
              className="btn border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 py-2 px-3 text-sm"
            >
              <Key className="w-4 h-4" /> Unlock Key
            </button>
          )}
          {passwordUnlocked && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg font-medium">
              <CheckCircle className="w-3.5 h-3.5" /> Key unlocked
            </div>
          )}
          <button onClick={() => setShowCompose(!showCompose)} className="btn-primary">
            <MessageSquare className="w-4 h-4" /> New Message
          </button>
        </div>
      </div>

      {/* Key unlock panel */}
      {showPasswordPanel && !passwordUnlocked && (
        <div className="card border border-amber-200 bg-amber-50/50">
          <div className="flex items-center gap-2 mb-3">
            <Key className="w-4 h-4 text-amber-600" />
            <p className="font-medium text-amber-800 text-sm">Unlock your private key to decrypt messages</p>
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              className="input flex-1"
              placeholder="Your account password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlockKey()}
            />
            <button
              onClick={handleUnlockKey}
              disabled={unlocking || !password}
              className="btn-primary py-2 px-4 disabled:opacity-50"
            >
              {unlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Unlock'}
            </button>
          </div>
          <p className="text-xs text-amber-700 mt-2">Your password never leaves this browser. Used only for PBKDF2 key derivation.</p>
        </div>
      )}

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
              <input
                className="input"
                placeholder="recipient@firm.com or client@email.com"
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Message</label>
              <textarea
                className="input min-h-[120px] resize-y"
                placeholder="Your message is encrypted in this browser before sending…"
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-text-muted bg-surface-muted rounded-lg px-3 py-2">
              <Lock className="w-3 h-3 text-[#1d6464] shrink-0" />
              AES-256-GCM encrypted in browser · ECIES P-256 key wrap · plaintext never transmitted
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCompose(false)} className="btn border border-border text-text-secondary py-2 px-4">Cancel</button>
              <button
                onClick={handleSend}
                disabled={sending || !composeTo.trim() || !composeBody.trim()}
                className="btn-primary py-2 px-4 disabled:opacity-50"
              >
                {sending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Encrypting…</>
                  : <><Send className="w-4 h-4" /> Send Encrypted</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading / error / empty */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#1d6464]" />
        </div>
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
          <p className="text-text-muted text-sm mt-1">All messages are end-to-end encrypted. Start a conversation with a colleague or client.</p>
        </div>
      )}

      {/* Conversation threads */}
      {!loading && !error && conversations.length > 0 && (
        <div className="space-y-3">
          {conversations.map(([otherEmail, msgs]) => {
            const unread = msgs.filter((m) => m.senderId !== user?.id && !m.readAt).length
            const latest = msgs[msgs.length - 1]
            const isExpanded = expandedId === otherEmail

            return (
              <div key={otherEmail} className="card">
                {/* Conversation header */}
                <button
                  className="w-full flex items-center justify-between"
                  onClick={() => setExpandedId(isExpanded ? null : otherEmail)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1d6464]/10 flex items-center justify-center text-[#1d6464] font-bold text-sm">
                      {otherEmail[0].toUpperCase()}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-text-primary text-sm">{otherEmail}</p>
                        {unread > 0 && (
                          <span className="text-[10px] bg-[#1d6464] text-white font-bold px-1.5 py-0.5 rounded-full">{unread}</span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted">{msgs.length} message{msgs.length !== 1 ? 's' : ''} · {new Date(latest.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-[10px] text-[#1d6464] font-semibold bg-[#1d6464]/10 px-2 py-0.5 rounded">
                      <Lock className="w-3 h-3" /> E2E
                    </div>
                    <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* Messages in thread */}
                {isExpanded && (
                  <div className="mt-4 space-y-3 border-t border-border pt-4">
                    {msgs.map((m) => {
                      const isOwn = m.senderId === user?.id
                      const dec = decrypted[m.id]
                      return (
                        <div key={m.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${isOwn ? 'bg-[#1d6464] text-white' : 'bg-surface-muted'}`}>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className={`text-[10px] font-semibold ${isOwn ? 'text-white/70' : 'text-text-muted'}`}>
                                {isOwn ? 'You' : m.senderName || m.senderEmail}
                              </span>
                              <span className={`text-[10px] ${isOwn ? 'text-white/50' : 'text-text-muted'}`}>
                                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            {dec?.loading && (
                              <div className="flex items-center gap-2 text-sm">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Decrypting…
                              </div>
                            )}
                            {dec?.text && (
                              <p className={`text-sm whitespace-pre-wrap ${isOwn ? 'text-white' : 'text-text-primary'}`}>{dec.text}</p>
                            )}
                            {dec?.error && (
                              <p className="text-xs text-red-400">{dec.error}</p>
                            )}
                            {!dec && (
                              <div className="space-y-1.5">
                                <p className={`font-mono text-[10px] break-all ${isOwn ? 'text-white/50' : 'text-text-muted'}`}>
                                  {m.encryptedPayload.slice(0, 40)}…
                                </p>
                                <button
                                  onClick={() => handleDecrypt(m)}
                                  className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
                                    isOwn
                                      ? 'bg-white/20 text-white hover:bg-white/30'
                                      : 'bg-[#1d6464]/10 text-[#1d6464] hover:bg-[#1d6464]/20'
                                  }`}
                                >
                                  {passwordUnlocked ? <Eye className="w-3.5 h-3.5" /> : <Key className="w-3.5 h-3.5" />}
                                  {passwordUnlocked ? 'Decrypt' : 'Unlock key first'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {/* Quick reply */}
                    <div className="pt-2 border-t border-border flex gap-2">
                      <input
                        className="input flex-1 text-sm py-2"
                        placeholder={`Reply to ${otherEmail}…`}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            setComposeTo(otherEmail)
                            setComposeBody((e.target as HTMLInputElement).value)
                            ;(e.target as HTMLInputElement).value = ''
                            setShowCompose(true)
                          }
                        }}
                      />
                      <button
                        onClick={() => { setComposeTo(otherEmail); setShowCompose(true) }}
                        className="btn border border-[#1d6464] text-[#1d6464] hover:bg-[#1d6464]/10 py-2 px-3 text-sm"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
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
