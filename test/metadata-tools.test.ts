import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { metadataTools } from '../src/tools/metadata.js'

const mockFetch = vi.fn()

const tool = (name: string) => {
  const found = metadataTools.find(t => t.name === name)
  if (!found) throw new Error(`tool ${name} not defined`)
  return found
}

const jsonResponse = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })

describe('metadata tools', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.stubEnv('IMPORTLY_API_KEY', 'test-key')
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it.each([
    ['get_metadata', '/metadata', 'check_metadata'],
    ['get_basic_metadata', '/metadata/basic', 'check_basic_metadata']
  ])('%s submits to %s and points at %s', async (toolName, path, checkTool) => {
    mockFetch.mockReturnValue(jsonResponse({ success: true, data: { jobId: 'j2', status: 'queued' } }))
    const text = await tool(toolName).handler({ url: 'https://youtube.com/watch?v=x' })
    expect(mockFetch.mock.calls[0][0]).toContain(path)
    expect(text).toContain(checkTool)
  })

  it.each([
    ['check_metadata', '/metadata/status'],
    ['check_basic_metadata', '/metadata/basic/status']
  ])('%s polls %s', async (toolName, path) => {
    mockFetch.mockReturnValue(jsonResponse({
      success: true,
      data: { jobId: 'j2', status: 'completed', result: { title: 'Me at the zoo', duration: 19 } }
    }))
    const text = await tool(toolName).handler({ jobId: 'j2' })
    expect(mockFetch.mock.calls[0][0]).toContain(`${path}?id=j2`)
    expect(text).toContain('Me at the zoo')
  })
})
