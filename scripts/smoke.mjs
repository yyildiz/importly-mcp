// Usage: IMPORTLY_API_KEY=... pnpm smoke
import { importlyRequest } from '../dist/client.js'

const die = (msg) => { console.error(`SMOKE FAIL: ${msg}`); process.exit(1) }

if (!process.env.IMPORTLY_API_KEY) die('IMPORTLY_API_KEY not set')

const balance = await importlyRequest('/balance')
console.log('balance:', balance)
if (typeof balance.balance !== 'number') die('balance shape wrong')

const submit = await importlyRequest('/metadata/basic', {
  method: 'POST',
  body: { url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw' }
})
console.log('submitted:', submit)
if (!submit.jobId) die('no jobId')

for (let i = 0; i < 24; i++) {
  await new Promise(resolve => setTimeout(resolve, 5000))
  const status = await importlyRequest('/metadata/basic/status', { query: { id: submit.jobId } })
  console.log(`poll ${i + 1}:`, status.status)
  if (status.status === 'completed') {
    console.log('result:', JSON.stringify(status.result).slice(0, 300))
    console.log('SMOKE PASS')
    process.exit(0)
  }
  if (status.status === 'failed') die(`job failed: ${JSON.stringify(status)}`)
}
die('timed out after 120s')
