import { useState } from 'react'
import { View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { formatMiles, formatMinutes, formatUSD, rides, type RideView } from '@/data/ride'
import { useAction, useLoad } from '@/data/hooks'
import { color, tokens } from '@/theme'
import { ErrorBlock, Loading, Screen } from '@/ui/layout'
import { Text } from '@/ui/Text'
import { Button } from '@/ui/Button'
import { Avatar, Banner } from '@/ui/primitives'
import { Field } from '@/ui/Field'
import { RouteSummary, StarRating } from '@/ui/ride'
import { haptic } from '@/ui/haptics'

const payLine = { cash: 'Pay your driver in cash', card: 'Charged to your card' } as const
const praise = ['', 'Sorry to hear that.', 'What went wrong?', 'Thanks — anything to improve?', 'Great, thanks!', 'Awesome, thanks!']

// Fin de course : montant et note du chauffeur.
export default function Rate() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const ride = useLoad<RideView>(() => rides.ride(id), [id])
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')
  const rate = useAction(rides.rate)
  const done = () => router.dismissTo('/')

  if (ride.loading) return <Loading />
  if (ride.error || !ride.data) return <Screen><ErrorBlock message={ride.error?.message ?? 'Ride not found.'} onRetry={ride.reload} /></Screen>
  const r = ride.data
  const meta = `${formatMiles(r.distanceM)} · ${formatMinutes(r.durationS)}`

  return (
    <Screen onBack={done} close footer={<>
      <Button label="Submit rating" size="lg" disabled={!stars} loading={rate.busy}
        onPress={async () => { if ((await rate.attempt(id, stars)).ok) { haptic.success(); done() } }} />
      <Button label="Not now" variant="ghost" fullWidth onPress={done} />
    </>}>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Text variant="xl" heading center>You have arrived</Text>
        <Text tone="muted" center numberOfLines={1}>{r.dropoff.name}</Text>
      </View>
      <View style={{ backgroundColor: color('surface'), borderRadius: tokens.radius.lg, padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text weight={600}>{payLine[r.payment]}</Text>
          <Text variant="xl" tabular>{formatUSD(r.fareCents)}</Text>
        </View>
        <Text variant="xs" tone="subtle">Your price can't change after you accept an offer. If you're asked for more, call dispatch.</Text>
        <RouteSummary from={r.pickup.name} to={r.dropoff.name} meta={meta} />
      </View>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Avatar name={r.driver.firstName} size="lg" />
        <Text variant="lg" center>How was your ride with {r.driver.firstName}?</Text>
      </View>
      <StarRating value={stars} onChange={setStars} />
      {stars ? <Text tone="muted" center accessibilityLiveRegion="polite">{praise[stars]}</Text> : null}
      {stars ? <Field label="Add a comment (optional)" value={comment} onChangeText={setComment} multiline maxLength={500} counter /> : null}
      {rate.error ? <Banner kind="danger" title={rate.error} /> : null}
    </Screen>
  )
}
