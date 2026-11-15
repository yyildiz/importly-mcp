import { z } from 'zod'
import { importlyRequest } from '../client.js'
import type { ToolDef } from './types.js'

const format = (data: unknown) => JSON.stringify(data, null, 2)

export const submitGuidance = (checkTool: string, data: { jobId?: string }) =>
  `${format(data)}\n\nNext step: poll ${checkTool} with jobId "${data.jobId}" every ~5 seconds. Most jobs finish in 10-60 seconds; long videos can take a few minutes.`

export const runningGuidance = (checkTool: string, data: unknown) =>
  `${format(data)}\n\nStill processing — poll ${checkTool} again in ~5 seconds.`

export const statusText = (checkTool: string, data: { status?: string }) => {
  if (data.status === 'completed' || data.status === 'failed') return format(data)
  return runningGuidance(checkTool, data)
}

export const importTools: ToolDef[] = [
  {
    name: 'import_media',
    description:
      'Download the video/audio at any URL (YouTube, TikTok, X, and 1000+ sites) to hosted storage and get back a direct download link. ' +
      'Importly runs yt-dlp, rotating residential proxies, and ffmpeg server-side — no local tooling needed. ' +
      'Async: returns a jobId immediately; poll check_import for the result. ' +
      'Optionally also produce a transcript in the same job with includeTranscript. ' +
      'To add downloads to the user\'s own app instead, call get_integration_guide.',
    inputSchema: {
      url: z.string().describe('Media page URL, e.g. https://www.youtube.com/watch?v=...'),
      includeVideo: z.boolean().optional().describe('Include video stream (default true)'),
      includeAudio: z.boolean().optional().describe('Include audio stream (default true)'),
      videoQuality: z.enum(['lowest', '144p', '240p', '360p', '480p', '720p', '1080p', '1440p', '2160p', 'best']).optional().describe('Default 720p'),
      audioQuality: z.enum(['lowest', 'low', 'medium', 'high', 'best']).optional().describe('Default medium'),
      includeTranscript: z.boolean().optional().describe('Also transcribe the audio in the same job'),
      transcriptLanguage: z.string().optional().describe('ISO language hint for the transcript, e.g. "en"')
    },
    handler: async (args) => {
      const data = await importlyRequest('/import', { method: 'POST', body: args }) as { jobId?: string }
      return submitGuidance('check_import', data)
    }
  },
  {
    name: 'check_import',
    description:
      'Check the status of an import_media job. Returns the media download URL (and transcript, if requested) once the job completes.',
    inputSchema: {
      jobId: z.string().describe('Job id returned by import_media')
    },
    handler: async (args) => {
      const data = await importlyRequest('/import/status', { query: { id: String(args.jobId) } }) as { status?: string }
      return statusText('check_import', data)
    }
  }
]
