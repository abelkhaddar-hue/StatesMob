import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { booking, tripTypes, type Reservation } from '@/data/booking'
import { useAction, useLoad } from '@/data/hooks'
import { color, tokens } from '@/theme'
import { ErrorBlock, Loading, Screen } from '@/ui/layout'
import { Text } from '@/ui/Text'
import { Button } from '@/ui/Button'
import { Banner } from '@/ui/primitives'
import { CallButton, Eyebrow, StatusTimeline, SummaryRow, formatDate, formatTime } from '@/ui/sm'

// Détail d'une réservation : étapes, chauffeur une fois assigné, annulation tant que personne n'est en route.
export default function TrackRide() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const r = useLoad<Reservation>(() => booking.reservation(id), [id])
  const cancel = useAction(booking.cancel)
  const [confirming, setConfirming] = useState(false)

  // Rafraîchit le statut toutes les 5 s.
  useEffect(() => { const t = setInterval(r.reload, 5000); return () => clearInterval(t) }, [r.reload])

  if (r.loading && !r.data) return <Loading label="Loading your ride…" />
  if (r.error || !r.data) return <Screen title="Your ride"><ErrorBlock message={r.error?.message ?? 'We could not find this reservation.'} onRetry={r.reload} /></Screen>
  const x = r.data
  const cancellable = x.status === 'requested' || x.status === 'confirmed'

  return (
    <Screen title={`Ride ${x.id}`} onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
      {x.status === 'cancelled' ? <Banner kind="warning" title="This ride was cancelled" body="Book again anytime, or call dispatch." /> : <StatusTimeline status={x.status} />}

      {x.driver ? (
        <View style={{ gap: 4, padding: 14, borderRadius: tokens.radius.lg, borderWidth: 1, borderColor: color('accent'), backgroundColor: color('accent-soft') }}
          accessible accessibilityLabel={`Your driver ${x.driver.name}, ${x.driver.vehicle}, plate ${x.driver.plate}`}>
          <Eyebrow tone="accent">Your driver</Eyebrow>
          <Text variant="lg">{x.driver.name}</Text>
          <Text variant="sm" style={{ color: color('on-accent-soft') }}>{x.driver.vehicle} · {x.driver.plate}</Text>
        </View>
      ) : null}

      <View>
        <SummaryRow label="When" value={`${formatDate(x.date)} · ${formatTime(x.time)}`} />
        <SummaryRow label="Pickup" value={x.pickup} />
        <SummaryRow label="Destination" value={x.destination} />
        <SummaryRow label="Trip type" value={tripTypes.find((t) => t.value === x.tripType)?.label ?? ''} />
        <SummaryRow label="Passengers" value={x.passengers >= 7 ? '7+' : String(x.passengers)} />
        <SummaryRow label="Payment" value={x.payment === 'card' ? 'Credit card' : 'Cash'} />
        {x.notes ? <SummaryRow label="Notes" value={x.notes} /> : null}
      </View>

      <CallButton />

      {cancellable ? (confirming ? (
        <View style={{ gap: 8 }}>
          <Banner kind="danger" title="Cancel this ride?" body="Dispatch will be told right away." />
          {cancel.error ? <Banner kind="danger" title={cancel.error} /> : null}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label="Yes, cancel" variant="danger" loading={cancel.busy} onPress={async () => { if ((await cancel.attempt(x.id)).ok) { setConfirming(false); r.reload() } }} />
            <Button label="Keep my ride" variant="secondary" onPress={() => setConfirming(false)} />
          </View>
        </View>
      ) : <Button label="Cancel ride" variant="ghost" fullWidth onPress={() => setConfirming(true)} />) : null}
    </Screen>
  )
}
