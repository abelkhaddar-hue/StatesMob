import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { ChevronRight, Route, Star } from 'lucide-react-native'
import { formatUSD, rides, type RideView } from '@/data/ride'
import { color, tokens } from '@/theme'
import { TabScreen } from '@/ui/layout'
import { Text } from '@/ui/Text'
import { Button } from '@/ui/Button'
import { Touchable } from '@/ui/Pressable'
import { EmptyState } from '@/ui/primitives'
import { Eyebrow } from '@/ui/sm'

const statusLabel: Record<RideView['status'], string> = {
  driver_en_route: 'Driver on the way', driver_arrived: 'Driver is here', in_progress: 'On the way', completed: 'Completed', cancelled: 'Cancelled',
}
const live = (r: RideView) => r.status === 'driver_en_route' || r.status === 'driver_arrived' || r.status === 'in_progress'
const when = (iso: string) => new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

function RideRow({ r }: { r: RideView }) {
  return (
    <Touchable onPress={() => router.push(r.status === 'completed' && !r.rated ? `/ride/${r.id}/rate` : `/ride/${r.id}`)} accessibilityRole="button"
      accessibilityLabel={`${statusLabel[r.status]}, ${when(r.acceptedAt)}, ${r.pickup.name} to ${r.dropoff.name}, ${formatUSD(r.fareCents)}${r.stars ? `, rated ${r.stars} stars` : ''}`}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: tokens.radius.lg, backgroundColor: pressed ? color('surface-2') : color('surface') })}>
      <View style={{ flex: 1, gap: 4 }}>
        <Eyebrow tone={live(r) ? 'accent' : 'muted'}>{statusLabel[r.status]}</Eyebrow>
        <Text weight={600} numberOfLines={1}>{r.dropoff.name}</Text>
        <Text variant="sm" tone="muted" numberOfLines={1}>from {r.pickup.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text variant="xs" tone="muted">{when(r.acceptedAt)} · {r.driver.firstName}</Text>
          {r.stars ? <><Star size={12} color={color('star')} fill={color('star')} /><Text variant="xs" tone="muted">{r.stars}</Text></> : null}
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Text weight={600} tabular style={r.status === 'cancelled' ? { textDecorationLine: 'line-through', color: color('text-muted') } : undefined}>{formatUSD(r.fareCents)}</Text>
        <ChevronRight size={18} color={color('text-muted')} />
      </View>
    </Touchable>
  )
}

// « My rides » : course en cours en haut, puis l'historique (prix payé, chauffeur, note donnée).
export default function Rides() {
  const [items, setItems] = useState<RideView[] | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const refresh = useCallback(async () => setItems(await rides.history()), [])

  useFocusEffect(useCallback(() => {
    refresh()
    const t = setInterval(refresh, 2000)
    return () => clearInterval(t)
  }, [refresh]))

  const now = (items ?? []).filter(live)
  const past = (items ?? []).filter((r) => !live(r))

  return (
    <TabScreen title="My rides" refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false) }}>
      {items && !items.length ? (
        <EmptyState icon={Route} title="No rides yet" body="Name your price, pick a driver, and your trips will show up here."
          action={<Button label="Request a ride" onPress={() => router.navigate('/')} />} />
      ) : null}
      {now.length ? <View style={{ gap: 10 }}><Eyebrow tone="accent">Now</Eyebrow>{now.map((r) => <RideRow key={r.id} r={r} />)}</View> : null}
      {past.length ? <View style={{ gap: 10 }}><Eyebrow>Past rides</Eyebrow>{past.map((r) => <RideRow key={r.id} r={r} />)}</View> : null}
    </TabScreen>
  )
}
