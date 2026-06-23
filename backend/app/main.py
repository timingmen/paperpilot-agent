from __future__ import annotations
import io
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated

from docx import Document
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pypdf import PdfReader

from .agent_service import run_demo_analysis
from .demo_data import PROJECT, TASKS, TRACE
from .models import AnalysisResponse, Project, ProjectCreate, ReviewTask, TaskUpdate, UploadSummary

app = FastAPI(title="PaperPilot Agent API", version="0.1.0")
origins = [x.strip() for x in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if x.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"], allow_credentials=True)

projects: dict[str, Project] = {PROJECT.id: PROJECT}
tasks: dict[str, list[ReviewTask]] = {PROJECT.id: TASKS.copy()}
source_texts: dict[str, dict[str, str]] = {PROJECT.id: {"manuscript": "", "reviewer": ""}}

def extract_text(upload: UploadFile, payload: bytes) -> str:
    suffix = Path(upload.filename or "").suffix.lower()
    if suffix == ".docx":
        doc = Document(io.BytesIO(payload))
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    if suffix == ".pdf":
        reader = PdfReader(io.BytesIO(payload))
        return "\n".join((page.extract_text() or "") for page in reader.pages)
    return payload.decode("utf-8", errors="ignore")

@app.get("/api/health")
def health():
    return {"status": "ok", "mode": os.getenv("APP_MODE", "demo")}

@app.get("/api/projects", response_model=list[Project])
def list_projects():
    return list(projects.values())

@app.post("/api/projects", response_model=Project)
def create_project(payload: ProjectCreate):
    pid = f"pp-{uuid.uuid4().hex[:6]}"
    project = Project(id=pid, title=payload.title, journal=payload.journal, deadline=payload.deadline, progress=0, updated_at="Just now", manuscripts=0, comments=0)
    projects[pid] = project
    tasks[pid] = []
    source_texts[pid] = {"manuscript": "", "reviewer": ""}
    return project

@app.post("/api/projects/{project_id}/upload", response_model=UploadSummary)
async def upload_file(project_id: str, kind: str, file: Annotated[UploadFile, File(...)]):
    if project_id not in projects:
        raise HTTPException(status_code=404, detail="Project not found")
    if kind not in {"manuscript", "reviewer", "journal", "bibliography"}:
        raise HTTPException(status_code=400, detail="Unsupported upload kind")
    payload = await file.read()
    text = extract_text(file, payload)
    source_texts[project_id][kind] = text
    project = projects[project_id]
    if kind == "manuscript": project.manuscripts = max(project.manuscripts, 1)
    if kind == "reviewer": project.comments = max(project.comments, len(text.splitlines()))
    return UploadSummary(filename=file.filename or "upload", kind=kind, chars_extracted=len(text))

@app.post("/api/projects/{project_id}/analyze", response_model=AnalysisResponse)
def analyze(project_id: str):
    if project_id not in projects:
        raise HTTPException(status_code=404, detail="Project not found")
    result = run_demo_analysis(projects[project_id], source_texts[project_id].get("reviewer", ""), source_texts[project_id].get("manuscript", ""))
    tasks[project_id] = result.tasks
    project = projects[project_id]
    project.comments = len(result.tasks)
    project.progress = 18 if not result.tasks else 42
    return result

@app.get("/api/projects/{project_id}/tasks", response_model=list[ReviewTask])
def get_tasks(project_id: str):
    if project_id not in tasks:
        raise HTTPException(status_code=404, detail="Project not found")
    return tasks[project_id]

@app.get("/api/projects/{project_id}/trace")
def get_trace(project_id: str):
    if project_id not in projects:
        raise HTTPException(status_code=404, detail="Project not found")
    return TRACE

@app.patch("/api/projects/{project_id}/tasks/{task_id}", response_model=ReviewTask)
def update_task(project_id: str, task_id: str, payload: TaskUpdate):
    task_list = tasks.get(project_id)
    if not task_list:
        raise HTTPException(status_code=404, detail="Project or tasks not found")
    for task in task_list:
        if task.id == task_id:
            task.status = payload.status
            approved = sum(1 for x in task_list if x.status == "Approved")
            projects[project_id].progress = min(95, 42 + approved * 8)
            return task
    raise HTTPException(status_code=404, detail="Task not found")

@app.get("/api/projects/{project_id}/export/response-letter")
def export_response_letter(project_id: str):
    if project_id not in projects:
        raise HTTPException(status_code=404, detail="Project not found")
    doc = Document()
    doc.add_heading("Response to Reviewers", 0)
    doc.add_paragraph(f"Manuscript: {projects[project_id].title}")
    doc.add_paragraph(f"Prepared: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}")
    doc.add_paragraph("We sincerely thank the reviewers for their careful evaluation and constructive comments. Our point-by-point responses are provided below.")
    for task in tasks.get(project_id, []):
        doc.add_heading(f"{task.id} · {task.title}", level=2)
        doc.add_paragraph("Comment", style="Heading 3")
        doc.add_paragraph(task.comment)
        doc.add_paragraph("Response", style="Heading 3")
        doc.add_paragraph(task.response_draft)
        doc.add_paragraph("Change in manuscript", style="Heading 3")
        doc.add_paragraph(f"{task.manuscript_section}: {task.suggested_change}")
    stream = io.BytesIO()
    doc.save(stream)
    stream.seek(0)
    headers = {"Content-Disposition": 'attachment; filename="paperpilot_response_to_reviewers.docx"'}
    return StreamingResponse(stream, media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", headers=headers)
