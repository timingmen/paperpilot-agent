import { describe, expect, test } from 'vitest'
import { priorityLabel, statusLabel, uiText } from './i18n'

describe('Chinese interface copy', () => {
  test('uses Chinese labels for navigation and actions', () => {
    expect(uiText.navigation.workspace).toBe('修订工作台')
    expect(uiText.actions.launchAnalysis).toBe('启动分析')
    expect(uiText.actions.exportDocx).toBe('导出 DOCX')
  })

  test('renders workflow values as Chinese labels without changing stored values', () => {
    expect(statusLabel('Needs review')).toBe('待复核')
    expect(statusLabel('In progress')).toBe('处理中')
    expect(statusLabel('Approved')).toBe('已批准')
    expect(priorityLabel('High')).toBe('高')
  })
})
