import type { ZodRawShape } from 'zod'

// Explicit hints are required by the Claude and ChatGPT directories; clients
// use them to decide when to confirm with the user before running a tool.
export interface ToolAnnotations {
  readOnlyHint: boolean
  destructiveHint: boolean
  idempotentHint?: boolean
  openWorldHint: boolean
}

// Free lookups: status checks, balance, the static integration guide
export const READ_ONLY: ToolAnnotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }

// Starts a job that spends credits and fetches from the media's own site
export const PAID_JOB: ToolAnnotations = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }

export interface ToolDef {
  name: string
  title: string
  annotations: ToolAnnotations
  description: string
  inputSchema: ZodRawShape
  handler: (args: Record<string, unknown>) => Promise<string>
}
