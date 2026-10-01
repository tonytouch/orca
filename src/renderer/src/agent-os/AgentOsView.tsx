import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import {
  AGENT_OS_DEFAULT_BASE_URL,
  type AgentOsPublicConfig
} from '../../../shared/agent-os-endpoints'
import type { AgentOsBackendSnapshot } from '../../../shared/agent-os-types'
import { ORCA_BROWSER_GUEST_WEB_PREFERENCES_ATTRIBUTE } from '../../../shared/browser-guest-web-preferences'
import { moveFocusToRendererBeforeWebviewDetach } from '../components/browser-pane/host-guest/webview-registry'
import { AgentOsEndpointForm } from './AgentOsEndpointForm'

function attachAgentOsWebview(
  container: HTMLDivElement,
  partition: string,
  embedUrl: string,
  onLoadStopped: () => void,
  onLoadFailed: (event: Electron.DidFailLoadEvent) => void
): () => void {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: createElement('webview') is Electron.WebviewTag in the renderer.
  const webview = document.createElement('webview') as Electron.WebviewTag
  webview.setAttribute('partition', partition)
  webview.setAttribute('webpreferences', ORCA_BROWSER_GUEST_WEB_PREFERENCES_ATTRIBUTE)
  webview.setAttribute('aria-label', 'Agent OS')
  webview.style.width = '100%'
  webview.style.height = '100%'
  webview.style.border = 'none'
  webview.addEventListener('did-stop-loading', onLoadStopped)
  webview.addEventListener('did-fail-load', onLoadFailed)
  container.appendChild(webview)
  webview.setAttribute('src', embedUrl)
  return () => {
    webview.removeEventListener('did-stop-loading', onLoadStopped)
    webview.removeEventListener('did-fail-load', onLoadFailed)
    moveFocusToRendererBeforeWebviewDetach(webview)
    webview.remove()
  }
}

export default function AgentOsView(): React.JSX.Element {
  const [status, setStatus] = useState<AgentOsBackendSnapshot | null>(null)
  const [baseUrl, setBaseUrl] = useState<string>(AGENT_OS_DEFAULT_BASE_URL)
  const [config, setConfig] = useState<AgentOsPublicConfig | null>(null)
  const [showSettings, setShowSettings] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [iframeKey, setIframeKey] = useState<number>(0)
  const webviewContainerRef = useRef<HTMLDivElement>(null)

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
    } finally {
      setLoading(false)
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
    setLoading(true)
    setIframeKey((prev) => prev + 1)
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
      .finally(() => setLoading(false))
  }

  const isAvailable =
    status?.status === 'attached' ||
    status?.status === 'healthy' ||
    status?.status === 'starting' ||
    status?.status === 'probing' ||
    !status

  const embedUrl = `${baseUrl.replace(/\/$/, '')}/?embed=1#overview`

  useEffect(() => {
    const container = webviewContainerRef.current
    if (!isAvailable || !container) {
      return undefined
    }
    let disposed = false
    let detach: (() => void) | undefined
    const onLoadStopped = (): void => setLoading(false)
    const onLoadFailed = (event: Electron.DidFailLoadEvent): void => {
      if (event.isMainFrame && event.errorCode !== -3) {
        setLoading(false)
      }
    }
    setLoading(true)
    void window.api.browser.sessionResolvePartition({ profileId: null }).then((partition) => {
      if (disposed || !partition) {
        return
      }
      detach = attachAgentOsWebview(container, partition, embedUrl, onLoadStopped, onLoadFailed)
    })
    return () => {
      disposed = true
      detach?.()
    }
  }, [embedUrl, iframeKey, isAvailable])

  return (
    <div className="relative flex flex-col w-full h-full bg-background text-foreground overflow-hidden">
      <div className="flex justify-end border-b border-border px-3 py-1">
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setShowSettings((open) => !open)}
        >
          {showSettings ? 'Hide endpoints' : 'Endpoints'}
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
          <h2 className="text-xl font-semibold">Agent OS Backend Unavailable</h2>
          <p className="max-w-md text-muted-foreground text-sm">
            {status?.lastError || `Unable to reach the Agent OS backend at ${baseUrl}.`}
          </p>
          <div className="text-xs text-muted-foreground font-mono bg-muted/50 p-2 rounded">
            Target: {baseUrl} (mode: {status?.mode || 'local'})
          </div>
          <button
            type="button"
            onClick={handleReload}
            className="flex items-center gap-2 px-4 py-2 mt-4 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Connection
          </button>
        </div>
      ) : (
        <>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-xs z-10">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          <div ref={webviewContainerRef} className="h-full w-full" />
        </>
      )}
    </div>
  )
}
