import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ArrowLeft, Globe, RefreshCw, Sparkles } from 'lucide-react-native'
import { colors } from '../src/theme/mobile-theme'
import { checkOpenMuseHealth, type OpenMuseHealth } from '../../uao/openmuse/openmuse-health'
import {
  defaultAgentOsEndpoints,
  loadAgentOsSavedEndpoints,
  saveAgentOsEndpoints,
  type AgentOsSavedEndpoints
} from '../src/agent-os/agent-os-saved-endpoints'
import { RemoteHttpErrorView, RemoteHttpWebView } from '../src/agent-os/remote-http-webview'
import { AgentOsEndpointModal } from './agent-os-endpoint-modal'
import { agentOsMobileStyles as styles } from './agent-os-styles'

export default function OpenMuseMobileScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [endpoints, setEndpoints] = useState<AgentOsSavedEndpoints>(defaultAgentOsEndpoints())
  const [health, setHealth] = useState<OpenMuseHealth | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const refresh = useCallback(async (next: AgentOsSavedEndpoints) => {
    setHealth(null)
    const result = await checkOpenMuseHealth({
      webUrl: next.openmuseUrl,
      apiUrl: next.openmuseApiUrl
    })
    setHealth(result)
  }, [])

  useEffect(() => {
    let mounted = true
    void loadAgentOsSavedEndpoints()
      .then((saved) => {
        if (!mounted) {
          return
        }
        const next = saved ?? defaultAgentOsEndpoints()
        setEndpoints(next)
        return refresh(next)
      })
      .catch((error: unknown) => {
        if (!mounted) {
          return
        }
        const message = error instanceof Error ? error.message : 'Could not read saved endpoints.'
        setHealth({ status: 'unreachable', message, webUrl: '', apiUrl: '' })
      })
    return () => {
      mounted = false
    }
  }, [refresh, reloadKey])

  const webUrl = endpoints.openmuseUrl.trim()
  const embed = health?.status === 'ready' || health?.status === 'degraded'
  const banner = health?.message ?? 'Checking OpenMuse…'

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <Pressable
            style={({ pressed }) => [styles.headerButton, pressed && styles.buttonPressed]}
            onPress={() => router.back()}
            accessibilityLabel="Back"
          >
            <ArrowLeft size={20} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.titleGroup}>
            <View style={styles.titleRow}>
              <Sparkles size={16} color={colors.accentBlue} style={styles.titleIcon} />
              <Text style={styles.titleText}>OpenMuse</Text>
            </View>
            <Text style={styles.subtitleText} numberOfLines={1}>
              {webUrl || 'No web URL'}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            style={({ pressed }) => [styles.headerButton, pressed && styles.buttonPressed]}
            onPress={() => setSettingsOpen(true)}
            accessibilityLabel="Endpoints"
          >
            <Globe size={18} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.headerButton, pressed && styles.buttonPressed]}
            onPress={() => setReloadKey((value) => value + 1)}
            accessibilityLabel="Retry"
          >
            <RefreshCw size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>
      {health && health.status === 'degraded' ? (
        <View style={styles.headerBar}>
          <Text style={styles.subtitleText}>{banner}</Text>
        </View>
      ) : null}
      <View style={styles.contentArea}>
        {!webUrl || health?.status === 'unconfigured' ? (
          <RemoteHttpErrorView
            title="OpenMuse URL is not set"
            message="Set the OpenMuse web URL on this phone. UAO does not start the server, and the desktop app keeps a separate copy."
            url={webUrl}
            onChangeEndpoint={() => setSettingsOpen(true)}
          />
        ) : health?.status === 'unreachable' ? (
          <RemoteHttpErrorView
            title="Cannot reach OpenMuse"
            message={banner}
            url={health.webUrl || webUrl}
            onRetry={() => setReloadKey((value) => value + 1)}
            onChangeEndpoint={() => setSettingsOpen(true)}
          />
        ) : embed && webUrl ? (
          <RemoteHttpWebView
            key={reloadKey}
            url={webUrl}
            title="Cannot load OpenMuse"
            onChangeEndpoint={() => setSettingsOpen(true)}
          />
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accentBlue} />
            <Text style={styles.loadingText}>{banner}</Text>
          </View>
        )}
      </View>
      <AgentOsEndpointModal
        visible={settingsOpen}
        initial={endpoints}
        onClose={() => setSettingsOpen(false)}
        onSave={(next) => {
          void saveAgentOsEndpoints(next).then(() => {
            setEndpoints(next)
            setSettingsOpen(false)
            void refresh(next)
          })
        }}
        onReset={() => {
          const next = defaultAgentOsEndpoints()
          void saveAgentOsEndpoints(next).then(() => {
            setEndpoints(next)
            setSettingsOpen(false)
            void refresh(next)
          })
        }}
      />
    </SafeAreaView>
  )
}
