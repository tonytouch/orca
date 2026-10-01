import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  AGENT_OS_DEFAULT_ENDPOINTS,
  parseAgentOsSavedEndpoints,
  type AgentOsSavedEndpoints
} from '../../../src/shared/agent-os-endpoints'

export const AGENT_OS_ENDPOINT_STORAGE_KEY = 'orca:agent_os_endpoint'

export type { AgentOsSavedEndpoints }

export function defaultAgentOsEndpoints(): AgentOsSavedEndpoints {
  return {
    baseUrl: AGENT_OS_DEFAULT_ENDPOINTS.baseUrl,
    hermesUrl: AGENT_OS_DEFAULT_ENDPOINTS.hermesUrl,
    omnirouteUrl: AGENT_OS_DEFAULT_ENDPOINTS.omnirouteUrl
  }
}

export async function loadAgentOsSavedEndpoints(): Promise<AgentOsSavedEndpoints | null> {
  const raw = await AsyncStorage.getItem(AGENT_OS_ENDPOINT_STORAGE_KEY)
  return parseAgentOsSavedEndpoints(raw)
}

export async function saveAgentOsEndpoints(endpoints: AgentOsSavedEndpoints): Promise<void> {
  await AsyncStorage.setItem(AGENT_OS_ENDPOINT_STORAGE_KEY, JSON.stringify(endpoints))
}

export async function clearAgentOsSavedEndpoints(): Promise<void> {
  await AsyncStorage.removeItem(AGENT_OS_ENDPOINT_STORAGE_KEY)
}
