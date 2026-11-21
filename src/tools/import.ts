import { z } from 'zod'
import { READ_ONLY, PAID_JOB, type ToolDef } from './types.js'
import { importlyRequest, DASHBOARD_URL } from '../client.js'

const format = (data: unknown) => JSON.stringify(data, null, 2)

export const submitGuidance = (checkTool: string, data: { jobId?: string }) =>
  `${format(data)}\n\nNext step: poll ${checkTool} with jobId "${data.jobId}" every ~5 seconds. Most jobs finish in 10-60 seconds; long videos can take a few minutes.`

export const runningGuidance = (checkTool: string, data: unknown) =>
  `${format(data)}\n\nStill processing — poll ${checkTool} again in ~5 seconds.`

export const statusText = (checkTool: string, data: { status?: string }) => {
  if (data.status === 'completed' || data.status === 'failed') return format(data)
  return runningGuidance(checkTool, data)
}

type ImportStatus = {
  status?: string
  code?: string
  affordableVideoQuality?: string | null
  result?: { videoQuality?: string; requestedVideoQuality?: string }
}

// What check_import adds below the JSON when the balance decided the quality (#59)
export const importStatusText = (data: ImportStatus) => {
  const text = statusText('check_import', data)
  const downgraded = data.result
  if (data.status === 'completed' && downgraded?.requestedVideoQuality && downgraded.videoQuality) {
    return `${text}\n\nDownloaded at ${downgraded.videoQuality}, not the requested ${downgraded.requestedVideoQuality}: the credit balance didn't cover ${downgraded.requestedVideoQuality}, so the import used the highest quality it did. Add credits at ${DASHBOARD_URL} for higher quality.`
  }
  if (data.status === 'failed' && data.code === 'INSUFFICIENT_BALANCE') {
    const lower = data.affordableVideoQuality ? `retry with videoQuality "${data.affordableVideoQuality}", or ` : ''
    return `${text}\n\nThe credit balance doesn't cover this import. ${lower ? `To go ahead, ${lower}a` : 'A'}sk the user to add credits at ${DASHBOARD_URL}.`
  }
  return text
}

export const importTools: ToolDef[] = [
  {
    name: 'import_media',
    title: 'Download media from a URL',
    annotations: PAID_JOB,
    description:
      'Download the video/audio at any URL (YouTube, TikTok, X, and 1000+ sites) to hosted storage and get back a direct download link. ' +
      'Async: returns a jobId immediately; poll check_import for the result. ' +
      'Optionally also produce a transcript in the same job with includeTranscript. ' +
      'If the credit balance doesn\'t cover the requested videoQuality, it downloads at the highest quality the balance covers and check_import names the quality used. ' +
      'Runs the same job as POST /import in the REST API, so it doubles as a test call while building downloads into the user\'s app; ' +
      'for that app code, call get_integration_guide.',
    inputSchema: {
      url: z.string().describe('Media page URL, e.g. https://www.youtube.com/watch?v=...'),
      includeVideo: z.boolean().optional().describe('Include video stream (default true)'),
      includeAudio: z.boolean().optional().describe('Include audio stream (default true)'),
      videoQuality: z.enum(['lowest', '144p', '240p', '360p', '480p', '720p', '1080p', '1440p', '2160p', 'best']).optional().describe('Default 720p. Drops to the highest quality the credit balance covers when it can\'t pay for this one'),
      audioQuality: z.enum(['lowest', 'low', 'medium', 'high', 'best']).optional().describe('Default medium'),
      maxCostDollars: z.number().min(0.01).optional().describe('Most this request may cost in total, in dollars (download plus transcript), at least 0.01. If it would cost more, nothing is downloaded and the job fails with MAX_COST_EXCEEDED and the price, for a $0.003 price check'),
      includeTranscript: z.boolean().optional().describe('Also transcribe the audio in the same job'),
      transcriptLanguage: z.string().optional().describe('ISO language hint for the transcript, e.g. "en"')
    },
    handler: async (args) => {
      // A first video too big for the balance downloads at a quality that
      // fits instead of failing (#59); REST callers get the error instead
      const data = await importlyRequest('/import', { method: 'POST', body: { ...args, fitQualityToBalance: true } }) as { jobId?: string }
      return submitGuidance('check_import', data)
    }
  },
  {
    name: 'check_import',
    title: 'Check a download job',
    annotations: READ_ONLY,
    description:
      'Check the status of an import_media job. Returns the media download URL (and transcript, if requested) once the job completes.',
    inputSchema: {
      jobId: z.string().describe('Job id returned by import_media')
    },
    handler: async (args) => {
      const data = await importlyRequest('/import/status', { query: { id: String(args.jobId) } }) as ImportStatus
      return importStatusText(data)
    }
  }
]
