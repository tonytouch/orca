import { useEffect, useState } from 'react'
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { colors } from '../src/theme/mobile-theme'
import {
  AGENT_OS_DEFAULT_BASE_URL,
  AGENT_OS_DEFAULT_HERMES_URL,
  AGENT_OS_DEFAULT_OMNIROUTE_URL,
  CLOUDROOM_DEFAULT_BASE_URL,
  OPENMUSE_DEFAULT_API_URL,
  OPENMUSE_DEFAULT_WEB_URL,
  normalizeAgentOsHttpUrl,
  resolveOptionalHttpUrl,
  type AgentOsSavedEndpoints
} from '../../src/shared/agent-os-endpoints'
import { agentOsMobileStyles as styles } from './agent-os-styles'

type AgentOsEndpointModalProps = {
  visible: boolean
  initial: AgentOsSavedEndpoints
  onClose: () => void
  onSave: (endpoints: AgentOsSavedEndpoints) => void
  onReset: () => void
}

export function AgentOsEndpointModal({
  visible,
  initial,
  onClose,
  onSave,
  onReset
}: AgentOsEndpointModalProps) {
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl)
  const [hermesUrl, setHermesUrl] = useState(initial.hermesUrl)
  const [omnirouteUrl, setOmnirouteUrl] = useState(initial.omnirouteUrl)
  const [cloudroomUrl, setCloudroomUrl] = useState(initial.cloudroomUrl)
  const [openmuseUrl, setOpenmuseUrl] = useState(initial.openmuseUrl)
  const [openmuseApiUrl, setOpenmuseApiUrl] = useState(initial.openmuseApiUrl)

  useEffect(() => {
    if (!visible) {
      return
    }
    setBaseUrl(initial.baseUrl)
    setHermesUrl(initial.hermesUrl)
    setOmnirouteUrl(initial.omnirouteUrl)
    setCloudroomUrl(initial.cloudroomUrl)
    setOpenmuseUrl(initial.openmuseUrl)
    setOpenmuseApiUrl(initial.openmuseApiUrl)
  }, [visible, initial])

  const save = () => {
    onSave({
      baseUrl: normalizeAgentOsHttpUrl(baseUrl, AGENT_OS_DEFAULT_BASE_URL),
      hermesUrl: normalizeAgentOsHttpUrl(hermesUrl, AGENT_OS_DEFAULT_HERMES_URL),
      omnirouteUrl: normalizeAgentOsHttpUrl(omnirouteUrl, AGENT_OS_DEFAULT_OMNIROUTE_URL),
      cloudroomUrl: resolveOptionalHttpUrl(cloudroomUrl, initial.cloudroomUrl),
      openmuseUrl: resolveOptionalHttpUrl(openmuseUrl, initial.openmuseUrl),
      openmuseApiUrl: resolveOptionalHttpUrl(openmuseApiUrl, initial.openmuseApiUrl)
    })
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Configure Agent OS Endpoints</Text>
            <Text style={styles.modalSubtitle}>
              Agent OS, Hermes, Omniroute, CloudRoom, and OpenMuse on the Tailscale host. Tokens
              stay on the desktop app. Leave CloudRoom or the OpenMuse web URL empty to hide that
              page.
            </Text>

            <Text style={styles.modalLabel}>Agent OS</Text>
            <TextInput
              style={styles.modalInput}
              value={baseUrl}
              onChangeText={setBaseUrl}
              placeholder={AGENT_OS_DEFAULT_BASE_URL}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <Text style={styles.modalLabel}>Hermes</Text>
            <TextInput
              style={styles.modalInput}
              value={hermesUrl}
              onChangeText={setHermesUrl}
              placeholder={AGENT_OS_DEFAULT_HERMES_URL}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <Text style={styles.modalLabel}>CloudRoom</Text>
            <TextInput
              style={styles.modalInput}
              value={cloudroomUrl}
              onChangeText={setCloudroomUrl}
              placeholder={CLOUDROOM_DEFAULT_BASE_URL}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <Text style={styles.modalLabel}>OpenMuse web</Text>
            <TextInput
              style={styles.modalInput}
              value={openmuseUrl}
              onChangeText={setOpenmuseUrl}
              placeholder={OPENMUSE_DEFAULT_WEB_URL}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <Text style={styles.modalLabel}>OpenMuse API</Text>
            <TextInput
              style={styles.modalInput}
              value={openmuseApiUrl}
              onChangeText={setOpenmuseApiUrl}
              placeholder={OPENMUSE_DEFAULT_API_URL}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <Text style={styles.modalLabel}>Omniroute</Text>
            <TextInput
              style={styles.modalInput}
              value={omnirouteUrl}
              onChangeText={setOmnirouteUrl}
              placeholder={AGENT_OS_DEFAULT_OMNIROUTE_URL}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.modalResetButton} onPress={onReset}>
                <Text style={styles.modalResetButtonText}>Reset to Default</Text>
              </Pressable>
              <View style={styles.modalRightActions}>
                <Pressable style={styles.modalCancelButton} onPress={onClose}>
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.modalSaveButton} onPress={save}>
                  <Text style={styles.modalSaveButtonText}>Save</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
