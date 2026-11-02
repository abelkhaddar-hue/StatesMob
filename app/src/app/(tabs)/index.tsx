import { useCallback, useEffect, useState } from 'react'
import { Image, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { ChevronRight, LocateFixed, Pencil } from 'lucide-react-native'
import { booking } from '@/data/booking'
import { formatMiles, formatMinutes, formatUSD, geo, rides, type LngLat, type RideView } from '@/data/ride'
import { draft, useDraft } from '@/data/draft'
import { useAction } from '@/data/hooks'
import { color, shadow, tokens } from '@/theme'
import { Text } from '@/ui/Text'
import { Button, IconButton } from '@/ui/Button'
import { Touchable } from '@/ui/Pressable'
import { Banner } from '@/ui/primitives'
import { MapScreen } from '@/ui/layout'
import { FakeMap } from '@/ui/map'
import { AddressField, ServiceTabs, payments } from '@/ui/ride'
import { CallButton } from '@/ui/sm'

type Resume = { kind: 'ride'; ride: RideView } | { kind: 'request'; id: string } | { kind: 'rate'; id: string }

// Reprendre là où on en était : course en cours, recherche de chauffeur, ou course à noter.
function ResumeCard({ r }: { r: Resume }) {
  const title = r.kind === 'ride'
    ? r.ride.status === 'in_progress' ? `On the way to ${r.ride.dropoff.name}` : r.ride.status === 'driver_arrived' ? `${r.ride.driver.firstName} is here` : `${r.ride.driver.firstName} is on the way`
    : r.kind === 'request' ? 'Finding you a driver…' : 'How was your last ride?'
  const go = () => router.push(r.kind === 'ride' ? `/ride/${r.ride.id}` : r.kind === 'request' ? `/request/${r.id}` : `/ride/${r.id}/rate`)
  return (
    <Touchable onPress={go} accessibilityRole="button" accessibilityLabel={`${title}. Open`}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: tokens.radius.lg, borderWidth: 1, borderColor: color('accent'), backgroundColor: pressed ? color('surface-2') : color('accent-soft') })}>
      <View style={{ width: 10, height: 10, borderRadius: tokens.radius.pill, backgroundColor: color('accent') }} />
      <Text weight={600} style={{ flex: 1, color: color('on-accent-soft') }} numberOfLines={1}>{title}</Text>
      <ChevronRight size={20} color={color('on-accent-soft')} />
    </Touchable>
  )
}

// Accueil façon VTC : carte plein écran, panneau « Where to? », service, prix proposé, « Find a driver ».
export default function Home() {
  const d = useDraft()
  const [me, setMe] = useState<LngLat | null>(null)
  const [quoteError, setQuoteError] = useState<string>()
  const [quoting, setQuoting] = useState(false)
  const [resume, setResume] = useState<Resume>()
  const [name, setName] = useState<string>()
  const create = useAction(rides.createRequest)

  useEffect(() => {
    geo.myPosition().then(async (p) => { setMe(p); if (!draft.get().pickup) draft.set({ pickup: await geo.reverse(p) }) }).catch(() => {})
  }, [])

  useFocusEffect(useCallback(() => {
    setName(booking.savedContact()?.fullName.split(' ')[0])
    let alive = true
    const check = async () => {
      const a = await rides.active()
      if (!alive) return
      if (a.rideId) setResume({ kind: 'ride', ride: await rides.ride(a.rideId) })
      else if (a.requestId) setResume({ kind: 'request', id: a.requestId })
      else if (a.rideToRate) setResume({ kind: 'rate', id: a.rideToRate })
      else setResume(undefined)
    }
    check()
    const t = setInterval(check, 3000)
    return () => { alive = false; clearInterval(t) }
  }, []))

  // Nouveau prix conseillé dès que départ, arrivée ou service changent.
  useEffect(() => {
    if (!d.pickup || !d.dropoff) { draft.set({ quote: null }); setQuoteError(undefined); return }
    let alive = true
    setQuoting(true); setQuoteError(undefined)
    rides.quote(d.pickup.point, d.dropoff.point, d.service)
      .then((q) => {
        if (!alive) return
        const cur = draft.get().offeredCents
        draft.set({ quote: q, offeredCents: cur && cur >= q.recommendedCents ? cur : q.recommendedCents })
      })
      .catch((e) => { if (alive) { draft.set({ quote: null }); setQuoteError(e.message) } })
      .finally(() => { if (alive) setQuoting(false) })
    return () => { alive = false }
  }, [d.pickup?.id, d.dropoff?.id, d.service])

  const busy = resume?.kind === 'ride' || resume?.kind === 'request'
  const ready = !!(d.quote && d.offeredCents && d.offeredCents >= d.quote.recommendedCents && !busy)
  const pay = payments.find((p) => p.code === d.payment)!

  const submit = async () => {
    if (!d.pickup || !d.dropoff || !d.offeredCents) return
    const r = await create.run({ service: d.service, pickup: d.pickup, dropoff: d.dropoff, offeredCents: d.offeredCents, payment: d.payment })
    if (r) router.push(`/request/${r.id}`)
  }

  return (
    <MapScreen
      map={<FakeMap me={me} pickup={d.dropoff ? d.pickup?.point : null} dropoff={d.dropoff?.point} route={d.quote?.route} label="Map around your location" />}
      top={
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }} pointerEvents="box-none">
          <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 6, paddingRight: 14, height: 48, borderRadius: tokens.radius.pill, backgroundColor: color('bg') }, shadow('card')]}
            accessible accessibilityLabel="StatesMob">
            <Image source={require('../../../assets/brand/logo.png')} style={{ width: 36, height: 36, borderRadius: 18 }} accessibilityIgnoresInvertColors />
            <Text variant="label-lg" weight={600}>States<Text variant="label-lg" weight={600} style={{ color: color('accent') }}>Mob</Text></Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <IconButton icon={LocateFixed} label="Start from my location" onPress={async () => { if (me) draft.set({ pickup: await geo.reverse(me) }) }} />
            <CallButton compact />
          </View>
        </View>
      }
    >
      {resume ? <ResumeCard r={resume} /> : <Text variant="lg" heading>{name ? `Where to, ${name}?` : 'Where to?'}</Text>}
      <ServiceTabs value={d.service} onChange={(service) => draft.set({ service })} />
      <View style={{ gap: 8 }}>
        <AddressField kind="pickup" value={d.pickup?.name} placeholder="Finding your location…" onPress={() => router.push({ pathname: '/place', params: { field: 'pickup' } })}
          error={quoteError?.includes('pickup') ? quoteError : undefined} />
        <AddressField kind="dropoff" value={d.dropoff?.name} placeholder="Where to?" onPress={() => router.push({ pathname: '/place', params: { field: 'dropoff' } })}
          error={quoteError && !quoteError.includes('pickup') ? quoteError : undefined} />
      </View>
      {d.dropoff && !quoteError ? (
        <Touchable onPress={() => router.push('/fare')} accessibilityRole="button"
          accessibilityLabel={`Your price ${d.offeredCents ? formatUSD(d.offeredCents) : 'calculating'}, paid by ${pay.label}. Change`}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16, borderRadius: tokens.radius.md, backgroundColor: pressed ? color('surface-2') : color('surface') })}>
          <pay.icon size={tokens.size.icon} color={color('text')} />
          <View style={{ flex: 1 }}>
            <Text variant="xs" tone="subtle">Your price · {pay.label}</Text>
            <Text weight={600} tabular>{quoting || !d.offeredCents ? 'Calculating…' : formatUSD(d.offeredCents)}</Text>
          </View>
          <Pencil size={18} color={color('text-muted')} />
        </Touchable>
      ) : null}
      {d.quote && !quoting ? (
        <Text variant="xs" tone="subtle" center>
          {formatMiles(d.quote.distanceM)} · about {formatMinutes(d.quote.durationS)} · suggested {formatUSD(d.quote.recommendedCents)}
        </Text>
      ) : null}
      {create.error ? <Banner kind="danger" title={create.error} /> : null}
      <Button label="Find a driver" size="lg" disabled={!ready} loading={create.busy} onPress={submit} />
    </MapScreen>
  )
}
