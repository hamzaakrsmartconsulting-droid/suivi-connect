/**
 * Runs infra smoke against local frontend + backend.
 * Usage: node scripts/run-smoke-local.mjs
 *   or:  npm run smoke:infra:local
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const env = {
  ...process.env,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  API_URL: process.env.API_URL || 'http://localhost:3000',
  SMOKE_TIMEOUT_MS: process.env.SMOKE_TIMEOUT_MS || '10000',
}

const child = spawn(
  process.execPath,
  ['--test', path.join(root, 'smoke-infra.mjs')],
  { stdio: 'inherit', env, cwd: path.join(root, '..') },
)

child.on('exit', (code) => process.exit(code ?? 1))
