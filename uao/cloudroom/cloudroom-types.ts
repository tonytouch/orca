/** Harnesses CloudRoom core accepts on POST /v1/sessions. */
export const CLOUDROOM_HARNESSES = ['codex', 'claude-code', 'pi', 'cursor'] as const

export type CloudroomHarness = (typeof CLOUDROOM_HARNESSES)[number]

export type CloudroomSessionSummary = {
  sessionId: string
  harness: string
  state: string
  model: string | null
  lastActivityMs: number | null
}

export type CloudroomEvent = {
  sequence: number
  kind: string
  text: string
}

export type CloudroomHealth =
  | { status: 'unconfigured'; message: string }
  | { status: 'unreachable'; baseUrl: string; message: string }
  | { status: 'unauthorized'; baseUrl: string; message: string }
  | { status: 'not-ready'; baseUrl: string; message: string }
  | { status: 'ready'; baseUrl: string; message: string }

export type CloudroomCallResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; code?: string; sessionId?: string }

export function isCloudroomHarness(value: string): value is CloudroomHarness {
  return value === 'codex' || value === 'claude-code' || value === 'pi' || value === 'cursor'
}

/** Orca agent ids that CloudRoom can run. Everything else stays on a local or SSH terminal. */
export function cloudroomHarnessForAgent(agent: string): CloudroomHarness | null {
  switch (agent) {
    case 'codex':
      return 'codex'
    case 'claude':
    case 'claude-agent-teams':
    case 'openclaude':
      return 'claude-code'
    case 'pi':
      return 'pi'
    case 'cursor':
      return 'cursor'
    default:
      return null
  }
}
