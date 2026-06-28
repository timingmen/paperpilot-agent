# PaperPilot Vector RAG and DeepSeek Design

## Goal

Replace the demo keyword retriever with semantic vector retrieval and add a real DeepSeek-backed agent provider while preserving the deterministic demo provider for offline tests and demonstrations.

## Chosen Approach

Use FastEmbed with `BAAI/bge-small-en-v1.5` for local English manuscript embeddings and cosine similarity search. Use DeepSeek's OpenAI-compatible chat API with JSON output for grounded task drafting. This needs only the existing DeepSeek key and keeps manuscript embeddings local.

Alternatives considered:

1. `sentence-transformers` plus FAISS: familiar, but substantially heavier on Windows because of PyTorch and FAISS packaging.
2. Hosted embeddings: operationally simple, but requires a second provider key and sends manuscript chunks to another service.
3. FastEmbed plus in-process cosine search: the selected option; small download, CPU-friendly, easy to test through dependency injection.

## Components

- `backend/app/rag_service.py`: paragraph-aware chunking, embedding protocol, lazy FastEmbed adapter, normalized cosine retrieval, and evidence conversion.
- `backend/app/deepseek_service.py`: DeepSeek chat protocol, OpenAI SDK adapter, grounded JSON prompt, response parsing, and schema validation.
- `backend/app/agent_service.py`: retain `RuleBasedAgentProvider`; add `DeepSeekRagAgentProvider` and select it with `APP_MODE=deepseek-rag`.
- `backend/app/main.py`: load `backend/.env` before reading configuration and translate provider configuration/runtime failures to clear API errors.

## Data Flow

1. Parse the uploaded manuscript and reviewer comments using the existing upload endpoints.
2. Split the manuscript into overlapping, paragraph-aware chunks.
3. Embed all chunks once with the local BGE model.
4. Split reviewer comments into actionable items and embed each item as a query.
5. Retrieve the top three chunks by cosine similarity and retain their location, excerpt, and score.
6. Send each reviewer comment plus only its retrieved evidence to DeepSeek.
7. Require JSON fields for title, category, priority, manuscript section, rationale, suggested change, and response draft.
8. Validate the model response with Pydantic, attach retrieved evidence, persist tasks and trace events, then retain the existing human approval and DOCX export gate.

## Configuration

```env
APP_MODE=deepseek-rag
DEEPSEEK_API_KEY=<local secret>
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
EMBEDDING_CACHE_DIR=D:/demo/models/fastembed
RAG_TOP_K=3
RAG_CHUNK_CHARS=900
RAG_CHUNK_OVERLAP=150
```

The existing key is copied locally from `D:/demo/agentdesk/.env.local` without printing it. `backend/.env` remains ignored by `.gitignore`.

## Error Handling

- Missing DeepSeek key: fail provider construction with a configuration error.
- Missing manuscript or reviewer text: return HTTP 409 with an actionable message.
- Embedding download or inference failure: return HTTP 503 and keep previously persisted tasks unchanged.
- DeepSeek timeout, empty JSON, or schema mismatch: retry once for transport/empty-output failures, then return HTTP 502.
- Low retrieval scores: still expose the score and instruct DeepSeek to state that evidence is insufficient rather than invent support.

## Testing

- Unit-test chunk overlap and stable chunk locations.
- Unit-test cosine ranking with a fake embedding provider, so tests never download the model.
- Unit-test the DeepSeek prompt and validated task mapping with a fake chat client, so tests never spend API credits.
- Unit-test provider selection and missing-key behavior.
- Keep all existing backend/frontend tests passing.
- Run one opt-in live smoke request with the local key after unit tests pass; do not print the key or full manuscript content.

## Scope Boundaries

- This is dense vector RAG, not GraphRAG.
- The vector index is rebuilt per analysis run and kept in process; persistent vector storage is deferred until the workflow needs multi-document scale.
- The rule-based provider remains available as `APP_MODE=demo` for offline use.
