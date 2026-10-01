import { createServer, type Server } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import {
  buildAgentOsBackendEnvironment,
  createAgentOsBackendSupervisor
} from '../../../agent-os/supervisor/agent-os-backend-supervisor'

let server: Server | null = null

async function closeServer(): Promise<void> {
  const current = server
  server = null
  if (!current) {
    return
  }
  await new Promise<void>((resolve, reject) => {
    current.close((error) => (error ? reject(error) : resolve()))
  })
}

async function listen(port = 0): Promise<number> {
  server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end('{"ok":true}')
  })
  await new Promise<void>((resolve, reject) => {
    server?.listen(port, '127.0.0.1', () => resolve())
    server?.once('error', reject)
  })
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('HTTP fixture did not bind')
  }
  return address.port
}

afterEach(closeServer)

describe('Agent OS backend supervisor', () => {
  it('runs packaged Electron as Node on every desktop platform', () => {
    expect(buildAgentOsBackendEnvironment({ PATH: '/bin' }, 5050)).toMatchObject({
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PATH: '/bin',
      PORT: '5050'
    })
  })

  it('recovers a failed snapshot by attaching on the next probe', async () => {
    const port = await listen()
    await closeServer()
    const baseUrl = `http://127.0.0.1:${port}`
    const supervisor = createAgentOsBackendSupervisor({
      repoRoot: '',
      nodeBinary: process.execPath,
      mode: 'remote',
      remoteBaseUrl: baseUrl
    })

    expect((await supervisor.start()).status).toBe('failed')
    await listen(port)

    const recovered = await supervisor.start()
    expect(recovered.status).toBe('attached')
    expect(recovered.lastError).toBeNull()
  })
})
