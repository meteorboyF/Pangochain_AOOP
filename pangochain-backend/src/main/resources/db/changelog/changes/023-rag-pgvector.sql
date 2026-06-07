--liquibase formatted sql

--changeset pangochain:023-rag-pgvector failOnError:false
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS rag_document_chunk_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_id VARCHAR(128) NOT NULL,
    file_name VARCHAR(512) NOT NULL,
    page_number INTEGER,
    chunk_index INTEGER NOT NULL,
    chunk_hash_sha256 VARCHAR(64) NOT NULL,
    embedding vector(384) NOT NULL,
    embedding_model VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_rag_chunk UNIQUE (case_id, document_id, chunk_id, chunk_hash_sha256)
);

CREATE INDEX IF NOT EXISTS idx_rag_chunk_case_id ON rag_document_chunk_embeddings(case_id);
CREATE INDEX IF NOT EXISTS idx_rag_chunk_document_id ON rag_document_chunk_embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_rag_chunk_embedding ON rag_document_chunk_embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE TABLE IF NOT EXISTS rag_case_index_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    embedding_model VARCHAR(128) NOT NULL,
    indexed_chunk_count INTEGER NOT NULL,
    status VARCHAR(32) NOT NULL,
    last_indexed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    error_code VARCHAR(128),
    error_message VARCHAR(512)
);

CREATE INDEX IF NOT EXISTS idx_rag_index_status_case_user ON rag_case_index_status(case_id, user_id);

--rollback DROP TABLE IF EXISTS rag_case_index_status; DROP TABLE IF EXISTS rag_document_chunk_embeddings;
