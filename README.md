# PaperPilot Agent

 **paper revision multi-agent** application for researchers.

## What it does

- Upload a manuscript, reviewer comments, journal guide, and bibliography
- Parse review comments into structured action items
- Locate likely manuscript sections to revise
- Retrieve supporting evidence from manuscript snippets and references
- Draft revision suggestions and a Response to Reviewers letter
- Require human approval before export
- Show a trace timeline for the multi-agent workflow



## Tech stack

- Frontend: React + TypeScript + Vite + Tailwind-style custom CSS
- Backend: FastAPI + Pydantic
- Documents: `python-docx`, `pypdf`
- Agent architecture: parser → locator → evidence retriever → revision writer → quality gate
- Persistence: JSON file for demo mode; easy to replace with PostgreSQL

## Run locally

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

## Optional environment variables

Copy `backend/.env.example` to `backend/.env`.

```env
APP_MODE=demo
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
CORS_ORIGINS=http://localhost:5173
```

## Product flow

1. Create a project and upload source files.
2. Launch an analysis run.
3. Inspect each review item, evidence excerpt, suggested revision, and response language.
4. Approve or request revision for each item.
5. Export a response-to-reviewers letter.

## Portfolio demo script

- Upload a manuscript and a reviewer-comment file.
- Click **Launch analysis**.
- Open a high-priority comment.
- Show the evidence source, suggested manuscript change, and generated reply.
- Approve one task and export the response letter.
- Open **Run Monitor** to show the agent trace and human-in-the-loop checkpoint.

## Windows installation note

The project includes `frontend/.npmrc`, which explicitly uses the public npm registry. In PowerShell, run:

```powershell
cd frontend
Remove-Item -Recurse -Force .\node_modules -ErrorAction SilentlyContinue
Remove-Item -Force .\package-lock.json -ErrorAction SilentlyContinue
npm cache clean --force
npm install
npm run dev
```

Recommended runtime: Node.js 20 LTS or newer.
