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

Jobs are async: submit tools return a `jobId`, check tools poll it. Responses tell the agent exactly what to do next.

## Setup

1. Get an API key at [importly.io](https://importly.io/?utm_source=mcp&utm_medium=integration&utm_campaign=readme) — **$3.00 in free credits, no card required**.
2. Add the server to your MCP client:

### Claude Code

```bash
claude mcp add importly -e IMPORTLY_API_KEY=your_key -- npx -y importly-mcp
```

### Claude Desktop / Cursor / Cline / Windsurf

```json
{
  "mcpServers": {
    "importly": {
      "command": "npx",
      "args": ["-y", "importly-mcp"],
      "env": { "IMPORTLY_API_KEY": "your_key" }
    }
  }
}
```

(Claude Desktop: `claude_desktop_config.json` · Cursor: `.cursor/mcp.json` · Cline: MCP settings UI · Windsurf: `~/.codeium/windsurf/mcp_config.json`)

## Example prompts

- "Transcribe this talk and summarize the key points: https://www.youtube.com/watch?v=…"
- "Download the audio of this podcast episode and give me a link"
- "How long is this video and who uploaded it?"

## Pricing

Usage-based credits (downloads ~$0.01/MB, transcription per media minute) — see [pricing](https://importly.io/pricing?utm_source=mcp&utm_medium=integration&utm_campaign=readme). New accounts get $3.00 free.

## Docs & support

- [Setup guide](https://importly.io/docs/integrations/mcp?utm_source=mcp&utm_medium=integration&utm_campaign=readme)
- [API docs](https://importly.io/docs?utm_source=mcp&utm_medium=integration&utm_campaign=readme)
- support@importly.io

MIT licensed. The server is a thin wrapper over the [Importly API](https://importly.io/docs?utm_source=mcp&utm_medium=integration&utm_campaign=readme).
