import { describe, expect, it } from 'vitest'
import { createCloudroomEnvironment } from '../../../uao/cloudroom/cloudroom-environment'
import { cloudroomHarnessForAgent } from '../../../uao/cloudroom/cloudroom-types'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status })
}

describe('cloudroom environment', () => {
  it('does not call the network when no URL is set', async () => {
    let calls = 0
    const environment = createCloudroomEnvironment({
      baseUrl: '   ',
      token: 'tok',
      fetchImpl: async () => {
        calls += 1
        throw new Error('should not fetch')
      }
    })
    expect(await environment.health()).toMatchObject({ status: 'unconfigured' })
    expect(await environment.listSessions()).toEqual({
      ok: false,
      error: 'CloudRoom is not configured.'
    })
    expect(await environment.createSession({ harness: 'codex', prompt: 'hi' })).toEqual({
      ok: false,
      error: 'CloudRoom is not configured.'
    })
    expect(calls).toBe(0)
  })

  it('reports unreachable and unauthorized without throwing', async () => {
    const down = createCloudroomEnvironment({
      baseUrl: 'http://100.90.167.20:9840',
      token: 'tok',
      fetchImpl: async () => {
        throw new TypeError('fetch failed')
      }
    })
    expect(await down.health()).toMatchObject({
      status: 'unreachable',
      message: expect.stringContaining("Can't reach CloudRoom")
    })

    const denied = createCloudroomEnvironment({
      baseUrl: 'http://100.90.167.20:9840',
      token: 'tok',
      fetchImpl: async () => jsonResponse(401, { error: 'nope', code: 'unauthorized' })
    })
    expect(await denied.health()).toMatchObject({
      status: 'unauthorized',
      message: expect.stringContaining('CLOUDROOM_TOKEN')
    })

    const notReady = createCloudroomEnvironment({
      baseUrl: 'http://100.90.167.20:9840',
      token: 'tok',
      fetchImpl: async () => jsonResponse(503, { ready: false })
    })
    expect(await notReady.health()).toMatchObject({ status: 'not-ready' })
  })

  it('rejects a harness CloudRoom cannot run', async () => {
    let calls = 0
    const environment = createCloudroomEnvironment({
      baseUrl: 'http://100.90.167.20:9840',
      token: 'tok',
      fetchImpl: async () => {
        calls += 1
        return jsonResponse(200, {})
      }
    })
    const result = await environment.createSession({ harness: 'kimchi' })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('Codex')
    }
    expect(calls).toBe(0)
  })

  it('keeps the session id when the first prompt fails', async () => {
    const environment = createCloudroomEnvironment({
      baseUrl: 'http://100.90.167.20:9840',
      token: 'tok',
      fetchImpl: async (url) => {
        if (url.includes('/prompts')) {
          return jsonResponse(409, { error: 'busy', code: 'storage_blocked' })
        }
        return jsonResponse(202, { session_id: 'cr_demo', receipt: 'accepted', saving: true })
      }
    })
    const result = await environment.createSession({ harness: 'codex', prompt: 'hello' })
    expect(result).toMatchObject({
      ok: false,
      error: 'busy',
      code: 'storage_blocked',
      sessionId: 'cr_demo'
    })
  })
})

describe('cloudroomHarnessForAgent', () => {
  it('maps the agents CloudRoom can run and leaves the rest alone', () => {
    expect(cloudroomHarnessForAgent('codex')).toBe('codex')
    expect(cloudroomHarnessForAgent('claude')).toBe('claude-code')
    expect(cloudroomHarnessForAgent('claude-agent-teams')).toBe('claude-code')
    expect(cloudroomHarnessForAgent('openclaude')).toBe('claude-code')
    expect(cloudroomHarnessForAgent('pi')).toBe('pi')
    expect(cloudroomHarnessForAgent('cursor')).toBe('cursor')
    expect(cloudroomHarnessForAgent('kimchi')).toBeNull()
  })
})
