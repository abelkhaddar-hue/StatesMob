// Composants de l'inscription chauffeur : progression, ligne d'info, document à envoyer, case à cocher.
import type { ReactNode } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Check, type LucideIcon } from 'lucide-react-native'
import { color, tokens } from '@/theme'
import { Text } from './Text'
import { Touchable } from './Pressable'
import { haptic } from './haptics'

export function StepProgress({ step, steps }: { step: number; steps: readonly string[] }) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={`Step ${step + 1} of ${steps.length}: ${steps[step]}`}
      accessibilityValue={{ min: 1, max: steps.length, now: step + 1 }} style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {steps.map((s, i) => (
          <View key={s} style={{ flex: 1, height: 4, borderRadius: tokens.radius.pill, backgroundColor: color(i <= step ? 'accent' : 'surface-2') }} />
        ))}
      </View>
      <Text variant="xs" tone="muted">Step {step + 1} of {steps.length}</Text>
    </View>
  )
}

// Ligne d'info avec pastille d'icône (avantages, conditions).
export function InfoRow({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body?: string }) {
  return (
    <View accessible style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <View style={{ width: 40, height: 40, borderRadius: tokens.radius.pill, backgroundColor: color('accent-soft'), alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} color={color('on-accent-soft')} />
      </View>
      <View style={{ flex: 1, gap: 2, paddingTop: 2 }}>
        <Text weight={600}>{title}</Text>
        {body ? <Text variant="sm" tone="muted">{body}</Text> : null}
      </View>
    </View>
  )
}

export function DocumentRow({ icon: Icon, label, hint, file, busy, onPress }: { icon: LucideIcon; label: string; hint: string; file?: string; busy?: boolean; onPress: () => void }) {
  return (
    <Touchable onPress={busy ? undefined : onPress} accessibilityRole="button" accessibilityState={{ busy: !!busy }}
      accessibilityLabel={`${label}, ${file ? `added: ${file}. Tap to replace` : hint}`}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: tokens.radius.lg, borderWidth: 1,
        borderColor: file ? color('success') : color('border'), backgroundColor: pressed ? color('surface-2') : color('surface'),
      })}>
      <Icon size={tokens.size['icon-lg']} color={color(file ? 'success' : 'text')} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text weight={600}>{label}</Text>
        <Text variant="sm" tone={file ? 'success' : 'muted'} numberOfLines={1}>{busy ? 'Uploading…' : file ? `Added · ${file}` : hint}</Text>
      </View>
      {busy ? <ActivityIndicator color={color('accent')} /> : file ? (
        <View style={{ width: 28, height: 28, borderRadius: tokens.radius.pill, backgroundColor: color('success'), alignItems: 'center', justifyContent: 'center' }}>
          <Check size={16} color={color('on-accent')} />
        </View>
      ) : <Text variant="sm" weight={600} tone="accent">Add</Text>}
    </Touchable>
  )
}

// Le message d'erreur s'affiche ailleurs (près du bouton) : ici, seulement le contour rouge.
export function Checkbox({ checked, onChange, children, invalid }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; invalid?: boolean }) {
  return (
    <Touchable onPress={() => { haptic.select(); onChange(!checked) }} accessibilityRole="checkbox" accessibilityState={{ checked }}
      style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 4 }}>
      <View style={{
        width: 24, height: 24, borderRadius: tokens.radius.sm, borderWidth: 2, marginTop: 1, alignItems: 'center', justifyContent: 'center',
        borderColor: color(invalid ? 'danger' : checked ? 'accent' : 'border-input'), backgroundColor: checked ? color('accent') : 'transparent',
      }}>
        {checked ? <Check size={16} color={color('on-accent')} strokeWidth={3} /> : null}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Touchable>
  )
}

// Bloc récapitulatif avec bouton « Edit » (dernière étape).
export function ReviewSection({ title, lines, onEdit }: { title: string; lines: string[]; onEdit: () => void }) {
  return (
    <View style={{ backgroundColor: color('surface'), borderRadius: tokens.radius.lg, padding: 14, gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text weight={600}>{title}</Text>
        <Touchable onPress={onEdit} accessibilityRole="button" accessibilityLabel={`Edit ${title}`} hitSlop={8}
          style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 6, borderRadius: tokens.radius.pill, backgroundColor: pressed ? color('surface-2') : 'transparent' })}>
          <Text variant="sm" weight={600} tone="accent">Edit</Text>
        </Touchable>
      </View>
      {lines.map((l) => <Text key={l} variant="sm" tone="muted">{l}</Text>)}
    </View>
  )
}
