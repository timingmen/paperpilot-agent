import type React from 'react'

export type Priority = 'High' | 'Medium' | 'Low'
export type Status = 'Needs review' | 'Approved' | 'In progress' | 'Blocked'
export type Evidence = { source: string; location: string; excerpt: string; score: number }
export type Task = {
  id: string
  reviewer: string
  title: string
  comment: string
  category: string
  priority: Priority
  status: Status
  manuscript_section: string
  rationale: string
  suggested_change: string
  response_draft: string
  evidence: Evidence[]
}
export type Project = {
  id: string
  title: string
  journal: string
  deadline?: string | null
  progress: number
  updated_at: string
  manuscripts: number
  comments: number
}
export type Trace = {
  agent: string
  action: string
  status: 'done' | 'running' | 'waiting'
  elapsed: string
  detail: string
}

export type IconNode = React.ReactNode
