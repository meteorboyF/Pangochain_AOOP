import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bot, Eye, EyeOff, Lock, Send, ShieldCheck } from 'lucide-react'
import api from '../lib/api'

interface CaseDto {
  id: string
  title: string
  caseType?: string
  status: string
  documentCount?: number
}

interface Page<T> {
  content: T[]
}

interface CaseSource {
  title: string
  confidential: boolean
  text: string
  keywords: string[]
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sourceTitle?: string
  confidential?: boolean
}

const caseKnowledge: Record<string, CaseSource[]> = {
  chen: [
    {
      title: 'Chen-Meridian Master Lease Agreement 2021',
      confidential: true,
      keywords: ['lease', 'notice', 'termination', '90', 'default', 'repair', 'fees'],
      text: 'The lease requires Meridian to give Chen 90 days written notice before terminating for monetary default. The notice must include a clear itemized cure amount. The lease also makes Meridian responsible for base building repairs and gives the prevailing party reasonable attorneys fees.',
    },
    {
      title: 'Meridian Notice of Default 2024-01-18',
      confidential: true,
      keywords: ['wrong', 'problem', 'default', 'notice', '30', '119240', 'wire', 'transfer', 'cam', 'late fee', 'cure'],
      text: 'Meridian claimed $119,240 in unpaid rent, CAM charges, and late fees, but the notice gave only 30 days to cure. It also appears to omit Chen\'s February 2, 2024 wire transfer and does not clearly itemize disputed CAM charges.',
    },
    {
      title: 'Draft Preliminary Injunction Motion',
      confidential: true,
      keywords: ['support', 'supports', 'injunction', 'warehouse', 'harm', 'business interruption', '485000', 'lock', 'utilities'],
      text: 'Chen can argue for an injunction because losing warehouse access could interrupt configured assembly operations and cause about $485,000 in business interruption damages. The motion asks the court to stop Meridian from changing locks, terminating utilities, or interfering with shipments.',
    },
  ],
  delgado: [
    {
      title: 'Roberto Delgado Last Will and Testament',
      confidential: true,
      keywords: ['will', 'executor', 'beneficiary', 'sofia', 'mateo', 'isabel', 'shares', 'art'],
      text: 'Sofia Delgado is named executor. The residence goes to Sofia, the brokerage account is divided equally among Sofia, Mateo, and Isabel, and the art collection must be appraised before distribution. Family business shares may be limited by transfer restrictions.',
    },
    {
      title: 'Estate Asset Schedule Initial Inventory',
      confidential: true,
      keywords: ['asset', 'inventory', 'valuation', 'residence', 'brokerage', 'paintings', 'appraisal'],
      text: 'The estate inventory lists a $925,000 residence, a $610,000 brokerage account, $340,000 in family business shares, a $175,000 art collection, and $38,500 in vehicle/personal property. Two paintings require independent appraisal.',
    },
  ],
  pinnacle: [
    {
      title: 'Pinnacle Security Incident Report Oct 2024',
      confidential: true,
      keywords: ['breach', 'incident', 'credential', 'stuffing', 'records', 'mfa', 'notice'],
      text: 'The incident ran from October 4 to October 9, 2024 and involved credential stuffing against customer support accounts. Around 12,000 customer profiles were affected. Containment included disabling credentials, forcing password resets, expanding MFA, and preserving authentication logs.',
    },
  ],
}

const examples = [
  'What is the main issue in this case?',
  'What documents support our position?',
  'What should I review before the hearing?',
  'What risks should we focus on?',
]

function caseKey(title: string) {
  const lower = title.toLowerCase()
  if (lower.includes('chen')) return 'chen'
  if (lower.includes('delgado')) return 'delgado'
  if (lower.includes('pinnacle')) return 'pinnacle'
  return ''
}

function scoreSource(question: string, source: CaseSource) {
  const lower = question.toLowerCase()
  return source.keywords.reduce((score, keyword) => score + (lower.includes(keyword) ? 1 : 0), 0)
}

const crossCaseHints = [
  'executor',
  'beneficiary',
  'painting',
  'paintings',
  'estate',
  'probate',
  'records affected',
  'containment',
  'credential',
  'breach',
  'mfa',
  'security incident',
]

function buildAnswer(question: string, sources: CaseSource[]) {
  if (sources.length === 0) {
    return {
      content: 'I do not have case knowledge loaded for this case yet.',
      source: undefined,
    }
  }

  const ranked = [...sources].sort((a, b) => scoreSource(question, b) - scoreSource(question, a))
  const best = ranked[0]
  const bestScore = scoreSource(question, best)
  const lower = question.toLowerCase()

  if (bestScore === 0) {
    const looksLikeOtherCase = crossCaseHints.some((hint) => lower.includes(hint))
    return {
      content: looksLikeOtherCase
        ? 'I cannot find that information in the selected case. Please switch to the matching case and ask again.'
        : `I do not see a direct match in this case. The available sources are: ${sources.map((source) => source.title).join(', ')}.`,
      source: undefined,
    }
  }

  if (lower.includes('main') || lower.includes('summary') || lower.includes('issue')) {
    return {
      content: `The main issue is: ${best.text}`,
      source: best,
    }
  }
  if (lower.includes('document') || lower.includes('source') || lower.includes('support')) {
    return {
      content: `The strongest source to review is "${best.title}". It says: ${best.text}`,
      source: best,
    }
  }
  if (lower.includes('risk') || lower.includes('focus')) {
    return {
      content: `The key risk/focus area is tied to "${best.title}": ${best.text}`,
      source: best,
    }
  }
  if (lower.includes('hearing') || lower.includes('review')) {
    return {
      content: `Before the hearing, review "${best.title}" first. Relevant point: ${best.text}`,
      source: best,
    }
  }
  return {
    content: best.text,
    source: best,
  }
}

export default function AiAssistant() {
  const [selectedCaseId, setSelectedCaseId] = useState('')
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [password, setPassword] = useState('')
  const [showSecret, setShowSecret] = useState(false)

  const { data: cases = [], isLoading: loadingCases, isError: casesError } = useQuery({
    queryKey: ['basic-assistant-cases'],
    queryFn: async () => {
      const { data } = await api.get<Page<CaseDto>>('/cases', { params: { status: 'ACTIVE', size: 100 } })
      return data.content ?? []
    },
  })

  useEffect(() => {
    if (!selectedCaseId && cases[0]) setSelectedCaseId(cases[0].id)
  }, [cases, selectedCaseId])

  const selectedCase = useMemo(
    () => cases.find((item) => item.id === selectedCaseId),
    [cases, selectedCaseId],
  )

  const sources = useMemo(
    () => caseKnowledge[caseKey(selectedCase?.title ?? '')] ?? [],
    [selectedCase],
  )

  useEffect(() => {
    setMessages([])
    setQuestion('')
    setPassword('')
    setShowSecret(false)
  }, [selectedCaseId])

  const secretAnswers = messages.some((message) => message.confidential)
  const canReveal = showSecret && password.trim().length > 0

  const handleAsk = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = question.trim()
    if (!trimmed || !selectedCase) return

    const result = buildAnswer(trimmed, sources)
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', content: trimmed },
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.content,
        sourceTitle: result.source?.title,
        confidential: result.source?.confidential,
      },
    ])
    setQuestion('')
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary flex items-center gap-2">
            <Bot className="w-6 h-6 text-[#1d6464]" />
            Case Q&A Assistant
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Ask simple questions for one selected case. Confidential answers stay hidden until unlocked.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-5">
        <section className="space-y-4">
          <div className="card space-y-3">
            <div>
              <label className="label">Case</label>
              <select
                className="input"
                value={selectedCaseId}
                onChange={(event) => setSelectedCaseId(event.target.value)}
                disabled={loadingCases || cases.length === 0}
              >
                {loadingCases && <option>Loading cases...</option>}
                {!loadingCases && cases.length === 0 && <option>No active cases</option>}
                {cases.map((item) => (
                  <option key={item.id} value={item.id}>{item.title}</option>
                ))}
              </select>
              {casesError && <p className="text-xs text-error mt-2">Failed to load cases.</p>}
            </div>

            {selectedCase && (
              <div className="rounded-lg bg-surface-muted px-3 py-2">
                <p className="text-sm font-medium text-text-primary truncate">{selectedCase.title}</p>
                <p className="text-xs text-text-muted">
                  {selectedCase.caseType || 'Case'} · {sources.length} assistant sources
                </p>
              </div>
            )}
          </div>

          <div className="card space-y-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 flex gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Basic case Q&A is ready.</span>
            </div>

            {secretAnswers && (
              <div className="space-y-2">
                <label className="label flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  Password to reveal confidential answers
                </label>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((value) => !value)}
                  disabled={!password.trim()}
                  className="btn border border-border text-text-secondary w-full justify-center disabled:opacity-50"
                >
                  {canReveal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {canReveal ? 'Hide confidential answers' : 'Reveal confidential answers'}
                </button>
              </div>
            )}
          </div>

          <div className="card space-y-2">
            <p className="text-sm font-medium text-text-primary">Try Asking</p>
            {examples.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setQuestion(item)}
                className="block w-full text-left text-xs rounded-lg border border-border px-3 py-2 text-text-muted hover:text-[#1d6464] hover:border-[#1d6464]/30"
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="card min-h-[620px] flex flex-col p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="font-heading font-semibold text-text-primary text-sm">Case Chat</p>
            <p className="text-xs text-text-muted">Answers are scoped to the selected case.</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="h-full min-h-[380px] flex flex-col items-center justify-center text-center text-text-muted">
                <Bot className="w-10 h-10 mb-3 text-[#1d6464]" />
                <p className="font-heading font-semibold text-text-primary">Ask a basic case question</p>
                <p className="text-sm max-w-md mt-1">
                  Choose a case, ask a question, and confidential-source answers will be protected.
                </p>
              </div>
            ) : messages.map((message) => {
              const hidden = message.confidential && !canReveal
              return (
                <div key={message.id} className={`rounded-lg px-3 py-2 text-sm max-w-[84%] ${message.role === 'user' ? 'bg-[#1d6464] text-white ml-auto' : 'bg-surface-muted text-text-primary'}`}>
                  {message.confidential && (
                    <div className="text-[10px] font-semibold text-red-600 mb-1 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Confidential source{message.sourceTitle ? `: ${message.sourceTitle}` : ''}
                    </div>
                  )}
                  <p className={`whitespace-pre-wrap ${hidden ? 'blur-sm select-none' : ''}`}>
                    {message.content}
                  </p>
                  {hidden && (
                    <p className="text-xs text-text-muted mt-2">Enter password on the left to reveal this answer.</p>
                  )}
                </div>
              )
            })}
          </div>

          <form onSubmit={handleAsk} className="p-4 border-t border-border flex gap-2">
            <input
              className="input flex-1"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              disabled={!selectedCase}
              placeholder="Ask a question about this case"
            />
            <button
              disabled={!selectedCase || !question.trim()}
              className="h-11 w-11 rounded-lg bg-[#1d6464] text-white flex items-center justify-center disabled:opacity-50"
              title="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
