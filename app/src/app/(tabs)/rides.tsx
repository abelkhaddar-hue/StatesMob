import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { ChevronRight, SearchX, Ticket } from 'lucide-react-native'
import { booking, formatUsPhone, statusSteps, type Reservation, type WeeklyReservation } from '@/data/booking'
import { useAction } from '@/data/hooks'
import { color, tokens } from '@/theme'
import { TabScreen } from '@/ui/layout'
import { Text } from '@/ui/Text'
import { Button } from '@/ui/Button'
import { Touchable } from '@/ui/Pressable'
import { EmptyState } from '@/ui/primitives'
import { Field } from '@/ui/Field'
import { Eyebrow, formatDate, formatTime } from '@/ui/sm'

type Item = Reservation | WeeklyReservation
const done = (r: Reservation) => r.status === 'cancelled' || r.status === 'completed'

function RideCard({ r }: { r: Reservation }) {
  const step = statusSteps.find((s) => s.status === r.status)
  return (
    <Touchable onPress={() => router.push({ pathname: '/track/[id]', params: { id: r.id } })} accessibilityRole="button"
      accessibilityLabel={`${r.id}, ${formatDate(r.date)} ${formatTime(r.time)}, ${r.pickup} to ${r.destination}, ${r.status === 'cancelled' ? 'cancelled' : step?.label}`}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: tokens.radius.lg, backgroundColor: pressed ? color('surface-2') : color('surface') })}>
      <View style={{ flex: 1, gap: 4 }}>
        <Eyebrow tone={done(r) ? 'muted' : 'accent'}>{r.status === 'cancelled' ? 'Cancelled' : step?.label ?? ''}</Eyebrow>
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
    <View style={{ gap: 4, padding: 14, borderRadius: tokens.radius.lg, backgroundColor: color('surface') }}
      accessible accessibilityLabel={`Weekly commute request ${w.id}, waiting for a weekly rate`}>
      <Eyebrow tone="accent">Weekly · rate pending</Eyebrow>
      <Text weight={600} numberOfLines={1}>{w.home} ↔ {w.work}</Text>
      <Text variant="xs" tone="muted">{w.days.join(', ')} · {formatTime(w.morningTime)} / {formatTime(w.eveningTime)} · {w.id}</Text>
    </View>
  )
}

function Section({ title, items }: { title: string; items: Item[] }) {
  if (!items.length) return null
  return (
    <View style={{ gap: 10 }}>
      <Eyebrow>{title}</Eyebrow>
      {items.map((r) => (r.kind === 'ride' ? <RideCard key={r.id} r={r} /> : <WeeklyCard key={r.id} w={r} />))}
    </View>
  )
}

// « Mes courses » : liste automatique pour le numéro enregistré ; sinon, recherche par téléphone comme sur le site.
export default function Rides() {
  const [items, setItems] = useState<Item[] | null>(null)
  const [hasContact, setHasContact] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [phone, setPhone] = useState('')
  const search = useAction(booking.track)

  const refresh = useCallback(async () => {
    const c = booking.savedContact()
    setHasContact(!!c)
    if (c) setItems(await booking.myBookings().catch(() => []))
  }, [])

  useFocusEffect(useCallback(() => {
    refresh()
    const t = setInterval(refresh, 5000)
    return () => clearInterval(t)
  }, [refresh]))

  const pull = async () => { setRefreshing(true); await refresh(); setRefreshing(false) }
  const run = async () => { const r = await search.run(phone); if (r) setItems(r) }

  const rides = (items ?? []).filter((x): x is Reservation => x.kind === 'ride')
  const upcoming = rides.filter((r) => !done(r))
  const past = rides.filter(done)
  const weekly = (items ?? []).filter((x): x is WeeklyReservation => x.kind === 'weekly')

  return (
    <TabScreen title="My rides" refreshing={refreshing} onRefresh={hasContact ? pull : undefined}>
      {!hasContact ? (
        <View style={{ gap: 12 }}>
          <Text tone="muted">Booked by phone or on the website? Enter the number you used.</Text>
          <Field label="Phone number" value={phone} onChangeText={(v) => { setPhone(formatUsPhone(v)); search.setError(undefined) }} placeholder="513-000-0000"
            keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" error={search.error} onSubmitEditing={run} returnKeyType="search" />
          <Button label="Find my rides" size="lg" loading={search.busy} onPress={run} />
        </View>
      ) : null}

      {items && !items.length ? (
        <EmptyState icon={hasContact ? Ticket : SearchX} title={hasContact ? 'No rides yet' : 'No reservation found'}
          body={hasContact ? 'Your bookings will show up here, with live status.' : 'Check the number, or call dispatch if you booked by phone.'}
          action={hasContact ? <Button label="Book a ride" onPress={() => router.navigate('/')} /> : undefined} />
      ) : null}

      <Section title="Upcoming" items={upcoming} />
      <Section title="Weekly commute" items={weekly} />
      <Section title="Past" items={past} />
    </TabScreen>
  )
}
