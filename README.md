# PaperPilot Agent

A portfolio-ready paper revision agent for researchers. PaperPilot turns reviewer comments into a traceable revision queue with evidence anchors, suggested manuscript edits, response-letter drafts, and human approval before export.

## What it does

- Upload a manuscript, reviewer comments, journal guide, and bibliography.
- Parse reviewer comments into structured action items.
- Locate likely manuscript sections to revise.
- Retrieve supporting manuscript evidence.
- Draft bounded revision suggestions and response-to-reviewers language.
- Require human approval before DOCX export.
- Persist demo projects, tasks, uploaded source text, and run traces to a local JSON store.

## Architecture

- Frontend: React + TypeScript + Vite.
- Backend: FastAPI + Pydantic.
- Documents: `python-docx`, `pypdf`.
- Agent pipeline: review parser -> local BGE vector index -> dense evidence retriever -> DeepSeek revision writer -> quality gate.
- Storage: JSON file for local/demo deployments, configured by `PAPERPILOT_DATA_FILE`.
- Provider boundary: `backend/app/agent_service.py` exposes the offline `RuleBasedAgentProvider` and the real `DeepSeekRagAgentProvider` behind the same `AgentProvider` contract.

`APP_MODE=deepseek-rag` embeds manuscript chunks locally with FastEmbed and `BAAI/bge-small-en-v1.5`, retrieves the top matching evidence for each reviewer comment, and asks DeepSeek for a schema-validated English revision task. `APP_MODE=demo` remains available for deterministic offline demonstrations.

## Run Locally

### Backend

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

## Environment

Copy `backend/.env.example` to `backend/.env`.

```env
APP_MODE=deepseek-rag
CORS_ORIGINS=http://localhost:5173
PAPERPILOT_DATA_FILE=./data/paperpilot_state.json
MAX_UPLOAD_BYTES=8388608
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
EMBEDDING_CACHE_DIR=D:/demo/models/fastembed
RAG_TOP_K=3
RAG_CHUNK_CHARS=900
RAG_CHUNK_OVERLAP=150
```

The embedding model is downloaded once and reused from `EMBEDDING_CACHE_DIR`. Manuscript embeddings stay local; only the reviewer comment and retrieved evidence excerpts are sent to DeepSeek.

## Verification

From the project root:

```powershell
$env:PYTHONPATH="backend"; python -m unittest discover -s backend\tests
python -m compileall backend\app
```

From `frontend/`:

```bash
npm test
npm run build
npm audit --audit-level=moderate
```

## Product Flow

1. Create a project and upload source files.
2. Launch an analysis run.
3. Inspect each review item, evidence excerpt, suggested revision, and response language.
4. Approve or request revision for each item.
5. Export a response-to-reviewers DOCX after at least one task is approved.

## Portfolio Talking Points

- Human-in-the-loop revision workflow, not a generic chatbot.
- Real dense vector RAG with local BGE embeddings and grounded DeepSeek JSON generation.
- Explicit provider boundary that keeps deterministic offline analysis available for tests and demos.
- Persistent local audit state through a JSON store that can be replaced with PostgreSQL.
- Tests cover the store, provider boundary, DOCX export rules, and frontend queue metrics.
- Dependency audit currently passes after upgrading to Vite 8.
