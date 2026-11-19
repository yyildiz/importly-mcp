import { z } from 'zod'
import type { ToolDef } from './types.js'

// Code an agent can drop into the user's app. Purely local: no API call, so it
// works before an API key is configured. Keep in sync with
// https://importly.io/docs/webhooks and /docs/endpoints/*.

export type GuideLanguage = 'node' | 'nextjs' | 'python' | 'curl'
export type GuideUseCase = 'import' | 'transcribe' | 'metadata'

const LANGUAGES: GuideLanguage[] = ['node', 'nextjs', 'python', 'curl']
const USE_CASES: GuideUseCase[] = ['import', 'transcribe', 'metadata']

const API = 'https://api.importly.io'
const DOCS = 'https://importly.io'

const USE_CASE_INFO: Record<GuideUseCase, { summary: string, resultFields: string, webhookFields: string, keyField: string }> = {
  import: {
    summary: 'Download media from a URL to Importly-hosted storage (or the user\'s S3 bucket) and get a direct link.',
    resultFields: '`result.mediaUrl` (direct link), `result.title`, `result.duration`, `result.fileSizeBytes`',
    webhookFields: '`data.mediaUrl`, `data.title`, `data.duration`, `data.fileSizeBytes`',
    keyField: 'data.mediaUrl'
  },
  transcribe: {
    summary: 'Transcribe a media URL. Uses the video\'s own captions when available; pass `provider: "importly"` for AI speech-to-text when it has none ($0.01/min).',
    resultFields: '`result.text` (full transcript), `result.data.segments` (timestamped), `result.language`',
    webhookFields: '`data.text`, `data.data.segments`, `data.language`',
    keyField: 'data.text'
  },
  metadata: {
    summary: 'Get full metadata for a media URL (title, duration, uploader, formats, thumbnails, view counts) without downloading.',
    resultFields: '`result.title`, `result.duration`, `result.uploader`, `result.formats`, `result.thumbnail`',
    webhookFields: '`data.title`, `data.duration`, `data.uploader`, `data.formats`, `data.thumbnail` (raw source fields, snake_case)',
    keyField: 'data.title'
  }
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

const nodeClient = (useCase: GuideUseCase) => `// lib/importly.js (server-side only: never import this into browser code)
const IMPORTLY_API = '${API}'
const headers = {
  Authorization: \`Bearer \${process.env.IMPORTLY_API_KEY}\`,
  'Content-Type': 'application/json',
}

async function importlyRequest(path, init = {}) {
  const res = await fetch(\`\${IMPORTLY_API}\${path}\`, { ...init, headers })
  const body = await res.json()
  if (!res.ok || !body.success) {
    throw new Error(\`Importly \${res.status}: \${body.error ?? 'request failed'}\`)
  }
  return body.data
}

// Start a job. Importly POSTs the result to webhookUrl when it succeeds.
export async function start${capitalize(useCase)}(url) {
  const data = await importlyRequest('/${useCase}', {
    method: 'POST',
    body: JSON.stringify({ url, webhookUrl: process.env.IMPORTLY_WEBHOOK_URL }),
  })
  return data.jobId
}

// Poll instead of (or as a fallback to) the webhook. Failed jobs never fire webhooks.
export async function get${capitalize(useCase)}Status(jobId) {
  // => { status: 'queued' | 'running' | 'completed' | 'failed', result?, message? }
  return importlyRequest(\`/${useCase}/status?id=\${encodeURIComponent(jobId)}\`)
}`


const nodeWebhook = (useCase: GuideUseCase) => `// Express webhook handler
app.post('/webhooks/importly', express.json(), async (req, res) => {
  const { data } = req.body // result fields are flattened into data (not nested under result)
  if (data.type === '${useCase}' && data.status === 'completed') {
    // look up your record by data.jobId and save ${USE_CASE_INFO[useCase].keyField}
  }
  res.sendStatus(200)
})`

const nextjsCode = (useCase: GuideUseCase) => `// app/api/${useCase}/route.ts: starts a job (server-side only; never expose the key to the browser)
export async function POST(request: Request) {
  const { url } = await request.json()
  const res = await fetch('${API}/${useCase}', {
    method: 'POST',
    headers: {
      Authorization: \`Bearer \${process.env.IMPORTLY_API_KEY}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, webhookUrl: \`\${process.env.APP_URL}/api/webhooks/importly\` }),
  })
  const body = await res.json()
  if (!res.ok || !body.success) {
    return Response.json({ error: body.error ?? 'Importly request failed' }, { status: res.status })
  }
  // store body.data.jobId against your record, then wait for the webhook
  return Response.json({ jobId: body.data.jobId })
}

// app/api/webhooks/importly/route.ts: receives the result
export async function POST(request: Request) {
  const { data } = await request.json() // result fields are flattened into data
  if (data.type === '${useCase}' && data.status === 'completed') {
    // look up your record by data.jobId and save the result
  }
  return new Response(null, { status: 200 })
}

// Polling fallback (failed jobs never fire webhooks):
// GET ${API}/${useCase}/status?id=<jobId> with the same Authorization header`

const pythonCode = (useCase: GuideUseCase) => `# importly.py (server-side only)
import os
import requests

IMPORTLY_API = "${API}"
HEADERS = {"Authorization": f"Bearer {os.environ['IMPORTLY_API_KEY']}"}


def _data(res):
    body = res.json()
    if not res.ok or not body.get("success"):
        raise RuntimeError(f"Importly {res.status_code}: {body.get('error', 'request failed')}")
    return body["data"]


def start_${useCase}(url):
    """Start a job. Importly POSTs the result to webhookUrl when it succeeds."""
    res = requests.post(
        f"{IMPORTLY_API}/${useCase}",
        headers=HEADERS,
        json={"url": url, "webhookUrl": os.environ.get("IMPORTLY_WEBHOOK_URL")},
        timeout=30,
    )
    return _data(res)["jobId"]


def get_${useCase}_status(job_id):
    """Poll instead of (or as a fallback to) the webhook. Failed jobs never fire webhooks."""
    res = requests.get(f"{IMPORTLY_API}/${useCase}/status?id={job_id}", headers=HEADERS, timeout=30)
    return _data(res)  # {"status": "queued" | "running" | "completed" | "failed", "result": ...}


# Flask webhook handler
@app.post("/webhooks/importly")
def importly_webhook():
    data = request.get_json()["data"]  # result fields are flattened into data
    if data["type"] == "${useCase}" and data["status"] == "completed":
        pass  # look up your record by data["jobId"] and save the result
    return "", 200`

const curlCode = (useCase: GuideUseCase) => `# Start a job (export IMPORTLY_API_KEY first; keep it out of source control)
curl -X POST ${API}/${useCase} \\
  -H "Authorization: Bearer $IMPORTLY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://www.youtube.com/watch?v=jNQXAC9IVRw", "webhookUrl": "https://your-app.com/webhooks/importly"}'
# => {"success": true, "data": {"jobId": "...", "status": "queued"}}

# Poll for the result
curl "${API}/${useCase}/status?id=JOB_ID" \\
  -H "Authorization: Bearer $IMPORTLY_API_KEY"`

const CODE: Record<GuideLanguage, { fence: string, build: (useCase: GuideUseCase) => string }> = {
  node: { fence: 'javascript', build: (useCase) => `${nodeClient(useCase)}\n\n${nodeWebhook(useCase)}` },
  nextjs: { fence: 'typescript', build: nextjsCode },
  python: { fence: 'python', build: pythonCode },
  curl: { fence: 'bash', build: curlCode }
}

export function buildIntegrationGuide(language: GuideLanguage, useCase: GuideUseCase): string {
  const info = USE_CASE_INFO[useCase]
  const code = CODE[language]

  return `# Add Importly ${useCase} to this app (${language})

${info.summary}

## 1. API key
Put the key in the server environment, e.g. \`.env\`:

\`\`\`
IMPORTLY_API_KEY=your_key
\`\`\`

Use the same key as this MCP server (the user can copy it from https://importly.io/dashboard/api-key). Read it server-side only: never hardcode it, commit it, or send it to the browser.

## 2. Code
\`\`\`${code.fence}
${code.build(useCase)}
\`\`\`

## 3. How results arrive
- Jobs are async. \`POST ${API}/${useCase}\` returns \`data.jobId\` immediately.
- **Webhook** (recommended): pass \`webhookUrl\`; Importly sends one POST when the job succeeds. Result fields are flattened into \`data\`: ${info.webhookFields}. Failed jobs do not fire webhooks and there are no retries, so keep a polling fallback.
- **Polling**: \`GET ${API}/${useCase}/status?id=<jobId>\` until \`status\` is \`completed\` or \`failed\`. Completed jobs include ${info.resultFields}. Poll every few seconds (limit: 3,600 status requests per hour per key).

## 4. Errors
- 400: invalid URL or parameters
- 401: missing or invalid API key
- 402: insufficient credits (top up at https://importly.io/dashboard)
- 429: rate limited; back off and retry

## Docs
- Endpoint reference: ${DOCS}/docs/endpoints/${useCase}.md
- Webhooks: ${DOCS}/docs/webhooks.md
- Everything in one file: ${DOCS}/llms-full.txt
`
}

export const guideTools: ToolDef[] = [
  {
    name: 'get_integration_guide',
    description:
      'Get working code for adding Importly to the user\'s own app (Node, Next.js, Python, or cURL): API key setup, ' +
      'starting a job, receiving the result by webhook or polling, and error handling. ' +
      'Use this when the user wants their application (not just this chat) to download, transcribe, or get metadata for media URLs. ' +
      'Does not call the API or use credits.',
    inputSchema: {
      language: z.enum(LANGUAGES as [GuideLanguage, ...GuideLanguage[]]).optional().describe('Language/framework of the user\'s app (default node)'),
      useCase: z.enum(USE_CASES as [GuideUseCase, ...GuideUseCase[]]).optional().describe('What the app needs: import (download), transcribe, or metadata (default import)')
    },
    handler: async (args) => {
      const language = (args.language as GuideLanguage | undefined) ?? 'node'
      const useCase = (args.useCase as GuideUseCase | undefined) ?? 'import'
      return buildIntegrationGuide(language, useCase)
    }
  }
]
