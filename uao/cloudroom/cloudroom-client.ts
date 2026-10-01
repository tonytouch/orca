import type { CloudroomEvent, CloudroomHarness, CloudroomSessionSummary } from './cloudroom-types'

export class CloudroomClientError extends Error {
  readonly kind: 'unreachable' | 'unauthorized' | 'http'
  readonly code: string | undefined
  readonly status: number | undefined

  constructor(
    kind: 'unreachable' | 'unauthorized' | 'http',
    message: string,
    code?: string,
    status?: number
  ) {
    super(message)
    this.name = 'CloudroomClientError'
    this.kind = kind
    this.code = code
    this.status = status
  }
}

export type CloudroomClient = {
  ready: () => Promise<{ ready: boolean }>
  listSessions: () => Promise<CloudroomSessionSummary[]>
  createSession: (input: {
    requestId: string
    harness: CloudroomHarness
    workspace?: string
  }) => Promise<{ sessionId: string }>
  sendPrompt: (sessionId: string, input: { requestId: string; text: string }) => Promise<void>
  events: (sessionId: string, after: number) => Promise<CloudroomEvent[]>
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function errorMessage(parsed: unknown, status: number): string {
  if (isRecord(parsed) && typeof parsed.error === 'string' && parsed.error.trim()) {
    return parsed.error
  }
  return `CloudRoom returned HTTP ${status}.`
}

function errorCode(parsed: unknown): string | undefined {
  if (isRecord(parsed) && typeof parsed.code === 'string') {
    return parsed.code
  }
  return undefined
}

export function createCloudroomClient(options: {
  baseUrl: string
  token: string
  fetchImpl?: FetchLike
}): CloudroomClient {
  const fetchImpl = options.fetchImpl ?? fetch
  const base = options.baseUrl.replace(/\/$/, '')

  async function request(
    path: string,
    init?: { method?: string; body?: unknown }
  ): Promise<unknown> {
    const headers: Record<string, string> = { accept: 'application/json' }
    if (options.token) {
      headers.authorization = `Bearer ${options.token}`
    }
    if (init?.body !== undefined) {
      headers['content-type'] = 'application/json'
    }
    let response: Response
    try {
      response = await fetchImpl(`${base}${path}`, {
        method: init?.method ?? 'GET',
        headers,
        body: init?.body !== undefined ? JSON.stringify(init.body) : undefined
      })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'network error'
      throw new CloudroomClientError('unreachable', `Can't reach CloudRoom at ${base}. ${detail}`)
    }
    const text = await response.text()
    let parsed: unknown = null
    if (text) {
      try {
        parsed = JSON.parse(text)
      } catch {
        parsed = { error: text.slice(0, 300) }
      }
    }
    if (!response.ok) {
      throw new CloudroomClientError(
        response.status === 401 ? 'unauthorized' : 'http',
        errorMessage(parsed, response.status),
        errorCode(parsed),
        response.status
      )
    }
    return parsed
  }

  return {
    ready: async () => {
      try {
        const body = await request('/v1/ready')
        return { ready: isRecord(body) && body.ready === true }
      } catch (error) {
        if (error instanceof CloudroomClientError && error.status === 503) {
          return { ready: false }
        }
        throw error
      }
    },
    listSessions: async () => {
      const body = await request('/v1/sessions')
      if (!isRecord(body) || !Array.isArray(body.sessions)) {
        return []
      }
      const sessions: CloudroomSessionSummary[] = []
      for (const item of body.sessions) {
        if (!isRecord(item) || typeof item.session_id !== 'string') {
          continue
        }
        sessions.push({
          sessionId: item.session_id,
          harness: typeof item.harness === 'string' ? item.harness : 'unknown',
          state: typeof item.state === 'string' ? item.state : 'unknown',
          model: typeof item.model === 'string' ? item.model : null,
          lastActivityMs: typeof item.last_activity_ms === 'number' ? item.last_activity_ms : null
        })
      }
      return sessions
    },
    createSession: async (input) => {
      const body: Record<string, string> = {
        request_id: input.requestId,
        harness: input.harness
      }
      if (input.workspace) {
        body.workspace = input.workspace
      }
      const parsed = await request('/v1/sessions', { method: 'POST', body })
      if (!isRecord(parsed) || typeof parsed.session_id !== 'string') {
        throw new CloudroomClientError('http', 'CloudRoom did not return a session id.')
      }
      return { sessionId: parsed.session_id }
    },
    sendPrompt: async (sessionId, input) => {
      await request(`/v1/sessions/${encodeURIComponent(sessionId)}/prompts`, {
        method: 'POST',
        body: { request_id: input.requestId, text: input.text }
      })
    },
    events: async (sessionId, after) => {
      const parsed = await request(
        `/v1/sessions/${encodeURIComponent(sessionId)}/events?after=${after}`
      )
      const records = Array.isArray(parsed)
        ? parsed
        : isRecord(parsed) && Array.isArray(parsed.events)
          ? parsed.events
          : []
      const events: CloudroomEvent[] = []
      for (const item of records) {
        if (!isRecord(item) || typeof item.sequence !== 'number') {
          continue
        }
        events.push({
          sequence: item.sequence,
          kind: typeof item.kind === 'string' ? item.kind : 'record',
          text: eventText(item)
        })
      }
      return events
    }
  }
}

function eventText(item: Record<string, unknown>): string {
  const data = item.data
  if (typeof data === 'string') {
    return data
  }
  if (!isRecord(data)) {
    return ''
  }
  for (const key of ['text', 'delta', 'message', 'content']) {
    const value = data[key]
    if (typeof value === 'string' && value) {
      return value
    }
  }
  return ''
}
