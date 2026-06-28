from __future__ import annotations
import os
import re
from pathlib import Path
from collections.abc import Callable
from typing import Protocol

from .deepseek_service import DeepSeekDraftService, OpenAIDeepSeekClient
from .demo_data import PROJECT, TASKS, TRACE
from .models import AnalysisResponse, Evidence, Project, ReviewTask, TraceEvent
from .rag_service import FastEmbedProvider, VectorRetriever


class AgentProvider(Protocol):
    def analyze(self, project: Project, reviewer_text: str, manuscript_text: str) -> AnalysisResponse:
        ...


class AnalysisInputError(ValueError):
    pass


class RuleBasedAgentProvider:
    def analyze(self, project: Project, reviewer_text: str, manuscript_text: str) -> AnalysisResponse:
        return run_demo_analysis(project, reviewer_text, manuscript_text)


class DeepSeekRagAgentProvider:
    def __init__(
        self,
        *,
        retriever_factory: Callable[[str], VectorRetriever],
        draft_service: DeepSeekDraftService,
        top_k: int = 3,
    ) -> None:
        self.retriever_factory = retriever_factory
        self.draft_service = draft_service
        self.top_k = top_k

    def analyze(self, project: Project, reviewer_text: str, manuscript_text: str) -> AnalysisResponse:
        if not manuscript_text.strip():
            raise AnalysisInputError("A manuscript must be uploaded before running vector RAG analysis")
        if not reviewer_text.strip():
            raise AnalysisInputError("Reviewer comments must be uploaded before running vector RAG analysis")

        comments = split_comments(reviewer_text)
        if not comments:
            raise AnalysisInputError("No actionable reviewer comments were found")

        retriever = self.retriever_factory(manuscript_text)
        tasks: list[ReviewTask] = []
        for index, comment in enumerate(comments, start=1):
            retrieved = retriever.search(comment, top_k=self.top_k)
            generated = self.draft_service.generate(comment, retrieved)
            tasks.append(
                ReviewTask(
                    id=f"RAG-C{index}",
                    reviewer="Reviewer comment",
                    title=generated.title,
                    comment=comment,
                    category=generated.category,
                    priority=generated.priority,
                    status="Needs review",
                    manuscript_section=generated.manuscript_section,
                    rationale=generated.rationale,
                    suggested_change=generated.suggested_change,
                    response_draft=generated.response_draft,
                    evidence=[
                        Evidence(
                            source="Manuscript vector index",
                            location=item.location,
                            excerpt=item.text,
                            score=item.score,
                        )
                        for item in retrieved
                    ],
                )
            )

        trace = [
            TraceEvent(agent="Review Parser", action=f"Extracted {len(comments)} actionable comments", status="done", elapsed="local", detail="Split reviewer text into bounded revision requests."),
            TraceEvent(agent="Vector Index", action="Embedded manuscript chunks with BGE", status="done", elapsed="local", detail="Built a local dense-vector index for the uploaded manuscript."),
            TraceEvent(agent="Evidence Retriever", action=f"Retrieved top-{self.top_k} evidence chunks", status="done", elapsed="local", detail="Ranked normalized embedding similarity for every reviewer comment."),
            TraceEvent(agent="DeepSeek Revision Writer", action=f"Generated {len(tasks)} grounded task drafts", status="done", elapsed="API", detail="Used retrieved evidence and validated every response against the task schema."),
            TraceEvent(agent="Quality Gate", action="Human approval required", status="waiting", elapsed="-", detail="Generated text remains blocked from export until explicitly approved."),
        ]
        return AnalysisResponse(project=project, tasks=tasks, trace=trace)


def build_deepseek_rag_provider() -> DeepSeekRagAgentProvider:
    api_key = os.getenv("DEEPSEEK_API_KEY", "")
    model = os.getenv("DEEPSEEK_MODEL", "deepseek-v4-flash")
    base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    embedding_model = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
    cache_dir = Path(os.getenv("EMBEDDING_CACHE_DIR", str(Path.home() / ".cache" / "paperpilot" / "fastembed")))
    chunk_chars = int(os.getenv("RAG_CHUNK_CHARS", "900"))
    chunk_overlap = int(os.getenv("RAG_CHUNK_OVERLAP", "150"))
    top_k = int(os.getenv("RAG_TOP_K", "3"))

    embedder = FastEmbedProvider(embedding_model, cache_dir)
    client = OpenAIDeepSeekClient(api_key=api_key, model=model, base_url=base_url)
    draft_service = DeepSeekDraftService(client)

    def create_retriever(manuscript_text: str) -> VectorRetriever:
        return VectorRetriever.from_text(
            manuscript_text,
            embedder,
            chunk_chars=chunk_chars,
            overlap_chars=chunk_overlap,
        )

    return DeepSeekRagAgentProvider(
        retriever_factory=create_retriever,
        draft_service=draft_service,
        top_k=top_k,
    )


def get_agent_provider(mode: str | None = None) -> AgentProvider:
    selected = (mode or os.getenv("APP_MODE", "demo")).strip().lower()
    if selected in {"demo", "rule", "rules", "rule-based", "local"}:
        return RuleBasedAgentProvider()
    if selected in {"deepseek-rag", "deepseek", "rag"}:
        return build_deepseek_rag_provider()
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
