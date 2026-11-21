import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { transcribeTools } from '../src/tools/transcribe.js'

const mockFetch = vi.fn()

const tool = (name: string) => {
  const found = transcribeTools.find(t => t.name === name)
  if (!found) throw new Error(`tool ${name} not defined`)
  return found
}

const jsonResponse = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })

describe('transcribe tools', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.stubEnv('IMPORTLY_API_KEY', 'test-key')
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('transcribe_media submits in mode auto and waits for the transcript', async () => {
    mockFetch.mockReturnValue(jsonResponse({ success: true, data: { jobId: 'j3', status: 'queued' } }))
    const text = await tool('transcribe_media').handler({ url: 'https://youtube.com/watch?v=x', language: 'en' })
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toContain('/transcribe')
    expect(JSON.parse(init.body)).toEqual({ url: 'https://youtube.com/watch?v=x', language: 'en', mode: 'auto', wait: 30 })
    expect(text).toContain('check_transcription')
  })

  it('transcribe_media returns the finished transcript without a polling step', async () => {
    mockFetch.mockReturnValue(jsonResponse({ success: true, data: { jobId: 'j3', status: 'completed', result: { text: 'hello' } } }))
    const text = await tool('transcribe_media').handler({ url: 'https://youtube.com/watch?v=x' })
    expect(text).toContain('hello')
    expect(text).not.toContain('Next step')
  })

  it('transcribe_media treats provider importly as mode ai', async () => {
    mockFetch.mockReturnValue(jsonResponse({ success: true, data: { jobId: 'j4', status: 'queued' } }))
    await tool('transcribe_media').handler({ url: 'https://tiktok.com/@a/video/1', provider: 'importly', maxCostDollars: 0.5 })
    const [, init] = mockFetch.mock.calls[0]
    expect(JSON.parse(init.body)).toEqual({ url: 'https://tiktok.com/@a/video/1', provider: 'importly', maxCostDollars: 0.5, mode: 'ai', wait: 30 })
  })

  it('transcribe_media explains captions vs AI speech-to-text and prices', () => {
    const { description, inputSchema } = tool('transcribe_media')
    expect(description).toContain('mode "auto"')
    expect(description).toContain('$0.003')
    expect(description).toContain('$0.01/min')
    expect(inputSchema.mode).toBeDefined()
  })

  it('check_transcription returns transcript on completion', async () => {
    mockFetch.mockReturnValue(jsonResponse({
      success: true,
      data: { jobId: 'j3', status: 'completed', result: { text: 'alright so here we are', segments: [] } }
    }))
    const text = await tool('check_transcription').handler({ jobId: 'j3' })
    expect(mockFetch.mock.calls[0][0]).toContain('/transcribe/status?id=j3')
    expect(text).toContain('alright so here we are')
  })
})
