from __future__ import annotations

from pathlib import Path
import unittest

from app.models import Project, ReviewTask
from app.store import JsonProjectStore


def make_project(pid: str = "pp-test") -> Project:
    return Project(
        id=pid,
        title="Revision project",
        journal="Target journal",
        deadline=None,
        progress=0,
        updated_at="Just now",
        manuscripts=0,
        comments=0,
    )


def make_task(tid: str = "R1-C1", status: str = "Needs review") -> ReviewTask:
    return ReviewTask(
        id=tid,
        reviewer="Reviewer 1",
        title="Clarify methods",
        comment="Please clarify how the evaluation protocol was configured.",
        category="Clarity",
        priority="Medium",
        status=status,
        manuscript_section="Methods",
        rationale="The reviewer asks for an explicit protocol detail.",
        suggested_change="Add one sentence to Methods.",
        response_draft="We clarified the evaluation protocol.",
        evidence=[],
    )


class StoreTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmpdir = Path(__file__).parent / ".tmp-test-state"
        self.tmpdir.mkdir(exist_ok=True)
        for path in self.tmpdir.glob("*"):
            path.unlink()

    def tearDown(self) -> None:
        for path in self.tmpdir.glob("*"):
            path.unlink()
        self.tmpdir.rmdir()

    def test_store_persists_projects_tasks_and_source_text(self) -> None:
        store_path = self.tmpdir / "paperpilot-state.json"
        store = JsonProjectStore(store_path, seed_demo=False)

        project = make_project()
        task = make_task()
        store.upsert_project(project)
        store.save_tasks(project.id, [task])
        store.save_source_text(project.id, "reviewer", "1. Please clarify the method.")

        reloaded = JsonProjectStore(store_path, seed_demo=False)

        self.assertEqual(reloaded.get_project(project.id), project)
        self.assertEqual(reloaded.get_tasks(project.id), [task])
        self.assertEqual(reloaded.get_source_text(project.id, "reviewer"), "1. Please clarify the method.")

    def test_store_updates_task_status_and_recomputes_progress(self) -> None:
        store = JsonProjectStore(self.tmpdir / "paperpilot-state.json", seed_demo=False)
        project = make_project()
        store.upsert_project(project)
        store.save_tasks(project.id, [make_task("R1-C1"), make_task("R1-C2")])

        updated = store.update_task_status(project.id, "R1-C1", "Approved")

        self.assertEqual(updated.status, "Approved")
        self.assertEqual(store.get_project(project.id).progress, 50)
        self.assertEqual([task.status for task in store.get_tasks(project.id)], ["Approved", "Needs review"])

    def test_store_rejects_unknown_project_or_task(self) -> None:
        store = JsonProjectStore(self.tmpdir / "paperpilot-state.json", seed_demo=False)

        with self.assertRaises(KeyError):
            store.get_project("missing")

        store.upsert_project(make_project())

        with self.assertRaises(KeyError):
            store.update_task_status("pp-test", "missing", "Approved")


if __name__ == "__main__":
    unittest.main()
