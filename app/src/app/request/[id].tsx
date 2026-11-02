import { useEffect, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SearchX, TrendingUp } from 'lucide-react-native'
import { OFFER_TTL, formatMiles, formatMinutes, formatUSD, rides, type Offer, type RideRequest } from '@/data/ride'
import { draft } from '@/data/draft'
import { useAction, useLoad, useSecondsLeft } from '@/data/hooks'
import { Text } from '@/ui/Text'
import { Button } from '@/ui/Button'
import { Banner, EmptyState } from '@/ui/primitives'
import { OfferCard, RouteSummary, SearchingPulse } from '@/ui/ride'
import { FakeMap } from '@/ui/map'
import { ErrorBlock, Loading, MapScreen } from '@/ui/layout'
import { haptic } from '@/ui/haptics'

// Rafraîchit une donnée chaque seconde (la démo calcule l'état à partir de l'heure).
const every = <T,>(load: () => Promise<T>) => (set: (v: T) => void) => { const t = setInterval(() => load().then(set).catch(() => {}), 1000); return () => clearInterval(t) }

function LiveOffer({ offer, onAccept, onDecline, accepting, disabled }: { offer: Offer; onAccept: () => void; onDecline: () => void; accepting: boolean; disabled: boolean }) {
  const left = useSecondsLeft(offer.expiresAt)
  return (
    <OfferCard accepting={accepting} disabled={disabled} onAccept={onAccept} onDecline={onDecline}
      offer={{
        id: offer.id, fareCents: offer.fareCents, kind: offer.kind, etaMin: Math.max(1, Math.round(offer.etaS / 60)), miles: formatMiles(offer.distanceM),
        driver: { name: offer.driver.firstName, rating: offer.driver.rating, rides: offer.driver.rides }, vehicle: offer.vehicle, totalS: OFFER_TTL, leftS: left,
      }} />
  )
}

// Recherche de chauffeur : les offres arrivent pendant la recherche, on en accepte une.
export default function RequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const req = useLoad<RideRequest>(() => rides.request(id), [id], every(() => rides.request(id)))
  const offers = useLoad<Offer[]>(() => rides.offers(id), [id], every(() => rides.offers(id)))
  const [accepting, setAccepting] = useState<string | null>(null)
  const [banner, setBanner] = useState<string>()
  const cancel = useAction(rides.cancelRequest)
  const [elapsed, setElapsed] = useState(0)
  const createdAt = req.data?.createdAt

  useEffect(() => {
    if (!createdAt) return
    const t = setInterval(() => setElapsed(Math.round((Date.now() - Date.parse(createdAt)) / 1000)), 1000)
    return () => clearInterval(t)
  }, [createdAt])

  // Une nouvelle offre : petit retour tactile.
  const count = offers.data?.length ?? 0
  useEffect(() => { if (count) haptic.tap() }, [count])

  // Offre déjà acceptée (retour sur cet écran) : on passe au suivi.
  const rideId = req.data?.status === 'matched' ? req.data.rideId : undefined
  useEffect(() => { if (rideId) router.replace(`/ride/${rideId}`) }, [rideId])

  if (req.loading && !req.data) return <Loading label="Loading your request…" />
  if (req.error || !req.data) return <MapScreen map={<FakeMap />}><ErrorBlock message={req.error?.message ?? 'Request not found.'} onRetry={req.reload} /><Button label="Back to map" size="lg" onPress={() => router.dismissTo('/')} /></MapScreen>

  const r = req.data
  if (r.status === 'matched') return <Loading label="Opening your ride…" />

  const accept = async (o: Offer) => {
    setAccepting(o.id); setBanner(undefined)
    try {
      const ride = await rides.acceptOffer(id, o.id)
      haptic.success(); draft.reset()
      router.replace(`/ride/${ride.id}`)
    } catch (e) {
      setBanner(e instanceof Error ? e.message : 'Could not accept this offer.')
      offers.reload()
    } finally { setAccepting(null) }
  }

  const map = <FakeMap pickup={r.pickup.point} dropoff={r.dropoff.point} route={r.route} label={`Trip from ${r.pickup.name} to ${r.dropoff.name}`} />
  const meta = `${formatMiles(r.distanceM)} · ${formatMinutes(r.durationS)}`
  const live = offers.data ?? []

  if (r.status === 'expired' || r.status === 'cancelled') {
    return (
      <MapScreen map={map}>
        <EmptyState icon={SearchX} title={r.status === 'expired' ? 'No driver answered' : 'Request cancelled'}
          body={r.status === 'expired' ? 'Your request expired. Try a slightly higher price.' : 'You can request a new ride anytime.'} />
        <Button label="New request" size="lg" onPress={() => router.dismissTo('/')} />
      </MapScreen>
    )
  }

  const slow = elapsed >= 20 && live.length === 0
  return (
    <MapScreen map={map}>
      {banner ? <Banner kind="warning" title={banner} onDismiss={() => setBanner(undefined)} /> : null}
      {live.length === 0 ? (
        <View style={{ gap: 16 }}>
          <SearchingPulse label={slow ? 'Still looking… Nearby drivers may be busy.' : 'Letting drivers near you know…'} />
          <RouteSummary from={r.pickup.name} to={r.dropoff.name} meta={meta} />
          <Text center tone="muted">Your price: <Text weight={700}>{formatUSD(r.offeredCents)}</Text></Text>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <Text variant="label-lg" heading accessibilityLiveRegion="polite">{live.length} offer{live.length > 1 ? 's' : ''} for {formatUSD(r.offeredCents)}</Text>
          <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 12, paddingBottom: 4 }}>
            {live.map((o) => (
              <LiveOffer key={o.id} offer={o} accepting={accepting === o.id} disabled={!!accepting && accepting !== o.id}
                onAccept={() => accept(o)} onDecline={() => rides.declineOffer(o.id).then(offers.reload)} />
            ))}
          </ScrollView>
        </View>
      )}
      {cancel.error ? <Banner kind="danger" title={cancel.error} /> : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button label="Cancel" variant="secondary" loading={cancel.busy} disabled={!!accepting}
          onPress={async () => { if ((await cancel.attempt(id)).ok) router.dismissTo('/') }} />
        <View style={{ flex: 1 }}>
          <Button label="Raise price" icon={TrendingUp} fullWidth variant={slow ? 'primary' : 'ghost'} disabled={!!accepting}
            onPress={() => router.push({ pathname: '/fare', params: { raise: id } })} />
        </View>
      </View>
    </MapScreen>
  )
}
