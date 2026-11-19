# Importly MCP Server

Turn any video or audio link into **files, transcripts and metadata for your app**: YouTube, TikTok, X, podcasts, and 1000+ other sites. Your AI agent can build it in over MCP.

[Importly](https://www.importly.io/?utm_source=mcp&utm_medium=integration&utm_campaign=readme) is one API for your app. It keeps working on production servers where downloads usually get blocked, so you never deal with blocked requests, broken downloaders, or videos without captions. Connect this MCP server to your coding agent and ask it to add Importly to your app: it gets working code for your stack from `get_integration_guide`, writes the integration, and tests real calls with your API key. Your backend then uses the same key.

## Tools

| Tool | What it does |
| ---- | ------------ |
| `get_integration_guide` | Working code (Node, Next.js, Python, cURL) to build Importly into your app: key setup, webhooks, polling, errors. No credits used |
| `import_media` / `check_import` | Download media to hosted storage, get a direct link (optionally with a transcript) |
| `transcribe_media` / `check_transcription` | Speech-to-text with timestamped segments |
| `get_metadata` / `check_metadata` | Full metadata: formats, uploader, thumbnails, stats |
| `get_basic_metadata` / `check_basic_metadata` | Fast title/duration/thumbnail lookup |
| `check_balance` | Remaining credit balance |

Each media tool runs the same job as its REST endpoint, so what the agent sees in a test call is what your app gets. Jobs are async: submit tools return a `jobId`, check tools poll it. Responses tell the agent exactly what to do next.

Transcripts use the video's own captions when it has them ($0.003). For media without captions, the agent can retry with `provider: "importly"` for AI speech-to-text ($0.01/min).

## Setup (hosted, recommended)

Importly runs this server for you at **`https://mcp.importly.io/mcp`** (Streamable HTTP). Nothing to install.

### Claude.ai, ChatGPT, Claude Desktop

Add a **custom connector** with the URL `https://mcp.importly.io/mcp`, click **Connect**, and sign in to Importly (new accounts get **$3.00 in free credits, no card required**). No API key needed.

### Coding agents (API key)

1. Get an API key at [importly.io](https://importly.io/?utm_source=mcp&utm_medium=integration&utm_campaign=readme) — **$3.00 in free credits, no card required**.
2. Add the server to your MCP client, sending the key as an `Authorization: Bearer` header:

#### Claude Code

```bash
claude mcp add --transport http importly https://mcp.importly.io/mcp --header "Authorization: Bearer your_key"
```

#### Cursor

```json
{
  "mcpServers": {
    "importly": {
      "url": "https://mcp.importly.io/mcp",
      "headers": { "Authorization": "Bearer your_key" }
    }
  }
}
```

More clients (VS Code, Cline, …): [setup guide](https://importly.io/docs/integrations/mcp?utm_source=mcp&utm_medium=integration&utm_campaign=readme).

> **This npm package is no longer maintained.** The hosted server above runs the same tools and always has the latest version. The source here is kept for reference.

## Example prompts

- "Add import-from-URL to our upload form using Importly. Download the media server-side and save it like a normal upload." (the agent calls `get_integration_guide`, writes the code, and reads the same API key from your environment)
- "When a user adds a video link, use Importly to fetch its transcript and store it with timestamps."
- "Show a preview card (title, duration, thumbnail) when someone pastes a video URL, using Importly basic metadata."
- One-off jobs work too: "Transcribe this talk and summarize the key points: https://www.youtube.com/watch?v=…"

## Pricing

Pay per use, from credits. What typical tasks cost:

- A 10-minute 720p video downloaded: about **$0.15**
- A 10-minute podcast transcribed with AI: **$0.10**
- A transcript from the video's own captions, or a metadata lookup: **$0.003**

AI speech-to-text is $0.01 per minute, all-in ($0.005/min with your own speech-to-text key). Downloads are $2.05/GB. Minimum $0.01 per import or transcription. New accounts get **$3.00 in free credits, no card required**. See [pricing](https://www.importly.io/pricing?utm_source=mcp&utm_medium=integration&utm_campaign=readme).

## Docs & support

- [Setup guide](https://importly.io/docs/integrations/mcp?utm_source=mcp&utm_medium=integration&utm_campaign=readme)
- [API docs](https://importly.io/docs?utm_source=mcp&utm_medium=integration&utm_campaign=readme)
- support@importly.io

MIT licensed. The server is a thin wrapper over the [Importly API](https://importly.io/docs?utm_source=mcp&utm_medium=integration&utm_campaign=readme).
