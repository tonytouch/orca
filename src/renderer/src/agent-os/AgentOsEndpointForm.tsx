import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AGENT_OS_DEFAULT_ENDPOINTS,
  type AgentOsEndpointConfig,
  type AgentOsPublicConfig,
  type AgentOsTokenService
} from '../../../shared/agent-os-endpoints'

type AgentOsEndpointFormProps = {
  config: AgentOsPublicConfig
  onSaved: (config: AgentOsPublicConfig) => void
}

const TOKEN_FIELDS: { service: AgentOsTokenService; label: string }[] = [
  { service: 'agent-os', label: 'Agent OS token' },
  { service: 'hermes', label: 'Hermes token' },
  { service: 'omniroute', label: 'Omniroute token' }
]

export function AgentOsEndpointForm({
  config,
  onSaved
}: AgentOsEndpointFormProps): React.JSX.Element {
  const [draft, setDraft] = useState<AgentOsEndpointConfig>(config)
  const [tokens, setTokens] = useState<Record<AgentOsTokenService, string>>({
    'agent-os': '',
    hermes: '',
    omniroute: ''
  })
  const [message, setMessage] = useState<string | null>(null)

  const save = async (): Promise<void> => {
    setMessage(null)
    const next = await window.api.agentOs.setConfig(draft)
    for (const field of TOKEN_FIELDS) {
      const value = tokens[field.service].trim()
      if (!value) {
        continue
      }
      const result = await window.api.agentOs.setToken(field.service, value)
      if (!result.ok) {
        setMessage(result.error)
        onSaved(next)
        return
      }
    }
    setTokens({ 'agent-os': '', hermes: '', omniroute: '' })
    onSaved(await window.api.agentOs.getConfig())
    setMessage('Saved. Tokens stay in the OS keychain.')
  }

  return (
    <form
      className="flex flex-col gap-3 border-b border-border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
    >
      <p className="text-sm text-muted-foreground">
        UAO attaches to the Agent OS server. It does not start a local backend unless you turn that
        on.
      </p>
      <label className="flex flex-col gap-1 text-sm">
        Agent OS
        <Input
          value={draft.baseUrl}
          onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })}
          spellCheck={false}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Hermes
        <Input
          value={draft.hermesUrl}
          onChange={(event) => setDraft({ ...draft, hermesUrl: event.target.value })}
          spellCheck={false}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Omniroute
        <Input
          value={draft.omnirouteUrl}
          onChange={(event) => setDraft({ ...draft, omnirouteUrl: event.target.value })}
          spellCheck={false}
        />
      </label>
      {TOKEN_FIELDS.map((field) => (
        <label key={field.service} className="flex flex-col gap-1 text-sm">
          {field.label}
          {config.tokens[field.service] ? ' (saved)' : ''}
          <Input
            type="password"
            autoComplete="off"
            value={tokens[field.service]}
            placeholder={config.tokens[field.service] ? 'Saved in the keychain' : 'Enter token'}
            onChange={(event) => setTokens({ ...tokens, [field.service]: event.target.value })}
          />
        </label>
      ))}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.localSupervisor}
          onChange={(event) => setDraft({ ...draft, localSupervisor: event.target.checked })}
        />
        Also start a local backend on this machine
      </label>
      <div className="flex gap-2">
        <Button type="submit">Save</Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setDraft(AGENT_OS_DEFAULT_ENDPOINTS)}
        >
          Use Tailscale defaults
        </Button>
      </div>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </form>
  )
}
