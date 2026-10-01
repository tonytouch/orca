import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { WebView } from 'react-native-webview'
import { AlertCircle, Globe, RefreshCw } from 'lucide-react-native'
import { colors } from '../theme/mobile-theme'
import { agentOsMobileStyles as styles } from './agent-os-styles'
import { describeProbeFailure, mainFrameHttpStatusFailure } from './remote-http-load'

const PROBE_TIMEOUT_MS = 12_000

export type RemoteHttpWebViewHandle = {
  reload: () => void
  injectJavaScript: (script: string) => void
}

type RemoteHttpErrorViewProps = {
  title: string
  message: string
  url: string
  onRetry?: () => void
  onChangeEndpoint?: () => void
}

export function RemoteHttpErrorView({
  title,
  message,
  url,
  onRetry,
  onChangeEndpoint
}: RemoteHttpErrorViewProps) {
  return (
    <View style={styles.errorContainer}>
      <AlertCircle size={44} color={colors.statusRed} />
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      <Text style={styles.errorDetail} selectable>
        {url || 'No URL configured'}
      </Text>
      <View style={styles.errorActions}>
        {onRetry ? (
          <Pressable style={styles.retryButton} onPress={onRetry}>
            <RefreshCw size={16} color={colors.onAccent} />
            <Text style={styles.retryButtonText}>Retry connection</Text>
          </Pressable>
        ) : null}
        {onChangeEndpoint ? (
          <Pressable style={styles.changeEndpointButton} onPress={onChangeEndpoint}>
            <Globe size={16} color={colors.textPrimary} />
            <Text style={styles.changeEndpointButtonText}>Change endpoint</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

type RemoteHttpWebViewProps = {
  url: string
  title: string
  onChangeEndpoint?: () => void
}

function isHttpUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://')
}

export const RemoteHttpWebView = forwardRef<RemoteHttpWebViewHandle, RemoteHttpWebViewProps>(
  function RemoteHttpWebView({ url, title, onChangeEndpoint }, ref) {
    const webViewRef = useRef<WebView>(null)
    const loadedRef = useRef(false)
    const failedRef = useRef(false)
    const [attempt, setAttempt] = useState(0)
    const [failure, setFailure] = useState<string | null>(null)

    useImperativeHandle(ref, () => ({
      reload: () => setAttempt((value) => value + 1),
      injectJavaScript: (script: string) => {
        webViewRef.current?.injectJavaScript(script)
      }
    }))

    useEffect(() => {
      let cancelled = false
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
      loadedRef.current = false
      failedRef.current = false
      setFailure(null)
      void fetch(url, { signal: controller.signal })
        .then(() => undefined)
        .catch((error: unknown) => {
          if (!cancelled && !loadedRef.current) {
            setFailure(describeProbeFailure(error, url, controller.signal.aborted))
          }
        })
      return () => {
        cancelled = true
        clearTimeout(timer)
        controller.abort()
      }
    }, [attempt, url])

    if (failure) {
      return (
        <RemoteHttpErrorView
          title={title}
          message={failure}
          url={url}
          onRetry={() => setAttempt((value) => value + 1)}
          onChangeEndpoint={onChangeEndpoint}
        />
      )
    }

    return (
      <View style={styles.contentArea}>
        <WebView
          key={`${url}:${attempt}`}
          ref={webViewRef}
          source={{ uri: url }}
          style={styles.webView}
          containerStyle={styles.webView}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
          sharedCookiesEnabled
          mixedContentMode="always"
          setSupportMultipleWindows={false}
          nestedScrollEnabled
          cacheEnabled={false}
          onLoadEnd={() => {
            if (!failedRef.current) {
              loadedRef.current = true
            }
          }}
          onError={(event) => {
            failedRef.current = true
            setFailure(event.nativeEvent.description || `Could not load ${url}`)
          }}
          onHttpError={(event) => {
            const httpFailure = mainFrameHttpStatusFailure(url, event.nativeEvent)
            if (httpFailure) {
              setFailure(httpFailure)
            }
          }}
          onRenderProcessGone={() => {
            setFailure(`The page renderer stopped while loading ${url}`)
          }}
          onContentProcessDidTerminate={() => {
            setFailure(`The page renderer stopped while loading ${url}`)
          }}
          onOpenWindow={(event) => {
            const target = event.nativeEvent.targetUrl
            if (isHttpUrl(target)) {
              webViewRef.current?.injectJavaScript(
                `window.location.href = ${JSON.stringify(target)}; true;`
              )
            }
          }}
          renderError={(_domain, _code, description) => (
            <RemoteHttpErrorView
              title={title}
              message={description || `Could not load ${url}`}
              url={url}
              onRetry={() => setAttempt((value) => value + 1)}
              onChangeEndpoint={onChangeEndpoint}
            />
          )}
        />
      </View>
    )
  }
)
