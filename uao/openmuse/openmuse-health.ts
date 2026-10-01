export type OpenMuseHealth =
  | { status: 'unconfigured'; message: string }
  | { status: 'unreachable'; message: string; webUrl: string; apiUrl: string }
  | { status: 'degraded'; message: string; webUrl: string; apiUrl: string }
  | { status: 'ready'; message: string; webUrl: string; apiUrl: string }

export type OpenMuseProbeResponse = {
  ok: boolean
  status?: number
  json: () => Promise<unknown>
}

export type OpenMuseProbe = (
  url: string,
  init?: { signal?: AbortSignal }
) => Promise<OpenMuseProbeResponse>

const PROBE_TIMEOUT_MS = 4_000

function isOkBody(body: unknown): boolean {
  return typeof body === 'object' && body !== null && 'ok' in body && body.ok === true
}

async function probe(
  fetchImpl: OpenMuseProbe,
  url: string
): Promise<{ ok: boolean; status: number; body: unknown } | { error: string }> {
  try {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) })
    let body: unknown = null
    try {
      body = await response.json()
    } catch {
      body = null
    }
    return { ok: response.ok, status: response.status ?? (response.ok ? 200 : 0), body }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'request failed' }
  }
}

function probeDetail(result: { error: string } | { status: number }): string {
  return 'error' in result ? result.error : `HTTP ${result.status}`
}

/** Web URL empty skips the network. The page's API target is baked in as EXPO_PUBLIC_API_URL. */
export async function checkOpenMuseHealth(input: {
  webUrl: string
  apiUrl: string
  fetchImpl?: OpenMuseProbe
}): Promise<OpenMuseHealth> {
  const webUrl = input.webUrl.trim().replace(/\/$/, '')
  const apiUrl = input.apiUrl.trim().replace(/\/$/, '')
  if (!webUrl) {
    return {
      status: 'unconfigured',
      message: 'Set an OpenMuse web URL to show this page.'
    }
  }
  const fetchImpl = input.fetchImpl ?? fetch
  const web = await probe(fetchImpl, webUrl)
  if ('error' in web || !web.ok) {
    return {
      status: 'unreachable',
      webUrl,
      apiUrl,
      message: `Unable to reach OpenMuse at ${webUrl}. ${probeDetail(web)}`
    }
  }
  if (!apiUrl) {
    return {
      status: 'degraded',
      webUrl,
      apiUrl,
      message:
        'The web app is up. Set the OpenMuse API URL so UAO can check the server. The page calls EXPO_PUBLIC_API_URL from when it was started.'
    }
  }
  const api = await probe(fetchImpl, `${apiUrl}/api/health`)
  if ('error' in api || !api.ok || !isOkBody(api.body)) {
    return {
      status: 'degraded',
      webUrl,
      apiUrl,
      message: `The web app is up, but ${apiUrl}/api/health did not report ok. The page still loads. That URL has to match EXPO_PUBLIC_API_URL.`
    }
  }
  return {
    status: 'ready',
    webUrl,
    apiUrl,
    message: 'OpenMuse is reachable.'
  }
}
