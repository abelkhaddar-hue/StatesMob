import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { ChevronRight, SearchX } from 'lucide-react-native'
import { booking, formatUsPhone, statusSteps, type Reservation, type WeeklyReservation } from '@/data/booking'
import { useAction } from '@/data/hooks'
import { color, tokens } from '@/theme'
import { Screen } from '@/ui/layout'
import { Text } from '@/ui/Text'
import { Button } from '@/ui/Button'
import { Touchable } from '@/ui/Pressable'
import { Banner, EmptyState } from '@/ui/primitives'
import { Field } from '@/ui/Field'
import { Eyebrow, formatDate, formatTime } from '@/ui/sm'

function RideCard({ r }: { r: Reservation }) {
  const step = statusSteps.find((s) => s.status === r.status)
  return (
    <Touchable onPress={() => router.push({ pathname: '/track/[id]', params: { id: r.id } })} accessibilityRole="button"
      accessibilityLabel={`${r.id}, ${formatDate(r.date)} ${formatTime(r.time)}, ${r.pickup} to ${r.destination}, ${r.status === 'cancelled' ? 'cancelled' : step?.label}`}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: tokens.radius.lg, borderWidth: 1, borderColor: color('border'), backgroundColor: pressed ? color('surface-2') : color('surface') })}>
      <View style={{ flex: 1, gap: 4 }}>
        <Eyebrow tone={r.status === 'cancelled' ? 'muted' : 'accent'}>{r.status === 'cancelled' ? 'Cancelled' : step?.label ?? ''}</Eyebrow>
        <Text weight={600} numberOfLines={1}>{r.destination}</Text>
        <Text variant="sm" tone="muted" numberOfLines={1}>from {r.pickup}</Text>
        <Text variant="xs" tone="muted">{formatDate(r.date)} · {formatTime(r.time)} · {r.id}</Text>
      </View>
      <ChevronRight size={20} color={color('text-muted')} />
    </Touchable>
  )
}

function WeeklyCard({ w }: { w: WeeklyReservation }) {
  return (
    <View style={{ gap: 4, padding: 14, borderRadius: tokens.radius.lg, borderWidth: 1, borderColor: color('border'), backgroundColor: color('surface') }}
      accessible accessibilityLabel={`Weekly ride request ${w.id}, waiting for a weekly rate`}>
      <Eyebrow tone="accent">Weekly ride · rate pending</Eyebrow>
      <Text weight={600} numberOfLines={1}>{w.home} ↔ {w.work}</Text>
      <Text variant="xs" tone="muted">{w.days.join(', ')} · {formatTime(w.morningTime)} / {formatTime(w.eveningTime)} · {w.id}</Text>
    </View>
  )
}

// « Track ride » : retrouver ses réservations avec le numéro utilisé pour réserver.
export default function Track() {
  const [phone, setPhone] = useState('')
  const [results, setResults] = useState<(Reservation | WeeklyReservation)[] | null>(null)
  const search = useAction(booking.track)

  useEffect(() => { const c = booking.savedContact(); if (c) setPhone(formatUsPhone(c.phone)) }, [])
  const run = async () => { const r = await search.run(phone); if (r) setResults(r) }

  return (
    <Screen title="Track your ride">
      <Text tone="muted">Enter the phone number you used to book your reservation.</Text>
      <Field label="Phone number" value={phone} onChangeText={(v) => { setPhone(formatUsPhone(v)); search.setError(undefined) }} placeholder="513-000-0000"
        keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" error={search.error} onSubmitEditing={run} />
      <Button label="Track" size="lg" loading={search.busy} onPress={run} />
      {results && !results.length ? (
        <EmptyState icon={SearchX} title="No reservation found" body="Check the number, or call dispatch if you booked by phone." />
      ) : null}
      {results?.length ? (
        <View style={{ gap: 10 }}>
          {results.map((r) => (r.kind === 'ride' ? <RideCard key={r.id} r={r} /> : <WeeklyCard key={r.id} w={r} />))}
          <Banner kind="info" title="Demo" body="Rides move from “Request received” to “Driver on the way” within a minute to show tracking." />
        </View>
      ) : null}
    </Screen>
  )
}
