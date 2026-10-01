import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Globe,
  LayoutDashboard,
  RefreshCw,
  Terminal
} from 'lucide-react-native'
import { colors } from '../src/theme/mobile-theme'
import {
  clearAgentOsSavedEndpoints,
  defaultAgentOsEndpoints,
  loadAgentOsSavedEndpoints,
  saveAgentOsEndpoints,
  type AgentOsSavedEndpoints
} from '../src/agent-os/agent-os-saved-endpoints'
import { agentOsEmbedUrl } from '../src/agent-os/remote-http-load'
import {
  RemoteHttpWebView,
  type RemoteHttpWebViewHandle
} from '../src/agent-os/remote-http-webview'
import { AgentOsEndpointModal } from './agent-os-endpoint-modal'
import { agentOsMobileStyles as styles } from './agent-os-styles'

export default function AgentOsMobileScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const webViewRef = useRef<RemoteHttpWebViewHandle>(null)
  const [endpoints, setEndpoints] = useState<AgentOsSavedEndpoints>(defaultAgentOsEndpoints())
  const [activeHash, setActiveHash] = useState('overview')
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const baseUrl = endpoints.baseUrl
  const fullUrl = agentOsEmbedUrl(baseUrl, activeHash)

  useEffect(() => {
    let mounted = true
    void loadAgentOsSavedEndpoints().then((saved) => {
      if (mounted) {
        setEndpoints(saved ?? defaultAgentOsEndpoints())
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  const handleSaveEndpoint = useCallback(async (next: AgentOsSavedEndpoints) => {
    await saveAgentOsEndpoints(next)
    setEndpoints(next)
    setIsConfigModalOpen(false)
  }, [])

  const handleResetEndpoint = useCallback(async () => {
    await clearAgentOsSavedEndpoints()
    setEndpoints(defaultAgentOsEndpoints())
    setIsConfigModalOpen(false)
  }, [])

  const handleNavSwitch = useCallback((hash: string) => {
    setActiveHash(hash)
    webViewRef.current?.injectJavaScript(`window.location.hash = ${JSON.stringify(hash)}; true;`)
  }, [])

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
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
              {baseUrl || 'No Agent OS URL'}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            style={({ pressed }) => [styles.headerButton, pressed && styles.buttonPressed]}
            onPress={() => setIsConfigModalOpen(true)}
            accessibilityLabel="Endpoints"
          >
            <Globe size={18} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.headerButton, pressed && styles.buttonPressed]}
            onPress={() => webViewRef.current?.reload()}
            accessibilityLabel="Retry"
          >
            <RefreshCw size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>
      <View style={styles.contentArea}>
        {fullUrl ? (
          <RemoteHttpWebView
            ref={webViewRef}
            url={fullUrl}
            title="Cannot connect to Agent OS"
            onChangeEndpoint={() => setIsConfigModalOpen(true)}
          />
        ) : null}
      </View>
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
