from __future__ import annotations
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field

Priority = Literal["High", "Medium", "Low"]
Status = Literal["Needs review", "Approved", "In progress", "Blocked"]

class ProjectCreate(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    journal: str = Field(default="Target journal")
    deadline: str | None = None

class Project(BaseModel):
    id: str
    title: str
    journal: str
    deadline: str | None = None
    progress: int = 0
    updated_at: str
    manuscripts: int = 0
    comments: int = 0

class Evidence(BaseModel):
    source: str
    location: str
    excerpt: str
    score: float

class ReviewTask(BaseModel):
    id: str
    reviewer: str
    title: str
    comment: str
    category: str
    priority: Priority
    status: Status
    manuscript_section: str
    rationale: str
    suggested_change: str
    response_draft: str
    evidence: list[Evidence] = []
 
class TraceEvent(BaseModel):
    agent: str
    action: str
    status: Literal["done", "running", "waiting"]
    elapsed: str
    detail: str

class AnalysisResponse(BaseModel):
    project: Project
    tasks: list[ReviewTask]
    trace: list[TraceEvent]

class TaskUpdate(BaseModel):
    status: Status

class UploadSummary(BaseModel):
    filename: str
    kind: str
    chars_extracted: int
