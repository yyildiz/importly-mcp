import { describe, it, expect } from 'vitest'
import { allTools } from '../src/tools/all.js'

describe('tool registration', () => {
  it('exposes exactly the 9 spec tools with unique names', () => {
    const names = allTools.map(t => t.name).sort()
    expect(names).toEqual([
      'check_balance',
      'check_basic_metadata',
      'check_import',
      'check_metadata',
      'check_transcription',
      'get_basic_metadata',
      'get_metadata',
      'import_media',
      'transcribe_media'
    ])
    expect(new Set(names).size).toBe(9)
  })

  it('every tool has a non-empty description mentioning what it does', () => {
    for (const tool of allTools) {
      expect(tool.description.length).toBeGreaterThan(40)
    }
  })
})
