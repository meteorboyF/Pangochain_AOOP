import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Bot, Database, FileText, Loader2, MessageSquare, Send, ShieldCheck, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { askCaseQuestion, clearRagSession, getRagStatus, indexRagDocument } from '../api/ragApi'
import { chunkDocumentText } from '../utils/chunkDocumentText'
import type { CaseChatDocument, ChatMessage, RagStatus } from '../types'

interface Props {
  caseId: string
  documents: CaseChatDocument[]
}

export function CaseChatPanel({ caseId, documents }: Props) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<RagStatus | null>(null)
  const [selectedDocId, setSelectedDocId] = useState('')
  const [plaintext, setPlaintext] = useState('')
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [indexing, setIndexing] = useState(false)
  const [asking, setAsking] = useState(false)

  const selectedDoc = useMemo(
    () => documents.find((doc) => doc.id === selectedDocId) ?? documents[0],
    [documents, selectedDocId],
  )

  useEffect(() => {
    if (!selectedDocId && documents[0]) setSelectedDocId(documents[0].id)
  }, [documents, selectedDocId])

  const refreshStatus = async () => {
    setLoadingStatus(true)
    try {
      setStatus(await getRagStatus(caseId))
    } catch {
      setStatus({
        available: false,
        reason: 'RAG_STATUS_UNAVAILABLE',
        message: 'Case chat status could not be loaded.',
        persistedEmbeddingCount: 0,
        sessionPlaintextChunkCount: 0,
        dependencies: {},
      })
    } finally {
      setLoadingStatus(false)
    }
  }

  useEffect(() => {
    if (open) refreshStatus()
  }, [open, caseId])

  const handleIndex = async () => {
    if (!selectedDoc || !plaintext.trim()) return
    const chunks = chunkDocumentText(selectedDoc.id, plaintext)
    if (chunks.length === 0) return

    setIndexing(true)
    try {
      await indexRagDocument(caseId, selectedDoc.id, selectedDoc.fileName, chunks)
      setPlaintext('')
      await refreshStatus()
      toast.success('Session context indexed')
    } catch (error: any) {
      toast.error(error.response?.data?.detail ?? 'Could not index document context')
    } finally {
      setIndexing(false)
    }
  }

  const handleAsk = async (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = question.trim()
    if (!trimmed) return

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: trimmed }
    setMessages((prev) => [...prev, userMessage])
    setQuestion('')
    setAsking(true)
    try {
      const response = await askCaseQuestion(caseId, trimmed)
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.answer,
        citations: response.citations,
      }])
    } catch (error: any) {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: error.response?.data?.detail ?? 'Case chat is unavailable right now.',
      }])
    } finally {
      setAsking(false)
    }
  }

  const handleClear = async () => {
    try {
      await clearRagSession(caseId)
      setMessages([])
      await refreshStatus()
      toast.success('Session context cleared')
    } catch {
      toast.error('Could not clear session context')
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full bg-[#1d6464] text-white shadow-lg flex items-center justify-center hover:bg-[#155252] transition-colors"
        title="Open case chat"
      >
        <MessageSquare className="w-5 h-5" />
      </button>
    )
  }

  const ready = Boolean(status?.available && status.sessionPlaintextChunkCount > 0)

  return (
    <aside className="fixed bottom-5 right-5 z-40 w-[min(420px,calc(100vw-2rem))] max-h-[calc(100vh-2.5rem)] rounded-lg border border-border bg-white shadow-xl flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-surface">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-[#1d6464]/10 text-[#1d6464] flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-heading font-semibold text-sm text-text-primary">Case RAG Chat</p>
            <p className="text-[11px] text-text-muted truncate">Grounded in active session documents</p>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text-primary text-lg leading-none px-1">x</button>
      </div>

      <div className="p-3 border-b border-border space-y-3">
        <div className={`rounded-lg border px-3 py-2 text-xs flex gap-2 ${status?.available ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
          {loadingStatus ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : status?.available ? <ShieldCheck className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{status?.message ?? 'Checking case chat availability...'}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded border border-border px-2 py-1.5 flex items-center gap-1.5 text-text-muted">
            <Database className="w-3.5 h-3.5" /> {status?.persistedEmbeddingCount ?? 0} vectors
          </div>
          <div className="rounded border border-border px-2 py-1.5 flex items-center gap-1.5 text-text-muted">
            <FileText className="w-3.5 h-3.5" /> {status?.sessionPlaintextChunkCount ?? 0} session chunks
          </div>
        </div>

        {documents.length > 0 && (
          <div className="space-y-2">
            <select className="input text-xs py-2" value={selectedDoc?.id ?? ''} onChange={(e) => setSelectedDocId(e.target.value)}>
              {documents.map((doc) => <option key={doc.id} value={doc.id}>{doc.fileName}</option>)}
            </select>
            <textarea
              className="input text-xs min-h-[72px] resize-y"
              value={plaintext}
              onChange={(e) => setPlaintext(e.target.value)}
              placeholder="Paste browser-decrypted text for this active session"
            />
            <button disabled={!status?.available || indexing || !plaintext.trim()} onClick={handleIndex} className="btn-primary text-xs py-2 w-full disabled:opacity-50">
              {indexing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Indexing...</> : 'Index Session Text'}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[220px]">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-text-muted text-sm">
            Ask about admissions, dates, exhibits, obligations, or inconsistencies in indexed case documents.
          </div>
        ) : messages.map((message) => (
          <div key={message.id} className={`rounded-lg px-3 py-2 text-sm ${message.role === 'user' ? 'bg-[#1d6464] text-white ml-8' : 'bg-surface-muted text-text-primary mr-8'}`}>
            <p className="whitespace-pre-wrap">{message.content}</p>
            {message.citations && message.citations.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {message.citations.map((citation) => (
                  <button
                    key={citation.citationId}
                    onClick={() => toast(`Open ${citation.fileName} page ${citation.pageNumber ?? '?'}`)}
                    className="text-[10px] rounded border border-[#1d6464]/20 bg-white text-[#1d6464] px-1.5 py-0.5"
                    title={`${citation.fileName}, page ${citation.pageNumber ?? 'unknown'}, chunk ${citation.chunkIndex}`}
                  >
                    {citation.fileName} p.{citation.pageNumber ?? '?'} c.{citation.chunkIndex}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {asking && <Loader2 className="w-4 h-4 animate-spin text-[#1d6464] mx-auto" />}
      </div>

      <form onSubmit={handleAsk} className="p-3 border-t border-border flex gap-2">
        <button type="button" onClick={handleClear} className="h-10 w-10 rounded-lg border border-border flex items-center justify-center text-text-muted hover:text-red-600" title="Clear session context">
          <Trash2 className="w-4 h-4" />
        </button>
        <input
          className="input text-sm flex-1"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={!ready || asking}
          placeholder={ready ? 'Ask a case-grounded question' : 'Index session text to ask'}
        />
        <button disabled={!ready || asking || !question.trim()} className="h-10 w-10 rounded-lg bg-[#1d6464] text-white flex items-center justify-center disabled:opacity-50" title="Send">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </aside>
  )
}
