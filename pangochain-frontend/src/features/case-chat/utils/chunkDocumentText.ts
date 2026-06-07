export interface ClientChunk {
  chunkId: string
  pageNumber: number
  chunkIndex: number
  text: string
}

const TARGET_CHARS = 3600
const OVERLAP_CHARS = 600

export function chunkDocumentText(documentId: string, text: string): ClientChunk[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim()
  if (!normalized) return []

  const chunks: ClientChunk[] = []
  let start = 0
  let index = 0

  while (start < normalized.length) {
    const hardEnd = Math.min(start + TARGET_CHARS, normalized.length)
    let end = hardEnd
    const paragraphBreak = normalized.lastIndexOf('\n\n', hardEnd)
    const sentenceBreak = normalized.lastIndexOf('. ', hardEnd)
    if (paragraphBreak > start + 1200) end = paragraphBreak
    else if (sentenceBreak > start + 1200) end = sentenceBreak + 1

    const chunkText = normalized.slice(start, end).trim()
    if (chunkText) {
      chunks.push({
        chunkId: `${documentId}:p1:c${index}`,
        pageNumber: 1,
        chunkIndex: index,
        text: chunkText,
      })
      index += 1
    }

    if (end >= normalized.length) break
    start = Math.max(0, end - OVERLAP_CHARS)
  }

  return chunks
}
