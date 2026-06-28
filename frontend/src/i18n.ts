import type { Priority, Status } from './types'

export const uiText = {
  navigation: {
    overview: '总览',
    workspace: '修订工作台',
    evidence: '证据库',
    monitor: '运行监控',
    settings: '设置',
  },
  actions: {
    launchAnalysis: '启动分析',
    runningAnalysis: '分析中',
    uploadFiles: '上传文件',
    newProject: '新建项目',
    requestEdit: '请求修改',
    approve: '批准',
    exportDocx: '导出 DOCX',
  },
} as const

const statusLabels: Record<Status, string> = {
  'Needs review': '待复核',
  'In progress': '处理中',
  Approved: '已批准',
  Blocked: '已阻塞',
}

const priorityLabels: Record<Priority, string> = {
  High: '高',
  Medium: '中',
  Low: '低',
}

export function statusLabel(status: Status): string {
  return statusLabels[status]
}

export function priorityLabel(priority: Priority): string {
  return priorityLabels[priority]
}
