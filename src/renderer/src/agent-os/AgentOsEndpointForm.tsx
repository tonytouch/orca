import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AGENT_OS_DEFAULT_ENDPOINTS,
  UAO_ENDPOINTS_SAVED_EVENT,
  type AgentOsEndpointConfig,
  type AgentOsPublicConfig,
  type AgentOsTokenService
} from '../../../shared/agent-os-endpoints'
import { translate } from '@/i18n/i18n'

type AgentOsEndpointFormProps = {
  config: AgentOsPublicConfig
  onSaved: (config: AgentOsPublicConfig) => void
}

const EMPTY_TOKENS: Record<AgentOsTokenService, string> = {
  'agent-os': '',
  hermes: '',
  omniroute: '',
  cloudroom: ''
}

export function AgentOsEndpointForm({
  config,
  onSaved
}: AgentOsEndpointFormProps): React.JSX.Element {
  const [draft, setDraft] = useState<AgentOsEndpointConfig>(config)
  const [tokens, setTokens] = useState<Record<AgentOsTokenService, string>>(EMPTY_TOKENS)
  const [message, setMessage] = useState<string | null>(null)
  const tokenFields: { service: AgentOsTokenService; label: string }[] = [
    {
      service: 'agent-os',
      label: translate('auto.agent.os.AgentOsEndpointForm.204357c484', 'Agent OS token')
    },
    {
      service: 'hermes',
      label: translate('auto.agent.os.AgentOsEndpointForm.3b7a4cd28d', 'Hermes token')
    },
    {
      service: 'omniroute',
      label: translate('auto.agent.os.AgentOsEndpointForm.1b3239c29e', 'Omniroute token')
    },
    {
      service: 'cloudroom',
      label: translate('auto.agent.os.AgentOsEndpointForm.60d1cfde4c', 'CloudRoom token')
    }
  ]

  const save = async (): Promise<void> => {
    setMessage(null)
    const next = await window.api.agentOs.setConfig(draft)
    window.dispatchEvent(new Event(UAO_ENDPOINTS_SAVED_EVENT))
    for (const field of tokenFields) {
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
    setTokens(EMPTY_TOKENS)
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
        {translate(
          'auto.agent.os.AgentOsEndpointForm.c8f5df1618',
          'UAO attaches to Agent OS, CloudRoom, and OpenMuse. It does not start those servers. Clear the CloudRoom URL to hide that launch target. Clear the OpenMuse web URL to hide that page.'
        )}
      </p>
      <label className="flex flex-col gap-1 text-sm">
        {translate('auto.agent.os.AgentOsEndpointForm.254279d709', 'Agent OS')}
        <Input
          value={draft.baseUrl}
          onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })}
          spellCheck={false}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {translate('auto.agent.os.AgentOsEndpointForm.5e08d5c069', 'Hermes')}
        <Input
          value={draft.hermesUrl}
          onChange={(event) => setDraft({ ...draft, hermesUrl: event.target.value })}
          spellCheck={false}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {translate('auto.agent.os.AgentOsEndpointForm.cb522269ce', 'Omniroute')}
        <Input
          value={draft.omnirouteUrl}
          onChange={(event) => setDraft({ ...draft, omnirouteUrl: event.target.value })}
          spellCheck={false}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {translate('auto.agent.os.AgentOsEndpointForm.8bc83a331c', 'CloudRoom')}
        <Input
          value={draft.cloudroomUrl}
          onChange={(event) => setDraft({ ...draft, cloudroomUrl: event.target.value })}
          spellCheck={false}
          placeholder={translate(
            'auto.agent.os.AgentOsEndpointForm.b55aec67fc',
            'Leave empty to hide CloudRoom'
          )}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {translate('auto.agent.os.AgentOsEndpointForm.dd192485fb', 'OpenMuse web')}
        <Input
          value={draft.openmuseUrl}
          onChange={(event) => setDraft({ ...draft, openmuseUrl: event.target.value })}
          spellCheck={false}
          placeholder={translate(
            'auto.agent.os.AgentOsEndpointForm.596582255f',
            'Leave empty to hide OpenMuse'
          )}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {translate('auto.agent.os.AgentOsEndpointForm.523de2d6d4', 'OpenMuse API')}
        <Input
          value={draft.openmuseApiUrl}
          onChange={(event) => setDraft({ ...draft, openmuseApiUrl: event.target.value })}
          spellCheck={false}
          placeholder={translate(
            'auto.agent.os.AgentOsEndpointForm.0f336ded38',
            'Must match EXPO_PUBLIC_API_URL'
          )}
        />
      </label>
      {tokenFields.map((field) => (
        <label key={field.service} className="flex flex-col gap-1 text-sm">
          {field.label}{' '}
          {config.tokens[field.service]
            ? translate('auto.agent.os.AgentOsEndpointForm.dd57eaeac8', '(saved)')
            : ''}
          <Input
            type="password"
            autoComplete="off"
            value={tokens[field.service]}
            placeholder={
              config.tokens[field.service]
                ? translate('auto.agent.os.AgentOsEndpointForm.ddd0a8bcaf', 'Saved in the keychain')
                : translate('auto.agent.os.AgentOsEndpointForm.a8e3e28ea8', 'Enter token')
            }
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
        {translate(
          'auto.agent.os.AgentOsEndpointForm.4b8d88725b',
          'Also start a local backend on this machine'
        )}
      </label>
      <div className="flex gap-2">
        <Button type="submit">
          {translate('auto.agent.os.AgentOsEndpointForm.ad7a3bde61', 'Save')}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setDraft(AGENT_OS_DEFAULT_ENDPOINTS)}
        >
          {translate('auto.agent.os.AgentOsEndpointForm.ff7d439110', 'Use Tailscale defaults')}
        </Button>
      </div>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </form>
  )
}
