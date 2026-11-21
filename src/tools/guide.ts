import { z } from 'zod'
import { READ_ONLY, type ToolDef } from './types.js'
import { PRICES, formatMoney } from '../prices.js'

// Code an agent can drop into the user's app. Purely local: no API call, so it
// works before an API key is configured. Keep in sync with
// https://www.importly.io/docs/webhooks and /docs/endpoints/*.

export type GuideLanguage = 'node' | 'nextjs' | 'python' | 'curl'
export type GuideUseCase = 'import' | 'transcribe' | 'metadata'

const LANGUAGES: GuideLanguage[] = ['node', 'nextjs', 'python', 'curl']
const USE_CASES: GuideUseCase[] = ['import', 'transcribe', 'metadata']

const API = 'https://api.importly.io'
const DOCS = 'https://www.importly.io'

const USE_CASE_INFO: Record<GuideUseCase, { summary: string, resultFields: string, webhookFields: string, keyField: string }> = {
  import: {
    summary: 'Download media from a URL to Importly-hosted storage (or the user\'s S3 bucket) and get a direct link.',
    resultFields: '`result.mediaUrl` (direct link), `result.title`, `result.duration`, `result.fileSizeBytes`',
    webhookFields: '`data.mediaUrl`, `data.title`, `data.duration`, `data.fileSizeBytes`',
    keyField: 'data.mediaUrl'
  },
  transcribe: {
    summary: `Transcribe a media URL. The code sends \`mode: "auto"\`: it uses the video's own captions when available and AI speech-to-text when it has none (${formatMoney(PRICES.houseTranscriptionPerMinute)}/min). Without \`mode\`, a video with no captions fails with \`TRANSCRIPTION_PROVIDER_REQUIRED\`. Add \`maxCostDollars\` to cap the speech-to-text charge on long media.`,
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

const USE_CASE_TOOL: Record<GuideUseCase, string> = {
  import: 'import_media',
  transcribe: 'transcribe_media',
  metadata: 'get_metadata'
}

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

// Transcribe requests ask for captions with an AI fallback (#57), so a
// caption-less video still gets a transcript in the app
const jsBodyExtra = (useCase: GuideUseCase) => useCase === 'transcribe' ? ", mode: 'auto'" : ''
const jsonBodyExtra = (useCase: GuideUseCase) => useCase === 'transcribe' ? ', "mode": "auto"' : ''

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

// Start a job. Importly POSTs to webhookUrl once when it finishes (success: false if it failed).
export async function start${capitalize(useCase)}(url) {
  const data = await importlyRequest('/${useCase}', {
    method: 'POST',
    body: JSON.stringify({ url${jsBodyExtra(useCase)}, webhookUrl: process.env.IMPORTLY_WEBHOOK_URL }),
  })
  return data.jobId
}

// Poll instead of (or as a fallback to) the webhook. Deliveries aren't retried.
export async function get${capitalize(useCase)}Status(jobId) {
  // => { status: 'queued' | 'running' | 'completed' | 'failed', result?, message? }
  return importlyRequest(\`/${useCase}/status?id=\${encodeURIComponent(jobId)}\`)
}`


const nodeWebhook = (useCase: GuideUseCase) => `// Express webhook handler
app.post('/webhooks/importly', express.json(), async (req, res) => {
  const { success, data } = req.body // result fields are flattened into data (not nested under result)
  if (data.type === '${useCase}') {
    if (success) {
      // look up your record by data.jobId and save ${USE_CASE_INFO[useCase].keyField}
    } else {
      // the job failed: mark the record failed with data.code and data.message
    }
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
    body: JSON.stringify({ url${jsBodyExtra(useCase)}, webhookUrl: \`\${process.env.APP_URL}/api/webhooks/importly\` }),
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
  const { success, data } = await request.json() // result fields are flattened into data
  if (data.type === '${useCase}') {
    if (success) {
      // look up your record by data.jobId and save the result
    } else {
      // the job failed: mark the record failed with data.code and data.message
    }
  }
  return new Response(null, { status: 200 })
}

// Polling fallback (webhook deliveries aren't retried):
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
    """Start a job. Importly POSTs to webhookUrl once when it finishes (success: false if it failed)."""
    res = requests.post(
        f"{IMPORTLY_API}/${useCase}",
        headers=HEADERS,
        json={"url": url${jsonBodyExtra(useCase)}, "webhookUrl": os.environ.get("IMPORTLY_WEBHOOK_URL")},
        timeout=30,
    )
    return _data(res)["jobId"]


def get_${useCase}_status(job_id):
    """Poll instead of (or as a fallback to) the webhook. Deliveries aren't retried."""
    res = requests.get(f"{IMPORTLY_API}/${useCase}/status?id={job_id}", headers=HEADERS, timeout=30)
    return _data(res)  # {"status": "queued" | "running" | "completed" | "failed", "result": ...}


# Flask webhook handler
@app.post("/webhooks/importly")
def importly_webhook():
    body = request.get_json()
    data = body["data"]  # result fields are flattened into data
    if data["type"] == "${useCase}":
        if body["success"]:
            pass  # look up your record by data["jobId"] and save the result
        else:
            pass  # the job failed: mark the record failed with data["code"] and data["message"]
    return "", 200`

const curlCode = (useCase: GuideUseCase) => `# Start a job (export IMPORTLY_API_KEY first; keep it out of source control)
curl -X POST ${API}/${useCase} \\
  -H "Authorization: Bearer $IMPORTLY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://www.youtube.com/watch?v=jNQXAC9IVRw"${jsonBodyExtra(useCase)}, "webhookUrl": "https://example.com/webhooks/importly"}'
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

Use the same key as this MCP server (the user creates it at https://www.importly.io/dashboard/api-key; the full key is shown only once, so if it wasn't saved they regenerate it there). Read it server-side only: never hardcode it, commit it, or send it to the browser.

## 2. Code
\`\`\`${code.fence}
${code.build(useCase)}
\`\`\`

## 3. How results arrive
- Jobs are async. \`POST ${API}/${useCase}\` returns \`data.jobId\` immediately.
- **Webhook** (recommended): pass \`webhookUrl\`; Importly sends one POST when the job finishes. On success, \`success\` is \`true\` and the result fields are flattened into \`data\`: ${info.webhookFields}. A job that fails sends one webhook with \`success: false\` and \`data.code\` and \`data.message\`, so check \`success\` first. Deliveries aren't retried, so keep a polling fallback.
- **Polling**: \`GET ${API}/${useCase}/status?id=<jobId>\` until \`status\` is \`completed\` or \`failed\`. Completed jobs include ${info.resultFields}. Poll every few seconds (limit: 3,600 status requests per hour per key).

## 4. Test it
Before wiring up the UI, run the matching MCP tool (\`${USE_CASE_TOOL[useCase]}\`) on a real link the app will see. It runs the same job as \`POST ${API}/${useCase}\`, at the same price, so its result shows what the app will get back for that link.

## 5. Errors
- 400: invalid URL or parameters
- 401: missing or invalid API key
- 402: insufficient credits (top up at https://www.importly.io/dashboard)
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
    title: 'Get app integration code',
    annotations: READ_ONLY,
    description:
      'Get working code that builds Importly into the user\'s own app (Node, Next.js, Python, or cURL): API key setup, ' +
      'starting a job from the backend, receiving the result by webhook or polling, and error handling. ' +
      'Call this first whenever the user is building or changing an app that takes video or audio links and needs the file, a transcript, or metadata. ' +
      'The app reads the same API key from its server environment. Does not call the API or use credits.',
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
