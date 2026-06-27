from __future__ import annotations

import json
import os
import threading
from pathlib import Path
from typing import Any

from .demo_data import PROJECT, TASKS, TRACE
from .models import Project, ReviewTask, TraceEvent

DEFAULT_UPLOAD_KINDS = ("manuscript", "reviewer", "journal", "bibliography")


def _dump_model(model: Any) -> dict[str, Any]:
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return model.dict()


def _task_progress(items: list[ReviewTask]) -> int:
    if not items:
        return 0
    approved = sum(1 for item in items if item.status == "Approved")
    return round((approved / len(items)) * 100)


class JsonProjectStore:
    """Small JSON-backed store for demo deployments and portfolio walkthroughs."""

    def __init__(self, path: str | os.PathLike[str], *, seed_demo: bool = True) -> None:
        self.path = Path(path)
        self._lock = threading.RLock()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self._write_state(self._seed_state() if seed_demo else self._empty_state())

    @staticmethod
    def _empty_state() -> dict[str, Any]:
        return {"projects": {}, "tasks": {}, "source_texts": {}, "traces": {}}

    @staticmethod
    def _seed_state() -> dict[str, Any]:
        project = PROJECT.model_copy(deep=True)
        seeded_tasks = [task.model_copy(deep=True) for task in TASKS]
        project.comments = len(seeded_tasks)
        project.progress = _task_progress(seeded_tasks)
        return {
            "projects": {project.id: _dump_model(project)},
            "tasks": {project.id: [_dump_model(task) for task in seeded_tasks]},
            "source_texts": {project.id: {kind: "" for kind in DEFAULT_UPLOAD_KINDS}},
            "traces": {project.id: [_dump_model(event) for event in TRACE]},
        }

    def _read_state(self) -> dict[str, Any]:
        with self._lock:
            if not self.path.exists():
                return self._empty_state()
            with self.path.open("r", encoding="utf-8") as handle:
                data = json.load(handle)
            state = self._empty_state()
            state.update({key: data.get(key, state[key]) for key in state})
            return state

    def _write_state(self, state: dict[str, Any]) -> None:
        with self._lock:
            tmp_path = self.path.with_suffix(f"{self.path.suffix}.tmp")
            with tmp_path.open("w", encoding="utf-8") as handle:
                json.dump(state, handle, ensure_ascii=False, indent=2)
                handle.write("\n")
            os.replace(tmp_path, self.path)

    def list_projects(self) -> list[Project]:
        state = self._read_state()
        return [Project.model_validate(item) for item in state["projects"].values()]

    def get_project(self, project_id: str) -> Project:
        state = self._read_state()
        try:
            return Project.model_validate(state["projects"][project_id])
        except KeyError as exc:
            raise KeyError(f"Project not found: {project_id}") from exc

    def upsert_project(self, project: Project) -> Project:
        state = self._read_state()
        state["projects"][project.id] = _dump_model(project)
        state["tasks"].setdefault(project.id, [])
        state["source_texts"].setdefault(project.id, {kind: "" for kind in DEFAULT_UPLOAD_KINDS})
        state["traces"].setdefault(project.id, [])
        self._write_state(state)
        return project

    def get_tasks(self, project_id: str) -> list[ReviewTask]:
        state = self._read_state()
        if project_id not in state["projects"]:
            raise KeyError(f"Project not found: {project_id}")
        return [ReviewTask.model_validate(item) for item in state["tasks"].get(project_id, [])]

    def save_tasks(self, project_id: str, items: list[ReviewTask]) -> list[ReviewTask]:
        state = self._read_state()
        if project_id not in state["projects"]:
            raise KeyError(f"Project not found: {project_id}")
        state["tasks"][project_id] = [_dump_model(item) for item in items]
        self._write_state(state)
        return items

    def update_task_status(self, project_id: str, task_id: str, status: str) -> ReviewTask:
        state = self._read_state()
        if project_id not in state["projects"]:
            raise KeyError(f"Project not found: {project_id}")
        items = [ReviewTask.model_validate(item) for item in state["tasks"].get(project_id, [])]
        for index, task in enumerate(items):
            if task.id == task_id:
                updated = task.model_copy(update={"status": status})
                items[index] = updated
                state["tasks"][project_id] = [_dump_model(item) for item in items]
                project = Project.model_validate(state["projects"][project_id])
                project.progress = _task_progress(items)
                project.comments = len(items)
                state["projects"][project_id] = _dump_model(project)
                self._write_state(state)
                return updated
        raise KeyError(f"Task not found: {task_id}")

    def get_source_text(self, project_id: str, kind: str) -> str:
        state = self._read_state()
        if project_id not in state["projects"]:
            raise KeyError(f"Project not found: {project_id}")
        return state["source_texts"].get(project_id, {}).get(kind, "")

    def get_source_texts(self, project_id: str) -> dict[str, str]:
        state = self._read_state()
        if project_id not in state["projects"]:
            raise KeyError(f"Project not found: {project_id}")
        values = {kind: "" for kind in DEFAULT_UPLOAD_KINDS}
        values.update(state["source_texts"].get(project_id, {}))
        return values

    def save_source_text(self, project_id: str, kind: str, text: str) -> None:
        state = self._read_state()
        if project_id not in state["projects"]:
            raise KeyError(f"Project not found: {project_id}")
        state["source_texts"].setdefault(project_id, {kind: "" for kind in DEFAULT_UPLOAD_KINDS})
        state["source_texts"][project_id][kind] = text
        self._write_state(state)

    def get_trace(self, project_id: str) -> list[TraceEvent]:
        state = self._read_state()
        if project_id not in state["projects"]:
            raise KeyError(f"Project not found: {project_id}")
        return [TraceEvent.model_validate(item) for item in state["traces"].get(project_id, [])]

    def save_trace(self, project_id: str, items: list[TraceEvent]) -> list[TraceEvent]:
        state = self._read_state()
        if project_id not in state["projects"]:
            raise KeyError(f"Project not found: {project_id}")
        state["traces"][project_id] = [_dump_model(item) for item in items]
        self._write_state(state)
        return items
