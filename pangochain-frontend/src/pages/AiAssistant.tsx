import { Bot } from 'lucide-react'
import { FeatureScaffold } from '../components/FeatureScaffold'

export default function AiAssistant() {
  return (
    <FeatureScaffold
      icon={<Bot className="w-5 h-5 text-[#1d6464]" />}
      title="RAG Legal AI Assistant"
      tagline="Ask natural-language questions answered from your case documents, with source citations."
      capabilities={[
        'Persistent chat panel on each case answering questions like “What did the opposing party admit in Exhibit C?”',
        'Answers grounded in the actual uploaded documents, with citations linking back to the source file',
        'Client decrypts documents locally and sends plaintext over TLS, session-scoped — no plaintext persisted server-side',
        'Semantic retrieval over embedded chunks (pgvector) before passing context to the LLM',
      ]}
      dependencies={['Secure Document Download', 'Case Document List', 'PostgreSQL (pgvector)']}
      infraNote="A LangChain4j retrieval service, a sentence-transformer embedding model, the pgvector extension, and an LLM endpoint (hosted or local). Not provisioned in this environment."
    />
  )
}
