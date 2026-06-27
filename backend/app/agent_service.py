from __future__ import annotations
import os
import re
from pathlib import Path
from typing import Iterable, Protocol
from .demo_data import PROJECT, TASKS, TRACE
from .models import AnalysisResponse, Evidence, Project, ReviewTask, TraceEvent


class AgentProvider(Protocol):
    def analyze(self, project: Project, reviewer_text: str, manuscript_text: str) -> AnalysisResponse:
        ...


class RuleBasedAgentProvider:
    def analyze(self, project: Project, reviewer_text: str, manuscript_text: str) -> AnalysisResponse:
        return run_demo_analysis(project, reviewer_text, manuscript_text)


def get_agent_provider(mode: str | None = None) -> AgentProvider:
    selected = (mode or os.getenv("APP_MODE", "demo")).strip().lower()
    if selected in {"demo", "rule", "rules", "rule-based", "local"}:
        return RuleBasedAgentProvider()
    raise ValueError(f"Unsupported agent provider mode: {selected}")

KEYWORDS = {
    "training": ("Reproducibility", "Section 4.5.7 · Computational footprint"),
    "compute": ("Reproducibility", "Section 4.5.7 · Computational footprint"),
    "memory": ("Reproducibility", "Section 4.5.7 · Computational footprint"),
    "uncertainty": ("Reliability", "Section 5.2 · Reliability-aware retrieval"),
    "confidence": ("Reliability", "Section 5.2 · Reliability-aware retrieval"),
    "failure": ("Clarity", "Section 5.3 · Failure analysis"),
    "limitation": ("Scope", "Section 5.4 · Limitations"),
    "citation": ("Related work", "Section 1 · Introduction"),
}

def split_comments(text: str) -> list[str]:
    chunks = re.split(r"\n\s*(?:\d+[.)]|Reviewer\s*\d+[:.)]|Comment\s*\d+[:.)])\s*", text, flags=re.I)
    items = [c.strip() for c in chunks if len(c.strip()) > 25]
    return items[:12]

def classify(comment: str) -> tuple[str, str, str]:
    lower = comment.lower()
    for key, (category, section) in KEYWORDS.items():
        if key in lower:
            priority = "High" if key in {"training", "compute", "uncertainty", "confidence"} else "Medium"
            return category, section, priority
    return "Clarity", "Section 5 · Discussion", "Medium"

def nearest_evidence(manuscript: str, comment: str) -> list[Evidence]:
    if not manuscript.strip():
        return [Evidence(source="Demo manuscript", location="Section 4", excerpt="No manuscript text was uploaded. The suggested location is based on the reviewer comment category.", score=0.45)]
    tokens = {t for t in re.findall(r"[A-Za-z]{5,}", comment.lower())}
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", manuscript) if len(p.strip()) > 60]
    scored = []
    for i, p in enumerate(paragraphs):
        p_tokens = set(re.findall(r"[A-Za-z]{5,}", p.lower()))
        score = len(tokens & p_tokens) / max(len(tokens), 1)
        if score:
            scored.append((score, i, p))
    ranked = sorted(scored, reverse=True)[:2]
    if not ranked:
        return [Evidence(source="Manuscript", location="Global search", excerpt=manuscript[:260] + ("…" if len(manuscript) > 260 else ""), score=0.42)]
    return [Evidence(source="Manuscript", location=f"Paragraph {i + 1}", excerpt=p[:320] + ("…" if len(p) > 320 else ""), score=round(score, 2)) for score, i, p in ranked]

def craft_task(idx: int, comment: str, manuscript: str) -> ReviewTask:
    category, section, priority = classify(comment)
    title = comment.split(".")[0].strip().capitalize()
    if len(title) > 74:
        title = title[:71] + "…"
    evidence = nearest_evidence(manuscript, comment)
    response = f"Thank you for this valuable comment. We revised {section} to address the reviewer’s concern regarding {category.lower()}. The revision adds explicit evidence, narrows the claim where appropriate, and clarifies how the reported result should be interpreted."
    change = f"Revise {section} with a concise, evidence-bound paragraph directly addressing this comment. Cite the retrieved manuscript evidence, add any missing quantitative result, and avoid claiming broader generalization than the current experiments support."
    return ReviewTask(
        id=f"AUTO-C{idx}", reviewer="Reviewer comment", title=title,
        comment=comment, category=category, priority=priority, status="Needs review",
        manuscript_section=section,
        rationale="The system ranked the target section using reviewer keywords and manuscript overlap.",
        suggested_change=change, response_draft=response, evidence=evidence,
    )

def run_demo_analysis(project: Project | None = None, reviewer_text: str = "", manuscript_text: str = "") -> AnalysisResponse:
    if not reviewer_text.strip():
        return AnalysisResponse(project=project or PROJECT, tasks=TASKS, trace=TRACE)
    tasks = [craft_task(i + 1, item, manuscript_text) for i, item in enumerate(split_comments(reviewer_text))]
    dynamic_trace = [
        TraceEvent(agent="Review Parser", action=f"Extracted {len(tasks)} actionable comments", status="done", elapsed="1.8s", detail="Split reviewer text into self-contained requests."),
        TraceEvent(agent="Paper Locator", action="Ranked likely revision sections", status="done", elapsed="0.9s", detail="Used keyword and manuscript-overlap matching."),
        TraceEvent(agent="Evidence Retriever", action="Retrieved manuscript snippets", status="done", elapsed="1.2s", detail="Attached the strongest matching paragraphs to each task."),
        TraceEvent(agent="Revision Writer", action="Drafted bounded revisions and responses", status="done", elapsed="1.5s", detail="Generated non-final text for human review."),
        TraceEvent(agent="Quality Gate", action="Human approval required", status="waiting", elapsed="—", detail="High-impact changes remain blocked until approved."),
    ]
    return AnalysisResponse(project=project or PROJECT, tasks=tasks or TASKS, trace=dynamic_trace)
