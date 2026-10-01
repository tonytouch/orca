/** Where the backend lives. `remote` never spawns; it only reports on a peer. */
export type AgentOsBackendMode = 'local' | 'remote'

export type AgentOsBackendStatus =
  | 'stopped'
  | 'probing'
  | 'attached'
  | 'starting'
  | 'healthy'
  | 'unhealthy'
  | 'failed'

export type AgentOsBackendSnapshot = {
  status: AgentOsBackendStatus
  baseUrl: string
  port: number
  mode: AgentOsBackendMode
  /** True when this supervisor owns the process and may stop it. */
  owned: boolean
  pid: number | null
  restarts: number
  lastError: string | null
  checkedAt: number
}
