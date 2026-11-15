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

  it('transcribe_media submits url and optional language', async () => {
    mockFetch.mockReturnValue(jsonResponse({ success: true, data: { jobId: 'j3', status: 'queued' } }))
    const text = await tool('transcribe_media').handler({ url: 'https://youtube.com/watch?v=x', language: 'en' })
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toContain('/transcribe')
    expect(JSON.parse(init.body)).toEqual({ url: 'https://youtube.com/watch?v=x', language: 'en' })
    expect(text).toContain('check_transcription')
  })

  it('transcribe_media passes provider through for videos without captions', async () => {
    mockFetch.mockReturnValue(jsonResponse({ success: true, data: { jobId: 'j4', status: 'queued' } }))
    await tool('transcribe_media').handler({ url: 'https://tiktok.com/@a/video/1', provider: 'importly', maxCostDollars: 0.5 })
    const [, init] = mockFetch.mock.calls[0]
    expect(JSON.parse(init.body)).toEqual({ url: 'https://tiktok.com/@a/video/1', provider: 'importly', maxCostDollars: 0.5 })
  })

  it('transcribe_media explains when to use provider importly', () => {
    const { description, inputSchema } = tool('transcribe_media')
    expect(description).toContain('provider')
    expect(inputSchema.provider).toBeDefined()
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
