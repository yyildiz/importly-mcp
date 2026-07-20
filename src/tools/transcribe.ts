import { z } from 'zod'
import { importlyRequest } from '../client.js'
import { submitGuidance, statusText } from './import.js'
import type { ToolDef } from './types.js'

export const transcribeTools: ToolDef[] = [
  {
    name: 'transcribe_media',
    description:
      'Transcribe the audio of any video/audio URL (YouTube, TikTok, podcasts, and 1000+ sites) to text with timestamped segments. ' +
      'Importly handles the download, audio extraction, and speech-to-text server-side — no yt-dlp or ffmpeg needed. ' +
      'Async: returns a jobId immediately; poll check_transcription for the transcript. ' +
      'Costs scale with media length; set maxCostDollars to cap spend on long media.',
    inputSchema: {
      url: z.string().describe('Media page URL, e.g. https://www.youtube.com/watch?v=...'),
      language: z.string().optional().describe('ISO language hint, e.g. "en"'),
      maxCostDollars: z.number().optional().describe('Abort with a quote if the estimated cost exceeds this cap')
    },
    handler: async (args) => {
      const data = await importlyRequest('/transcribe', { method: 'POST', body: args }) as { jobId?: string }
      return submitGuidance('check_transcription', data)
    }
  },
  {
    name: 'check_transcription',
    description:
      'Check the status of a transcribe_media job. Returns the transcript text and timestamped segments once completed.',
    inputSchema: {
      jobId: z.string().describe('Job id returned by transcribe_media')
    },
    handler: async (args) => {
      const data = await importlyRequest('/transcribe/status', { query: { id: String(args.jobId) } }) as { status?: string }
      return statusText('check_transcription', data)
    }
  }
]
