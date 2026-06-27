from __future__ import annotations

import unittest

from app.agent_service import RuleBasedAgentProvider, get_agent_provider
from app.models import Project


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


if __name__ == "__main__":
    unittest.main()
