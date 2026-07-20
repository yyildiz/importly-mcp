import { importlyRequest, DASHBOARD_URL } from '../client.js'
import type { ToolDef } from './types.js'

export const accountTools: ToolDef[] = [
  {
    name: 'check_balance',
    description:
      'Check the remaining Importly credit balance for the configured API key. ' +
      'Use this to diagnose failed jobs (insufficient credits) or as a pre-flight check before large imports/transcriptions.',
    inputSchema: {},
    handler: async () => {
      const data = await importlyRequest('/balance') as { balance?: number, currency?: string }
      const balance = typeof data.balance === 'number' ? data.balance : 0
      return `Importly credit balance: $${balance.toFixed(2)} ${data.currency || 'USD'}. Top up at ${DASHBOARD_URL}`
    }
  }
]
