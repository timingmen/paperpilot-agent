from __future__ import annotations
from .models import Project, ReviewTask, Evidence, TraceEvent

PROJECT = Project(
    id="pp-001",
    title="Feature Enhancement and Viewpoint-Aware Alignment",
    journal="Sensors · Major revision",
    deadline="2026-07-05",
    progress=68,
    updated_at="Just now",
    manuscripts=4,
    comments=11,
)

TASKS = [
    ReviewTask(
        id="R2-C3",
        reviewer="Reviewer 2",
        title="Report training cost and deployment footprint",
        comment="The manuscript does not adequately discuss computational requirements. Please report the training hardware, total training time, memory footprint, and practical inference cost.",
        category="Reproducibility",
        priority="High",
        status="Needs review",
        manuscript_section="Section 4.5.7 · Computational footprint",
        rationale="The reviewer requests concrete resource reporting. Adding reproducibility details makes the claimed efficiency verifiable without changing the method narrative.",
        suggested_change="Add a compact subsection reporting 80 epochs on 2× NVIDIA L20 GPUs, average epoch duration, total training duration, peak allocated and reserved memory, input resolution, batch size, and single-image inference latency. Clarify whether the reported latency excludes data loading and post-processing.",
        response_draft="Thank you for this constructive suggestion. We added Section 4.5.7, ‘Computational Footprint,’ to report the training hardware, configuration, total pure training time, peak GPU memory usage, and inference latency. We also clarified the measurement protocol and distinguished inference from data loading and post-processing.",
        evidence=[
            Evidence(source="Manuscript", location="Section 4.5", excerpt="The current efficiency table reports inference parameters and latency, but training resources are not stated.", score=0.96),
            Evidence(source="Experiment log", location="run_fvaa_l20.log", excerpt="80 epochs · batch 32 · average epoch 5.8 min · peak allocated 8.73 GB/GPU.", score=0.92),
        ],
    ),
    ReviewTask(
        id="R2-C7",
        reviewer="Reviewer 2",
        title="Strengthen uncertainty and navigation reliability analysis",
        comment="Please provide a more explicit analysis of retrieval confidence and explain how the method could support operational decision-making in GNSS-limited navigation.",
        category="Reliability",
        priority="High",
        status="In progress",
        manuscript_section="Section 5.2 · Reliability-aware retrieval",
        rationale="The core request is not a new model but evidence that the prediction score can guide acceptance, fallback, or human review in a navigation workflow.",
        suggested_change="Introduce margin and entropy as confidence indicators. Partition queries into high-, medium-, and low-confidence groups, report Top-1 performance, and add an operational policy: accept high-confidence matches, use medium-confidence matches with temporal/geometric verification, and trigger fallback for low-confidence queries.",
        response_draft="We appreciate this important comment. We added a reliability analysis based on retrieval margin and entropy, including group-level Top-1 accuracy. The revised discussion now explains how these indicators can support an acceptance, verification, or fallback decision in GNSS-limited navigation.",
        evidence=[
            Evidence(source="Experiment table", location="Reliability analysis", excerpt="High-confidence group: 100.00% Top-1; medium: 96.70%; low: 70.29%.", score=0.98),
            Evidence(source="Discussion draft", location="Section 5.2", excerpt="Confidence alone is insufficient for position output; it must be paired with temporal or geometric consistency checks.", score=0.88),
        ],
    ),
    ReviewTask(
        id="R3-C2",
        reviewer="Reviewer 3",
        title="Clarify contribution boundaries and failure cases",
        comment="The manuscript would benefit from a clearer distinction between the proposed modules and a more transparent discussion of cases where the alignment strategy remains challenging.",
        category="Clarity",
        priority="Medium",
        status="Needs review",
        manuscript_section="Introduction + Section 5.3",
        rationale="The paper already contains module descriptions and qualitative errors. The revision should connect these to a concise contribution statement and explicit limitations.",
        suggested_change="Rewrite the final introduction paragraph into three verifiable contributions. Add two representative failure modes: substantial scene change/occlusion and visually repetitive near-nadir areas. State why the proposed alignment reduces, but does not eliminate, these ambiguities.",
        response_draft="Thank you for the helpful recommendation. We revised the final paragraph of the Introduction to distinguish the contributions of feature enhancement and viewpoint-aware alignment. We also added representative failure cases and discussed the remaining limitations under severe appearance change and repetitive near-nadir layouts.",
        evidence=[
            Evidence(source="Figure archive", location="Failure case panel", excerpt="False retrievals predominantly arise in repeated road blocks and imagery containing large seasonal or construction changes.", score=0.90),
        ],
    ),
    ReviewTask(
        id="R1-C4",
        reviewer="Reviewer 1",
        title="Discuss urban-scene scope and GNSS modeling relation",
        comment="Please clarify the intended operating scope, especially dense urban environments, and explain how learning-based GNSS prediction complements rather than duplicates the proposed visual localization setting.",
        category="Scope",
        priority="Medium",
        status="Approved",
        manuscript_section="Introduction + Limitations",
        rationale="This is a scope and positioning request. The response should avoid overclaiming and state the complementarity of visual retrieval and GNSS estimation.",
        suggested_change="Add a short paragraph distinguishing visual cross-view localization from learning-based GNSS signal prediction. State that the present method is designed for visually informative scenes and may degrade in severe occlusion, homogeneous road corridors, and dense urban canyons.",
        response_draft="We thank the reviewer for raising this point. The revised Introduction now positions visual cross-view localization as complementary to learning-based GNSS prediction: the former contributes image-based place recognition when satellite signal quality is limited, while the latter models GNSS-related error or availability. We also clarified the limitations in dense urban canyons and visually homogeneous scenes.",
        evidence=[
            Evidence(source="Related work", location="Introduction", excerpt="Existing GNSS learning approaches estimate signal quality or position-related error; they do not directly solve cross-view image retrieval.", score=0.86),
        ],
    ),
]

TRACE = [
    TraceEvent(agent="Review Parser", action="Extracted 11 actionable reviewer comments", status="done", elapsed="8.2s", detail="Grouped comments by reviewer, request type, and urgency."),
    TraceEvent(agent="Paper Locator", action="Mapped comments to manuscript sections", status="done", elapsed="4.7s", detail="Matched headings, contribution claims, tables, and discussion paragraphs."),
    TraceEvent(agent="Evidence Retriever", action="Collected supporting snippets and logs", status="done", elapsed="6.4s", detail="Ranked manuscript excerpts, experiment logs, and related-work notes."),
    TraceEvent(agent="Revision Writer", action="Drafted revisions and response language", status="done", elapsed="12.5s", detail="Generated bounded edits with response-to-reviewers wording."),
    TraceEvent(agent="Quality Gate", action="Awaiting human approval on 3 high-impact changes", status="waiting", elapsed="—", detail="No manuscript overwrite occurs until each high-priority task is approved."),
]
