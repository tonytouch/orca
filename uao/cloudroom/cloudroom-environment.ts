import { randomUUID } from 'node:crypto'
import {
  CloudroomClientError,
  createCloudroomClient,
  type CloudroomClient
} from './cloudroom-client'
import {
  isCloudroomHarness,
  type CloudroomCallResult,
  type CloudroomEvent,
  type CloudroomHarness,
  type CloudroomHealth,
  type CloudroomSessionSummary
} from './cloudroom-types'

export type CloudroomEnvironment = {
  health: () => Promise<CloudroomHealth>
  listSessions: () => Promise<CloudroomCallResult<CloudroomSessionSummary[]>>
  createSession: (input: {
    harness: string
    prompt?: string
    workspace?: string
  }) => Promise<CloudroomCallResult<{ sessionId: string }>>
  events: (sessionId: string, after: number) => Promise<CloudroomCallResult<CloudroomEvent[]>>
}

function requestId(): string {
  return `uao-${randomUUID()}`
}

function failure(error: unknown): { ok: false; error: string; code?: string } {
  if (error instanceof CloudroomClientError) {
    return {
      ok: false,
      error: error.message,
      ...(error.code ? { code: error.code } : {})
    }
  }
  return { ok: false, error: 'CloudRoom request failed.' }
}

export function createCloudroomEnvironment(options: {
  baseUrl: string
  token: string
  fetchImpl?: (input: string, init?: RequestInit) => Promise<Response>
}): CloudroomEnvironment {
  const baseUrl = options.baseUrl.trim()

  function client(): CloudroomClient {
    return createCloudroomClient({
      baseUrl,
      token: options.token,
      ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {})
    })
  }

  return {
    health: async () => {
      if (!baseUrl) {
        return {
          status: 'unconfigured',
          message: 'Set a CloudRoom URL in Endpoints to launch agents there.'
        }
      }
      try {
        const ready = await client().ready()
        if (ready.ready) {
          return {
            status: 'ready',
            baseUrl,
            message: `Connected to CloudRoom at ${baseUrl}.`
          }
        }
        return {
          status: 'not-ready',
          baseUrl,
          message: `CloudRoom at ${baseUrl} is up but not ready. Check Postgres and the service logs.`
        }
      } catch (error) {
        if (error instanceof CloudroomClientError && error.kind === 'unauthorized') {
          return {
            status: 'unauthorized',
            baseUrl,
            message: 'CloudRoom refused the token. Enter the CLOUDROOM_TOKEN from the server.'
          }
        }
        const detail = error instanceof Error ? error.message : 'CloudRoom is unreachable.'
        return { status: 'unreachable', baseUrl, message: detail }
      }
    },
    listSessions: async () => {
      if (!baseUrl) {
        return { ok: false, error: 'CloudRoom is not configured.' }
      }
      try {
        return { ok: true, value: await client().listSessions() }
      } catch (error) {
        return failure(error)
      }
    },
    createSession: async (input) => {
      if (!baseUrl) {
        return { ok: false, error: 'CloudRoom is not configured.' }
      }
      if (!isCloudroomHarness(input.harness)) {
        return {
          ok: false,
          error: 'CloudRoom runs Codex, Claude Code, Pi, and Cursor. Pick one of those.'
        }
      }
      const harness: CloudroomHarness = input.harness
      try {
        const created = await client().createSession({
          requestId: requestId(),
          harness,
          ...(input.workspace ? { workspace: input.workspace } : {})
        })
        const prompt = input.prompt?.trim()
        if (prompt) {
          try {
            await client().sendPrompt(created.sessionId, { requestId: requestId(), text: prompt })
          } catch (error) {
            const failed = failure(error)
            return { ...failed, sessionId: created.sessionId }
          }
        }
        return { ok: true, value: created }
      } catch (error) {
        return failure(error)
      }
    },
    events: async (sessionId, after) => {
      if (!baseUrl) {
        return { ok: false, error: 'CloudRoom is not configured.' }
      }
      try {
        return { ok: true, value: await client().events(sessionId, after) }
      } catch (error) {
        return failure(error)
      }
    }
  }
}
