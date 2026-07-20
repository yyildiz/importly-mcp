#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { ImportlyApiError } from './client.js'
import { allTools } from './tools/all.js'

const server = new McpServer({
  name: 'importly',
  version: '0.1.0'
})

for (const tool of allTools) {
  server.registerTool(
    tool.name,
    { description: tool.description, inputSchema: tool.inputSchema },
    async (args: Record<string, unknown>) => {
      try {
        const text = await tool.handler(args)
        return { content: [{ type: 'text' as const, text }] }
      } catch (error) {
        const text = error instanceof ImportlyApiError
          ? error.message
          : `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
        return { content: [{ type: 'text' as const, text }], isError: true }
      }
    }
  )
}

const transport = new StdioServerTransport()
await server.connect(transport)
console.error('importly-mcp server running on stdio')
