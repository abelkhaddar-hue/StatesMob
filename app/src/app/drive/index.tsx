import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { ClipboardList, CloudOff, History, Power, Radar, Sunrise, Timer } from 'lucide-react-native'
import { driver, driving, type DriverAccount, type DriverFeed, type FeedRequest } from '@/data/driver'
import { formatMiles, formatMinutes, formatUSD, OFFER_TTL, services } from '@/data/ride'
import { live } from '@/data/supabase'
import { useAction, useLoad, useSecondsLeft } from '@/data/hooks'
import { color, tokens } from '@/theme'
import { Loading, Screen } from '@/ui/layout'
import { Text } from '@/ui/Text'
import { Button } from '@/ui/Button'
import { Banner, Chip, EmptyState, ListGroup, ListRow } from '@/ui/primitives'
import { CountdownBar, RouteSummary, SearchingPulse } from '@/ui/ride'
import { haptic } from '@/ui/haptics'
import { Eyebrow } from '@/ui/sm'

const payLabel = { cash: 'Cash', card: 'Card' } as const

// Mode chauffeur : se mettre en ligne, voir les demandes des passagers, accepter leur prix ou contre-proposer.
export default function DriveHome() {
  const me = useLoad<DriverAccount | null>(() => (live ? driving.me() : Promise.resolve(null)), [])
  if (!live) {
    return (
      <Screen title="Driver mode">
        <EmptyState icon={CloudOff} title="Needs the live database" body="Driver mode only works when the app is connected to StatesMob's server." />
      </Screen>
    )
  }
  if (me.loading && !me.data) return <Loading label="Loading your driver account…" />
  if (me.error) return <Screen title="Driver mode"><Banner kind="danger" title={me.error.message} /><Button label="Try again" onPress={me.reload} /></Screen>
  if (!me.data) return <NotRegistered onDone={me.reload} />
  if (!me.data.approved) {
    return (
      <Screen title="Driver mode">
        <EmptyState icon={Timer} title="Almost there" body="Your application is still being reviewed. Driver mode opens as soon as you're approved."
          action={<Button label="Check again" variant="secondary" onPress={me.reload} />} />
      </Screen>
    )
  }
  return <Online account={me.data} />
}

// Candidature faite avant le branchement de la base (ou sur un autre appareil) : on l'active ici.
function NotRegistered({ onDone }: { onDone: () => void }) {
  const a = driver.open()
  const sync = useAction(driver.submit)
  if (!a.submittedAt) {
    return (
      <Screen title="Driver mode">
        <EmptyState icon={ClipboardList} title="Apply to drive first" body="Send your driver application. Driver mode opens once you're approved."
          action={<Button label="Start application" onPress={() => router.replace('/driver')} />} />
      </Screen>
    )
  }
  return (
    <Screen title="Driver mode">
      <EmptyState icon={Timer} title="Activate your driver account" body={`We'll send the application of ${a.firstName} to StatesMob's server.`}
        action={<Button label="Activate" loading={sync.busy} onPress={async () => { if ((await sync.attempt(a)).ok) onDone() }} />} />
      {sync.error ? <Banner kind="danger" title={sync.error} /> : null}
    </Screen>
  )
}

function Online({ account }: { account: DriverAccount }) {
  const [online, setOnline] = useState(account.online)
  const toggle = useAction(driving.setOnline)
  const feed = useLoad<DriverFeed>(() => driving.feed(), [online], (set) => {
    const t = setInterval(() => driving.feed().then(set).catch(() => {}), 2000)
    return () => clearInterval(t)
  })

  // Le passager a accepté une offre : on part sur la course.
  const rideId = feed.data?.rideId
  useEffect(() => { if (rideId) { haptic.success(); router.replace(`/drive/ride/${rideId}`) } }, [rideId])

  const count = feed.data?.requests.length ?? 0
  useEffect(() => { if (count) haptic.warning() }, [count])

  const flip = async () => {
    const r = await toggle.run(!online)
    if (r) { haptic.select(); setOnline(r.online) }
  }
  const v = account.vehicle
  const requests = online ? feed.data?.requests ?? [] : []

  return (
    <Screen title="Driver mode" footer={
      <Button label={online ? 'Go offline' : 'Go online'} icon={Power} size="lg" fullWidth variant={online ? 'secondary' : 'primary'} loading={toggle.busy} onPress={flip} />
    }>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color(online ? 'success' : 'text-subtle') }} />
        <Text weight={600} accessibilityLiveRegion="polite">{online ? "You're online" : "You're offline"}</Text>
        <Text variant="sm" tone="muted" style={{ flex: 1 }} numberOfLines={1}>· {v.color} {v.make} {v.model}</Text>
      </View>
      {toggle.error ? <Banner kind="danger" title={toggle.error} /> : null}
      <ListGroup>
        <ListRow icon={History} label="Ride history" detail={`${account.rides} trip${account.rides === 1 ? '' : 's'} · Earnings and ratings`} onPress={() => router.push('/drive/history')} />
      </ListGroup>

      {!online ? (
        <EmptyState icon={Sunrise} title={`Ready, ${account.firstName}?`} body={`Go online to see ride requests near you: ${account.services.map((c) => services.find((s) => s.code === c)!.name).join(', ')}.`} />
      ) : requests.length ? (
        <View style={{ gap: 12 }}>
          <Eyebrow tone="accent">{`${requests.length} request${requests.length > 1 ? 's' : ''} near you`}</Eyebrow>
          {requests.map((r) => <RequestCard key={r.id} r={r} onSent={feed.reload} />)}
        </View>
      ) : (
        <View style={{ alignItems: 'center', gap: 12, paddingVertical: 24 }}>
          <SearchingPulse label="Looking for ride requests" />
          <Text tone="muted" center>New requests show up here as soon as a passenger names a price.</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Radar size={14} color={color('text-subtle')} />
            <Text variant="xs" tone="subtle">Keep this screen open to stay online.</Text>
          </View>
        </View>
      )}
    </Screen>
  )
}

function RequestCard({ r, onSent }: { r: FeedRequest; onSent: () => void }) {
  const send = useAction(driving.sendOffer)
  const [counter, setCounter] = useState<number | null>(null)
  const mine = r.myOffer
  const waiting = mine?.status === 'open'
  const left = useSecondsLeft(waiting ? mine.expiresAt : undefined)
  const offer = async (cents: number) => { if ((await send.attempt(r.id, cents)).ok) { haptic.success(); setCounter(null); onSent() } }
  const service = services.find((s) => s.code === r.service)!

  return (
    <View style={{ gap: 12, padding: 16, borderRadius: tokens.radius.lg, backgroundColor: color('surface'), borderWidth: 1, borderColor: color(waiting ? 'accent' : 'border') }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text weight={600}>{r.passengerName}</Text>
          <Text variant="sm" tone="muted">{service.name} · {payLabel[r.payment]} · {formatMiles(r.distanceM)} · {formatMinutes(r.durationS)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="xl" tabular>{formatUSD(r.offeredCents)}</Text>
          <Text variant="xs" tone="subtle">passenger's price</Text>
        </View>
      </View>
      <RouteSummary from={r.pickup.name} to={r.dropoff.name} />

      {waiting ? (
        <View style={{ gap: 8 }} accessibilityLiveRegion="polite">
          <Text variant="sm" weight={600} tone="accent">Offer sent · {formatUSD(mine.fareCents)} · waiting for {r.passengerName}</Text>
          <CountdownBar total={OFFER_TTL} left={left} />
        </View>
      ) : (
        <>
          {mine?.status === 'declined' ? <Text variant="sm" tone="danger">{r.passengerName} declined your offer. You can send another.</Text> : null}
          {mine?.status === 'expired' || mine?.status === 'withdrawn' ? <Text variant="sm" tone="muted">Your last offer ended. Send a new one if you're still free.</Text> : null}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {[200, 500, 800].map((d) => (
              <Chip key={d} label={`+${formatUSD(d)}`} selected={counter === d} onPress={() => setCounter(counter === d ? null : d)} />
            ))}
          </View>
          <Button label={counter ? `Offer ${formatUSD(r.offeredCents + counter)}` : `Accept ${formatUSD(r.offeredCents)}`} fullWidth loading={send.busy}
            onPress={() => offer(r.offeredCents + (counter ?? 0))} />
          {send.error ? <Banner kind="danger" title={send.error} /> : null}
        </>
      )}
    </View>
  )
}
