import { z } from 'zod'
import { importlyRequest } from '../client.js'
import { submitGuidance, statusText } from './import.js'
import type { ToolDef } from './types.js'

export const transcribeTools: ToolDef[] = [
  {
    name: 'transcribe_media',
    description:
      'Transcribe the audio of any video/audio URL (YouTube, TikTok, podcasts, and 1000+ sites) to text with timestamped segments. ' +
      'Works from agent sandboxes and servers, with nothing to install. ' +
      'Async: returns a jobId immediately; poll check_transcription for the transcript. ' +
      'Uses the video\'s own captions when it has them ($0.01). If it has none, the job fails with a cost quote: ' +
      'retry with provider "importly" for AI speech-to-text ($0.02/min), and set maxCostDollars to cap spend on long media. ' +
      'To add transcription to the user\'s own app instead, call get_integration_guide.',
    inputSchema: {
      url: z.string().describe('Media page URL, e.g. https://www.youtube.com/watch?v=...'),
      language: z.string().optional().describe('ISO language hint, e.g. "en"'),
      provider: z.enum(['importly']).optional().describe('Set to "importly" for AI speech-to-text when the media has no captions ($0.02/min plus audio download)'),
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
