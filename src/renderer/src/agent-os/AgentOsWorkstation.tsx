import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { WorkstationCheck } from '../../../../uao/desktop-shell/workstation-health'
import { translate } from '@/i18n/i18n'

export function AgentOsWorkstation(): React.JSX.Element {
  const [checks, setChecks] = useState<WorkstationCheck[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (): Promise<void> => {
    const api = window.api?.agentOs
    if (!api) {
      return
    }
    try {
      setChecks(await api.workstationHealth())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Workstation health failed.')
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-auto scrollbar-sleek p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">
          {translate('auto.agent.os.AgentOsWorkstation.title', 'Workstation health')}
        </h2>
        <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
          {translate('auto.agent.os.AgentOsWorkstation.refresh', 'Refresh')}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!checks ? (
        <p className="text-sm text-muted-foreground">
          {translate('auto.agent.os.AgentOsWorkstation.loading', 'Checking services…')}
        </p>
      ) : null}
      {checks?.map((check) => (
        <div key={check.id} className="flex flex-col gap-1 border-b border-border py-2">
          <p className="text-sm font-medium">
            {check.label}
            {check.state === 'up'
              ? translate('auto.agent.os.AgentOsWorkstation.up', ' · up')
              : translate('auto.agent.os.AgentOsWorkstation.down', ' · down')}
          </p>
          <p className="text-sm text-muted-foreground">
            {check.detail} · {check.url}
          </p>
        </div>
      ))}
    </div>
  )
}
