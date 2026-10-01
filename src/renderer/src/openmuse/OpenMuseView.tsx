import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { moveFocusToRendererBeforeWebviewDetach } from '../components/browser-pane/host-guest/webview-registry'
import { AgentOsEndpointForm } from '../agent-os/AgentOsEndpointForm'
import { ORCA_BROWSER_GUEST_WEB_PREFERENCES_ATTRIBUTE } from '../../../shared/browser-guest-web-preferences'
import {
  UAO_ENDPOINTS_SAVED_EVENT,
  type AgentOsPublicConfig
} from '../../../shared/agent-os-endpoints'
import type { OpenMuseHealth } from '../../../../uao/openmuse/openmuse-health'
import { OPENMUSE_PARTITION } from '../../../../uao/openmuse/openmuse-permission'
import { translate } from '@/i18n/i18n'

function attachOpenMuseWebview(
  container: HTMLDivElement,
  embedUrl: string,
  onLoadStopped: () => void,
  onLoadFailed: (event: Electron.DidFailLoadEvent) => void
): () => void {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: createElement('webview') is Electron.WebviewTag in the renderer.
  const webview = document.createElement('webview') as Electron.WebviewTag
  webview.setAttribute('partition', OPENMUSE_PARTITION)
  webview.setAttribute('webpreferences', ORCA_BROWSER_GUEST_WEB_PREFERENCES_ATTRIBUTE)
  webview.setAttribute('aria-label', 'OpenMuse')
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

export default function OpenMuseView(): React.JSX.Element {
  const [health, setHealth] = useState<OpenMuseHealth | null>(null)
  const [config, setConfig] = useState<AgentOsPublicConfig | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const [embedError, setEmbedError] = useState<string | null>(null)
  const webviewContainerRef = useRef<HTMLDivElement>(null)

  const refresh = useCallback(async (): Promise<void> => {
    const api = window.api?.openmuse
    if (!api) {
      setLoading(false)
      return
    }
    const next = await api.health()
    setHealth(next)
    if (window.api?.agentOs) {
      setConfig(await window.api.agentOs.getConfig())
    }
    if (next.status === 'unconfigured') {
      setShowSettings(true)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
    const onSaved = (): void => {
      setReloadKey((value) => value + 1)
      void refresh()
    }
    window.addEventListener(UAO_ENDPOINTS_SAVED_EVENT, onSaved)
    return () => window.removeEventListener(UAO_ENDPOINTS_SAVED_EVENT, onSaved)
  }, [refresh])

  const embed = health?.status === 'ready' || health?.status === 'degraded'
  const webUrl = embed ? health.webUrl : ''

  useEffect(() => {
    const container = webviewContainerRef.current
    if (!embed || !container || !webUrl) {
      return undefined
    }
    setLoading(true)
    setEmbedError(null)
    const onLoadStopped = (): void => setLoading(false)
    const onLoadFailed = (event: Electron.DidFailLoadEvent): void => {
      if (event.isMainFrame && event.errorCode !== -3) {
        setLoading(false)
        setEmbedError(event.errorDescription || 'OpenMuse failed to load.')
      }
    }
    return attachOpenMuseWebview(container, webUrl, onLoadStopped, onLoadFailed)
  }, [embed, reloadKey, webUrl])

  const retry = (): void => {
    setEmbedError(null)
    setLoading(true)
    setReloadKey((value) => value + 1)
    void refresh()
  }

  const failed = health?.status === 'unreachable' || embedError !== null
  const banner = embedError ?? health?.message ?? 'Checking OpenMuse…'

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-background text-foreground">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h1 className="text-sm font-medium">
          {translate('auto.openmuse.OpenMuseView.7d1f741fbb', 'OpenMuse')}
        </h1>
        <Button type="button" variant="ghost" onClick={() => setShowSettings((open) => !open)}>
          {showSettings
            ? translate('auto.openmuse.OpenMuseView.f73e28c747', 'Hide endpoints')
            : translate('auto.openmuse.OpenMuseView.d09ebf2854', 'Endpoints')}
        </Button>
      </div>
      {health?.status === 'ready' && !embedError ? (
        <div className="border-b border-border px-4 py-2 text-sm text-muted-foreground">
          {banner}
        </div>
      ) : null}
      {health?.status === 'degraded' && !embedError ? (
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2 text-sm text-destructive">
          <span>{banner}</span>
          <Button type="button" variant="outline" onClick={retry}>
            <RefreshCw />
            {translate('auto.openmuse.OpenMuseView.e23303b8fc', 'Retry')}
          </Button>
        </div>
      ) : null}
      {health?.status === 'unconfigured' || !health ? (
        <div className="border-b border-border px-4 py-2 text-sm text-muted-foreground">
          {banner}
        </div>
      ) : null}
      {showSettings && config ? (
        <AgentOsEndpointForm
          config={config}
          onSaved={(next) => {
            setConfig(next)
            void refresh()
          }}
        />
      ) : null}
      {failed ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
          <AlertCircle className="size-12 text-destructive" />
          <h2 className="text-xl font-semibold">
            {translate('auto.openmuse.OpenMuseView.6d9941f5d7', 'OpenMuse is unreachable')}
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">{banner}</p>
          <Button type="button" onClick={retry}>
            <RefreshCw />
            {translate('auto.openmuse.OpenMuseView.70552f6357', 'Retry connection')}
          </Button>
        </div>
      ) : (
        <div className="relative h-full w-full">
          {loading && embed ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-xs">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : null}
          <div ref={webviewContainerRef} className="h-full w-full" />
        </div>
      )}
    </div>
  )
}
