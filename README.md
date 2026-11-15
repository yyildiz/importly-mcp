# Importly MCP Server

Give your AI agent the ability to **download, transcribe, and inspect any video or audio URL** — YouTube, TikTok, X, podcasts, and 1000+ other sites.

[Importly](https://importly.io/?utm_source=mcp&utm_medium=integration&utm_campaign=readme) runs yt-dlp, rotating residential proxies, ffmpeg, and speech-to-text server-side, so your agent (and you) never deal with IP bans, 429s, cookie rot, or extractor breakage.

## Tools

| Tool | What it does |
| ---- | ------------ |
| `import_media` / `check_import` | Download media to hosted storage, get a direct link (optionally with a transcript) |
| `transcribe_media` / `check_transcription` | Speech-to-text with timestamped segments |
| `get_metadata` / `check_metadata` | Full metadata: formats, uploader, thumbnails, stats |
| `get_basic_metadata` / `check_basic_metadata` | Fast title/duration/thumbnail lookup |
| `check_balance` | Remaining credit balance |
| `get_integration_guide` | Working code (Node, Next.js, Python, cURL) to add Importly to your own app: key setup, webhooks, polling, errors. No credits used |

Jobs are async: submit tools return a `jobId`, check tools poll it. Responses tell the agent exactly what to do next.

Transcripts use the video's own captions when it has them ($0.01). For media without captions, the agent can retry with `provider: "importly"` for AI speech-to-text ($0.02/min).

## Setup (hosted, recommended)

Importly runs this server for you at **`https://mcp.importly.io/mcp`** (Streamable HTTP). Nothing to install.

1. Get an API key at [importly.io](https://importly.io/?utm_source=mcp&utm_medium=integration&utm_campaign=readme) — **$3.00 in free credits, no card required**.
2. Add the server to your MCP client, sending the key as an `Authorization: Bearer` header:

### Claude Code

```bash
claude mcp add --transport http importly https://mcp.importly.io/mcp --header "Authorization: Bearer your_key"
```

### Cursor

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

More clients (VS Code, Cline, Claude Desktop): [setup guide](https://importly.io/docs/integrations/mcp?utm_source=mcp&utm_medium=integration&utm_campaign=readme).

> **This npm package is no longer maintained.** The hosted server above runs the same tools and always has the latest version. The source here is kept for reference.

## Example prompts

- "Transcribe this talk and summarize the key points: https://www.youtube.com/watch?v=…"
- "Download the audio of this podcast episode and give me a link"
- "How long is this video and who uploaded it?"
- "Add import-from-URL to our upload form using Importly" (the agent calls `get_integration_guide` and writes the code, with the same API key read from your environment)

## Pricing

Usage-based credits (downloads ~$0.01/MB, transcription per media minute) — see [pricing](https://importly.io/pricing?utm_source=mcp&utm_medium=integration&utm_campaign=readme). New accounts get $3.00 free.

## Docs & support

- [Setup guide](https://importly.io/docs/integrations/mcp?utm_source=mcp&utm_medium=integration&utm_campaign=readme)
- [API docs](https://importly.io/docs?utm_source=mcp&utm_medium=integration&utm_campaign=readme)
- support@importly.io

MIT licensed. The server is a thin wrapper over the [Importly API](https://importly.io/docs?utm_source=mcp&utm_medium=integration&utm_campaign=readme).
