import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { accountTools } from '../src/tools/account.js'

const mockFetch = vi.fn()

const jsonResponse = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) })

describe('check_balance', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.stubEnv('IMPORTLY_API_KEY', 'test-key')
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('reports the balance with a top-up pointer', async () => {
    mockFetch.mockReturnValue(jsonResponse({ success: true, data: { balance: 1.42, currency: 'USD' } }))
    const text = await accountTools[0].handler({})
    expect(mockFetch.mock.calls[0][0]).toContain('/balance')
    expect(text).toContain('$1.42')
    expect(text).toContain('importly.io/dashboard')
  })
})
