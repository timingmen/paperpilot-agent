from __future__ import annotations

import io
import os
import uuid
from pathlib import Path
from typing import Annotated

from docx import Document
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pypdf import PdfReader

from .agent_service import get_agent_provider
from .exporter import build_response_letter_docx
from .models import AnalysisResponse, Project, ProjectCreate, ReviewTask, TaskUpdate, UploadSummary
from .store import JsonProjectStore

app = FastAPI(title="PaperPilot Agent API", version="0.2.0")

origins = [x.strip() for x in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

DEFAULT_DATA_FILE = Path(__file__).resolve().parents[1] / "data" / "paperpilot_state.json"
DATA_FILE = Path(os.getenv("PAPERPILOT_DATA_FILE", str(DEFAULT_DATA_FILE)))
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(8 * 1024 * 1024)))
UPLOAD_KINDS = {"manuscript", "reviewer", "journal", "bibliography"}

store = JsonProjectStore(DATA_FILE)


def not_found(message: str = "Project not found") -> HTTPException:
    return HTTPException(status_code=404, detail=message)


def progress_for_tasks(items: list[ReviewTask]) -> int:
    if not items:
        return 0
    approved = sum(1 for item in items if item.status == "Approved")
    return round((approved / len(items)) * 100)


def extract_text(upload: UploadFile, payload: bytes) -> str:
    suffix = Path(upload.filename or "").suffix.lower()
    try:
        if suffix == ".docx":
            doc = Document(io.BytesIO(payload))
            return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        if suffix == ".pdf":
            reader = PdfReader(io.BytesIO(payload))
            return "\n".join((page.extract_text() or "") for page in reader.pages)
        return payload.decode("utf-8", errors="ignore")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse uploaded file: {upload.filename}") from exc


@app.get("/api/health")
def health():
    return {"status": "ok", "mode": os.getenv("APP_MODE", "demo"), "storage": str(DATA_FILE)}


@app.get("/api/projects", response_model=list[Project])
def list_projects():
    return store.list_projects()


@app.post("/api/projects", response_model=Project)
def create_project(payload: ProjectCreate):
    pid = f"pp-{uuid.uuid4().hex[:6]}"
    project = Project(
        id=pid,
        title=payload.title,
        journal=payload.journal,
        deadline=payload.deadline,
        progress=0,
        updated_at="Just now",
        manuscripts=0,
        comments=0,
    )
    return store.upsert_project(project)


@app.post("/api/projects/{project_id}/upload", response_model=UploadSummary)
async def upload_file(project_id: str, kind: str, file: Annotated[UploadFile, File(...)]):
    if kind not in UPLOAD_KINDS:
        raise HTTPException(status_code=400, detail="Unsupported upload kind")
    try:
        project = store.get_project(project_id)
    except KeyError as exc:
        raise not_found() from exc

    payload = await file.read()
    if len(payload) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Upload is larger than the configured limit")

    text = extract_text(file, payload)
    store.save_source_text(project_id, kind, text)

    if kind == "manuscript":
        project.manuscripts = max(project.manuscripts, 1)
    if kind == "reviewer":
        project.comments = max(project.comments, len([line for line in text.splitlines() if line.strip()]))
    project.updated_at = "Just now"
    store.upsert_project(project)

    return UploadSummary(filename=file.filename or "upload", kind=kind, chars_extracted=len(text))


@app.post("/api/projects/{project_id}/analyze", response_model=AnalysisResponse)
def analyze(project_id: str):
    try:
        project = store.get_project(project_id)
        source_texts = store.get_source_texts(project_id)
    except KeyError as exc:
        raise not_found() from exc

    try:
        provider = get_agent_provider()
    except ValueError as exc:
        raise HTTPException(status_code=501, detail=str(exc)) from exc

    result = provider.analyze(
        project,
        source_texts.get("reviewer", ""),
        source_texts.get("manuscript", ""),
    )
    updated_project = result.project.model_copy(
        update={
            "comments": len(result.tasks),
            "progress": progress_for_tasks(result.tasks),
            "updated_at": "Just now",
        }
    )
    store.upsert_project(updated_project)
    store.save_tasks(project_id, result.tasks)
    store.save_trace(project_id, result.trace)
    return AnalysisResponse(project=updated_project, tasks=result.tasks, trace=result.trace)


@app.get("/api/projects/{project_id}/tasks", response_model=list[ReviewTask])
def get_tasks(project_id: str):
    try:
        return store.get_tasks(project_id)
    except KeyError as exc:
        raise not_found() from exc


@app.get("/api/projects/{project_id}/trace")
def get_trace(project_id: str):
    try:
        return store.get_trace(project_id)
    except KeyError as exc:
        raise not_found() from exc


@app.patch("/api/projects/{project_id}/tasks/{task_id}", response_model=ReviewTask)
def update_task(project_id: str, task_id: str, payload: TaskUpdate):
    try:
        return store.update_task_status(project_id, task_id, payload.status)
    except KeyError as exc:
        raise not_found("Project or task not found") from exc


@app.get("/api/projects/{project_id}/export/response-letter")
def export_response_letter(project_id: str):
    try:
        project = store.get_project(project_id)
        task_list = store.get_tasks(project_id)
    except KeyError as exc:
        raise not_found() from exc

    try:
        payload = build_response_letter_docx(project, task_list)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    stream = io.BytesIO(payload)
    headers = {"Content-Disposition": 'attachment; filename="paperpilot_response_to_reviewers.docx"'}
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers=headers,
    )
