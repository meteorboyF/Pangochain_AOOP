import api from '../../../lib/api'
import type { RagChatResponse, RagStatus } from '../types'

type RagClientChunk = { chunkId: string; pageNumber: number; chunkIndex: number; text: string }
type RagClientDocument = { documentId: string; fileName: string; chunks: RagClientChunk[] }

export async function getRagStatus(caseId: string): Promise<RagStatus> {
  const { data } = await api.get(`/cases/${caseId}/rag/status`)
  return data
}

export async function indexRagDocument(caseId: string, documentId: string, fileName: string, chunks: RagClientChunk[]) {
  return indexRagDocuments(caseId, [{ documentId, fileName, chunks }])
}

export async function indexRagDocuments(caseId: string, documents: RagClientDocument[]) {
  const { data } = await api.post(`/cases/${caseId}/rag/session/index`, {
    documents,
  })
  return data
}

export async function askCaseQuestion(caseId: string, question: string): Promise<RagChatResponse> {
  const { data } = await api.post(`/cases/${caseId}/rag/chat`, { question })
  return data
}

export async function clearRagSession(caseId: string) {
  await api.delete(`/cases/${caseId}/rag/session`)
}
