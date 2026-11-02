import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ban, BadgeCheck } from 'lucide-react-native'
import { driving, type DriverRide } from '@/data/driver'
import { formatMiles, formatMinutes, formatUSD } from '@/data/ride'
import { useAction, useLoad } from '@/data/hooks'
import { color, tokens } from '@/theme'
import { Text } from '@/ui/Text'
import { Button } from '@/ui/Button'
import { Avatar, Banner, Divider, EmptyState } from '@/ui/primitives'
import { RouteSummary } from '@/ui/ride'
import { FakeMap } from '@/ui/map'
import { ErrorBlock, Loading, MapScreen } from '@/ui/layout'
import { haptic } from '@/ui/haptics'

// Étape suivante de la course côté chauffeur.
const next = {
  driver_en_route: { to: 'driver_arrived', label: "I've arrived", title: 'Pick up' },
  driver_arrived: { to: 'in_progress', label: 'Start trip', title: 'Waiting for' },
  in_progress: { to: 'completed', label: 'Complete trip', title: 'Driving' },
} as const

// Course acceptée par le passager : aller au départ, prendre en charge, déposer.
export default function DriveRide() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const ride = useLoad<DriverRide>(() => driving.ride(id), [id], (set) => {
    const t = setInterval(() => driving.ride(id).then(set).catch(() => {}), 2000)
    return () => clearInterval(t)
  })
  const step = useAction(driving.advance)
  const cancel = useAction(driving.cancel)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const status = ride.data?.status
  useEffect(() => { if (status === 'cancelled') haptic.warning() }, [status])

  if (ride.loading && !ride.data) return <Loading label="Loading the ride…" />
  if (ride.error || !ride.data) return <MapScreen map={<FakeMap />}><ErrorBlock message={ride.error?.message ?? 'Ride not found.'} onRetry={ride.reload} /></MapScreen>

  const r = ride.data
  const back = () => router.replace('/drive')
  const toPickup = r.status === 'driver_en_route' || r.status === 'driver_arrived'
  const map = (
    <FakeMap pickup={r.pickup.point} dropoff={toPickup ? null : r.dropoff.point} driver={r.driverPosition} route={toPickup ? null : r.route}
      label={toPickup ? `Heading to ${r.pickup.name}` : `Driving to ${r.dropoff.name}`} />
  )

  if (r.status === 'cancelled' || r.status === 'completed') {
    const done = r.status === 'completed'
    return (
      <MapScreen map={map}>
        <EmptyState icon={done ? BadgeCheck : Ban} title={done ? 'Trip complete' : 'Ride cancelled'}
          body={done
            ? r.payment === 'cash' ? `Collect ${formatUSD(r.fareCents)} in cash from ${r.passengerName}.` : `${formatUSD(r.fareCents)} will be paid to you by card.`
            : r.cancelledBy === 'passenger' ? `${r.passengerName} cancelled the ride.` : 'You cancelled this ride.'} />
        <Button label="Back to requests" size="lg" onPress={back} />
      </MapScreen>
    )
  }

  const n = next[r.status]
  return (
    <MapScreen map={map}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar name={r.passengerName} size="lg" />
        <View style={{ flex: 1 }}>
          <Text variant="xs" tone="subtle">{n.title}</Text>
          <Text variant="lg" heading numberOfLines={1} accessibilityLiveRegion="polite">{r.passengerName}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="lg" tabular>{formatUSD(r.fareCents)}</Text>
          <Text variant="xs" tone="subtle">{r.payment === 'cash' ? 'Cash' : 'Card'}</Text>
        </View>
      </View>
      <View style={{ backgroundColor: color('surface'), borderRadius: tokens.radius.md, padding: 12, gap: 8 }}>
        <RouteSummary from={r.pickup.name} to={r.dropoff.name} meta={`${formatMiles(r.distanceM)} · ${formatMinutes(r.durationS)}`} />
      </View>
      {r.status === 'driver_arrived' ? <Banner kind="info" title={`Tell ${r.passengerName} you're here`} body="Start the trip once they're in the car." /> : null}
      {step.error ? <Banner kind="danger" title={step.error} /> : null}
      <Button label={n.label} size="lg" fullWidth loading={step.busy}
        onPress={async () => { const v = await step.run(id, n.to); if (v) { haptic.success(); ride.reload() } }} />
      {toPickup ? (confirmCancel ? (
        <View style={{ gap: 8 }}>
          <Divider />
          <Banner kind="danger" title="Cancel this ride?" body={`${r.passengerName} will need to find another driver.`} />
          {cancel.error ? <Banner kind="danger" title={cancel.error} /> : null}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label="Yes, cancel" variant="danger" loading={cancel.busy} onPress={async () => { if ((await cancel.attempt(id)).ok) ride.reload() }} />
            <Button label="Keep the ride" variant="secondary" onPress={() => setConfirmCancel(false)} />
          </View>
        </View>
      ) : <Button label="Cancel ride" variant="ghost" fullWidth onPress={() => setConfirmCancel(true)} />) : null}
    </MapScreen>
  )
}
