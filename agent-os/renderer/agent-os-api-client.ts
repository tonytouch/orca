/**
 * Typed client for the Agent OS backend, for the Orca renderer.
 *
 * Two rules this file exists to enforce:
 *  - The token never reaches renderer storage. It is handed in by the preload
 *    bridge (sourced from Electron safeStorage in the main process) and lives
 *    only in this module's closure.
 *  - Every path here is one verified to exist in Agent OS. Nothing is guessed:
 *    inventing an endpoint makes a ported pane fail in a way that looks like a
 *    backend outage.
 */

export type AgentOsClientOptions = {
  baseUrl: string
  /** From the preload bridge. Omitted only for the token-exempt /healthz. */
  token?: string
  fetchImpl?: typeof fetch
}

export type ApprovalRequest = {
  id: string
  tool: string
  primaryArg?: string
  reason?: string
  metadata?: Record<string, unknown>
  createdAt?: number
}

export type HealthResult = { ok: boolean; status: number }

export type OrcaPanelResult = {
  ok: boolean
  orca_bin?: string
  runtime: { runtimeId?: string; pid?: number; transports?: unknown; startedAt?: number } | null
  repos: unknown[]
}

export class AgentOsApiError extends Error {
  readonly status: number
  readonly path: string

  constructor(path: string, status: number, detail: string) {
    super(`Agent OS ${path} failed (${status}): ${detail}`)
    this.name = 'AgentOsApiError'
    this.status = status
    this.path = path
  }
}

export function createAgentOsClient(options: AgentOsClientOptions): {
  health: () => Promise<HealthResult>
  orcaPanel: () => Promise<OrcaPanelResult>
  pendingApprovals: () => Promise<ApprovalRequest[]>
  approvalHistory: () => Promise<ApprovalRequest[]>
  decideApproval: (id: string, approved: boolean) => Promise<void>
} {
  const doFetch = options.fetchImpl ?? fetch
  const base = options.baseUrl.replace(/\/$/, '')

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    // Bearer is the documented programmatic path in routes/auth.js
    // (Authorization: Bearer <token> or X-Agent-OS-Token). Loopback is exempt,
    // which is why local dev works with no token at all.
    if (options.token) {
      headers.authorization = `Bearer ${options.token}`
    }
    const res = await doFetch(`${base}${path}`, {
      ...init,
      headers: { ...headers, ...init?.headers }
    })
    if (!res.ok) {
      throw new AgentOsApiError(path, res.status, (await res.text()).slice(0, 300))
    }
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: res.json() is the JSON body of the path this helper was called for.
    return (await res.json()) as T
  }

  return {
    health: async () => {
      const res = await doFetch(`${base}/healthz`)
      return { ok: res.ok, status: res.status }
    },

    orcaPanel: () => request<OrcaPanelResult>('/api/orca/panel'),

    pendingApprovals: async () => {
      const body = await request<{ pending?: ApprovalRequest[] } | ApprovalRequest[]>(
        '/api/approval/pending'
      )
      return Array.isArray(body) ? body : (body.pending ?? [])
    },

    approvalHistory: async () => {
      const body = await request<{ history?: ApprovalRequest[] } | ApprovalRequest[]>(
        '/api/approval/history'
      )
      return Array.isArray(body) ? body : (body.history ?? [])
    },

    decideApproval: async (id, approved) => {
      // The verdict must land on /approve or /reject so approval_inbox resolves
      // the parked tool call. There is no generic PATCH on purpose.
      await request<unknown>(approved ? '/api/approval/approve' : '/api/approval/reject', {
        method: 'POST',
        body: JSON.stringify({ id })
      })
    }
  }
}
