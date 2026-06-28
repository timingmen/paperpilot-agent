import type { Project, Task, Trace } from './types'

export const generatedOutputLanguage = 'English'

export const seedProject: Project = {
  id: 'pp-001',
  title: 'Feature Enhancement and Viewpoint-Aware Alignment',
  journal: 'Sensors - Major revision',
  deadline: '2026-07-05',
  progress: 25,
  updated_at: 'Just now',
  manuscripts: 4,
  comments: 4,
}

export const seedTasks: Task[] = [
  {
    id: 'R2-C3',
    reviewer: 'Reviewer 2',
    title: 'Report training cost and deployment footprint',
    comment: 'The manuscript does not adequately discuss computational requirements. Please report training hardware, total training time, memory footprint, and practical inference cost.',
    category: 'Reproducibility',
    priority: 'High',
    status: 'Needs review',
    manuscript_section: 'Section 4.5.7 - Computational footprint',
    rationale: 'Adding reproducibility details makes the efficiency claim verifiable without changing the method narrative.',
    suggested_change: 'Add a compact subsection reporting 80 epochs on 2x NVIDIA L20 GPUs, average epoch duration, total pure training time, peak allocated and reserved memory, input resolution, batch size, and single-image inference latency.',
    response_draft: 'Thank you for this constructive suggestion. We added Section 4.5.7, "Computational Footprint," to report the training hardware, configuration, total pure training time, peak GPU memory usage, and inference latency.',
    evidence: [
      { source: 'Experiment log', location: 'run_fvaa_l20.log', excerpt: '80 epochs - batch 32 - average epoch 5.8 min - peak allocated 8.73 GB/GPU.', score: 0.92 },
      { source: 'Manuscript', location: 'Section 4.5', excerpt: 'The current efficiency table reports inference parameters and latency, but training resources are not stated.', score: 0.96 },
    ],
  },
  {
    id: 'R2-C7',
    reviewer: 'Reviewer 2',
    title: 'Strengthen uncertainty and navigation reliability analysis',
    comment: 'Please provide a more explicit analysis of retrieval confidence and explain how the method could support operational decision-making in GNSS-limited navigation.',
    category: 'Reliability',
    priority: 'High',
    status: 'In progress',
    manuscript_section: 'Section 5.2 - Reliability-aware retrieval',
    rationale: 'The reviewer needs evidence that confidence can drive an acceptance, verification, or fallback decision.',
    suggested_change: 'Introduce margin and entropy as confidence indicators. Partition queries into high-, medium-, and low-confidence groups, report Top-1 performance, and add an operational policy.',
    response_draft: 'We appreciate this important comment. We added a reliability analysis based on retrieval margin and entropy, including group-level Top-1 accuracy and a practical acceptance/verification/fallback decision policy.',
    evidence: [
      { source: 'Experiment table', location: 'Reliability analysis', excerpt: 'High confidence: 100.00% Top-1; medium: 96.70%; low: 70.29%.', score: 0.98 },
    ],
  },
  {
    id: 'R3-C2',
    reviewer: 'Reviewer 3',
    title: 'Clarify contribution boundaries and failure cases',
    comment: 'The manuscript would benefit from a clearer distinction between proposed modules and a more transparent discussion of cases where the alignment strategy remains challenging.',
    category: 'Clarity',
    priority: 'Medium',
    status: 'Needs review',
    manuscript_section: 'Introduction + Section 5.3',
    rationale: 'The requested change is mainly structural: distinguish the modules and connect qualitative errors to limitations.',
    suggested_change: 'Rewrite the final introduction paragraph into three verifiable contributions. Add two representative failure modes: substantial scene change/occlusion and visually repetitive near-nadir areas.',
    response_draft: 'Thank you for the helpful recommendation. We revised the final paragraph of the Introduction to distinguish the modules and added representative failure cases with a discussion of remaining ambiguities.',
    evidence: [
      { source: 'Figure archive', location: 'Failure case panel', excerpt: 'False retrievals arise in repeated road blocks and large seasonal or construction changes.', score: 0.9 },
    ],
  },
  {
    id: 'R1-C4',
    reviewer: 'Reviewer 1',
    title: 'Discuss urban-scene scope and GNSS modeling relation',
    comment: 'Please clarify the intended operating scope, especially dense urban environments, and explain how learning-based GNSS prediction complements rather than duplicates visual localization.',
    category: 'Scope',
    priority: 'Medium',
    status: 'Approved',
    manuscript_section: 'Introduction + Limitations',
    rationale: 'This comment asks for positioning and boundary conditions, not an additional experiment.',
    suggested_change: 'Add a short paragraph distinguishing visual cross-view localization from learning-based GNSS signal prediction and state the known limits in urban canyons and visually homogeneous corridors.',
    response_draft: 'We thank the reviewer for raising this point. The revised Introduction positions visual cross-view localization as complementary to learning-based GNSS prediction and clarifies its limitations in dense urban canyons and visually homogeneous scenes.',
    evidence: [
      { source: 'Related work', location: 'Introduction', excerpt: 'GNSS learning approaches estimate signal quality or position-related error; they do not directly solve cross-view image retrieval.', score: 0.86 },
    ],
  },
]

export const seedTrace: Trace[] = [
  { agent: 'Review Parser', action: 'Extracted 4 actionable reviewer comments', status: 'done', elapsed: '8.2s', detail: 'Grouped comments by reviewer, request type, and urgency.' },
  { agent: 'Paper Locator', action: 'Mapped comments to manuscript sections', status: 'done', elapsed: '4.7s', detail: 'Matched headings, contribution claims, tables, and discussion paragraphs.' },
  { agent: 'Evidence Retriever', action: 'Collected supporting snippets and logs', status: 'done', elapsed: '6.4s', detail: 'Ranked manuscript excerpts, experiment logs, and related-work notes.' },
  { agent: 'Revision Writer', action: 'Drafted revisions and response language', status: 'done', elapsed: '12.5s', detail: 'Generated bounded edits with response-to-reviewers wording.' },
  { agent: 'Quality Gate', action: 'Awaiting human approval on 3 revision decisions', status: 'waiting', elapsed: '-', detail: 'No manuscript overwrite occurs until high-priority tasks are approved.' },
]
