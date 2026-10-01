import { translate } from '@/i18n/i18n'
import type { AgentCatalogEntry } from './agent-catalog'

/** Kimchi and Mavis live outside the upstream catalog so that file stays under its line limit. */
export function agentOsCatalogEntries(): AgentCatalogEntry[] {
  return [
    {
      id: 'kimchi',
      label: translate('auto.lib.agent.catalog.kimchi', 'Kimchi'),
      cmd: 'kimchi',
      homepageUrl: 'https://github.com/tonytouch/ultimate-agent-os'
    },
    {
      id: 'mavis',
      label: translate('auto.lib.agent.catalog.mavis', 'Mavis'),
      cmd: 'mavis-bridge.sh',
      homepageUrl: 'https://github.com/tonytouch/ultimate-agent-os'
    }
  ]
}
