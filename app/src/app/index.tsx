import { useState } from 'react'
import { Image, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { BedDouble, Briefcase, Clock3, LocateFixed, MapPin, PartyPopper, Plane, Repeat, Route, type LucideIcon } from 'lucide-react-native'
import { fleet, serviceAreas, suggestions } from '@/data/booking'
import { draft, useDraft } from '@/data/draft'
import { color, tokens } from '@/theme'
import { Text } from '@/ui/Text'
import { Button } from '@/ui/Button'
import { Touchable } from '@/ui/Pressable'
import { AddressInput, BrandBar, CallButton, DateChips, Eyebrow, Stepper, TimeChips, nextDays } from '@/ui/sm'

const services: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Plane, title: 'Airport transfers', body: 'To and from CVG, timed to your flight.' },
  { icon: MapPin, title: 'Local rides', body: 'Anywhere in Cincinnati and the surrounding area.' },
  { icon: BedDouble, title: 'Hotel transportation', body: 'Pickup and drop-off for hotel guests.' },
  { icon: Briefcase, title: 'Business travel', body: 'Discreet rides for professionals and executives.' },
  { icon: Route, title: 'Long distance', body: 'Comfortable trips outside the city, on your schedule.' },
  { icon: PartyPopper, title: 'Events', body: 'Weddings, parties and concerts — on time, in style.' },
  { icon: Clock3, title: '24/7 service', body: 'Day and night, every day of the week.' },
]

function Shortcut({ icon: Icon, title, body, onPress }: { icon: LucideIcon; title: string; body: string; onPress: () => void }) {
  return (
    <Touchable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${body}`}
      style={({ pressed }) => ({ flex: 1, gap: 8, padding: 14, borderRadius: tokens.radius.lg, borderWidth: 1, borderColor: color('border'), backgroundColor: pressed ? color('surface-2') : color('surface') })}>
      <Icon size={22} color={color('accent')} />
      <Text weight={600}>{title}</Text>
      <Text variant="xs" tone="muted">{body}</Text>
    </Touchable>
  )
}

// Accueil : reprend la page d'accueil du site (accroche, réservation rapide, flotte, services, zones).
export default function Home() {
  const d = useDraft()
  const [error, setError] = useState<string>()
  const date = d.date || nextDays(1)[0].value

  const getQuote = () => {
    if (!d.pickup.trim() || !d.destination.trim()) { setError('Add a pickup location and a destination to continue.'); return }
    setError(undefined)
    draft.set({ date })
    router.push('/book')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color('bg') }} edges={['top']}>
      <BrandBar />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={{ width: '100%', maxWidth: tokens.layout['max-content'], alignSelf: 'center', padding: tokens.layout.gutter, gap: 28 }}>
          <View style={{ gap: 10, paddingTop: 8 }}>
            <Eyebrow tone="accent">Cincinnati & Northern Kentucky</Eyebrow>
            <Text variant="xl" heading>
              Reliable rides across <Text variant="xl" style={{ color: color('accent') }}>Cincinnati</Text>
            </Text>
            <Text tone="muted">Airport transfers, scheduled rides and local travel — 24/7 with professional drivers.</Text>
          </View>

          <View style={{ gap: 14, padding: 16, borderRadius: tokens.radius.xl, borderWidth: 1, borderColor: color('border'), backgroundColor: color('surface') }}>
            <Text variant="label-lg" heading>Book your ride</Text>
            <AddressInput label="Pickup" value={d.pickup} onChange={(pickup) => draft.set({ pickup })} placeholder="Address or landmark" options={suggestions} />
            <AddressInput label="Destination" value={d.destination} onChange={(destination) => draft.set({ destination })} placeholder="CVG Airport, downtown, etc." options={suggestions} />
            <View style={{ gap: 6 }}>
              <Text variant="sm" weight={500}>Date</Text>
              <DateChips value={date} onChange={(v) => draft.set({ date: v, time: '' })} />
            </View>
            <View style={{ gap: 6 }}>
              <Text variant="sm" weight={500}>Pickup time</Text>
              <TimeChips value={d.time} onChange={(time) => draft.set({ time })} date={date} />
            </View>
            <Stepper label="Passengers" value={d.passengers} onChange={(passengers) => draft.set({ passengers })} max={7} plusLabel="7+" />
            {error ? <Text variant="sm" tone="danger" accessibilityLiveRegion="polite">{error}</Text> : null}
            <Button label="Get my quote" size="lg" onPress={getQuote} />
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Shortcut icon={Repeat} title="Weekly ride" body="Home ↔ work, billed weekly." onPress={() => router.push('/weekly')} />
            <Shortcut icon={LocateFixed} title="Track ride" body="Find your booking by phone." onPress={() => router.push('/track')} />
          </View>

          <CallButton />

          <View style={{ gap: 12 }}>
            <Eyebrow>The fleet</Eyebrow>
            <Text variant="lg" heading>Three vehicles, one standard</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {fleet.map((v) => (
                <View key={v.id} style={{ width: 240, borderRadius: tokens.radius.lg, borderWidth: 1, borderColor: color('border'), backgroundColor: color('surface'), overflow: 'hidden' }}
                  accessible accessibilityLabel={`${v.className}, ${v.model}, up to ${v.passengers} passengers and ${v.luggage} bags`}>
                  <Image source={v.image} style={{ width: '100%', height: 130 }} resizeMode="cover" accessibilityIgnoresInvertColors />
                  <View style={{ padding: 12, gap: 4 }}>
                    <Eyebrow tone="accent">{v.className}</Eyebrow>
                    <Text weight={600}>{v.model}</Text>
                    <Text variant="xs" tone="muted">{v.blurb}</Text>
                    <Text variant="sm" style={{ marginTop: 4 }}>{v.passengers} passengers · {v.luggage} bags</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

          <View style={{ gap: 12 }}>
            <Eyebrow>What we offer</Eyebrow>
            <View style={{ borderRadius: tokens.radius.lg, borderWidth: 1, borderColor: color('border'), backgroundColor: color('surface'), overflow: 'hidden' }}>
              {services.map(({ icon: Icon, title, body }, i) => (
                <View key={title} style={{ flexDirection: 'row', gap: 14, alignItems: 'center', padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: color('border') }}>
                  <Icon size={22} color={color('accent')} />
                  <View style={{ flex: 1 }}>
                    <Text weight={600}>{title}</Text>
                    <Text variant="sm" tone="muted">{body}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={{ gap: 12 }}>
            <Eyebrow>Where we drive</Eyebrow>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {serviceAreas.map((a) => (
                <View key={a} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: tokens.radius.pill, borderWidth: 1, borderColor: color('border') }}>
                  <Text variant="sm">{a}</Text>
                </View>
              ))}
            </View>
          </View>

          <Text variant="xs" tone="muted" center>© 2026 SafeMobility · Demo app — requests are not sent to dispatch yet.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
