import type { ZodRawShape } from 'zod'

export interface ToolDef {
  name: string
  description: string
  inputSchema: ZodRawShape
  handler: (args: Record<string, unknown>) => Promise<string>
}
