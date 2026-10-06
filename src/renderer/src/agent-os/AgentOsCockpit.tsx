import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { CockpitApproval, CockpitQueue } from '../../../../uao/desktop-shell/cockpit-queue'
import { translate } from '@/i18n/i18n'

function approvalTitle(item: CockpitApproval): string {
  return item.primaryArg ? `${item.tool} · ${item.primaryArg}` : item.tool
}

export function AgentOsCockpit(): React.JSX.Element {
  const [queue, setQueue] = useState<CockpitQueue | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const refresh = useCallback(async (): Promise<void> => {
    const api = window.api?.agentOs
    if (!api) {
      return
    }
    try {
      setQueue(await api.cockpit())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approvals are unreachable.')
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const decide = async (id: string, approved: boolean): Promise<void> => {
    setBusyId(id)
    try {
      await window.api.agentOs.decideCockpit(id, approved)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The decision was not saved.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto scrollbar-sleek p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">
          {translate('auto.agent.os.AgentOsCockpit.title', 'Cockpit approvals')}
        </h2>
        <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
          {translate('auto.agent.os.AgentOsCockpit.refresh', 'Refresh')}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!queue ? (
        <p className="text-sm text-muted-foreground">
          {translate('auto.agent.os.AgentOsCockpit.loading', 'Checking the approval queue…')}
        </p>
      ) : null}
      {queue && queue.pending.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {translate('auto.agent.os.AgentOsCockpit.empty', 'Nothing is waiting for approval.')}
        </p>
      ) : null}
      {queue?.pending.map((item) => (
        <div key={item.id} className="flex flex-col gap-2 rounded-md border border-border p-3">
          <p className="text-sm font-medium">{approvalTitle(item)}</p>
          {item.reason ? <p className="text-sm text-muted-foreground">{item.reason}</p> : null}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busyId === item.id}
              onClick={() => void decide(item.id, true)}
            >
              {translate('auto.agent.os.AgentOsCockpit.approve', 'Approve')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busyId === item.id}
              onClick={() => void decide(item.id, false)}
            >
              {translate('auto.agent.os.AgentOsCockpit.reject', 'Reject')}
            </Button>
          </div>
        </div>
      ))}
      {queue && queue.history.length > 0 ? (
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">
            {translate('auto.agent.os.AgentOsCockpit.history', 'Recent decisions')}
          </h3>
          {queue.history.map((item) => (
            <p key={item.id} className="text-sm text-muted-foreground">
              {approvalTitle(item)}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  )
}
