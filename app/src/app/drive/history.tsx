import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { ChevronRight, Milestone, Star } from 'lucide-react-native'
import { driving, type DriverRide } from '@/data/driver'
import { formatMiles, formatUSD } from '@/data/ride'
import { color, tokens } from '@/theme'
import { ErrorBlock, Screen, Skeleton } from '@/ui/layout'
import { Text } from '@/ui/Text'
import { Button } from '@/ui/Button'
import { Touchable } from '@/ui/Pressable'
import { EmptyState } from '@/ui/primitives'
import { Eyebrow } from '@/ui/sm'

const statusLabel: Record<DriverRide['status'], string> = {
  driver_en_route: 'Heading to pickup', driver_arrived: 'At pickup', in_progress: 'Trip in progress', completed: 'Completed', cancelled: 'Cancelled',
}
const active = (r: DriverRide) => r.status === 'driver_en_route' || r.status === 'driver_arrived' || r.status === 'in_progress'
const when = (iso: string) => new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const sameDay = (iso: string) => new Date(iso).toDateString() === new Date().toDateString()

function RideRow({ r }: { r: DriverRide }) {
  const cancelled = r.status === 'cancelled'
  const body = (
    <>
      <View style={{ flex: 1, gap: 4 }}>
        <Eyebrow tone={active(r) ? 'accent' : 'muted'}>{statusLabel[r.status]}</Eyebrow>
        <Text weight={600} numberOfLines={1}>{r.passengerName} · {r.dropoff.name}</Text>
        <Text variant="sm" tone="muted" numberOfLines={1}>from {r.pickup.name} · {formatMiles(r.distanceM)}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text variant="xs" tone="muted">{when(r.acceptedAt)} · {r.payment === 'cash' ? 'Cash' : 'Card'}</Text>
          {r.stars ? <><Star size={12} color={color('star')} fill={color('star')} /><Text variant="xs" tone="muted">{r.stars}</Text></> : null}
          {cancelled && r.cancelledBy ? <Text variant="xs" tone="muted">· by {r.cancelledBy === 'driver' ? 'you' : r.passengerName}</Text> : null}
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Text weight={600} tabular style={cancelled ? { textDecorationLine: 'line-through', color: color('text-muted') } : undefined}>{formatUSD(r.fareCents)}</Text>
        {active(r) ? <ChevronRight size={18} color={color('text-muted')} /> : null}
      </View>
    </>
  )
  const label = `${statusLabel[r.status]}, ${when(r.acceptedAt)}, ${r.passengerName}, ${r.pickup.name} to ${r.dropoff.name}, ${formatUSD(r.fareCents)}${r.stars ? `, rated ${r.stars} stars` : ''}`
  const box = { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: tokens.radius.lg } as const
  // Course en cours : on la reprend. Courses passées : simple ligne d'historique.
  return active(r) ? (
    <Touchable onPress={() => router.replace(`/drive/ride/${r.id}`)} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => ({ ...box, backgroundColor: pressed ? color('surface-2') : color('surface') })}>{body}</Touchable>
  ) : (
    <View accessible accessibilityLabel={label} style={{ ...box, backgroundColor: color('surface') }}>{body}</View>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="lg" heading tabular>{value}</Text>
      <Text variant="xs" tone="subtle">{label}</Text>
    </View>
  )
}

// Historique chauffeur : gains, courses terminées, note reçue, puis la liste des courses.
export default function DriveHistory() {
  const [items, setItems] = useState<DriverRide[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const refresh = useCallback(() => driving.history().then((v) => { setItems(v); setError(null) }).catch((e) => setError(e.message)), [])

  useFocusEffect(useCallback(() => {
    refresh()
    const t = setInterval(refresh, 4000)
    return () => clearInterval(t)
  }, [refresh]))

  const list = items ?? []
  const done = list.filter((r) => r.status === 'completed')
  const earned = done.reduce((s, r) => s + r.fareCents, 0)
  const today = done.filter((r) => sameDay(r.acceptedAt)).reduce((s, r) => s + r.fareCents, 0)
  const rated = done.filter((r) => r.stars)
  const avg = rated.length ? rated.reduce((s, r) => s + (r.stars ?? 0), 0) / rated.length : 0
  const now = list.filter(active)
  const past = list.filter((r) => !active(r))

  return (
    <Screen title="Ride history">
      {error && !items ? <ErrorBlock message={error} onRetry={refresh} /> : null}
      {!items && !error ? <><Skeleton height={88} /><Skeleton /><Skeleton /></> : null}
      {items && !items.length ? (
        <EmptyState icon={Milestone} title="No trips yet" body="Rides you accept show up here with what you earned and how passengers rated you."
          action={<Button label="See ride requests" onPress={() => router.back()} />} />
      ) : null}
      {items?.length ? (
        <View style={{ flexDirection: 'row', gap: 12, padding: 16, borderRadius: tokens.radius.lg, backgroundColor: color('surface') }}>
          <Stat value={formatUSD(earned)} label="Earned" />
          <Stat value={formatUSD(today)} label="Today" />
          <Stat value={String(done.length)} label={done.length === 1 ? 'Trip' : 'Trips'} />
          <Stat value={avg ? avg.toFixed(1) : '–'} label="Rating" />
        </View>
      ) : null}
      {now.length ? <View style={{ gap: 10 }}><Eyebrow tone="accent">Now</Eyebrow>{now.map((r) => <RideRow key={r.id} r={r} />)}</View> : null}
      {past.length ? <View style={{ gap: 10 }}><Eyebrow>Past trips</Eyebrow>{past.map((r) => <RideRow key={r.id} r={r} />)}</View> : null}
    </Screen>
  )
}
