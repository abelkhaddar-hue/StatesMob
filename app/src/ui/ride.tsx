import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Easing, Image, View } from 'react-native'
import { Banknote, Car, CarFront, CreditCard, Delete, Gem, Phone, Share2, Star, type LucideIcon } from 'lucide-react-native'
import { formatUSD, services, type Payment, type ServiceCode } from '@/data/ride'
import { color, shadow, tokens } from '@/theme'
import { Text } from './Text'
import { Touchable } from './Pressable'
import { Button, IconButton } from './Button'
import { Avatar, PlateBadge, RatingBadge } from './primitives'
import { haptic } from './haptics'

// ───────── adresses ─────────

export function AddressField({ kind, value, placeholder, error, onPress }: { kind: 'pickup' | 'dropoff'; value?: string; placeholder: string; error?: string; onPress?: () => void }) {
  const label = kind === 'pickup' ? 'Pickup' : 'Destination'
  return (
    <View style={{ gap: 4 }}>
      <Touchable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${value ?? 'not set'}`}
        style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16, borderRadius: tokens.radius.md,
          borderWidth: error ? 2 : 0, borderColor: color('danger'), backgroundColor: pressed ? color('surface-pressed') : color('surface'),
        })}>
        <View style={{ width: 12, height: 12, borderRadius: kind === 'pickup' ? 6 : 2, backgroundColor: color(kind === 'pickup' ? 'marker-pickup' : 'marker-dropoff') }} />
        <View style={{ flex: 1 }}>
          <Text variant="xs" tone="subtle">{label}</Text>
          <Text numberOfLines={1} weight={value ? 500 : 400} tone={value ? 'default' : 'subtle'}>{value ?? placeholder}</Text>
        </View>
      </Touchable>
      {error ? <Text variant="sm" tone="danger">{error}</Text> : null}
    </View>
  )
}

export function RouteSummary({ from, to, meta }: { from: string; to: string; meta?: string }) {
  return (
    <View accessible accessibilityLabel={`From ${from} to ${to}${meta ? `, ${meta}` : ''}`} style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{ alignItems: 'center', paddingVertical: 5 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color('marker-pickup') }} />
        <View style={{ width: 2, flex: 1, backgroundColor: color('border'), marginVertical: 3 }} />
        <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color('marker-dropoff') }} />
      </View>
      <View style={{ flex: 1, gap: 8 }}>
        <Text variant="sm" numberOfLines={1}>{from}</Text>
        <Text variant="sm" numberOfLines={1}>{to}</Text>
      </View>
      {meta ? <Text variant="xs" tone="subtle">{meta}</Text> : null}
    </View>
  )
}

// ───────── service ─────────

const serviceIcon: Record<ServiceCode, LucideIcon> = { standard: Car, suv: CarFront, premium: Gem }

export function ServiceTabs({ value, onChange }: { value: ServiceCode; onChange: (c: ServiceCode) => void }) {
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 8 }}>
      {services.map(({ code, name, seats }) => {
        const Icon = serviceIcon[code]
        const on = value === code
        return (
          <Touchable key={code} onPress={() => { haptic.select(); onChange(code) }} accessibilityRole="tab" accessibilityLabel={`${name}, up to ${seats} passengers`} accessibilityState={{ selected: on }}
            style={({ pressed }) => ({
              flex: 1, alignItems: 'center', gap: 2, paddingVertical: 10, borderRadius: tokens.radius.md, borderWidth: 1,
              borderColor: on ? color('accent') : 'transparent', backgroundColor: on ? color('accent-soft') : pressed ? color('surface-2') : color('surface'),
            })}>
            <Icon size={tokens.size['icon-lg']} color={on ? color('on-accent-soft') : color('text')} />
            <Text variant="xs" weight={on ? 700 : 500} tone={on ? 'on-accent-soft' : 'default'}>{name}</Text>
            <Text variant="xs" tone="subtle">{seats} seats</Text>
          </Touchable>
        )
      })}
    </View>
  )
}

export function ServicePhoto({ code, height = 120 }: { code: ServiceCode; height?: number }) {
  const s = services.find((x) => x.code === code)!
  return <Image source={s.image} style={{ width: '100%', height, borderRadius: tokens.radius.lg }} resizeMode="cover" accessibilityIgnoresInvertColors accessibilityLabel={`${s.name}: ${s.model}`} />
}

// ───────── prix ─────────

export function FareInput({ cents, minimumCents, raising }: { cents: number | null; minimumCents: number; raising?: boolean }) {
  const below = cents != null && cents < minimumCents
  return (
    <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
      <Text variant="xs" tone="subtle">{raising ? 'New price' : 'Your price'}</Text>
      <View accessibilityLiveRegion="polite" accessible accessibilityLabel={cents ? formatUSD(cents) : 'No amount yet'} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Text variant="lg" tone="muted">$</Text>
        <Text variant="display" tabular tone={cents ? (below ? 'danger' : 'default') : 'subtle'}>{cents ? cents / 100 : 0}</Text>
      </View>
      <Text variant="sm" tone={below ? 'danger' : 'muted'}>
        {below ? `At least ${formatUSD(minimumCents)} for this trip` : raising ? `More than ${formatUSD(minimumCents - 100)}` : `Suggested price: ${formatUSD(minimumCents)}`}
      </Text>
      <Text variant="xs" tone="subtle" center>Tolls and airport fees are extra.</Text>
    </View>
  )
}

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '+2', '0', 'del'] as const

export function Keypad({ onKey }: { onKey: (k: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, justifyContent: 'space-between' }}>
      {keys.map((k) => (
        <Touchable key={k} onPress={() => { haptic.select(); onKey(k) }} accessibilityRole="button"
          accessibilityLabel={k === 'del' ? 'Delete last digit' : k === '+2' ? 'Add 2 dollars' : k}
          style={({ pressed }) => ({ width: '31%', height: 56, borderRadius: tokens.radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? color('surface-2') : color('surface') })}>
          {k === 'del' ? <Delete size={tokens.size['icon-lg']} color={color('text')} /> : <Text variant="lg" weight={600} tone={k === '+2' ? 'accent' : 'default'}>{k}</Text>}
        </Touchable>
      ))}
    </View>
  )
}

export const payments: { code: Payment; label: string; icon: LucideIcon }[] = [
  { code: 'card', label: 'Credit card', icon: CreditCard },
  { code: 'cash', label: 'Cash', icon: Banknote },
]

export function PaymentPicker({ value, onChange }: { value: Payment; onChange: (m: Payment) => void }) {
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 8 }}>
      {payments.map(({ code, label, icon: Icon }) => {
        const on = value === code
        return (
          <Touchable key={code} onPress={() => { haptic.select(); onChange(code) }} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={label}
            style={({ pressed }) => ({
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, borderRadius: tokens.radius.pill,
              borderWidth: 1, borderColor: on ? color('accent') : color('border'), backgroundColor: on ? color('accent-soft') : pressed ? color('surface-2') : color('surface'),
            })}>
            <Icon size={tokens.size.icon} color={on ? color('on-accent-soft') : color('text')} />
            <Text variant="sm" weight={on ? 600 : 400} tone={on ? 'on-accent-soft' : 'default'}>{label}</Text>
          </Touchable>
        )
      })}
    </View>
  )
}

// ───────── offres ─────────

export function CountdownBar({ total, left }: { total: number; left: number }) {
  const pct = Math.max(0, Math.min(1, left / total))
  return (
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ height: 4, backgroundColor: color('surface-2'), overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: 4, backgroundColor: left <= 10 ? color('warning') : color('accent') }} />
    </View>
  )
}

export type OfferCardData = {
  id: string; fareCents: number; kind: 'accept' | 'counter'; etaMin: number; miles: string
  driver: { name: string; rating: number; rides: number }; vehicle: { make: string; model: string; color: string }
  totalS: number; leftS: number
}

export function OfferCard({ offer, onAccept, onDecline, accepting, disabled }: { offer: OfferCardData; onAccept: () => void; onDecline: () => void; accepting?: boolean; disabled?: boolean }) {
  const slide = useRef(new Animated.Value(0)).current
  useEffect(() => {
    let cancelled = false
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return
      if (reduce) slide.setValue(1)
      else Animated.timing(slide, { toValue: 1, duration: tokens.motion['offer-in'], easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
    })
    return () => { cancelled = true }
  }, [slide])
  const { driver: d, vehicle: v } = offer
  return (
    <Animated.View accessibilityLiveRegion="polite"
      style={{ backgroundColor: color('surface'), borderRadius: tokens.radius.lg, overflow: 'hidden', opacity: slide, transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }] }}>
      <View accessible style={{ padding: 16, gap: 12 }}
        accessibilityLabel={`${offer.kind === 'counter' ? 'Counter-offer' : 'Accepts your price'}, ${formatUSD(offer.fareCents)}, ${d.name}, ${offer.etaMin} minutes away, ${v.color} ${v.make} ${v.model}, expires in ${offer.leftS} seconds`}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ gap: 2 }}>
            <Text variant="xl" tabular>{formatUSD(offer.fareCents)}</Text>
            <Text variant="xs" weight={600} tone={offer.kind === 'counter' ? 'warning' : 'success'}>{offer.kind === 'counter' ? 'Counter-offer' : 'Accepts your price'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Text weight={600}>{offer.etaMin} min</Text>
            <Text variant="xs" tone="subtle">{offer.miles}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={d.name} />
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text weight={600}>{d.name}</Text>
              <RatingBadge rating={d.rating} count={d.rides} />
            </View>
            <Text variant="sm" tone="muted">{v.color} {v.make} {v.model}</Text>
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 16 }}>
        <Button label="Decline" variant="secondary" accessibilityLabel={`Decline ${d.name}'s offer`} onPress={onDecline} disabled={disabled || accepting} />
        <View style={{ flex: 1 }}>
          <Button label="Accept" fullWidth accessibilityLabel={`Accept ${d.name}'s offer for ${formatUSD(offer.fareCents)}`} onPress={onAccept} loading={accepting} disabled={disabled} />
        </View>
      </View>
      <CountdownBar total={offer.totalS} left={offer.leftS} />
    </Animated.View>
  )
}

// ───────── course ─────────

export function DriverCard({ name, rating, rides, vehicle, plate, etaMin, arrived, onCall, onShare }: {
  name: string; rating: number; rides: number; vehicle: string; plate: string; etaMin?: number; arrived?: boolean; onCall?: () => void; onShare?: () => void
}) {
  return (
    <View style={{ gap: 16 }}>
      {arrived ? (
        <View accessibilityLiveRegion="assertive" style={{ backgroundColor: color('success-soft'), borderRadius: tokens.radius.md, padding: 12 }}>
          <Text weight={600} tone="success">Your driver is here</Text>
        </View>
      ) : etaMin != null ? (
        <Text variant="label-lg" heading accessibilityLiveRegion="polite">Arriving in {etaMin} min</Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
        <Avatar name={name} size="lg" />
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Text variant="lg">{name}</Text>
            <RatingBadge rating={rating} count={rides} />
          </View>
          <Text variant="sm" tone="muted">{vehicle}</Text>
          <PlateBadge plate={plate} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <IconButton icon={Phone} label={`Call ${name}`} variant="ghost" onPress={onCall} />
        <View style={{ flex: 1 }}>
          <Button label="Share trip" variant="secondary" icon={Share2} fullWidth onPress={onShare} />
        </View>
      </View>
    </View>
  )
}

export function SearchingPulse({ label }: { label: string }) {
  const p = useRef(new Animated.Value(0)).current
  const [reduce, setReduce] = useState(false)
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduce) }, [])
  useEffect(() => {
    if (reduce) return
    const loop = Animated.loop(Animated.timing(p, { toValue: 1, duration: tokens.motion.slow * 5, easing: Easing.out(Easing.quad), useNativeDriver: true }))
    loop.start()
    return () => loop.stop()
  }, [p, reduce])
  return (
    <View style={{ alignItems: 'center', gap: 16 }} accessibilityRole="progressbar" accessibilityLabel={label}>
      <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
        {[0, 1].map((i) => (
          <Animated.View key={i} style={{
            position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: color('accent'),
            opacity: reduce ? 0.12 : p.interpolate({ inputRange: [0, 1], outputRange: [0.25 - i * 0.1, 0] }),
            transform: [{ scale: reduce ? 0.8 : p.interpolate({ inputRange: [0, 1], outputRange: [0.3 + i * 0.2, 1] }) }],
          }} />
        ))}
        <View style={[{ width: 20, height: 20, borderRadius: 10, backgroundColor: color('marker-pickup'), borderWidth: 3, borderColor: color('bg') }, shadow('card')]} />
      </View>
      <Text tone="muted" center>{label}</Text>
    </View>
  )
}

export function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View accessible accessibilityRole="adjustable" accessibilityLabel="Rate your ride"
      accessibilityValue={{ min: 0, max: 5, now: value, text: value ? `${value} out of 5 stars` : 'Not rated yet' }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(Math.max(1, Math.min(5, value + (e.nativeEvent.actionName === 'increment' ? 1 : -1))))}
      style={{ flexDirection: 'row', gap: 4, alignSelf: 'center' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Touchable key={n} onPress={() => { haptic.select(); onChange(n) }} accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`} style={{ padding: 4, borderRadius: tokens.radius.pill }}>
          <Star size={40} color={n <= value ? color('star') : color('border-input')} fill={n <= value ? color('star') : 'transparent'} />
        </Touchable>
      ))}
    </View>
  )
}
