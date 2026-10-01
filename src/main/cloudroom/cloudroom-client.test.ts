import { describe, expect, it } from 'vitest'
import { createCloudroomClient } from '../../../uao/cloudroom/cloudroom-client'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  })
}

describe('cloudroom client', () => {
  it('reports ready, not-ready, and a refused token', async () => {
    const ready = createCloudroomClient({
      baseUrl: 'http://100.90.167.20:9840/',
      token: 'tok',
      fetchImpl: async () => jsonResponse(200, { ready: true })
    })
    expect(await ready.ready()).toEqual({ ready: true })

    const notReady = createCloudroomClient({
      baseUrl: 'http://100.90.167.20:9840',
      token: 'tok',
      fetchImpl: async () => jsonResponse(503, { ready: false })
    })
    expect(await notReady.ready()).toEqual({ ready: false })

    const denied = createCloudroomClient({
      baseUrl: 'http://100.90.167.20:9840',
      token: 'tok',
      fetchImpl: async () => jsonResponse(401, { error: 'unauthorized', code: 'unauthorized' })
    })
    await expect(denied.ready()).rejects.toMatchObject({ kind: 'unauthorized', status: 401 })
  })

  it('turns a network failure into an unreachable error', async () => {
    const client = createCloudroomClient({
      baseUrl: 'http://100.90.167.20:9840',
      token: '',
      fetchImpl: async () => {
        throw new TypeError('fetch failed')
      }
    })
    await expect(client.ready()).rejects.toMatchObject({
      kind: 'unreachable',
      message: expect.stringContaining("Can't reach CloudRoom")
    })
  })

  it('sends the bearer token and reads sessions, creates, and events', async () => {
    const calls: { url: string; init?: RequestInit }[] = []
    const client = createCloudroomClient({
      baseUrl: 'http://100.90.167.20:9840',
      token: 's3cret',
      fetchImpl: async (url, init) => {
        calls.push({ url, init })
        if (url.endsWith('/v1/sessions') && init?.method === 'POST') {
          return jsonResponse(202, { session_id: 'cr_demo', receipt: 'accepted', saving: true })
        }
        if (url.endsWith('/v1/sessions')) {
          return jsonResponse(200, {
            total: 1,
            sessions: [
              {
                session_id: 'cr_demo',
                harness: 'codex',
                state: 'idle',
                model: 'gpt',
                last_activity_ms: 5
              },
              { harness: 'codex' }
            ]
          })
        }
        if (url.includes('/events')) {
          return jsonResponse(200, {
            events: [{ sequence: 2, kind: 'text_delta', data: { text: 'Hello' } }],
            saving: false
          })
        }
        return jsonResponse(200, {})
      }
    })

    const sessions = await client.listSessions()
    expect(sessions).toEqual([
      {
        sessionId: 'cr_demo',
        harness: 'codex',
        state: 'idle',
        model: 'gpt',
        lastActivityMs: 5
      }
    ])
    const created = await client.createSession({ requestId: 'uao-1', harness: 'codex' })
    expect(created).toEqual({ sessionId: 'cr_demo' })
    const events = await client.events('cr_demo', 0)
    expect(events).toEqual([{ sequence: 2, kind: 'text_delta', text: 'Hello' }])

    const listCall = calls.find((call) => call.url.endsWith('/v1/sessions') && !call.init?.method)
    const headers = listCall?.init?.headers
    expect(headers).toMatchObject({ authorization: 'Bearer s3cret' })
    const createCall = calls.find((call) => call.init?.method === 'POST')
    expect(JSON.parse(String(createCall?.init?.body))).toEqual({
      request_id: 'uao-1',
      harness: 'codex'
    })
  })

  it('reads a bare event array', async () => {
    const client = createCloudroomClient({
      baseUrl: 'http://100.90.167.20:9840',
      token: 'tok',
      fetchImpl: async () => jsonResponse(200, [{ sequence: 1, kind: 'text_delta', data: 'Hi' }])
    })
    expect(await client.events('cr_demo', 0)).toEqual([
      { sequence: 1, kind: 'text_delta', text: 'Hi' }
    ])
  })
})
