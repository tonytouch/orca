import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { ORCA_BROWSER_GUEST_WEB_PREFERENCES_ATTRIBUTE } from '../../../shared/browser-guest-web-preferences'
import { moveFocusToRendererBeforeWebviewDetach } from '../components/browser-pane/host-guest/webview-registry'

const SIDECAR_PARTITION = 'persist:uao-sidecar'

function attachPaneWebview(
  container: HTMLDivElement,
  partition: string,
  url: string,
  label: string,
  onLoadStopped: () => void,
  onLoadFailed: (event: Electron.DidFailLoadEvent) => void
): () => void {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: createElement('webview') is Electron.WebviewTag in the renderer.
  const webview = document.createElement('webview') as Electron.WebviewTag
  webview.setAttribute('partition', partition)
  webview.setAttribute('webpreferences', ORCA_BROWSER_GUEST_WEB_PREFERENCES_ATTRIBUTE)
  webview.setAttribute('aria-label', label)
  webview.style.width = '100%'
  webview.style.height = '100%'
  webview.style.border = 'none'
  webview.addEventListener('did-stop-loading', onLoadStopped)
  webview.addEventListener('did-fail-load', onLoadFailed)
  container.appendChild(webview)
  webview.setAttribute('src', url)
  return () => {
    webview.removeEventListener('did-stop-loading', onLoadStopped)
    webview.removeEventListener('did-fail-load', onLoadFailed)
    moveFocusToRendererBeforeWebviewDetach(webview)
    webview.remove()
  }
}

async function partitionFor(pageUrl: string, agentOsBase: string): Promise<string> {
  try {
    if (new URL(pageUrl).origin === new URL(agentOsBase).origin) {
      const partition = await window.api.browser.sessionResolvePartition({ profileId: null })
      if (partition) {
        return partition
      }
    }
  } catch {
    return SIDECAR_PARTITION
  }
  return SIDECAR_PARTITION
}

export function AgentOsRemotePane({
  url,
  label,
  agentOsBase
}: {
  url: string
  label: string
  agentOsBase: string
}): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || !url) {
      return undefined
    }
    let disposed = false
    let detach: (() => void) | undefined
    setLoading(true)
    setError(null)
    const onLoadStopped = (): void => setLoading(false)
    const onLoadFailed = (event: Electron.DidFailLoadEvent): void => {
      if (event.isMainFrame && event.errorCode !== -3) {
        setLoading(false)
        setError(event.errorDescription || 'This page failed to load.')
      }
    }
    void partitionFor(url, agentOsBase).then((partition) => {
      if (disposed) {
        return
      }
      detach = attachPaneWebview(container, partition, url, label, onLoadStopped, onLoadFailed)
    })
    return () => {
      disposed = true
      detach?.()
    }
  }, [agentOsBase, label, url])

  return (
    <div className="relative h-full min-h-0 w-full">
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : null}
      {error ? (
        <p className="border-b border-border px-4 py-2 text-sm text-destructive">{error}</p>
      ) : null}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}
