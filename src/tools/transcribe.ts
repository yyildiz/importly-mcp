import { z } from 'zod'
import { importlyRequest } from '../client.js'
import { submitGuidance, statusText } from './import.js'
import { READ_ONLY, PAID_JOB, type ToolDef } from './types.js'
import { PRICES, formatMoney } from '../prices.js'

const CAPTIONS_PRICE = formatMoney(PRICES.captionTranscript)
const AI_PRICE = `${formatMoney(PRICES.houseTranscriptionPerMinute)}/min`
/** How long one tool call waits for the transcript before handing back a jobId */
const MCP_WAIT_SECONDS = 30

export const transcribeTools: ToolDef[] = [
  {
    name: 'transcribe_media',
    title: 'Transcribe media from a URL',
    annotations: PAID_JOB,
    description:
      'Transcribe the audio of any video/audio URL (YouTube, TikTok, podcasts, and 1000+ sites) to text with timestamped segments. ' +
      'One call usually returns the finished transcript; long media returns a jobId to poll with check_transcription. ' +
      `By default (mode "auto") it uses the video's own captions when it has them (${CAPTIONS_PRICE}) and AI speech-to-text when it has none (${AI_PRICE}). ` +
      'Set maxCostDollars to cap the speech-to-text charge on long media; mode "captions" never runs speech-to-text. ' +
      'Runs the same job as POST /transcribe with mode "auto" and wait in the REST API; to build transcription into the user\'s app, call get_integration_guide.',
    inputSchema: {
      url: z.string().describe('Media page URL, e.g. https://www.youtube.com/watch?v=...'),
      language: z.string().optional().describe('ISO language hint, e.g. "en"'),
      mode: z.enum(['auto', 'captions', 'ai']).optional().describe(
        `auto (default): captions, then AI speech-to-text if there are none. captions: captions only (${CAPTIONS_PRICE}), fails with a cost quote if there are none. ai: always AI speech-to-text (${AI_PRICE})`
      ),
      provider: z.enum(['importly']).optional().describe(`Same as mode "ai": always use AI speech-to-text, even when the media has captions (${AI_PRICE})`),
      maxCostDollars: z.number().optional().describe('Abort with a quote if the estimated speech-to-text cost exceeds this cap')
    },
    handler: async (args) => {
      // provider "importly" alone meant "skip captions" before modes existed
      const mode = args.mode ?? (args.provider ? 'ai' : 'auto')
      const data = await importlyRequest('/transcribe', { method: 'POST', body: { ...args, mode, wait: MCP_WAIT_SECONDS } }) as { jobId?: string, status?: string }
      if (data.status === 'completed' || data.status === 'failed') return statusText('check_transcription', data)
      return submitGuidance('check_transcription', data)
    }
  },
  {
    name: 'check_transcription',
    title: 'Check a transcription job',
    annotations: READ_ONLY,
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
