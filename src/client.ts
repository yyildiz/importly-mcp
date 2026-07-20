const DEFAULT_BASE_URL = 'https://api.importly.io'

export const SIGNUP_URL = 'https://importly.io/?utm_source=mcp&utm_medium=integration&utm_campaign=server'
export const DASHBOARD_URL = 'https://importly.io/dashboard?utm_source=mcp&utm_medium=integration&utm_campaign=server'

export const MISSING_KEY_MESSAGE =
  'No Importly API key configured. Set the IMPORTLY_API_KEY environment variable in your MCP client config. ' +
  `Get a free key at ${SIGNUP_URL} — $3.00 in free credits, no card required.`

export class ImportlyApiError extends Error {}

interface RequestOptions {
  method?: 'GET' | 'POST'
  body?: Record<string, unknown>
  query?: Record<string, string>
}

export async function importlyRequest(path: string, options: RequestOptions = {}): Promise<unknown> {
  const apiKey = process.env.IMPORTLY_API_KEY
  if (!apiKey) throw new ImportlyApiError(MISSING_KEY_MESSAGE)

  const baseUrl = process.env.IMPORTLY_API_URL || DEFAULT_BASE_URL
  const queryString = options.query ? `?${new URLSearchParams(options.query)}` : ''
  const url = `${baseUrl}${path}${queryString}`

  let response: { ok: boolean, status: number, json: () => Promise<unknown> }
  try {
    response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    })
  } catch {
    throw new ImportlyApiError('Importly API unreachable — check your network or retry shortly. Status page: https://importly.io')
  }

  let parsed: { success?: boolean, data?: unknown, error?: string }
  try {
    parsed = await response.json() as typeof parsed
  } catch {
    parsed = {}
  }

  if (response.status === 401 || response.status === 403) {
    throw new ImportlyApiError(
      `Importly rejected the API key (HTTP ${response.status}). Check that IMPORTLY_API_KEY is set to a valid key from ${DASHBOARD_URL}`
    )
  }
  if (response.status === 402) {
    throw new ImportlyApiError(
      `Insufficient Importly credits: ${parsed.error || 'balance too low for this job'}. Top up at ${DASHBOARD_URL}`
    )
  }
  if (response.status === 429) {
    throw new ImportlyApiError(
      'Importly rate limit reached. Wait a minute and retry; status-check endpoints allow ~1 request/second.'
    )
  }
  if (response.status >= 500) {
    throw new ImportlyApiError('Importly API error (server side). Retry shortly; if it persists, contact support@importly.io')
  }
  if (!response.ok || parsed.success === false) {
    throw new ImportlyApiError(parsed.error || `Importly API request failed (HTTP ${response.status})`)
  }

  return parsed.data
}
