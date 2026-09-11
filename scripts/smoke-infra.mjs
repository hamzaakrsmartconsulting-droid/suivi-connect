/**
 * Infra smoke tests — production readiness (section 0)
 *
 * Local (default for smoke:infra:local):
 *   FRONTEND_URL=http://localhost:5173 API_URL=http://localhost:3000 node --test scripts/smoke-infra.mjs
 *
 * Production:
 *   node --test scripts/smoke-infra.mjs
 *   FRONTEND_URL=https://... API_URL=https://... node --test scripts/smoke-infra.mjs
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://suivi-medicale.pages.dev').replace(/\/$/, '')
const API_URL = (process.env.API_URL || 'https://suivi-medicale-api.onrender.com').replace(/\/$/, '')
const HEALTH_URL = `${API_URL}/api/health`
const IS_LOCAL = /localhost|127\.0\.0\.1/.test(FRONTEND_URL) || /localhost|127\.0\.0\.1/.test(API_URL)
const COLD_START_MS = Number(process.env.SMOKE_TIMEOUT_MS || (IS_LOCAL ? 10_000 : 90_000))

console.log(`Smoke target: frontend=${FRONTEND_URL} api=${API_URL} mode=${IS_LOCAL ? 'local' : 'prod'}`)

async function fetchWithTimeout(url, options = {}, timeoutMs = 30_000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal, redirect: 'follow' })
  } finally {
    clearTimeout(timer)
  }
}

describe('0. Infra smoke', () => {
  describe('0.1 Frontend loads', () => {
    it('returns HTML successfully', async () => {
      const res = await fetchWithTimeout(FRONTEND_URL, {
        headers: { Accept: 'text/html' },
      }, COLD_START_MS)

      assert.ok(res.ok, `Frontend HTTP ${res.status} for ${FRONTEND_URL} — is "npm run dev" running in frontend/?`)
      const contentType = res.headers.get('content-type') || ''
      assert.match(contentType, /text\/html/i, `Expected HTML, got ${contentType}`)

      const body = await res.text()
      assert.ok(body.length > 100, 'Frontend HTML body looks empty')
      assert.match(body, /<!doctype html>/i, 'Missing doctype')
    })
  })

  describe('0.2 API health', () => {
    it('GET /api/health returns ok', async () => {
      const res = await fetchWithTimeout(HEALTH_URL, {
        headers: { Accept: 'application/json' },
      }, COLD_START_MS)

      assert.ok(res.ok, `Health HTTP ${res.status} for ${HEALTH_URL} — is backend up? (cd backend && npm run dev)`)
      const data = await res.json()
      assert.equal(data.status, 'ok')
      assert.ok(data.timestamp, 'Missing timestamp')
      assert.ok(!Number.isNaN(Date.parse(data.timestamp)), `Invalid timestamp: ${data.timestamp}`)
    })
  })

  describe('0.3 Cold start tolerance', () => {
    it('health responds within budget', async () => {
      const started = Date.now()
      const res = await fetchWithTimeout(HEALTH_URL, {}, COLD_START_MS)
      const elapsed = Date.now() - started

      assert.ok(res.ok, `Health failed after ${elapsed}ms (HTTP ${res.status})`)
      assert.ok(
        elapsed <= COLD_START_MS,
        `Took ${elapsed}ms — over budget of ${COLD_START_MS}ms`,
      )
      console.log(`   ⏱  health latency: ${elapsed}ms`)
    })
  })

  describe('0.4 HTTPS + CORS', () => {
    it('frontend and API use HTTPS (prod only)', { skip: IS_LOCAL }, () => {
      assert.match(FRONTEND_URL, /^https:\/\//, `Frontend is not HTTPS: ${FRONTEND_URL}`)
      assert.match(API_URL, /^https:\/\//, `API is not HTTPS: ${API_URL}`)
    })

    it('API final URL stays on HTTPS (prod only)', { skip: IS_LOCAL }, async () => {
      const res = await fetchWithTimeout(HEALTH_URL, {}, COLD_START_MS)
      assert.match(res.url, /^https:\/\//, `Final URL not HTTPS: ${res.url}`)
      assert.ok(res.ok)
    })

    it('CORS allows frontend origin', async () => {
      const origin = FRONTEND_URL
      const res = await fetchWithTimeout(
        HEALTH_URL,
        {
          method: 'OPTIONS',
          headers: {
            Origin: origin,
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'content-type',
          },
        },
        COLD_START_MS,
      )

      assert.ok(
        res.status >= 200 && res.status < 400,
        `CORS preflight HTTP ${res.status}`,
      )

      const allowOrigin = res.headers.get('access-control-allow-origin')
      assert.ok(
        allowOrigin === origin || allowOrigin === '*',
        `Missing/wrong ACAO header: got "${allowOrigin}", expected "${origin}"`,
      )
    })

    it('CORS allows credentialed GET from frontend origin', async () => {
      const origin = FRONTEND_URL
      const res = await fetchWithTimeout(
        HEALTH_URL,
        {
          method: 'GET',
          headers: {
            Origin: origin,
            Accept: 'application/json',
          },
        },
        COLD_START_MS,
      )

      assert.ok(res.ok, `Credentialed GET HTTP ${res.status}`)
      const allowOrigin = res.headers.get('access-control-allow-origin')
      assert.ok(
        allowOrigin === origin || allowOrigin === '*',
        `Missing/wrong ACAO on GET: got "${allowOrigin}"`,
      )
    })

    it('rejects unknown Origin (CORS)', async () => {
      const res = await fetchWithTimeout(
        HEALTH_URL,
        {
          method: 'GET',
          headers: {
            Origin: 'https://evil.example.com',
            Accept: 'application/json',
          },
        },
        COLD_START_MS,
      )

      const allowOrigin = res.headers.get('access-control-allow-origin')
      assert.notEqual(
        allowOrigin,
        'https://evil.example.com',
        'Evil origin must not be reflected in ACAO',
      )
    })
  })

  describe('0.5 Responsive readiness (smoke)', () => {
    it('frontend HTML is mobile-friendly (viewport meta)', async () => {
      const res = await fetchWithTimeout(FRONTEND_URL, {
        headers: { Accept: 'text/html' },
      }, COLD_START_MS)
      assert.ok(res.ok)
      const html = await res.text()
      assert.match(
        html,
        /<meta[^>]+name=["']viewport["'][^>]*>/i,
        'Missing viewport meta — mobile layout may break',
      )
    })
  })
})
