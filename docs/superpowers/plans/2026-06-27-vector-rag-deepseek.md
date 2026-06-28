# PaperPilot Vector RAG and DeepSeek Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add local semantic vector retrieval and DeepSeek-grounded English revision generation without weakening the existing approval and export controls.

**Architecture:** A new RAG module owns chunking, embedding, and cosine search. A DeepSeek module owns the external chat boundary and structured JSON parsing. `DeepSeekRagAgentProvider` composes both behind the existing `AgentProvider` protocol, while demo mode remains deterministic.

**Tech Stack:** Python 3.11, FastAPI, Pydantic v2, FastEmbed/ONNX Runtime, NumPy, OpenAI Python SDK configured for DeepSeek.

---

### Task 1: Prepare isolated runtime and local model cache

**Files:**
- Create: `backend/.venv/`
- Create: `D:/demo/models/fastembed/`
- Modify: `backend/requirements.txt`

- [ ] Create `backend/.venv` with `python -m venv backend/.venv`.
- [ ] Add `fastembed>=0.7.0`, `numpy>=1.26.0`, and `openai>=1.60.0` to `backend/requirements.txt`.
- [ ] Install requirements with `backend/.venv/Scripts/python -m pip install -r backend/requirements.txt`.
- [ ] Initialize `TextEmbedding(model_name="BAAI/bge-small-en-v1.5", cache_dir="D:/demo/models/fastembed")` and verify a 384-dimensional embedding is returned.

### Task 2: Add vector retrieval through TDD

**Files:**
- Create: `backend/tests/test_rag_service.py`
- Create: `backend/app/rag_service.py`

- [ ] Write failing tests for paragraph-aware chunks, overlap, stable locations, and top-k cosine ranking using a fake embedding provider.
- [ ] Run `backend/.venv/Scripts/python -m unittest backend.tests.test_rag_service` and confirm the import/test failure.
- [ ] Implement `TextChunk`, `RetrievedChunk`, `EmbeddingProvider`, `FastEmbedProvider`, `chunk_text()`, and `VectorRetriever.search()` with normalized dot-product similarity.
- [ ] Re-run the focused test and confirm it passes without downloading or loading the real model.

### Task 3: Add the DeepSeek structured generation boundary through TDD

**Files:**
- Create: `backend/tests/test_deepseek_service.py`
- Create: `backend/app/deepseek_service.py`

- [ ] Write failing tests proving that prompts contain only supplied comments/evidence, request English JSON, reject empty output, and validate priority values.
- [ ] Run `backend/.venv/Scripts/python -m unittest backend.tests.test_deepseek_service` and confirm failure.
- [ ] Implement `ChatClient`, `OpenAIDeepSeekClient`, `GeneratedTask`, `DeepSeekDraftService`, prompt construction, one retry for empty output, JSON parsing, and Pydantic validation.
- [ ] Re-run the focused tests and confirm they pass with a fake client and no API call.

### Task 4: Compose the DeepSeek RAG provider through TDD

**Files:**
- Modify: `backend/tests/test_agent_provider.py`
- Modify: `backend/app/agent_service.py`
- Modify: `backend/app/models.py`

- [ ] Add failing tests for `APP_MODE=deepseek-rag`, missing-key configuration, evidence attachment, and trace stages.
- [ ] Run the focused provider tests and confirm failure.
- [ ] Implement `DeepSeekRagAgentProvider`, injected retriever/draft-service factories, current-model configuration, and trace events for vector indexing, retrieval, generation, and human approval.
- [ ] Re-run provider tests and confirm both demo and DeepSeek RAG paths pass.

### Task 5: Load secure configuration and expose clear API failures

**Files:**
- Modify: `backend/app/main.py`
- Modify: `backend/.env.example`
- Create locally: `backend/.env` (ignored secret file)

- [ ] Load `backend/.env` before module-level environment values are read.
- [ ] Add non-secret DeepSeek/RAG defaults to `.env.example`.
- [ ] Securely copy only `DEEPSEEK_API_KEY` from `D:/demo/agentdesk/.env.local` into `backend/.env` and verify presence without printing its value.
- [ ] Return 409 for missing source text, 502 for invalid/empty DeepSeek output, and 503 for embedding failures.

### Task 6: Update product copy and documentation

**Files:**
- Modify: `README.md`
- Modify: `frontend/src/main.tsx`

- [ ] Describe the real dense-vector retrieval and DeepSeek provider accurately.
- [ ] Update settings/monitor text so it no longer implies that an unimplemented OpenAI provider is active.
- [ ] Preserve Chinese UI text and English generated manuscript content.

### Task 7: Verify end to end

**Files:**
- No production file changes expected.

- [ ] Run all backend unit tests with the project virtual environment.
- [ ] Run `python -m compileall backend/app`.
- [ ] Run frontend `npm test` and `npm run build`.
- [ ] Start FastAPI with `APP_MODE=deepseek-rag`, verify `/api/health`, upload a small English manuscript/reviewer fixture, run analysis, and confirm returned tasks include vector evidence and English DeepSeek drafts.
- [ ] Verify the DeepSeek key is absent from command output, source files, README, and test fixtures.
- [ ] Record that this directory has no Git repository, so commit steps are not available.
