import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  AGENT_OS_DEFAULT_ENDPOINTS,
  CLOUDROOM_DEFAULT_BASE_URL,
  OPENMUSE_DEFAULT_API_URL,
  OPENMUSE_DEFAULT_WEB_URL,
  migrateOpenMuseApiUrl,
  normalizeAgentOsHttpUrl,
  optionalHttpUrlFromStored,
  resolveOpenMuseApiUrl,
  resolveOptionalHttpUrl,
  type AgentOsEndpointConfig,
  type AgentOsPublicConfig,
  type AgentOsTokenService
} from '../../shared/agent-os-endpoints'
import type { SecretStore } from '../../shared/secret-store'

const ENDPOINT_FILE = 'agent-os-endpoints.json'
const TOKEN_DIR = 'agent-os-tokens'

function readStoredEndpoints(directory: string): Record<string, unknown> {
  const path = join(directory, ENDPOINT_FILE)
  if (!existsSync(path)) {
    return {}
  }
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }
    const record: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(parsed)) {
      record[key] = value
    }
    return record
  } catch {
    return {}
  }
}

export function readAgentOsEndpoints(directory: string): AgentOsEndpointConfig {
  const stored = readStoredEndpoints(directory)
  const text = (key: string): string => (typeof stored[key] === 'string' ? stored[key] : '')
  return {
    baseUrl: normalizeAgentOsHttpUrl(text('baseUrl'), AGENT_OS_DEFAULT_ENDPOINTS.baseUrl),
    hermesUrl: normalizeAgentOsHttpUrl(text('hermesUrl'), AGENT_OS_DEFAULT_ENDPOINTS.hermesUrl),
    omnirouteUrl: normalizeAgentOsHttpUrl(
      text('omnirouteUrl'),
      AGENT_OS_DEFAULT_ENDPOINTS.omnirouteUrl
    ),
    cloudroomUrl: optionalHttpUrlFromStored(stored, 'cloudroomUrl', CLOUDROOM_DEFAULT_BASE_URL),
    openmuseUrl: optionalHttpUrlFromStored(stored, 'openmuseUrl', OPENMUSE_DEFAULT_WEB_URL),
    openmuseApiUrl: migrateOpenMuseApiUrl(
      optionalHttpUrlFromStored(stored, 'openmuseApiUrl', OPENMUSE_DEFAULT_API_URL)
    ),
    localSupervisor: stored.localSupervisor === true
  }
}

export function writeAgentOsEndpoints(
  directory: string,
  config: AgentOsEndpointConfig
): AgentOsEndpointConfig {
  const next = readAgentOsEndpoints(directory)
  const merged: AgentOsEndpointConfig = {
    baseUrl: normalizeAgentOsHttpUrl(config.baseUrl, next.baseUrl),
    hermesUrl: normalizeAgentOsHttpUrl(config.hermesUrl, next.hermesUrl),
    omnirouteUrl: normalizeAgentOsHttpUrl(config.omnirouteUrl, next.omnirouteUrl),
    cloudroomUrl: resolveOptionalHttpUrl(config.cloudroomUrl, next.cloudroomUrl),
    openmuseUrl: resolveOptionalHttpUrl(config.openmuseUrl, next.openmuseUrl),
    openmuseApiUrl: resolveOpenMuseApiUrl(config.openmuseApiUrl, next.openmuseApiUrl),
    localSupervisor: config.localSupervisor === true
  }
  mkdirSync(directory, { recursive: true })
  writeFileSync(join(directory, ENDPOINT_FILE), JSON.stringify(merged), { mode: 0o600 })
  return merged
}

function tokenPath(directory: string, service: AgentOsTokenService): string {
  return join(directory, TOKEN_DIR, service)
}

export function hasAgentOsToken(directory: string, service: AgentOsTokenService): boolean {
  return existsSync(tokenPath(directory, service))
}

export function readAgentOsPublicConfig(directory: string): AgentOsPublicConfig {
  return {
    ...readAgentOsEndpoints(directory),
    tokens: {
      'agent-os': hasAgentOsToken(directory, 'agent-os'),
      hermes: hasAgentOsToken(directory, 'hermes'),
      omniroute: hasAgentOsToken(directory, 'omniroute'),
      cloudroom: hasAgentOsToken(directory, 'cloudroom')
    }
  }
}

/** Refuses to write when the OS keychain is unavailable. Never stores plaintext. */
export function writeAgentOsToken(
  directory: string,
  secrets: SecretStore,
  service: AgentOsTokenService,
  token: string
): { ok: true } | { ok: false; error: string } {
  const path = tokenPath(directory, service)
  const trimmed = token.trim()
  if (!trimmed) {
    rmSync(path, { force: true })
    return { ok: true }
  }
  if (!secrets.isEncryptionAvailable()) {
    return { ok: false, error: 'The OS keychain is unavailable, so the token was not saved.' }
  }
  mkdirSync(join(directory, TOKEN_DIR), { recursive: true })
  writeFileSync(path, secrets.encryptString(trimmed), { mode: 0o600 })
  return { ok: true }
}

export function readAgentOsToken(
  directory: string,
  secrets: SecretStore,
  service: AgentOsTokenService
): string | null {
  const path = tokenPath(directory, service)
  if (!existsSync(path) || !secrets.isEncryptionAvailable()) {
    return null
  }
  try {
    return secrets.decryptString(readFileSync(path))
  } catch {
    return null
  }
}
