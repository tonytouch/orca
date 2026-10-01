import { describe, expect, it, vi } from 'vitest'
import { checkOpenMuseHealth, type OpenMuseProbe } from '../../../uao/openmuse/openmuse-health'

function probe(handler: (url: string) => { ok: boolean; body: unknown }): OpenMuseProbe {
  return (url) =>
    Promise.resolve({ ok: handler(url).ok, json: () => Promise.resolve(handler(url).body) })
}

describe('checkOpenMuseHealth', () => {
  it('does not fetch when the web URL is empty', async () => {
    const fetchImpl = vi.fn<OpenMuseProbe>()
    const health = await checkOpenMuseHealth({
      webUrl: '  ',
      apiUrl: 'http://host:8787',
      fetchImpl
    })
    expect(health.status).toBe('unconfigured')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('reports unreachable when the web app does not answer', async () => {
    const fetchImpl = vi.fn<OpenMuseProbe>(() => Promise.reject(new Error('offline')))
    const health = await checkOpenMuseHealth({
      webUrl: 'http://100.90.167.20:8081',
      apiUrl: 'http://100.90.167.20:8787',
      fetchImpl
    })
    expect(health.status).toBe('unreachable')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('stays degraded when the API is empty or does not report ok', async () => {
    const webOnly = probe(() => ({ ok: true, body: '<html>' }))
    const emptyApi = await checkOpenMuseHealth({
      webUrl: 'http://100.90.167.20:8081/',
      apiUrl: '',
      fetchImpl: webOnly
    })
    expect(emptyApi.status).toBe('degraded')
    if (emptyApi.status === 'degraded') {
      expect(emptyApi.webUrl).toBe('http://100.90.167.20:8081')
    }

    const fetchImpl = probe((url) =>
      url.endsWith('/api/health') ? { ok: true, body: { ok: false } } : { ok: true, body: null }
    )
    const degraded = await checkOpenMuseHealth({
      webUrl: 'http://100.90.167.20:8081',
      apiUrl: 'http://100.90.167.20:8791',
      fetchImpl
    })
    expect(degraded.status).toBe('degraded')
  })

  it('is ready when the web app and the API both answer', async () => {
    const fetchImpl = probe((url) =>
      url.endsWith('/api/health') ? { ok: true, body: { ok: true } } : { ok: true, body: null }
    )
    const health = await checkOpenMuseHealth({
      webUrl: 'http://100.90.167.20:8081',
      apiUrl: 'http://100.90.167.20:8791/',
      fetchImpl
    })
    expect(health).toMatchObject({
      status: 'ready',
      webUrl: 'http://100.90.167.20:8081',
      apiUrl: 'http://100.90.167.20:8791'
    })
  })
})
