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
  MessageSquare,
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
import { agentOsPrimaryLinks } from '../../src/shared/agent-os-surface'
import {
  RemoteHttpWebView,
  type RemoteHttpWebViewHandle
} from '../src/agent-os/remote-http-webview'
import { AgentOsEndpointModal } from '../src/agent-os/agent-os-endpoint-modal'
import { agentOsMobileStyles as styles } from '../src/agent-os/agent-os-styles'

export default function AgentOsMobileScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const webViewRef = useRef<RemoteHttpWebViewHandle>(null)
  const [endpoints, setEndpoints] = useState<AgentOsSavedEndpoints>(defaultAgentOsEndpoints())
  const [activeId, setActiveId] = useState('chat')
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const baseUrl = endpoints.baseUrl
  const links = agentOsPrimaryLinks(baseUrl)
  const activeLink = links.find((link) => link.id === activeId) ?? links[0]
  const fullUrl = activeLink?.url ?? ''

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

  const handleNavSwitch = useCallback((id: string) => {
    setActiveId(id)
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
        {links.map((link) => {
          const selected = link.id === activeLink?.id
          const color = selected ? colors.accentBlue : colors.textSecondary
          const Icon =
            link.id === 'chat'
              ? MessageSquare
              : link.id === 'hermes-webui'
                ? Cpu
                : link.id === 'terminal'
                  ? Terminal
                  : link.id === 'pwa-approvals'
                    ? CheckCircle2
                    : LayoutDashboard
          return (
            <Pressable
              key={link.id}
              style={[styles.navItem, selected && styles.navItemActive]}
              onPress={() => handleNavSwitch(link.id)}
            >
              <Icon size={18} color={color} />
              <Text style={[styles.navItemText, selected && styles.navItemTextActive]}>
                {link.label}
              </Text>
            </Pressable>
          )
        })}
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
