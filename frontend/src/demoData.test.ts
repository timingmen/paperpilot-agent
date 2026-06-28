import { describe, expect, test } from 'vitest'
import { generatedOutputLanguage, seedTasks, seedTrace } from './demoData'

describe('demo generated content language', () => {
  test('keeps generated paper-revision content in English', () => {
    const generatedText = JSON.stringify({ seedTasks, seedTrace })

    expect(generatedOutputLanguage).toBe('English')
    expect(generatedText).toContain('Report training cost and deployment footprint')
    expect(generatedText).not.toMatch(/[\u4e00-\u9fff]/)
  })
})
