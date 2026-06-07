export interface CaseChatDocument {
  id: string
  fileName: string
}

export interface RagStatus {
  available: boolean
  reason: string
  message: string
  persistedEmbeddingCount: number
  sessionPlaintextChunkCount: number
  dependencies: Record<string, boolean>
}

export interface RagCitation {
  citationId: string
  documentId: string
  fileName: string
  pageNumber?: number
  chunkIndex: number
  chunkId: string
  similarity: number
}

export interface RagChatResponse {
  answer: string
  citations: RagCitation[]
  grounded: boolean
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: RagCitation[]
}
