from __future__ import annotations

import unittest
from unittest.mock import patch

from app.agent_service import AnalysisInputError, DeepSeekRagAgentProvider, RuleBasedAgentProvider, get_agent_provider
from app.deepseek_service import DeepSeekConfigurationError, GeneratedTask
from app.models import Project
from app.rag_service import RetrievedChunk


class FakeRetriever:
    def search(self, query: str, *, top_k: int = 3) -> list[RetrievedChunk]:
        return [
            RetrievedChunk(
                chunk_id="chunk-1",
                location="Paragraph 2",
                text="Training used two NVIDIA GPUs for four hours.",
                score=0.93,
            )
        ]


class FakeDraftService:
    def generate(self, reviewer_comment: str, evidence: list[RetrievedChunk]) -> GeneratedTask:
        return GeneratedTask(
            title="Report computational requirements",
            category="Reproducibility",
            priority="High",
            manuscript_section="Section 4.5 Computational footprint",
            rationale="The retrieved paragraph reports hardware but does not report peak memory.",
            suggested_change="Add GPU model, runtime, and peak memory to the methods section.",
            response_draft="Thank you for this comment. We revised Section 4.5 with the requested computational details.",
        )


class AgentProviderTests(unittest.TestCase):
    def test_demo_mode_uses_rule_based_provider(self) -> None:
        provider = get_agent_provider("demo")

        self.assertIsInstance(provider, RuleBasedAgentProvider)

    def test_rule_based_provider_returns_structured_analysis(self) -> None:
        project = Project(
            id="pp-test",
            title="Revision project",
            journal="Target journal",
            progress=0,
            updated_at="Just now",
        )
        provider = RuleBasedAgentProvider()

        result = provider.analyze(
            project,
            reviewer_text="1. Please report training hardware, runtime, and memory footprint.",
            manuscript_text="The method was trained for 80 epochs using two GPUs.",
        )

        self.assertEqual(result.project.id, project.id)
        self.assertEqual(len(result.tasks), 1)
        self.assertEqual(result.tasks[0].priority, "High")
        self.assertGreaterEqual(len(result.trace), 1)

    def test_unknown_provider_mode_fails_clearly(self) -> None:
        with self.assertRaises(ValueError):
            get_agent_provider("unknown-provider")

    def test_deepseek_rag_provider_attaches_vector_evidence_and_trace(self) -> None:
        project = Project(
            id="pp-rag",
            title="Revision project",
            journal="Target journal",
            progress=0,
            updated_at="Just now",
        )
        provider = DeepSeekRagAgentProvider(
            retriever_factory=lambda manuscript: FakeRetriever(),
            draft_service=FakeDraftService(),
            top_k=2,
        )

        result = provider.analyze(
            project,
            reviewer_text="1. Please report training hardware, runtime, and peak memory usage.",
            manuscript_text="Training used two NVIDIA GPUs for four hours.",
        )

        self.assertEqual(len(result.tasks), 1)
        self.assertEqual(result.tasks[0].evidence[0].score, 0.93)
        self.assertEqual(result.tasks[0].evidence[0].source, "Manuscript vector index")
        self.assertIn("Thank you", result.tasks[0].response_draft)
        self.assertIn("Vector Index", [event.agent for event in result.trace])
        self.assertIn("DeepSeek Revision Writer", [event.agent for event in result.trace])

    def test_deepseek_rag_provider_requires_uploaded_sources(self) -> None:
        provider = DeepSeekRagAgentProvider(
            retriever_factory=lambda manuscript: FakeRetriever(),
            draft_service=FakeDraftService(),
        )
        project = Project(
            id="pp-rag",
            title="Revision project",
            journal="Target journal",
            progress=0,
            updated_at="Just now",
        )

        with self.assertRaisesRegex(AnalysisInputError, "manuscript"):
            provider.analyze(project, reviewer_text="A sufficiently detailed reviewer comment for testing.", manuscript_text="")

    def test_deepseek_rag_mode_requires_key(self) -> None:
        with patch.dict("os.environ", {"DEEPSEEK_API_KEY": ""}, clear=False):
            with self.assertRaises(DeepSeekConfigurationError):
                get_agent_provider("deepseek-rag")


if __name__ == "__main__":
    unittest.main()
