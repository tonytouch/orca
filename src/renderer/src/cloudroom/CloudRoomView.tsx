import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AgentOsEndpointForm } from '../agent-os/AgentOsEndpointForm'
import type { AgentOsPublicConfig } from '../../../shared/agent-os-endpoints'
import {
  CLOUDROOM_HARNESSES,
  type CloudroomHarness,
  type CloudroomHealth,
  type CloudroomSessionSummary
} from '../../../../uao/cloudroom/cloudroom-types'

const HARNESS_LABELS: Record<CloudroomHarness, string> = {
  codex: 'Codex',
  'claude-code': 'Claude Code',
  pi: 'Pi',
  cursor: 'Cursor'
}

export default function CloudRoomView(): React.JSX.Element {
  const [health, setHealth] = useState<CloudroomHealth | null>(null)
  const [config, setConfig] = useState<AgentOsPublicConfig | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [harness, setHarness] = useState<CloudroomHarness>('codex')
  const [prompt, setPrompt] = useState('')
  const [workspace, setWorkspace] = useState('')
  const [sessions, setSessions] = useState<CloudroomSessionSummary[]>([])
  const [attached, setAttached] = useState<string | null>(null)
  const [transcript, setTranscript] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async (): Promise<void> => {
    const api = window.api?.cloudroom
    if (!api) {
      return
    }
    const nextHealth = await api.health()
    setHealth(nextHealth)
    setConfig(await window.api.agentOs.getConfig())
    if (nextHealth.status !== 'ready') {
      setSessions([])
      return
    }
    const listed = await api.listSessions()
    setSessions(listed.ok ? listed.value : [])
    if (!listed.ok) {
      setActionError(listed.error)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (health?.status === 'unconfigured') {
      setShowSettings(true)
    }
  }, [health?.status])

  useEffect(() => {
    if (!attached || health?.status !== 'ready') {
      return undefined
    }
    let cancelled = false
    let after = 0
    setTranscript('')
    const pull = async (): Promise<void> => {
      const result = await window.api.cloudroom.events(attached, after)
      if (cancelled || !result.ok || result.value.length === 0) {
        if (!cancelled && result && !result.ok) {
          setActionError(result.error)
        }
        return
      }
      after = result.value.at(-1)?.sequence ?? after
      const chunk = result.value
        .map((event) => event.text)
        .filter((text) => text.length > 0)
        .join('')
      if (chunk) {
        setTranscript((prev) => (prev + chunk).slice(-80_000))
      }
    }
    void pull()
    const timer = window.setInterval(() => {
      void pull()
    }, 2000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [attached, health?.status])

  const start = async (): Promise<void> => {
    setBusy(true)
    setActionError(null)
    try {
      const result = await window.api.cloudroom.createSession({
        harness,
        ...(prompt.trim() ? { prompt } : {}),
        ...(workspace.trim() ? { workspace: workspace.trim() } : {})
      })
      if (!result.ok) {
        setActionError(result.error)
        if (result.sessionId) {
          setAttached(result.sessionId)
        }
        return
      }
      setAttached(result.value.sessionId)
      setPrompt('')
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const ready = health?.status === 'ready'
  const banner = health?.message ?? 'Checking CloudRoom…'

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background text-foreground">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h1 className="text-sm font-medium">CloudRoom</h1>
        <Button type="button" variant="ghost" onClick={() => setShowSettings((open) => !open)}>
          {showSettings ? 'Hide endpoints' : 'Endpoints'}
        </Button>
      </div>
      {health?.status === 'ready' ? (
        <div className="border-b border-border px-4 py-2 text-sm text-foreground">{banner}</div>
      ) : null}
      {health?.status === 'unconfigured' || !health ? (
        <div className="border-b border-border px-4 py-2 text-sm text-muted-foreground">
          {banner}
        </div>
      ) : null}
      {health && health.status !== 'ready' && health.status !== 'unconfigured' ? (
        <div className="border-b border-border px-4 py-2 text-sm text-destructive">{banner}</div>
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
      <div className="flex flex-col gap-3 border-b border-border p-4">
        <div className="flex flex-wrap gap-2">
          {CLOUDROOM_HARNESSES.map((id) => (
            <Button
              key={id}
              type="button"
              variant={harness === id ? 'default' : 'outline'}
              disabled={!ready || busy}
              onClick={() => setHarness(id)}
            >
              {HARNESS_LABELS[id]}
            </Button>
          ))}
        </div>
        <Input
          value={workspace}
          onChange={(event) => setWorkspace(event.target.value)}
          placeholder="Workspace id (optional)"
          spellCheck={false}
          disabled={!ready || busy}
        />
        <Textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="First prompt (optional)"
          disabled={!ready || busy}
        />
        <div className="flex gap-2">
          <Button type="button" disabled={!ready || busy} onClick={() => void start()}>
            Start
          </Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void refresh()}>
            Refresh
          </Button>
        </div>
        {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2">
        <div className="scrollbar-sleek min-h-0 overflow-auto border-b border-border p-2 md:border-r md:border-b-0">
          {sessions.length === 0 ? (
            <p className="p-2 text-sm text-muted-foreground">No CloudRoom sessions yet.</p>
          ) : (
            sessions.map((session) => (
              <Button
                key={session.sessionId}
                type="button"
                variant={attached === session.sessionId ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setAttached(session.sessionId)}
              >
                {session.sessionId} · {session.harness} · {session.state}
              </Button>
            ))
          )}
        </div>
        <pre className="scrollbar-sleek min-h-40 overflow-auto p-4 font-mono text-sm whitespace-pre-wrap text-foreground">
          {attached
            ? transcript || 'Waiting for session output…'
            : 'Attach a session to see its output.'}
        </pre>
      </div>
    </div>
  )
}
