import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { WebView } from 'react-native-webview'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Globe,
  LayoutDashboard,
  RefreshCw,
  Terminal
} from 'lucide-react-native'
import { colors } from '../src/theme/mobile-theme'
import { loadHosts } from '../src/transport/host-store'
import {
  clearAgentOsSavedEndpoints,
  defaultAgentOsEndpoints,
  loadAgentOsSavedEndpoints,
  saveAgentOsEndpoints,
  type AgentOsSavedEndpoints
} from '../src/agent-os/agent-os-saved-endpoints'
import { AGENT_OS_DEFAULT_BASE_URL } from '../../src/shared/agent-os-endpoints'
import { AgentOsEndpointModal } from './agent-os-endpoint-modal'
import { agentOsMobileStyles as styles } from './agent-os-styles'

const DEFAULT_FALLBACK_ENDPOINT = AGENT_OS_DEFAULT_BASE_URL

function deriveAgentOsUrlFromEndpoint(endpoint: string): string {
  try {
    const url = new URL(endpoint)
    const protocol = url.protocol === 'wss:' ? 'https:' : 'http:'
    return `${protocol}//${url.hostname}:5050`
  } catch {
    return DEFAULT_FALLBACK_ENDPOINT
  }
}

export default function AgentOsMobileScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const webViewRef = useRef<WebView>(null)

  const [endpoints, setEndpoints] = useState<AgentOsSavedEndpoints>(defaultAgentOsEndpoints())
  const [activeHash, setActiveHash] = useState<string>('overview')
  const [_isLoading, setIsLoading] = useState<boolean>(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false)
  const baseUrl = endpoints.baseUrl

  // Resolve initial Agent OS Base URL
  useEffect(() => {
    let mounted = true

    async function resolveEndpoint() {
      try {
        const saved = await loadAgentOsSavedEndpoints()
        if (saved && mounted) {
          setEndpoints(saved)
          return
        }

        const hosts = await loadHosts().catch(() => [])
        if (hosts && hosts.length > 0 && mounted) {
          const primary = hosts[0]
          const derived = deriveAgentOsUrlFromEndpoint(primary.endpoint)
          setEndpoints({ ...defaultAgentOsEndpoints(), baseUrl: derived })
          return
        }

        if (mounted) {
          setEndpoints(defaultAgentOsEndpoints())
        }
      } catch {
        if (mounted) {
          setEndpoints(defaultAgentOsEndpoints())
        }
      }
    }

    void resolveEndpoint()
    return () => {
      mounted = false
    }
  }, [])

  const fullUrl = baseUrl ? `${baseUrl}?embed=1#${activeHash}` : ''

  const handleSaveEndpoint = useCallback(async (next: AgentOsSavedEndpoints) => {
    await saveAgentOsEndpoints(next)
    setEndpoints(next)
    setIsConfigModalOpen(false)
    setLoadError(null)
    setIsLoading(true)
  }, [])

  const handleResetEndpoint = useCallback(async () => {
    await clearAgentOsSavedEndpoints()
    const hosts = await loadHosts().catch(() => [])
    const nextUrl =
      hosts && hosts.length > 0
        ? deriveAgentOsUrlFromEndpoint(hosts[0].endpoint)
        : DEFAULT_FALLBACK_ENDPOINT
    setEndpoints({ ...defaultAgentOsEndpoints(), baseUrl: nextUrl })
    setIsConfigModalOpen(false)
    setLoadError(null)
    setIsLoading(true)
  }, [])

  const handleReload = useCallback(() => {
    setLoadError(null)
    setIsLoading(true)
    webViewRef.current?.reload()
  }, [])

  const handleNavSwitch = useCallback((hash: string) => {
    setActiveHash(hash)
    webViewRef.current?.injectJavaScript(`window.location.hash = '${hash}'; true;`)
  }, [])

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <Pressable
            style={({ pressed }) => [styles.headerButton, pressed && styles.buttonPressed]}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.titleGroup}>
            <View style={styles.titleRow}>
              <Cpu size={16} color={colors.accentBlue} style={styles.titleIcon} />
              <Text style={styles.titleText}>Ultimate Agent OS</Text>
            </View>
            <Text style={styles.subtitleText} numberOfLines={1}>
              {baseUrl || 'Resolving endpoint...'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <Pressable
            style={({ pressed }) => [styles.headerButton, pressed && styles.buttonPressed]}
            onPress={() => setIsConfigModalOpen(true)}
          >
            <Globe size={18} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.headerButton, pressed && styles.buttonPressed]}
            onPress={handleReload}
          >
            <RefreshCw size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Main WebView or Error Banner */}
      <View style={styles.contentArea}>
        {loadError ? (
          <View style={styles.errorContainer}>
            <AlertCircle size={44} color={colors.statusRed} />
            <Text style={styles.errorTitle}>Cannot Connect to Agent OS</Text>
            <Text style={styles.errorMessage}>
              Could not reach {baseUrl}. Ensure the Agent OS backend service is running on port 5050
              and accessible from this network (e.g. Tailscale or local Wi-Fi).
            </Text>
            <Text style={styles.errorDetail}>{loadError}</Text>
            <View style={styles.errorActions}>
              <Pressable style={styles.retryButton} onPress={handleReload}>
                <RefreshCw size={16} color={colors.onAccent} />
                <Text style={styles.retryButtonText}>Retry Connection</Text>
              </Pressable>
              <Pressable
                style={styles.changeEndpointButton}
                onPress={() => setIsConfigModalOpen(true)}
              >
                <Globe size={16} color={colors.textPrimary} />
                <Text style={styles.changeEndpointButtonText}>Change Endpoint</Text>
              </Pressable>
            </View>
          </View>
        ) : fullUrl ? (
          <WebView
            ref={webViewRef}
            source={{ uri: fullUrl }}
            style={styles.webView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accentBlue} />
                <Text style={styles.loadingText}>Loading Agent OS UI...</Text>
              </View>
            )}
            onLoadStart={() => {
              setIsLoading(true)
              setLoadError(null)
            }}
            onLoadEnd={() => setIsLoading(false)}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent
              setIsLoading(false)
              setLoadError(nativeEvent.description || 'Network request failed')
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent
              if (nativeEvent.statusCode >= 400) {
                setLoadError(`HTTP ${nativeEvent.statusCode}: ${nativeEvent.description}`)
              }
            }}
          />
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accentBlue} />
            <Text style={styles.loadingText}>Locating Agent OS host...</Text>
          </View>
        )}
      </View>

      {/* Quick Navigation Footer */}
      <View style={styles.bottomNav}>
        <Pressable
          style={[styles.navItem, activeHash === 'overview' && styles.navItemActive]}
          onPress={() => handleNavSwitch('overview')}
        >
          <LayoutDashboard
            size={18}
            color={activeHash === 'overview' ? colors.accentBlue : colors.textSecondary}
          />
          <Text style={[styles.navItemText, activeHash === 'overview' && styles.navItemTextActive]}>
            Overview
          </Text>
        </Pressable>

        <Pressable
          style={[styles.navItem, activeHash === 'mission-control' && styles.navItemActive]}
          onPress={() => handleNavSwitch('mission-control')}
        >
          <Cpu
            size={18}
            color={activeHash === 'mission-control' ? colors.accentBlue : colors.textSecondary}
          />
          <Text
            style={[
              styles.navItemText,
              activeHash === 'mission-control' && styles.navItemTextActive
            ]}
          >
            Missions
          </Text>
        </Pressable>

        <Pressable
          style={[styles.navItem, activeHash === 'terminal' && styles.navItemActive]}
          onPress={() => handleNavSwitch('terminal')}
        >
          <Terminal
            size={18}
            color={activeHash === 'terminal' ? colors.accentBlue : colors.textSecondary}
          />
          <Text style={[styles.navItemText, activeHash === 'terminal' && styles.navItemTextActive]}>
            Terminal
          </Text>
        </Pressable>

        <Pressable
          style={[styles.navItem, activeHash === 'pwa-approvals' && styles.navItemActive]}
          onPress={() => handleNavSwitch('pwa-approvals')}
        >
          <CheckCircle2
            size={18}
            color={activeHash === 'pwa-approvals' ? colors.accentBlue : colors.textSecondary}
          />
          <Text
            style={[styles.navItemText, activeHash === 'pwa-approvals' && styles.navItemTextActive]}
          >
            Approvals
          </Text>
        </Pressable>
      </View>

      <AgentOsEndpointModal
        visible={isConfigModalOpen}
        initial={endpoints}
        onClose={() => setIsConfigModalOpen(false)}
        onSave={(next) => {
          void handleSaveEndpoint(next)
        }}
        onReset={() => {
          void handleResetEndpoint()
        }}
      />
    </SafeAreaView>
  )
}
