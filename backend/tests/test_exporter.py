from __future__ import annotations

import io
import unittest

from docx import Document

from app.exporter import build_response_letter_docx
from app.models import Project
from backend.tests.test_store import make_task


class ExporterTests(unittest.TestCase):
    def test_response_letter_includes_only_approved_tasks(self) -> None:
        project = Project(
            id="pp-test",
            title="Revision project",
            journal="Target journal",
            progress=0,
            updated_at="Just now",
        )
        approved = make_task("R1-C1", "Approved")
        unapproved = make_task("R1-C2", "Needs review")

        payload = build_response_letter_docx(project, [approved, unapproved])

        document = Document(io.BytesIO(payload))
        text = "\n".join(paragraph.text for paragraph in document.paragraphs)
        self.assertIn("R1-C1", text)
        self.assertIn("Please clarify how the evaluation protocol was configured.", text)
        self.assertNotIn("R1-C2", text)

    def test_response_letter_requires_at_least_one_approved_task(self) -> None:
        project = Project(
            id="pp-test",
            title="Revision project",
            journal="Target journal",
            progress=0,
            updated_at="Just now",
        )

        with self.assertRaises(ValueError):
            build_response_letter_docx(project, [make_task("R1-C1", "Needs review")])


if __name__ == "__main__":
    unittest.main()
