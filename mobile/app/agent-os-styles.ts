import { StyleSheet } from 'react-native'
import { colors, radii, spacing } from '../src/theme/mobile-theme'

export const agentOsMobileStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgBase
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bgPanel,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonPressed: {
    backgroundColor: colors.bgRaised
  },
  titleGroup: {
    marginLeft: spacing.xs,
    flex: 1
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  titleIcon: {
    marginRight: spacing.xs
  },
  titleText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700'
  },
  subtitleText: {
    color: colors.textSecondary,
    fontSize: 11
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs
  },
  contentArea: {
    flex: 1,
    backgroundColor: colors.bgBase
  },
  webView: {
    flex: 1,
    backgroundColor: colors.bgBase
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bgBase,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.bgBase
  },
  errorTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textAlign: 'center'
  },
  errorMessage: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.sm
  },
  errorDetail: {
    color: colors.statusRed,
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: spacing.lg,
    textAlign: 'center'
  },
  errorActions: {
    flexDirection: 'row',
    gap: spacing.md
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accentBlue,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.button
  },
  retryButtonText: {
    color: colors.onAccent,
    fontSize: 13,
    fontWeight: '600'
  },
  changeEndpointButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.bgRaised,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.button
  },
  changeEndpointButtonText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '500'
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: colors.bgPanel,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    justifyContent: 'space-around'
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.row
  },
  navItemActive: {
    backgroundColor: colors.bgRaised
  },
  navItemText: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2
  },
  navItemTextActive: {
    color: colors.accentBlue,
    fontWeight: '600'
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: colors.bgPanel,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.lg
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.xs
  },
  modalSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing.md,
    lineHeight: 16
  },
  modalLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: spacing.xs
  },
  modalInput: {
    backgroundColor: colors.bgBase,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.input,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    marginBottom: spacing.md
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalResetButton: {
    paddingVertical: spacing.xs
  },
  modalResetButtonText: {
    color: colors.textMuted,
    fontSize: 12
  },
  modalRightActions: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  modalCancelButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.button
  },
  modalCancelButtonText: {
    color: colors.textSecondary,
    fontSize: 13
  },
  modalSaveButton: {
    backgroundColor: colors.accentBlue,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.button
  },
  modalSaveButtonText: {
    color: colors.onAccent,
    fontSize: 13,
    fontWeight: '600'
  }
})
