import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { importlyRequest, ImportlyApiError, MISSING_KEY_MESSAGE, setClientInfo } from '../src/client.js'
import { VERSION } from '../src/version.js'

const mockFetch = vi.fn()

describe('importlyRequest', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.stubEnv('IMPORTLY_API_KEY', 'test-key')
    vi.stubEnv('IMPORTLY_API_URL', 'https://api.test.local')
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  const jsonResponse = (status: number, body: unknown) =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body)
    })

  it('throws MISSING_KEY_MESSAGE when no API key is set', async () => {
    vi.stubEnv('IMPORTLY_API_KEY', '')
    await expect(importlyRequest('/balance')).rejects.toThrow(MISSING_KEY_MESSAGE)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('sends bearer auth and returns the data field on success', async () => {
    mockFetch.mockReturnValue(jsonResponse(200, { success: true, data: { jobId: 'j1', status: 'queued' } }))
    const data = await importlyRequest('/import', { method: 'POST', body: { url: 'https://x.test/v' } })
    expect(data).toEqual({ jobId: 'j1', status: 'queued' })
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.test.local/import')
    expect(init.headers['Authorization']).toBe('Bearer test-key')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ url: 'https://x.test/v' })
  })

  it('identifies itself and the MCP client in the User-Agent', async () => {
    mockFetch.mockReturnValue(jsonResponse(200, { success: true, data: {} }))
    setClientInfo(undefined)
    await importlyRequest('/balance')
    expect(mockFetch.mock.calls[0][1].headers['User-Agent']).toBe(`importly-mcp/${VERSION}`)

    setClientInfo('claude-code')
    await importlyRequest('/balance')
    expect(mockFetch.mock.calls[1][1].headers['User-Agent']).toBe(`importly-mcp/${VERSION} (claude-code)`)
    setClientInfo(undefined)
  })

  it('appends query params for GET requests', async () => {
    mockFetch.mockReturnValue(jsonResponse(200, { success: true, data: { status: 'running' } }))
    await importlyRequest('/import/status', { query: { id: 'j1' } })
    expect(mockFetch.mock.calls[0][0]).toBe('https://api.test.local/import/status?id=j1')
  })

  it('maps 401 to key guidance', async () => {
    mockFetch.mockReturnValue(jsonResponse(401, { success: false, error: 'Invalid API key' }))
    await expect(importlyRequest('/balance')).rejects.toThrow(/IMPORTLY_API_KEY/)
  })

  it('maps 402 to top-up guidance', async () => {
    mockFetch.mockReturnValue(jsonResponse(402, { success: false, error: 'Insufficient balance' }))
    await expect(importlyRequest('/import', { method: 'POST', body: { url: 'https://x.test/v' } }))
      .rejects.toThrow(/top up/i)
  })

  it('maps 429 to retry guidance', async () => {
    mockFetch.mockReturnValue(jsonResponse(429, { success: false, error: 'Rate limited' }))
    await expect(importlyRequest('/balance')).rejects.toThrow(/rate limit/i)
  })

  it('passes 4xx API error messages through verbatim', async () => {
    mockFetch.mockReturnValue(jsonResponse(400, { success: false, error: 'Missing required parameter: url' }))
    await expect(importlyRequest('/import', { method: 'POST', body: {} }))
      .rejects.toThrow('Missing required parameter: url')
  })

  it('maps 5xx to a generic API-error message', async () => {
    mockFetch.mockReturnValue(jsonResponse(500, { success: false, error: 'Internal server error' }))
    await expect(importlyRequest('/balance')).rejects.toThrow(/Importly API error/)
  })

  it('maps network failure to unreachable guidance', async () => {
    mockFetch.mockRejectedValue(new TypeError('fetch failed'))
    await expect(importlyRequest('/balance')).rejects.toThrow(/unreachable/i)
  })
})
