import { z } from 'zod'
import { importlyRequest } from '../client.js'
import { submitGuidance, statusText } from './import.js'
import { READ_ONLY, PAID_JOB, type ToolDef } from './types.js'

const urlInput = {
  url: z.string().describe('Media page URL, e.g. https://www.youtube.com/watch?v=...')
}

const jobIdInput = (submitTool: string) => ({
  jobId: z.string().describe(`Job id returned by ${submitTool}`)
})

export const metadataTools: ToolDef[] = [
  {
    name: 'get_metadata',
    title: 'Get full media metadata',
    annotations: PAID_JOB,
    description:
      'Extract full metadata for a video/audio URL (title, description, duration, uploader, formats, thumbnails, view counts) without downloading the media. ' +
      'Works on YouTube, TikTok, X, and 1000+ sites. Async: poll check_metadata with the returned jobId. ' +
      'For just title/duration/thumbnail, prefer the faster get_basic_metadata. ' +
      'Runs the same job as POST /metadata in the REST API; to build metadata lookups into the user\'s app, call get_integration_guide.',
    inputSchema: urlInput,
    handler: async (args) => {
      const data = await importlyRequest('/metadata', { method: 'POST', body: args }) as { jobId?: string }
      return submitGuidance('check_metadata', data)
    }
  },
  {
    name: 'check_metadata',
    title: 'Check a metadata job',
    annotations: READ_ONLY,
    description: 'Check the status of a get_metadata job. Returns the full metadata object once completed.',
    inputSchema: jobIdInput('get_metadata'),
    handler: async (args) => {
      const data = await importlyRequest('/metadata/status', { query: { id: String(args.jobId) } }) as { status?: string }
      return statusText('check_metadata', data)
    }
  },
  {
    name: 'get_basic_metadata',
    title: 'Get basic media metadata',
    annotations: PAID_JOB,
    description:
      'Fast-path metadata for a video/audio URL: title, duration, and thumbnail only. ' +
      'Cheaper and quicker than get_metadata — use this to identify or validate a media URL before importing or transcribing it. ' +
      'Async: poll check_basic_metadata with the returned jobId.',
    inputSchema: urlInput,
    handler: async (args) => {
      const data = await importlyRequest('/metadata/basic', { method: 'POST', body: args }) as { jobId?: string }
      return submitGuidance('check_basic_metadata', data)
    }
  },
  {
    name: 'check_basic_metadata',
    title: 'Check a basic metadata job',
    annotations: READ_ONLY,
    description: 'Check the status of a get_basic_metadata job. Returns title, duration, and thumbnail once completed.',
    inputSchema: jobIdInput('get_basic_metadata'),
    handler: async (args) => {
      const data = await importlyRequest('/metadata/basic/status', { query: { id: String(args.jobId) } }) as { status?: string }
      return statusText('check_basic_metadata', data)
    }
  }
]
