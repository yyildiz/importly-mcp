import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { VERSION } from '../src/version.js'

const readJson = (file: string) => JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'))

describe('version', () => {
  // server.json is the MCP registry listing for the hosted server
  // (mcp.importly.io) and is versioned independently of this package.
  it('matches package.json and manifest.json', () => {
    expect(readJson('package.json').version).toBe(VERSION)
    expect(readJson('manifest.json').version).toBe(VERSION)
  })
})
