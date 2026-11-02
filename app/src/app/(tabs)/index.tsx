import { useCallback, useState } from 'react'
import { Image, ScrollView, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Briefcase, ChevronRight, Hourglass, MapPin, PartyPopper, Plane, Repeat, Route, type LucideIcon } from 'lucide-react-native'
import { booking, fleet, statusSteps, suggestions, type Reservation, type TripType } from '@/data/booking'
import { draft, useDraft } from '@/data/draft'
import { color, tokens } from '@/theme'
import { TabScreen } from '@/ui/layout'
import { Text } from '@/ui/Text'
import { Button } from '@/ui/Button'
import { Touchable } from '@/ui/Pressable'
import { haptic } from '@/ui/haptics'
import { AddressInput, BrandBar, Eyebrow, formatDate, formatTime, nextDays } from '@/ui/sm'

const services: { type: TripType; icon: LucideIcon; title: string }[] = [
  { type: 'airport', icon: Plane, title: 'Airport' },
  { type: 'local', icon: MapPin, title: 'Local ride' },
  { type: 'business', icon: Briefcase, title: 'Business' },
  { type: 'hourly', icon: Hourglass, title: 'By the hour' },
  { type: 'long_distance', icon: Route, title: 'Long distance' },
  { type: 'event', icon: PartyPopper, title: 'Events' },
]

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

// Course en cours : raccourci vers le suivi, comme la bannière d'une app VTC.
function ActiveRide({ r }: { r: Reservation }) {
  const step = statusSteps.find((s) => s.status === r.status)
  return (
    <Touchable onPress={() => router.push({ pathname: '/track/[id]', params: { id: r.id } })} accessibilityRole="button"
      accessibilityLabel={`Your ride ${r.id}: ${step?.label}. ${formatDate(r.date)} ${formatTime(r.time)} to ${r.destination}`}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: tokens.radius.lg, borderWidth: 1, borderColor: color('accent'), backgroundColor: pressed ? color('surface-2') : color('accent-soft') })}>
      <View style={{ width: 10, height: 10, borderRadius: tokens.radius.pill, backgroundColor: color('accent') }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Eyebrow tone="accent">{step?.label ?? ''}</Eyebrow>
        <Text weight={600} numberOfLines={1}>{r.destination}</Text>
        <Text variant="xs" style={{ color: color('on-accent-soft') }}>{formatDate(r.date)} · {formatTime(r.time)} · {r.id}</Text>
      </View>
      <ChevronRight size={20} color={color('on-accent-soft')} />
    </Touchable>
  )
}

function ServiceTile({ icon: Icon, title, onPress }: { icon: LucideIcon; title: string; onPress: () => void }) {
  return (
    <Touchable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Book ${title.toLowerCase()}`}
      style={({ pressed }) => ({ width: '31.5%', alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: tokens.radius.lg, backgroundColor: pressed ? color('surface-2') : color('surface') })}>
      <View style={{ width: 44, height: 44, borderRadius: tokens.radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: color('accent-soft') }}>
        <Icon size={22} color={color('accent')} />
      </View>
      <Text variant="xs" weight={500} center numberOfLines={1}>{title}</Text>
    </Touchable>
  )
}

// Accueil de l'app : « Where to? », services en tuiles, course en cours, trajet hebdo, flotte.
export default function Home() {
  const d = useDraft()
  const [error, setError] = useState<string>()
  const [active, setActive] = useState<Reservation>()
  const [name, setName] = useState<string>()

  useFocusEffect(useCallback(() => {
    setName(booking.savedContact()?.fullName.split(' ')[0])
    let alive = true
    const refresh = () => booking.myBookings().then((list) => {
      if (alive) setActive(list.find((x): x is Reservation => x.kind === 'ride' && x.status !== 'cancelled' && x.status !== 'completed'))
    }).catch(() => {})
    refresh()
    const t = setInterval(refresh, 5000)
    return () => { alive = false; clearInterval(t) }
  }, []))

  const start = (tripType?: TripType) => {
    if (!d.date) draft.set({ date: nextDays(1)[0].value })
    if (tripType) { draft.set({ tripType }); router.push('/book'); return }
    if (!d.pickup.trim() || !d.destination.trim()) { haptic.warning(); setError('Add a pickup location and a destination.'); return }
    setError(undefined)
    router.push('/book')
  }

  return (
    <TabScreen top={<BrandBar />}>
      <View style={{ gap: 4 }}>
        <Text tone="muted">{name ? `${greeting()}, ${name}` : greeting()}</Text>
        <Text variant="xl" heading>Where to?</Text>
      </View>

      {active ? <ActiveRide r={active} /> : null}

      <View style={{ gap: 12, padding: 16, borderRadius: tokens.radius.xl, backgroundColor: color('surface') }}>
        <AddressInput label="Pickup" value={d.pickup} onChange={(pickup) => draft.set({ pickup })} placeholder="Address or landmark" options={suggestions} />
        <AddressInput label="Destination" value={d.destination} onChange={(destination) => draft.set({ destination })} placeholder="CVG Airport, downtown, etc." options={suggestions} />
        {error ? <Text variant="sm" tone="danger" accessibilityLiveRegion="polite">{error}</Text> : null}
        <Button label="Continue" size="lg" onPress={() => start()} />
      </View>

      <View style={{ gap: 12 }}>
        <Eyebrow>Services</Eyebrow>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }}>
          {services.map((s) => <ServiceTile key={s.type} icon={s.icon} title={s.title} onPress={() => start(s.type)} />)}
        </View>
      </View>

      <Touchable onPress={() => router.push('/weekly')} accessibilityRole="button" accessibilityLabel="Weekly commute. Home to work and back, billed weekly."
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: tokens.radius.lg, borderWidth: 1, borderColor: color('border'), backgroundColor: pressed ? color('surface-2') : 'transparent' })}>
        <Repeat size={22} color={color('accent')} />
        <View style={{ flex: 1 }}>
          <Text weight={600}>Weekly commute</Text>
          <Text variant="sm" tone="muted">Home ↔ work every day, billed weekly.</Text>
        </View>
        <ChevronRight size={20} color={color('text-muted')} />
      </Touchable>

      <View style={{ gap: 12 }}>
        <Eyebrow>The fleet</Eyebrow>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={232} decelerationRate="fast" contentContainerStyle={{ gap: 12 }}>
          {fleet.map((v) => (
            <View key={v.id} style={{ width: 220, borderRadius: tokens.radius.lg, backgroundColor: color('surface'), overflow: 'hidden' }}
              accessible accessibilityLabel={`${v.className}, ${v.model}, up to ${v.passengers} passengers and ${v.luggage} bags`}>
              <Image source={v.image} style={{ width: '100%', height: 120 }} resizeMode="cover" accessibilityIgnoresInvertColors />
              <View style={{ padding: 12, gap: 2 }}>
                <Eyebrow tone="accent">{v.className}</Eyebrow>
                <Text weight={600}>{v.model}</Text>
                <Text variant="xs" tone="muted">{v.passengers} passengers · {v.luggage} bags</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </TabScreen>
  )
}
