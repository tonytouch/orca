import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  AGENT_OS_DEFAULT_BASE_URL,
  CLOUDROOM_DEFAULT_BASE_URL
} from '../../shared/agent-os-endpoints'
import type { SecretStore } from '../../shared/secret-store'
import {
  readAgentOsEndpoints,
  readAgentOsToken,
  writeAgentOsEndpoints,
  writeAgentOsToken
} from './agent-os-endpoint-store'

function memorySecrets(available = true): SecretStore {
  const box = new Map<string, string>()
  return {
    isEncryptionAvailable: () => available,
    encryptString: (plain) => {
      const token = Buffer.from(plain).toString('base64url')
      box.set(token, plain)
      return Buffer.from(token)
    },
    decryptString: (cipher) => {
      const plain = box.get(cipher.toString())
      if (plain === undefined) {
        throw new Error('unknown cipher')
      }
      return plain
    },
    describeProtectionGap: () => null
  }
}

describe('agent os endpoint store', () => {
  it('defaults to the tailscale backend and does not start a local supervisor', () => {
    const directory = mkdtempSync(join(tmpdir(), 'uao-agent-os-'))
    expect(readAgentOsEndpoints(directory)).toMatchObject({
      baseUrl: AGENT_OS_DEFAULT_BASE_URL,
      hermesUrl: 'http://100.90.167.20:8787',
      omnirouteUrl: 'http://100.90.167.20:20128',
      cloudroomUrl: CLOUDROOM_DEFAULT_BASE_URL,
      localSupervisor: false
    })
  })

  it('keeps a cleared CloudRoom URL empty and a bad one on the previous value', () => {
    const directory = mkdtempSync(join(tmpdir(), 'uao-agent-os-'))
    const rejected = writeAgentOsEndpoints(directory, {
      ...readAgentOsEndpoints(directory),
      cloudroomUrl: 'not a url'
    })
    expect(rejected.cloudroomUrl).toBe(CLOUDROOM_DEFAULT_BASE_URL)
    const cleared = writeAgentOsEndpoints(directory, {
      ...readAgentOsEndpoints(directory),
      cloudroomUrl: ''
    })
    expect(cleared.cloudroomUrl).toBe('')
    expect(readAgentOsEndpoints(directory).cloudroomUrl).toBe('')
    const kept = writeAgentOsEndpoints(directory, {
      ...readAgentOsEndpoints(directory),
      cloudroomUrl: 'not a url'
    })
    expect(kept.cloudroomUrl).toBe('')
  })

  it('stores the CloudRoom token only as ciphertext', () => {
    const directory = mkdtempSync(join(tmpdir(), 'uao-agent-os-'))
    const secrets = memorySecrets()
    expect(writeAgentOsToken(directory, secrets, 'cloudroom', 's3cret').ok).toBe(true)
    const onDisk = readFileSync(join(directory, 'agent-os-tokens', 'cloudroom'))
    expect(onDisk.toString()).not.toContain('s3cret')
    expect(readAgentOsToken(directory, secrets, 'cloudroom')).toBe('s3cret')
  })

  it('stores tokens only as ciphertext', () => {
    const directory = mkdtempSync(join(tmpdir(), 'uao-agent-os-'))
    const secrets = memorySecrets()
    expect(writeAgentOsToken(directory, secrets, 'agent-os', 's3cret').ok).toBe(true)
    const onDisk = readFileSync(join(directory, 'agent-os-tokens', 'agent-os'))
    expect(onDisk.toString()).not.toContain('s3cret')
    expect(readAgentOsToken(directory, secrets, 'agent-os')).toBe('s3cret')
  })

  it('refuses to save a token when the keychain is unavailable', () => {
    const directory = mkdtempSync(join(tmpdir(), 'uao-agent-os-'))
    const result = writeAgentOsToken(directory, memorySecrets(false), 'hermes', 'nope')
    expect(result.ok).toBe(false)
    expect(readAgentOsToken(directory, memorySecrets(false), 'hermes')).toBeNull()
  })

  it('keeps a bad url on the previous value', () => {
    const directory = mkdtempSync(join(tmpdir(), 'uao-agent-os-'))
    const saved = writeAgentOsEndpoints(directory, {
      ...readAgentOsEndpoints(directory),
      baseUrl: 'not a url'
    })
    expect(saved.baseUrl).toBe(AGENT_OS_DEFAULT_BASE_URL)
  })
})
