import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { booking, formatUsPhone, suggestions } from '@/data/booking'
import { useAction } from '@/data/hooks'
import { color, tokens } from '@/theme'
import { Screen } from '@/ui/layout'
import { Text } from '@/ui/Text'
import { Button } from '@/ui/Button'
import { Touchable } from '@/ui/Pressable'
import { Banner } from '@/ui/primitives'
import { Field } from '@/ui/Field'
import { AddressInput, Eyebrow, Stepper, timeSlots } from '@/ui/sm'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function TimeSelect({ label, value, onChange, from, to }: { label: string; value: string; onChange: (v: string) => void; from: number; to: number }) {
  const slots = timeSlots.filter((t) => { const h = Number(t.value.slice(0, 2)); return h >= from && h < to })
  return (
    <View style={{ gap: 6 }}>
      <Text variant="sm" weight={500}>{label}</Text>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {slots.map((t) => {
          const on = t.value === value
          return (
            <Touchable key={t.value} onPress={() => onChange(t.value)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={t.label}
              style={{ paddingHorizontal: 12, height: 40, justifyContent: 'center', borderRadius: tokens.radius.pill, borderWidth: 1, borderColor: on ? color('accent') : color('border'), backgroundColor: on ? color('accent-soft') : color('surface') }}>
              <Text variant="sm" tabular style={{ color: color(on ? 'on-accent-soft' : 'text') }}>{t.label}</Text>
            </Touchable>
          )
        })}
      </View>
    </View>
  )
}

// Trajet partagé hebdomadaire : domicile → travail le matin, retour le soir, facturé à la semaine.
export default function Weekly() {
  const [f, setF] = useState({ fullName: '', phone: '', email: '', passengers: 1, home: '', work: '', morningTime: '07:30', eveningTime: '17:30', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], notes: '' })
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }))
  const send = useAction(booking.requestWeekly)
  useEffect(() => { const c = booking.savedContact(); if (c) set({ fullName: c.fullName, phone: formatUsPhone(c.phone), email: c.email }) }, [])

  const submit = async () => {
    const r = await send.run(f)
    if (r) router.replace({ pathname: '/weekly/done', params: { id: r.id } })
  }

  return (
    <Screen title="Weekly shared ride" footer={<Button label="Request weekly ride" size="lg" loading={send.busy} onPress={submit} />}>
      <Text tone="muted">Daily pickup from home, drop-off at work, and pickup again at the end of the day — billed weekly. Tell us your schedule and we’ll follow up with a weekly rate.</Text>

      <Eyebrow>Your commute</Eyebrow>
      <AddressInput label="Home address" value={f.home} onChange={(home) => set({ home })} placeholder="Street, city" options={suggestions} />
      <AddressInput label="Work address" value={f.work} onChange={(work) => set({ work })} placeholder="Street, city" options={suggestions} />
      <TimeSelect label="Morning pickup time" value={f.morningTime} onChange={(morningTime) => set({ morningTime })} from={5} to={11} />
      <TimeSelect label="Evening pickup time (return home)" value={f.eveningTime} onChange={(eveningTime) => set({ eveningTime })} from={14} to={21} />
      <View style={{ gap: 6 }}>
        <Text variant="sm" weight={500}>Days needed</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {DAYS.map((day) => {
            const on = f.days.includes(day)
            return (
              <Touchable key={day} onPress={() => set({ days: on ? f.days.filter((x) => x !== day) : DAYS.filter((x) => x === day || f.days.includes(x)) })}
                accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={day}
                style={{ flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: tokens.radius.md, borderWidth: 1, borderColor: on ? color('accent') : color('border'), backgroundColor: on ? color('accent-soft') : color('surface') }}>
                <Text variant="xs" weight={600} style={{ color: color(on ? 'on-accent-soft' : 'text-muted') }}>{day}</Text>
              </Touchable>
            )
          })}
        </View>
      </View>
      <Stepper label="Passengers" value={f.passengers} onChange={(passengers) => set({ passengers })} max={7} plusLabel="7+" />

      <Eyebrow>Your details</Eyebrow>
      <Field label="Full name" value={f.fullName} onChangeText={(fullName) => set({ fullName })} placeholder="Jane Carter" autoComplete="name" />
      <Field label="Phone" value={f.phone} onChangeText={(v) => set({ phone: formatUsPhone(v) })} placeholder="513-000-0000" keyboardType="phone-pad" autoComplete="tel" />
      <Field label="Email" value={f.email} onChangeText={(email) => set({ email })} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <Field label="Additional notes (optional)" value={f.notes} onChangeText={(notes) => set({ notes })} placeholder="Flexible times, building access, etc." multiline maxLength={500} counter />
      {send.error ? <Banner kind="danger" title={send.error} /> : null}
    </Screen>
  )
}
