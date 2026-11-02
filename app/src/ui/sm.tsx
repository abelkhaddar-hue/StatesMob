// Petits composants de la marque StatesMob : étiquette mono, appel du dispatch.
import { Linking, View } from 'react-native'
import { Headset } from 'lucide-react-native'
import { color, monoLabel, tokens } from '@/theme'
import { DISPATCH_PHONE, DISPATCH_TEL } from '@/data/booking'
import { Text } from './Text'
import { Touchable } from './Pressable'
import { IconButton } from './Button'

// Petite étiquette en Geist Mono majuscule, comme les intitulés du site.
export function Eyebrow({ children, tone = 'muted' }: { children: string; tone?: 'muted' | 'accent' }) {
  return <Text variant="xs" style={[monoLabel, { color: color(tone === 'accent' ? 'accent' : 'text-muted') }]}>{children}</Text>
}

// Appeler le dispatch (aide 24/7). Le numéro reste affiché en texte : le lien « tel: » ne marche pas partout.
export function CallButton({ compact }: { compact?: boolean }) {
  const call = () => Linking.openURL(DISPATCH_TEL).catch(() => {})
  if (compact) return <IconButton icon={Headset} label={`Call StatesMob dispatch, ${DISPATCH_PHONE}`} variant="accent" onPress={call} />
  return (
    <Touchable onPress={call} accessibilityRole="button" accessibilityLabel={`Call StatesMob dispatch, ${DISPATCH_PHONE}`}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: tokens.radius.lg, borderWidth: 1, borderColor: color('border'), backgroundColor: pressed ? color('surface-2') : color('surface') })}>
      <View style={{ width: 40, height: 40, borderRadius: tokens.radius.pill, backgroundColor: color('accent'), alignItems: 'center', justifyContent: 'center' }}>
        <Headset size={18} color={color('on-accent')} />
      </View>
      <View style={{ flex: 1 }}>
        <Text weight={600}>Need help?</Text>
        <Text variant="sm" tone="muted" selectable>Call dispatch 24/7 · {DISPATCH_PHONE}</Text>
      </View>
    </Touchable>
  )
}
