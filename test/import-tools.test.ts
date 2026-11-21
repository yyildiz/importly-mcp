import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { importTools } from '../src/tools/import.js'

const mockFetch = vi.fn()

const tool = (name: string) => {
  const found = importTools.find(t => t.name === name)
  if (!found) throw new Error(`tool ${name} not defined`)
  return found
}

const jsonResponse = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })

describe('import tools', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.stubEnv('IMPORTLY_API_KEY', 'test-key')
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('import_media submits and returns jobId with polling guidance', async () => {
    mockFetch.mockReturnValue(jsonResponse({ success: true, data: { jobId: 'j1', status: 'queued' } }))
    const text = await tool('import_media').handler({ url: 'https://youtube.com/watch?v=x', videoQuality: '720p' })
    expect(text).toContain('"jobId": "j1"')
    expect(text).toContain('check_import')
    const [, init] = mockFetch.mock.calls[0]
    expect(JSON.parse(init.body)).toEqual({ url: 'https://youtube.com/watch?v=x', videoQuality: '720p', fitQualityToBalance: true })
  })

  it('check_import names the quality used when the balance lowered it', async () => {
    mockFetch.mockReturnValue(jsonResponse({ success: true, data: { jobId: 'j1', status: 'completed', result: { videoQuality: '480p', requestedVideoQuality: '1080p' } } }))
    const text = await tool('check_import').handler({ jobId: 'j1' })
    expect(text).toContain('Downloaded at 480p, not the requested 1080p')
  })

  it('check_import passes the job id and repeats guidance while running', async () => {
    mockFetch.mockReturnValue(jsonResponse({ success: true, data: { jobId: 'j1', status: 'running' } }))
    const text = await tool('check_import').handler({ jobId: 'j1' })
    expect(mockFetch.mock.calls[0][0]).toContain('/import/status?id=j1')
    expect(text).toContain('running')
    expect(text).toContain('poll')
  })

  it('check_import returns the bare result when completed', async () => {
    mockFetch.mockReturnValue(jsonResponse({
      success: true,
      data: { jobId: 'j1', status: 'completed', result: { downloadUrl: 'https://cdn.test/f.mp4' } }
    }))
    const text = await tool('check_import').handler({ jobId: 'j1' })
    expect(text).toContain('downloadUrl')
    expect(text).not.toContain('poll again')
  })
})
