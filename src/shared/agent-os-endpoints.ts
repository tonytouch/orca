/** Tailscale addresses for Keith's Agent OS host. URLs are not secrets. */
export const AGENT_OS_DEFAULT_BASE_URL = 'http://100.90.167.20:5050'
export const AGENT_OS_DEFAULT_HERMES_URL = 'http://100.90.167.20:8787'
export const AGENT_OS_DEFAULT_OMNIROUTE_URL = 'http://100.90.167.20:20128'
/** cloudroom-core's own default port, on the same Tailscale host. */
export const CLOUDROOM_DEFAULT_BASE_URL = 'http://100.90.167.20:9840'
/** Expo web, bound on all interfaces. The page does not read this from UAO at runtime. */
export const OPENMUSE_DEFAULT_WEB_URL = 'http://100.90.167.20:8081'
/** OpenMuse's own API port. Hermes on this host already uses 8787, so one of them must move. */
export const OPENMUSE_DEFAULT_API_URL = 'http://100.90.167.20:8787'

export const UAO_ENDPOINTS_SAVED_EVENT = 'uao-endpoints-saved'

export type AgentOsTokenService = 'agent-os' | 'hermes' | 'omniroute' | 'cloudroom'

export type AgentOsEndpointConfig = {
  baseUrl: string
  hermesUrl: string
  omnirouteUrl: string
  cloudroomUrl: string
  openmuseUrl: string
  openmuseApiUrl: string
  /** When false, UAO only attaches to the remote backend and never spawns one. */
  localSupervisor: boolean
}

export type AgentOsPublicConfig = AgentOsEndpointConfig & {
  tokens: Record<AgentOsTokenService, boolean>
}

export const AGENT_OS_DEFAULT_ENDPOINTS: AgentOsEndpointConfig = {
  baseUrl: AGENT_OS_DEFAULT_BASE_URL,
  hermesUrl: AGENT_OS_DEFAULT_HERMES_URL,
  omnirouteUrl: AGENT_OS_DEFAULT_OMNIROUTE_URL,
  cloudroomUrl: CLOUDROOM_DEFAULT_BASE_URL,
  openmuseUrl: OPENMUSE_DEFAULT_WEB_URL,
  openmuseApiUrl: OPENMUSE_DEFAULT_API_URL,
  localSupervisor: false
}

/** A missing key uses the Tailscale default. A blank value stays blank so the feature can hide. */
export function optionalHttpUrlFromStored(
  stored: Record<string, unknown>,
  key: string,
  fallback: string
): string {
  if (!Object.hasOwn(stored, key)) {
    return fallback
  }
  const value = stored[key]
  if (typeof value !== 'string' || !value.trim()) {
    return ''
  }
  return normalizeAgentOsHttpUrl(value, fallback)
}

export function resolveOptionalHttpUrl(incoming: string | undefined, previous: string): string {
  if (incoming === undefined) {
    return previous
  }
  if (!incoming.trim()) {
    return ''
  }
  return normalizeAgentOsHttpUrl(incoming, previous)
}

export function cloudroomUrlFromStored(stored: Record<string, unknown>): string {
  return optionalHttpUrlFromStored(stored, 'cloudroomUrl', CLOUDROOM_DEFAULT_BASE_URL)
}

export function resolveCloudroomUrl(incoming: string | undefined, previous: string): string {
  return resolveOptionalHttpUrl(incoming, previous)
}

export function normalizeAgentOsHttpUrl(value: string, fallback: string): string {
  const trimmed = value.trim().replace(/\/$/, '')
  if (!trimmed) {
    return fallback
  }
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return fallback
    }
    return url.toString().replace(/\/$/, '')
  } catch {
    return fallback
  }
}

export type AgentOsSavedEndpoints = Pick<
  AgentOsEndpointConfig,
  'baseUrl' | 'hermesUrl' | 'omnirouteUrl' | 'cloudroomUrl' | 'openmuseUrl' | 'openmuseApiUrl'
>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function savedUrlField(record: Record<string, unknown>, key: string, fallback: string): string {
  const value = record[key]
  return typeof value === 'string' ? normalizeAgentOsHttpUrl(value, fallback) : fallback
}

/** Accepts the current JSON blob or a legacy plain Agent OS URL string. */
export function parseAgentOsSavedEndpoints(raw: string | null): AgentOsSavedEndpoints | null {
  if (!raw) {
    return null
  }
  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }
  if (trimmed.startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(trimmed)
      if (!isRecord(parsed)) {
        return null
      }
      return {
        baseUrl: savedUrlField(parsed, 'baseUrl', AGENT_OS_DEFAULT_BASE_URL),
        hermesUrl: savedUrlField(parsed, 'hermesUrl', AGENT_OS_DEFAULT_HERMES_URL),
        omnirouteUrl: savedUrlField(parsed, 'omnirouteUrl', AGENT_OS_DEFAULT_OMNIROUTE_URL),
        cloudroomUrl: cloudroomUrlFromStored(parsed),
        openmuseUrl: optionalHttpUrlFromStored(parsed, 'openmuseUrl', OPENMUSE_DEFAULT_WEB_URL),
        openmuseApiUrl: optionalHttpUrlFromStored(
          parsed,
          'openmuseApiUrl',
          OPENMUSE_DEFAULT_API_URL
        )
      }
    } catch {
      return null
    }
  }
  return {
    baseUrl: normalizeAgentOsHttpUrl(trimmed, AGENT_OS_DEFAULT_BASE_URL),
    hermesUrl: AGENT_OS_DEFAULT_HERMES_URL,
    omnirouteUrl: AGENT_OS_DEFAULT_OMNIROUTE_URL,
    cloudroomUrl: CLOUDROOM_DEFAULT_BASE_URL,
    openmuseUrl: OPENMUSE_DEFAULT_WEB_URL,
    openmuseApiUrl: OPENMUSE_DEFAULT_API_URL
  }
}
