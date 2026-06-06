import { useEffect, useRef, useState } from 'react'
import { Bell, Check, Loader2, X } from 'lucide-react'
import type { Client, StompSubscription } from '@stomp/stompjs'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'
import { createChatClient } from '../lib/chatSocket'

interface NotificationDto {
  id: string
  type: string
  message: string
  read: boolean
  createdAt: string
}

export function NotificationBell() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.accessToken)

  const [items, setItems] = useState<NotificationDto[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const clientRef = useRef<Client | null>(null)
  const subRef = useRef<StompSubscription | null>(null)

  // Initial load + browser-notification permission.
  useEffect(() => {
    if (!user) return
    setLoading(true)
    api.get('/notifications', { params: { size: 20 } })
      .then((r) => { setItems(r.data?.content ?? []); setUnread(r.data?.unread ?? 0) })
      .catch(() => { /* non-fatal */ })
      .finally(() => setLoading(false))
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [user])

  // Live subscription to this user's notification topic.
  useEffect(() => {
    if (!token || !user) return
    const client = createChatClient(token, {
      onConnect: () => {
        subRef.current?.unsubscribe()
        subRef.current = client.subscribe(`/topic/users/${user.id}/notifications`, (frame) => {
          try {
            const n: NotificationDto = JSON.parse(frame.body)
            setItems((prev) => (prev.some((p) => p.id === n.id) ? prev : [n, ...prev].slice(0, 50)))
            setUnread((c) => c + 1)
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('PangoChain', { body: n.message })
            }
          } catch { /* ignore malformed frame */ }
        })
      },
    })
    clientRef.current = client
    return () => { subRef.current?.unsubscribe(); subRef.current = null; client.deactivate(); clientRef.current = null }
  }, [token, user])

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all')
      setItems((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnread(0)
    } catch { /* non-fatal */ }
  }

  if (!user) return null

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen((v) => !v); if (!open && unread > 0) markAllRead() }}
        className="relative p-2 rounded-xl bg-white/90 border border-border shadow-card hover:bg-surface-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-text-secondary" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto scrollbar-thin bg-white rounded-2xl shadow-2xl border border-border z-40">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-white">
              <span className="font-semibold text-sm text-text-primary">Notifications</span>
              <div className="flex items-center gap-2">
                <button onClick={markAllRead} className="text-xs text-[#1d6464] hover:underline flex items-center gap-1">
                  <Check className="w-3 h-3" /> Mark all read
                </button>
                <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
              </div>
            </div>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[#1d6464]" /></div>
            ) : items.length === 0 ? (
              <p className="text-center text-sm text-text-muted py-10">You're all caught up.</p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => (
                  <li key={n.id} className={`px-4 py-3 ${n.read ? '' : 'bg-[#1d6464]/5'}`}>
                    <div className="flex items-start gap-2">
                      {!n.read && <span className="w-2 h-2 rounded-full bg-[#1d6464] mt-1.5 shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">{n.type.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-text-primary">{n.message}</p>
                        <p className="text-[11px] text-text-muted mt-0.5">{new Date(n.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
