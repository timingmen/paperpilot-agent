import { describe, expect, it } from 'vitest'
import { getWorkspaceMetrics } from './state'
import type { Task } from './types'

function makeTask(id: string, status: Task['status'], priority: Task['priority']): Task {
  return {
    id,
    reviewer: 'Reviewer 1',
    title: 'Clarify methods',
    comment: 'Please clarify the evaluation protocol.',
    category: 'Clarity',
    priority,
    status,
    manuscript_section: 'Methods',
    rationale: 'The reviewer asks for a precise protocol detail.',
    suggested_change: 'Add one sentence.',
    response_draft: 'We clarified the evaluation protocol.',
    evidence: [],
  }
}

describe('getWorkspaceMetrics', () => {
  it('derives queue counts and approval progress from tasks', () => {
    const metrics = getWorkspaceMetrics([
      makeTask('R1-C1', 'Approved', 'High'),
      makeTask('R1-C2', 'Needs review', 'Medium'),
      makeTask('R1-C3', 'In progress', 'Low'),
    ])

    expect(metrics.badge).toBe('3')
    expect(metrics.approved).toBe(1)
    expect(metrics.highPriority).toBe(1)
    expect(metrics.needsApproval).toBe(2)
    expect(metrics.completion).toBe(33)
  })

  it('handles an empty queue without divide-by-zero artifacts', () => {
    const metrics = getWorkspaceMetrics([])

    expect(metrics.badge).toBe('0')
    expect(metrics.approved).toBe(0)
    expect(metrics.needsApproval).toBe(0)
    expect(metrics.completion).toBe(0)
  })
})
