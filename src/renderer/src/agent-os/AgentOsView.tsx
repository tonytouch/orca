import { useEffect, useState, useCallback } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import {
  AGENT_OS_DEFAULT_BASE_URL,
  AGENT_OS_DEFAULT_ENDPOINTS,
  type AgentOsPublicConfig
} from '../../../shared/agent-os-endpoints'
import type { AgentOsBackendSnapshot } from '../../../shared/agent-os-types'
import { AgentOsEndpointForm } from './AgentOsEndpointForm'
import { AgentOsPaneHost } from './AgentOsPaneHost'
import { translate } from '@/i18n/i18n'

export default function AgentOsView(): React.JSX.Element {
  const [status, setStatus] = useState<AgentOsBackendSnapshot | null>(null)
  const [baseUrl, setBaseUrl] = useState<string>(AGENT_OS_DEFAULT_BASE_URL)
  const [config, setConfig] = useState<AgentOsPublicConfig | null>(null)
  const [showSettings, setShowSettings] = useState<boolean>(false)

  const refreshStatus = useCallback(async () => {
    try {
      if (window.api?.agentOs) {
        const snap = await window.api.agentOs.getStatus()
        const url = await window.api.agentOs.getBaseUrl()
        setStatus(snap)
        setBaseUrl(url || AGENT_OS_DEFAULT_BASE_URL)
        setConfig(await window.api.agentOs.getConfig())
      }
    } catch (err) {
      console.warn('[agent-os-view] failed to fetch status:', err)
    }
  }, [])

  useEffect(() => {
    void refreshStatus()

    if (window.api?.agentOs?.onStatusChange) {
      const unsub = window.api.agentOs.onStatusChange((snap) => {
        setStatus(snap)
        if (snap.baseUrl) {
          setBaseUrl(snap.baseUrl)
        }
      })
      return unsub
    }
    return undefined
  }, [refreshStatus])

  const handleReload = (): void => {
    void window.api.agentOs
      .reprobe()
      .then((snap) => {
        setStatus(snap)
        if (snap.baseUrl) {
          setBaseUrl(snap.baseUrl)
        }
      })
      .catch((err: unknown) => {
        console.warn('[agent-os-view] failed to reprobe backend:', err)
      })
  }

  const isAvailable =
    status?.status === 'attached' ||
    status?.status === 'healthy' ||
    status?.status === 'starting' ||
    status?.status === 'probing' ||
    !status

  const endpoints = config ?? { ...AGENT_OS_DEFAULT_ENDPOINTS, baseUrl }

  return (
    <div className="relative flex flex-col w-full h-full bg-background text-foreground overflow-hidden">
      <div className="flex justify-end border-b border-border px-3 py-1">
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setShowSettings((open) => !open)}
        >
          {showSettings
            ? translate('auto.agent.os.AgentOsView.30684e3f5b', 'Hide endpoints')
            : translate('auto.agent.os.AgentOsView.58bf5f3a7e', 'Endpoints')}
        </button>
      </div>
      {showSettings && config ? (
        <AgentOsEndpointForm
          config={config}
          onSaved={(next) => {
            setConfig(next)
            setBaseUrl(next.baseUrl)
            void refreshStatus()
          }}
        />
      ) : null}
      {!isAvailable && status?.status === 'failed' ? (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <h2 className="text-xl font-semibold">
            {translate('auto.agent.os.AgentOsView.8325fc6cc0', 'Agent OS Backend Unavailable')}
          </h2>
          <p className="max-w-md text-muted-foreground text-sm">
            {status?.lastError ||
              translate(
                'auto.agent.os.AgentOsView.86b7d3404c',
                'Unable to reach the Agent OS backend at {{value0}}.',
                { value0: baseUrl }
              )}
          </p>
          <div className="text-xs text-muted-foreground font-mono bg-muted/50 p-2 rounded">
            {translate('auto.agent.os.AgentOsView.target', 'Target: {{url}} (mode: {{mode}})', {
              url: baseUrl,
              mode: status?.mode || translate('auto.agent.os.AgentOsView.c65b727eb3', 'local')
            })}
          </div>
          <button
            type="button"
            onClick={handleReload}
            className="flex items-center gap-2 px-4 py-2 mt-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            {translate('auto.agent.os.AgentOsView.9b73425010', 'Retry Connection')}
          </button>
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <AgentOsPaneHost config={endpoints} />
        </div>
      )}
    </div>
  )
}
