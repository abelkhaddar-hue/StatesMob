import { useEffect, useState } from 'react'
import { Share, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { CarTaxiFront } from 'lucide-react-native'
import { formatMinutes, formatUSD, rides, type RideView } from '@/data/ride'
import { useAction, useLoad } from '@/data/hooks'
import { color, tokens } from '@/theme'
import { Text } from '@/ui/Text'
import { Button } from '@/ui/Button'
import { Banner, Divider, EmptyState } from '@/ui/primitives'
import { DriverCard, RouteSummary } from '@/ui/ride'
import { FakeMap } from '@/ui/map'
import { ErrorBlock, Loading, MapScreen } from '@/ui/layout'
import { haptic } from '@/ui/haptics'

const payLabel = { cash: 'in cash', card: 'by card' } as const

// Suivi de la course : chauffeur en route → arrivé → trajet en cours, sur la carte.
export default function RideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const ride = useLoad<RideView>(() => rides.ride(id), [id], (set) => { const t = setInterval(() => rides.ride(id).then(set).catch(() => {}), 1000); return () => clearInterval(t) })
  const [callInfo, setCallInfo] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const cancel = useAction(rides.cancelRide)
  const status = ride.data?.status

  useEffect(() => { if (status === 'driver_arrived') haptic.warning() }, [status])
  useEffect(() => { if (status === 'completed' && !ride.data?.rated) router.replace(`/ride/${id}/rate`) }, [status, ride.data?.rated, id])

  if (ride.loading && !ride.data) return <Loading label="Loading your ride…" />
  if (ride.error || !ride.data) return <MapScreen map={<FakeMap />}><ErrorBlock message={ride.error?.message ?? 'Ride not found.'} onRetry={ride.reload} /></MapScreen>

  const r = ride.data
  const enRoute = r.status === 'driver_en_route' || r.status === 'driver_arrived'
  const inTrip = r.status === 'in_progress'
  const vehicle = `${r.vehicle.color} ${r.vehicle.make} ${r.vehicle.model}`
  const map = (
    <FakeMap pickup={r.pickup.point} dropoff={inTrip || r.status === 'completed' ? r.dropoff.point : null} driver={r.driverPosition}
      route={inTrip ? r.route : null} label={inTrip ? `On the way to ${r.dropoff.name}` : `${r.driver.firstName} is heading to ${r.pickup.name}`} />
  )

  const share = () => Share.share({
    message: `I'm riding with StatesMob: ${r.driver.firstName}, ${vehicle}, plate ${r.vehicle.plate}. From ${r.pickup.name} to ${r.dropoff.name}${r.etaS ? `, arriving in about ${formatMinutes(r.etaS)}` : ''}.`,
  }).catch(() => {})

  if (r.status === 'cancelled' || r.status === 'completed') {
    return (
      <MapScreen map={map} onClose={() => router.dismissTo('/')}>
        <EmptyState icon={CarTaxiFront} title={r.status === 'cancelled' ? 'Ride cancelled' : 'You have arrived'}
          body={r.status === 'cancelled' ? 'You were not charged.' : `${formatUSD(r.fareCents)} paid ${payLabel[r.payment]}. Thanks for riding with StatesMob.`} />
        <Button label="Book another ride" size="lg" onPress={() => router.dismissTo('/')} />
      </MapScreen>
    )
  }

  return (
    <MapScreen map={map} onClose={() => router.dismissTo('/')}>
      {inTrip ? (
        <View style={{ gap: 4 }}>
          <Text variant="label-lg" heading accessibilityLiveRegion="polite">Arriving in {r.etaS ? formatMinutes(r.etaS) : '…'}</Text>
          <Text variant="sm" tone="muted" numberOfLines={1}>To {r.dropoff.name}</Text>
        </View>
      ) : null}
      <DriverCard name={r.driver.firstName} rating={r.driver.rating} rides={r.driver.rides} vehicle={vehicle} plate={r.vehicle.plate}
        etaMin={r.status === 'driver_en_route' && r.etaS ? Math.max(1, Math.round(r.etaS / 60)) : undefined} arrived={r.status === 'driver_arrived'}
        onCall={() => setCallInfo(true)} onShare={share} />
      {callInfo ? <Banner kind="info" title="Calls use a masked number" body="Your number stays private. This is coming soon in the demo." onDismiss={() => setCallInfo(false)} /> : null}
      {r.status === 'driver_en_route' ? <Banner kind="info" title="Check the plate before you get in" body="If the car or driver don't match, don't get in and cancel." /> : null}
      <Divider />
      <RouteSummary from={r.pickup.name} to={r.dropoff.name} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: color('surface'), borderRadius: tokens.radius.md, padding: 12 }}>
        <Text tone="muted">To pay {payLabel[r.payment]}</Text>
        <Text variant="lg" tabular>{formatUSD(r.fareCents)}</Text>
      </View>
      {enRoute ? (confirmCancel ? (
        <View style={{ gap: 8 }}>
          <Banner kind="danger" title="Cancel this ride?" body={`${r.driver.firstName} is already on the way.`} />
          {cancel.error ? <Banner kind="danger" title={cancel.error} /> : null}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label="Yes, cancel" variant="danger" loading={cancel.busy} onPress={async () => { if ((await cancel.attempt(id)).ok) ride.reload() }} />
            <Button label="Keep my ride" variant="secondary" onPress={() => setConfirmCancel(false)} />
          </View>
        </View>
      ) : <Button label="Cancel ride" variant="ghost" fullWidth onPress={() => setConfirmCancel(true)} />) : null}
    </MapScreen>
  )
}
