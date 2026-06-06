import { useEffect, useRef, useState } from 'react'
import { Hash, Briefcase, Send, Lock, Loader2, MessageSquare, Wifi, WifiOff, Plus, User as UserIcon, X } from 'lucide-react'
import type { Client, StompSubscription } from '@stomp/stompjs'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'
import { createChatClient } from '../lib/chatSocket'
import toast from 'react-hot-toast'

interface ConversationDto {
  id: string
  type: 'CASE' | 'FIRM' | 'DIRECT'
  title: string
  caseId: string | null
  memberCount: number
  lastMessagePreview: string | null
  lastMessageAt: string | null
}

interface ChatMessageDto {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  body: string
  createdAt: string
}

interface DirectoryEntry {
  id: string
  fullName: string
  email: string
  role: string
  hasPublicKey: boolean
}

const convIcon = (type: ConversationDto['type']) =>
  type === 'FIRM' ? Hash : type === 'DIRECT' ? UserIcon : Briefcase

export default function Chat() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.accessToken)

  const [conversations, setConversations] = useState<ConversationDto[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessageDto[]>([])
  const [input, setInput] = useState('')
  const [connected, setConnected] = useState(false)
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [sending, setSending] = useState(false)

  // New direct-message picker
  const [showPicker, setShowPicker] = useState(false)
  const [directory, setDirectory] = useState<DirectoryEntry[]>([])
  const [dirLoading, setDirLoading] = useState(false)
  const [dirSearch, setDirSearch] = useState('')

  const clientRef = useRef<Client | null>(null)
  const subRef = useRef<StompSubscription | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load channel list
  useEffect(() => {
    api.get<ConversationDto[]>('/chat/conversations')
      .then((r) => {
        setConversations(r.data)
        if (r.data.length > 0) setActiveId((prev) => prev ?? r.data[0].id)
      })
      .catch(() => toast.error('Could not load conversations'))
      .finally(() => setLoadingConvs(false))
  }, [])

  // Open the STOMP connection once
  useEffect(() => {
    if (!token) return
    const client = createChatClient(token, {
      onConnect: () => setConnected(true),
      onDisconnect: () => setConnected(false),
    })
    clientRef.current = client
    return () => { client.deactivate(); clientRef.current = null }
  }, [token])

  // When the active conversation or connection changes: load history + subscribe
  useEffect(() => {
    if (!activeId) return
    setLoadingMsgs(true)
    api.get<ChatMessageDto[]>(`/chat/conversations/${activeId}/messages`)
      .then((r) => setMessages(r.data))
      .catch(() => setMessages([]))
      .finally(() => setLoadingMsgs(false))
    api.post(`/chat/conversations/${activeId}/read`).catch(() => {})

    const client = clientRef.current
    if (client && connected) {
      subRef.current?.unsubscribe()
      subRef.current = client.subscribe(`/topic/conversations/${activeId}`, (frame) => {
        try {
          const msg: ChatMessageDto = JSON.parse(frame.body)
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
        } catch { /* ignore malformed frame */ }
      })
    }
    return () => { subRef.current?.unsubscribe(); subRef.current = null }
  }, [activeId, connected])

  // Auto-scroll to newest
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const active = conversations.find((c) => c.id === activeId) ?? null

  const openPicker = () => {
    setShowPicker(true)
    if (directory.length === 0) {
      setDirLoading(true)
      api.get<DirectoryEntry[]>('/users/firm-directory')
        .then((r) => setDirectory(r.data))
        .catch(() => toast.error('Could not load your firm directory'))
        .finally(() => setDirLoading(false))
    }
  }

  const startDirect = async (userId: string) => {
    try {
      const { data } = await api.post<ConversationDto>('/chat/direct', { userId })
      setConversations((prev) => (prev.some((c) => c.id === data.id) ? prev : [data, ...prev]))
      setActiveId(data.id)
      setShowPicker(false)
      setDirSearch('')
    } catch {
      toast.error('Could not start the conversation')
    }
  }

  const filteredDirectory = directory.filter(
    (d) =>
      d.fullName.toLowerCase().includes(dirSearch.toLowerCase()) ||
      d.email.toLowerCase().includes(dirSearch.toLowerCase()),
  )

  const handleSend = async () => {
    const body = input.trim()
    if (!body || !activeId) return
    setSending(true)
    try {
      // The server broadcasts to the topic, so the message arrives back via the
      // subscription — no optimistic insert needed (dedupe guards against doubles).
      await api.post(`/chat/conversations/${activeId}/messages`, { body })
      setInput('')
    } catch {
      toast.error('Message failed to send')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Team Chat</h1>
          <p className="text-text-muted text-sm mt-0.5">Real-time channels for your cases and firm</p>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${
          connected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
        }`}>
          {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          {connected ? 'Live' : 'Connecting…'}
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[18rem_1fr] gap-4">
        {/* Channel list */}
        <div className="bg-white/95 border border-border rounded-2xl overflow-y-auto scrollbar-thin flex flex-col">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border sticky top-0 bg-white/95 z-10">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">Channels</span>
            <button onClick={openPicker} title="New direct message"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#1d6464] hover:bg-[#1d6464]/10 rounded-lg px-2 py-1">
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>
          {loadingConvs ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-[#1d6464]" /></div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-10 px-4">
              <MessageSquare className="w-10 h-10 text-text-muted mx-auto mb-3" />
              <p className="text-sm font-semibold text-text-primary">No channels yet</p>
              <p className="text-xs text-text-muted mt-1">You'll see a channel here once you're added to a case.</p>
            </div>
          ) : (
            <ul className="p-2 space-y-0.5">
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setActiveId(c.id)}
                    className={`w-full text-left rounded-xl px-3 py-2.5 transition-colors ${
                      activeId === c.id ? 'bg-[#1d6464]/10' : 'hover:bg-surface-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {(() => { const Icon = convIcon(c.type); return <Icon className="w-4 h-4 text-[#1d6464] shrink-0" /> })()}
                      <span className="font-medium text-text-primary text-sm truncate flex-1">{c.title}</span>
                    </div>
                    {c.lastMessagePreview && (
                      <p className="text-xs text-text-muted truncate mt-0.5 pl-6">{c.lastMessagePreview}</p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Message pane */}
        <div className="bg-white/95 border border-border rounded-2xl flex flex-col min-h-0">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
              Select a channel to start chatting
            </div>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {(() => { const Icon = convIcon(active.type); return <Icon className="w-4 h-4 text-[#1d6464]" /> })()}
                  <span className="font-semibold text-text-primary">{active.title}</span>
                  <span className="text-xs text-text-muted">
                    · {active.type === 'DIRECT' ? 'Direct message' : `${active.memberCount} members`}
                  </span>
                </div>
                <span className="flex items-center gap-1 text-[10px] text-[#1d6464] font-semibold bg-[#1d6464]/10 px-2 py-0.5 rounded">
                  <Lock className="w-3 h-3" /> Encrypted at rest
                </span>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-3">
                {loadingMsgs ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-[#1d6464]" /></div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-sm text-text-muted py-10">No messages yet — say hello.</p>
                ) : (
                  messages.map((m) => {
                    const own = m.senderId === user?.id
                    return (
                      <div key={m.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${own ? 'bg-[#1d6464] text-white' : 'bg-surface-muted text-text-primary'}`}>
                          {!own && <p className="text-[11px] font-semibold text-[#1d6464] mb-0.5">{m.senderName}</p>}
                          <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                          <p className={`text-[10px] mt-1 ${own ? 'text-white/60' : 'text-text-muted'}`}>
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <div className="px-4 py-3 border-t border-border flex gap-2">
                <input
                  className="input flex-1"
                  placeholder={`Message ${active.title}…`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                />
                <button onClick={handleSend} disabled={sending || !input.trim()} className="btn-primary px-4 disabled:opacity-50">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New direct-message picker */}
      {showPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPicker(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold text-text-primary">New direct message</h2>
              <button onClick={() => setShowPicker(false)} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
            </div>
            <input className="input" placeholder="Search your firm…" autoFocus
              value={dirSearch} onChange={(e) => setDirSearch(e.target.value)} />
            <div className="max-h-80 overflow-y-auto scrollbar-thin -mx-1">
              {dirLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[#1d6464]" /></div>
              ) : filteredDirectory.length === 0 ? (
                <p className="text-center text-sm text-text-muted py-8">No matching firm members.</p>
              ) : (
                filteredDirectory.map((d) => (
                  <button key={d.id} onClick={() => startDirect(d.id)}
                    className="w-full flex items-center gap-3 text-left rounded-xl px-3 py-2.5 hover:bg-surface-muted">
                    <div className="w-8 h-8 rounded-full bg-[#1d6464]/10 flex items-center justify-center shrink-0">
                      <UserIcon className="w-4 h-4 text-[#1d6464]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary truncate">{d.fullName}</p>
                      <p className="text-xs text-text-muted truncate">{d.email}</p>
                    </div>
                    <span className="text-[10px] text-text-muted uppercase tracking-wide shrink-0">{d.role.replace(/_/g, ' ')}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
