import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { AgentOsEndpointConfig } from '../../../shared/agent-os-endpoints'
import {
  uaoDesktopPanes,
  withPublishedPanes,
  type PublishedPane,
  type UaoDesktopPane
} from '../../../../uao/desktop-shell/uao-desktop-panes'
import { translate } from '@/i18n/i18n'
import { AgentOsCockpit } from './AgentOsCockpit'
import { AgentOsRemotePane } from './AgentOsRemotePane'
import { AgentOsWorkstation } from './AgentOsWorkstation'

function paneLabel(pane: UaoDesktopPane): string {
  switch (pane.id) {
    case 'chat':
      return translate('auto.agent.os.pane.chat', 'Chat')
    case 'hermes-webui':
      return translate('auto.agent.os.pane.hermes', 'Hermes')
    case 'overview':
      return translate('auto.agent.os.pane.overview', 'Overview')
    case 'mission-control':
      return translate('auto.agent.os.pane.missions', 'Missions')
    case 'terminal':
      return translate('auto.agent.os.pane.terminal', 'Terminal')
    case 'pwa-approvals':
      return translate('auto.agent.os.pane.approvals', 'Approvals')
    case 'cockpit':
      return translate('auto.agent.os.pane.cockpit', 'Cockpit')
    case 'omniroute':
      return translate('auto.agent.os.pane.omniroute', 'Omniroute')
    case 'antigravity':
      return translate('auto.agent.os.pane.antigravity', 'Antigravity')
    case 'workstation':
      return translate('auto.agent.os.pane.workstation', 'Workstation')
    case 'openmaic':
      return translate('auto.agent.os.pane.openmaic', 'OpenMAIC')
    case 'jarvis':
      return translate('auto.agent.os.pane.jarvis', 'Jarvis')
    default:
      return pane.kind === 'page' ? pane.label : pane.id
  }
}

export function AgentOsPaneHost({ config }: { config: AgentOsEndpointConfig }): React.JSX.Element {
  const localPanes = useMemo(() => uaoDesktopPanes(config), [config])
  const [published, setPublished] = useState<PublishedPane[]>([])
  const panes = useMemo(() => withPublishedPanes(localPanes, published), [localPanes, published])
  const [activeId, setActiveId] = useState(panes[0]?.id ?? 'chat')
  const active = panes.find((pane) => pane.id === activeId) ?? panes[0]

  useEffect(() => {
    const api = window.api?.agentOs
    if (!api) {
      return undefined
    }
    let cancelled = false
    void api
      .publishedPanes()
      .then((next) => {
        if (!cancelled) {
          setPublished(next)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPublished([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [config.baseUrl])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex gap-1 overflow-x-auto border-b border-border px-2 py-1">
        {panes.map((pane) => (
          <Button
            key={pane.id}
            type="button"
            size="sm"
            variant={pane.id === active?.id ? 'secondary' : 'ghost'}
            aria-current={pane.id === active?.id ? 'page' : undefined}
            onClick={() => setActiveId(pane.id)}
          >
            {paneLabel(pane)}
          </Button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        {active?.kind === 'page' ? (
          <AgentOsRemotePane
            url={active.url}
            label={paneLabel(active)}
            agentOsBase={config.baseUrl}
          />
        ) : null}
        {active?.kind === 'cockpit' ? <AgentOsCockpit /> : null}
        {active?.kind === 'workstation' ? <AgentOsWorkstation /> : null}
      </div>
    </div>
  )
}
