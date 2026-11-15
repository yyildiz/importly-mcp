import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { guideTools, buildIntegrationGuide } from '../src/tools/guide.js'

const LANGUAGES = ['node', 'nextjs', 'python', 'curl'] as const
const USE_CASES = ['import', 'transcribe', 'metadata'] as const

describe('get_integration_guide', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.stubEnv('IMPORTLY_API_KEY', '')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('is registered as a single tool', () => {
    expect(guideTools.map(t => t.name)).toEqual(['get_integration_guide'])
  })

  it('works without an API key and makes no network calls', async () => {
    const text = await guideTools[0].handler({ language: 'node', useCase: 'import' })
    expect(text).toContain('IMPORTLY_API_KEY')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('defaults to node + import', async () => {
    const text = await guideTools[0].handler({})
    expect(text).toBe(buildIntegrationGuide('node', 'import'))
  })

  for (const language of LANGUAGES) {
    for (const useCase of USE_CASES) {
      it(`${language}/${useCase}: env-var key, right endpoint, webhook + polling, docs links`, () => {
        const guide = buildIntegrationGuide(language, useCase)
        expect(guide).toContain('IMPORTLY_API_KEY')
        expect(guide).not.toMatch(/Bearer [a-zA-Z0-9_]{12,}/)
        expect(guide).toContain(`https://api.importly.io/${useCase}`)
        expect(guide).toContain(`/${useCase}/status?id=`)
        expect(guide).toContain('webhookUrl')
        expect(guide).toContain('https://importly.io/llms-full.txt')
        expect(guide).toContain(`https://importly.io/docs/endpoints/${useCase}.md`)
      })
    }
  }

  it('tells the agent where the result lives for each use case', () => {
    expect(buildIntegrationGuide('node', 'import')).toContain('result.mediaUrl')
    expect(buildIntegrationGuide('node', 'transcribe')).toContain('result.text')
  })

  it('warns against exposing the key to the browser', () => {
    expect(buildIntegrationGuide('nextjs', 'import')).toMatch(/never .*browser|server-side only/i)
  })
})
