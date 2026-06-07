package com.pangochain.backend.rag.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class RagEmbeddingRepository {
    private final JdbcTemplate jdbcTemplate;

    public boolean isAvailable() {
        try {
            jdbcTemplate.queryForObject("SELECT to_regclass('rag_document_chunk_embeddings') IS NOT NULL", Boolean.class);
            jdbcTemplate.queryForObject("SELECT COUNT(*) FROM pg_extension WHERE extname = 'vector'", Integer.class);
            return true;
        } catch (DataAccessException ex) {
            return false;
        }
    }

    public void upsert(UUID caseId, UUID documentId, String chunkId, String fileName, Integer pageNumber,
                       int chunkIndex, String chunkHashSha256, float[] embedding, String embeddingModel) {
        String vector = toVectorLiteral(embedding);
        jdbcTemplate.update("""
                INSERT INTO rag_document_chunk_embeddings
                  (case_id, document_id, chunk_id, file_name, page_number, chunk_index,
                   chunk_hash_sha256, embedding, embedding_model)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?::vector, ?)
                ON CONFLICT (case_id, document_id, chunk_id, chunk_hash_sha256)
                DO UPDATE SET embedding = EXCLUDED.embedding,
                              embedding_model = EXCLUDED.embedding_model,
                              created_at = now()
                """, caseId, documentId, chunkId, fileName, pageNumber, chunkIndex,
                chunkHashSha256, vector, embeddingModel);
    }

    public List<RagChunkMatch> search(UUID caseId, float[] queryEmbedding, int topK) {
        String vector = toVectorLiteral(queryEmbedding);
        return jdbcTemplate.query("""
                SELECT id, case_id, document_id, chunk_id, file_name, page_number, chunk_index,
                       chunk_hash_sha256, 1 - (embedding <=> ?::vector) AS similarity
                FROM rag_document_chunk_embeddings
                WHERE case_id = ?
                ORDER BY embedding <=> ?::vector
                LIMIT ?
                """,
                (rs, rowNum) -> new RagChunkMatch(
                        rs.getObject("id", UUID.class),
                        rs.getObject("case_id", UUID.class),
                        rs.getObject("document_id", UUID.class),
                        rs.getString("chunk_id"),
                        rs.getString("file_name"),
                        (Integer) rs.getObject("page_number"),
                        rs.getInt("chunk_index"),
                        rs.getString("chunk_hash_sha256"),
                        rs.getDouble("similarity")
                ),
                vector, caseId, vector, topK);
    }

    public int countByCase(UUID caseId) {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM rag_document_chunk_embeddings WHERE case_id = ?",
                    Integer.class,
                    caseId);
            return count == null ? 0 : count;
        } catch (DataAccessException ex) {
            return 0;
        }
    }

    private String toVectorLiteral(float[] embedding) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < embedding.length; i++) {
            if (i > 0) {
                sb.append(',');
            }
            sb.append(Float.isFinite(embedding[i]) ? embedding[i] : 0.0f);
        }
        return sb.append(']').toString();
    }
}
