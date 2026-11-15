import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { VERSION } from '../src/version.js'

const readJson = (file: string) => JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'))

describe('version', () => {
  it('matches package.json, manifest.json, and server.json', () => {
    expect(readJson('package.json').version).toBe(VERSION)
    expect(readJson('manifest.json').version).toBe(VERSION)
    const server = readJson('server.json')
    expect(server.version).toBe(VERSION)
    expect(server.packages[0].version).toBe(VERSION)
  })
})
