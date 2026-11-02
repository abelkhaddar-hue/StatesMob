import { Platform } from 'react-native'
import * as Haptics from 'expo-haptics'

// Retours tactiles comme dans une app native ; rien sur le web.
const native = Platform.OS === 'ios' || Platform.OS === 'android'

export const haptic = {
  tap: () => { if (native) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}) },
  select: () => { if (native) Haptics.selectionAsync().catch(() => {}) },
  success: () => { if (native) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}) },
  warning: () => { if (native) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}) },
}
