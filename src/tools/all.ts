import { importTools } from './import.js'
import { metadataTools } from './metadata.js'
import { transcribeTools } from './transcribe.js'
import { accountTools } from './account.js'
import type { ToolDef } from './types.js'

export const allTools: ToolDef[] = [
  ...importTools,
  ...metadataTools,
  ...transcribeTools,
  ...accountTools
]
