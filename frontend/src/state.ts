import type { Task } from './types'

export function getWorkspaceMetrics(tasks: Task[]) {
  const approved = tasks.filter((task) => task.status === 'Approved').length
  const highPriority = tasks.filter((task) => task.priority === 'High').length
  const needsApproval = tasks.filter((task) => task.status !== 'Approved').length
  const completion = tasks.length === 0 ? 0 : Math.round((approved / tasks.length) * 100)

  return {
    badge: String(tasks.length),
    approved,
    highPriority,
    needsApproval,
    completion,
  }
}
