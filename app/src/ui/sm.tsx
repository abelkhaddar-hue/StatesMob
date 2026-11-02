// Composants propres au parcours SafeMobility (réservation, trajet hebdomadaire, suivi).
import { useState, type ReactNode } from 'react'
import { Image, Linking, ScrollView, View } from 'react-native'
import { Check, Minus, Phone, Plus } from 'lucide-react-native'
import { color, monoLabel, tokens } from '@/theme'
import { DISPATCH_PHONE, DISPATCH_TEL, statusSteps, type ReservationStatus } from '@/data/booking'
import { Text } from './Text'
import { Touchable } from './Pressable'
import { haptic } from './haptics'
import { IconButton } from './Button'
import { Field } from './Field'

// Petite étiquette en Geist Mono majuscule, comme les intitulés du site.
export function Eyebrow({ children, tone = 'muted' }: { children: string; tone?: 'muted' | 'accent' }) {
  return <Text variant="xs" style={[monoLabel, { color: color(tone === 'accent' ? 'accent' : 'text-muted') }]}>{children}</Text>
}

export function BrandBar({ right }: { right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: tokens.layout.header, paddingHorizontal: tokens.layout.gutter }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessible accessibilityLabel="StatesMob">
        <Image source={require('../../assets/brand/logo.png')} style={{ width: 32, height: 32, borderRadius: 6 }} accessibilityIgnoresInvertColors />
        <Text variant="label-lg" weight={600}>States<Text variant="label-lg" weight={600} style={{ color: color('accent') }}>Mob</Text></Text>
      </View>
      {right ?? <CallButton compact />}
    </View>
  )
}

// Appeler le dispatch. Le numéro reste affiché en texte : le lien « tel: » ne marche pas partout.
export function CallButton({ compact }: { compact?: boolean }) {
  if (compact) return <IconButton icon={Phone} label={`Call StatesMob, ${DISPATCH_PHONE}`} variant="accent" size={40} onPress={() => Linking.openURL(DISPATCH_TEL).catch(() => {})} />
  return (
    <Touchable onPress={() => Linking.openURL(DISPATCH_TEL).catch(() => {})} accessibilityRole="button" accessibilityLabel={`Call StatesMob, ${DISPATCH_PHONE}`}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: tokens.radius.lg, borderWidth: 1, borderColor: color('border'), backgroundColor: pressed ? color('surface-2') : color('surface') })}>
      <View style={{ width: 40, height: 40, borderRadius: tokens.radius.pill, backgroundColor: color('accent'), alignItems: 'center', justifyContent: 'center' }}>
        <Phone size={18} color={color('on-accent')} />
      </View>
      <View style={{ flex: 1 }}>
        <Text weight={600}>Need a ride right now?</Text>
        <Text variant="sm" tone="muted" selectable>Call dispatch 24/7 · {DISPATCH_PHONE}</Text>
      </View>
    </Touchable>
  )
}

// Barre d'étapes du formulaire de réservation.
export function Steps({ count, current, labels }: { count: number; current: number; labels: string[] }) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={`Step ${current + 1} of ${count}: ${labels[current]}`} style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {Array.from({ length: count }).map((_, i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= current ? color('accent') : color('surface-2') }} />
        ))}
      </View>
      <Eyebrow>{`Step ${current + 1} of ${count} · ${labels[current]}`}</Eyebrow>
    </View>
  )
}

// Choix unique en cases (comme « Private Ride / Shared Ride » et le type de trajet sur le site).
export function Choices<T extends string>({ options, value, onChange, columns = 2 }: { options: { value: T; label: string }[]; value: T | null; onChange: (v: T) => void; columns?: number }) {
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <Touchable key={o.value} onPress={() => { haptic.select(); onChange(o.value) }} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={o.label}
            style={({ pressed }) => ({
              width: columns === 1 ? '100%' : `${100 / columns - 2}%`, minHeight: 48, paddingHorizontal: 14, justifyContent: 'center',
              borderRadius: tokens.radius.md, borderWidth: 1,
              borderColor: on ? color('accent') : color('border'),
              backgroundColor: on ? color('accent-soft') : pressed ? color('surface-2') : color('surface'),
            })}>
            <Text variant="sm" weight={on ? 600 : 400} style={{ color: color(on ? 'on-accent-soft' : 'text-muted') }}>{o.label}</Text>
          </Touchable>
        )
      })}
    </View>
  )
}

export function Stepper({ label, value, min = 1, max = 7, onChange, plusLabel }: { label: string; value: number; min?: number; max?: number; onChange: (n: number) => void; plusLabel?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, borderRadius: tokens.radius.md, borderWidth: 1, borderColor: color('border'), backgroundColor: color('surface') }}>
      <Text style={{ flex: 1 }}>{label}</Text>
      <IconButton icon={Minus} size={40} variant="ghost" label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onPress={() => { haptic.select(); onChange(value - 1) }} />
      <Text variant="lg" tabular accessibilityLiveRegion="polite" accessibilityLabel={`${value}${value >= max && plusLabel ? ' or more' : ''} ${label.toLowerCase()}`}>{value >= max && plusLabel ? plusLabel : value}</Text>
      <IconButton icon={Plus} size={40} variant="ghost" label={`More ${label.toLowerCase()}`} disabled={value >= max} onPress={() => { haptic.select(); onChange(value + 1) }} />
    </View>
  )
}

// Date : les 14 prochains jours en pastilles (plus simple au pouce qu'un calendrier).
export function nextDays(n = 14) {
  const out: { value: string; top: string; bottom: string; label: string }[] = []
  const d = new Date()
  for (let i = 0; i < n; i++) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i)
    const value = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
    const top = i === 0 ? 'Today' : i === 1 ? 'Tmrw' : x.toLocaleDateString('en-US', { weekday: 'short' })
    const bottom = x.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    out.push({ value, top, bottom, label: x.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) })
  }
  return out
}
export const formatDate = (v: string) => {
  const [y, m, d] = v.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function DateChips({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} accessibilityRole="radiogroup">
      {nextDays().map((d) => {
        const on = d.value === value
        return (
          <Touchable key={d.value} onPress={() => { haptic.select(); onChange(d.value) }} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={d.label}
            style={{ width: 64, paddingVertical: 10, alignItems: 'center', gap: 2, borderRadius: tokens.radius.md, borderWidth: 1, borderColor: on ? color('accent') : color('border'), backgroundColor: on ? color('accent-soft') : color('surface') }}>
            <Text variant="xs" style={[monoLabel, { color: color(on ? 'on-accent-soft' : 'text-muted') }]}>{d.top}</Text>
            <Text variant="sm" weight={600} style={{ color: color(on ? 'on-accent-soft' : 'text') }}>{d.bottom}</Text>
          </Touchable>
        )
      })}
    </ScrollView>
  )
}

// Heure : créneaux de 30 min, 24 h sur 24 (le service est 24/7).
export const timeSlots = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2), m = i % 2 ? '30' : '00'
  const value = `${String(h).padStart(2, '0')}:${m}`
  const label = `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`
  return { value, label }
})
export const formatTime = (v: string) => timeSlots.find((t) => t.value === v)?.label ?? v

export function TimeChips({ value, onChange, date }: { value: string; onChange: (v: string) => void; date: string }) {
  // Aujourd'hui : on ne propose que les créneaux à au moins 30 min d'ici.
  const today = nextDays(1)[0].value === date
  const now = new Date(), minMinutes = now.getHours() * 60 + now.getMinutes() + 30
  const slots = timeSlots.filter((t) => !today || Number(t.value.slice(0, 2)) * 60 + Number(t.value.slice(3)) >= minMinutes)
  return (
    <View style={{ gap: 6 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} accessibilityRole="radiogroup">
        {slots.map((t) => {
          const on = t.value === value
          return (
            <Touchable key={t.value} onPress={() => { haptic.select(); onChange(t.value) }} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={t.label}
              style={{ paddingHorizontal: 14, height: 44, justifyContent: 'center', borderRadius: tokens.radius.pill, borderWidth: 1, borderColor: on ? color('accent') : color('border'), backgroundColor: on ? color('accent-soft') : color('surface') }}>
              <Text variant="sm" weight={on ? 600 : 400} tabular style={{ color: color(on ? 'on-accent-soft' : 'text') }}>{t.label}</Text>
            </Touchable>
          )
        })}
      </ScrollView>
      {!slots.length ? <Text variant="sm" tone="muted">No more slots today — pick another day, or call {DISPATCH_PHONE}.</Text> : null}
    </View>
  )
}

// Adresse libre + suggestions de lieux connus de Cincinnati.
export function AddressInput({ label, value, onChange, placeholder, options, error }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; options: string[]; error?: string }) {
  const [focused, setFocused] = useState(false)
  const q = value.trim().toLowerCase()
  const matches = focused ? options.filter((o) => (q ? o.toLowerCase().includes(q) && o.toLowerCase() !== q : true)).slice(0, 5) : []
  return (
    <View style={{ gap: 6 }}>
      <Field label={label} value={value} onChangeText={onChange} placeholder={placeholder} error={error}
        onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 150)} autoComplete="street-address" textContentType="fullStreetAddress" />
      {matches.length ? (
        <View style={{ borderRadius: tokens.radius.md, borderWidth: 1, borderColor: color('border'), backgroundColor: color('surface'), overflow: 'hidden' }}>
          {matches.map((m, i) => (
            <Touchable key={m} onPress={() => { onChange(m); setFocused(false) }} accessibilityRole="button" accessibilityLabel={`Use ${m}`}
              style={({ pressed }) => ({ paddingHorizontal: 14, minHeight: 44, justifyContent: 'center', borderTopWidth: i ? 1 : 0, borderTopColor: color('border'), backgroundColor: pressed ? color('surface-2') : 'transparent' })}>
              <Text variant="sm">{m}</Text>
            </Touchable>
          ))}
        </View>
      ) : null}
    </View>
  )
}

// Suivi d'une réservation : étapes passées cochées, étape en cours en turquoise.
export function StatusTimeline({ status }: { status: ReservationStatus }) {
  const idx = statusSteps.findIndex((s) => s.status === status)
  return (
    <View style={{ gap: 0 }}>
      {statusSteps.map((s, i) => {
        const done = i < idx, current = i === idx
        return (
          <View key={s.status} style={{ flexDirection: 'row', gap: 12 }} accessible accessibilityLabel={`${s.label}${current ? ', current step' : done ? ', done' : ''}`}>
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2,
                borderColor: done || current ? color('accent') : color('border-input'), backgroundColor: done ? color('accent') : 'transparent' }}>
                {done ? <Check size={14} color={color('on-accent')} strokeWidth={3} /> : current ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color('accent') }} /> : null}
              </View>
              {i < statusSteps.length - 1 ? <View style={{ width: 2, flex: 1, minHeight: 20, backgroundColor: done ? color('accent') : color('border') }} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: 16 }}>
              <Text weight={current ? 600 : 400} style={{ color: color(done || current ? 'text' : 'text-muted') }}>{s.label}</Text>
              {current ? <Text variant="sm" tone="muted">{s.detail}</Text> : null}
            </View>
          </View>
        )
      })}
    </View>
  )
}

// Ligne « libellé : valeur » du récapitulatif.
export function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: color('border') }}>
      <Text variant="sm" tone="muted" style={{ width: 110 }}>{label}</Text>
      <Text variant="sm" style={{ flex: 1 }}>{value}</Text>
    </View>
  )
}
