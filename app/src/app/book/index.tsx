import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { Banknote, CreditCard } from 'lucide-react-native'
import { booking, DISPATCH_PHONE, formatUsPhone, isEmail, isUsPhone, suggestions, tripTypes, type Payment, type TripType } from '@/data/booking'
import { draft, useDraft } from '@/data/draft'
import { useAction } from '@/data/hooks'
import { color, tokens } from '@/theme'
import { Screen } from '@/ui/layout'
import { Text } from '@/ui/Text'
import { Button } from '@/ui/Button'
import { Touchable } from '@/ui/Pressable'
import { Banner } from '@/ui/primitives'
import { Field } from '@/ui/Field'
import { AddressInput, Choices, DateChips, Steps, Stepper, SummaryRow, TimeChips, formatDate, formatTime, nextDays } from '@/ui/sm'

const labels = ['Trip', 'Date & passengers', 'Your details', 'Payment & notes', 'Review']

function PaymentChoice({ value, onChange }: { value: Payment | null; onChange: (p: Payment) => void }) {
  const opts: { v: Payment; label: string; icon: typeof Banknote }[] = [{ v: 'cash', label: 'Cash', icon: Banknote }, { v: 'card', label: 'Credit card', icon: CreditCard }]
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 8 }}>
      {opts.map(({ v, label, icon: Icon }) => {
        const on = value === v
        return (
          <Touchable key={v} onPress={() => onChange(v)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={label}
            style={{ flex: 1, alignItems: 'center', gap: 6, paddingVertical: 16, borderRadius: tokens.radius.md, borderWidth: 1, borderColor: on ? color('accent') : color('border'), backgroundColor: on ? color('accent-soft') : color('surface') }}>
            <Icon size={22} color={color(on ? 'on-accent-soft' : 'text-muted')} />
            <Text variant="sm" weight={on ? 600 : 400} style={{ color: color(on ? 'on-accent-soft' : 'text') }}>{label}</Text>
          </Touchable>
        )
      })}
    </View>
  )
}

// Réservation d'une course privée, en étapes (le long formulaire du site, découpé pour le téléphone).
export default function Book() {
  const d = useDraft()
  // Adresses et type déjà choisis à l'accueil : on commence directement à la date.
  const [step, setStep] = useState(() => { const x = draft.get(); return x.pickup.trim() && x.destination.trim() && x.tripType ? 1 : 0 })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const send = useAction(booking.requestRide)

  // Pré-remplit les coordonnées de la dernière demande faite sur ce téléphone.
  useEffect(() => {
    const c = booking.savedContact()
    if (c && !draft.get().fullName) draft.set({ fullName: c.fullName, phone: formatUsPhone(c.phone), email: c.email })
    if (!draft.get().date) draft.set({ date: nextDays(1)[0].value })
  }, [])

  const check = (s: number) => {
    const e: Record<string, string> = {}
    if (s === 0) {
      if (!d.pickup.trim()) e.pickup = 'Add a pickup location.'
      if (!d.destination.trim()) e.destination = 'Add a destination.'
      if (!d.tripType) e.tripType = 'Pick a trip type.'
    }
    if (s === 1 && !d.time) e.time = 'Pick a pickup time.'
    if (s === 2) {
      if (!d.fullName.trim()) e.fullName = 'Add your full name.'
      if (!isUsPhone(d.phone)) e.phone = 'Enter a 10-digit US phone number.'
      if (!isEmail(d.email)) e.email = 'Enter a valid email address.'
    }
    if (s === 3 && !d.payment) e.payment = 'Pick a payment method.'
    setErrors(e)
    return !Object.keys(e).length
  }

  const next = () => { if (check(step)) setStep((s) => s + 1) }
  const back = () => (step ? setStep(step - 1) : router.back())
  const submit = async () => {
    const r = await send.run({ ...d, tripType: d.tripType as TripType, payment: d.payment as Payment })
    if (r) { draft.reset(); router.replace({ pathname: '/book/done', params: { id: r.id } }) }
  }

  const footer = step < 4
    ? <Button label="Continue" size="lg" onPress={next} />
    : <>
        <Button label="Request my ride" size="lg" loading={send.busy} onPress={submit} />
        <Text variant="xs" tone="muted" center>Your request goes to our dispatch team. For immediate service, call {DISPATCH_PHONE}.</Text>
      </>

  return (
    <Screen title="Book a ride" onBack={back} footer={footer}>
      <Steps count={labels.length} current={step} labels={labels} />

      {step === 0 ? (
        <View style={{ gap: 16 }}>
          <View style={{ gap: 6 }}>
            <Text variant="sm" weight={500}>Ride type</Text>
            <Choices options={[{ value: 'private', label: 'Private ride' }, { value: 'weekly', label: 'Shared ride — weekly' }]} value="private"
              onChange={(v) => { if (v === 'weekly') router.replace('/weekly') }} />
          </View>
          <AddressInput label="Pickup location" value={d.pickup} onChange={(pickup) => draft.set({ pickup })} placeholder="Address or landmark" options={suggestions} error={errors.pickup} />
          <AddressInput label="Destination" value={d.destination} onChange={(destination) => draft.set({ destination })} placeholder="CVG Airport, downtown, etc." options={suggestions} error={errors.destination} />
          <View style={{ gap: 6 }}>
            <Text variant="sm" weight={500}>Trip type</Text>
            <Choices options={tripTypes} value={d.tripType} onChange={(tripType: TripType) => draft.set({ tripType })} />
            {errors.tripType ? <Text variant="sm" tone="danger">{errors.tripType}</Text> : null}
          </View>
        </View>
      ) : null}

      {step === 1 ? (
        <View style={{ gap: 16 }}>
          <View style={{ gap: 6 }}>
            <Text variant="sm" weight={500}>Pickup date</Text>
            <DateChips value={d.date} onChange={(date) => draft.set({ date, time: '' })} />
          </View>
          <View style={{ gap: 6 }}>
            <Text variant="sm" weight={500}>Pickup time</Text>
            <TimeChips value={d.time} onChange={(time) => draft.set({ time })} date={d.date} />
            {errors.time ? <Text variant="sm" tone="danger">{errors.time}</Text> : null}
          </View>
          <Stepper label="Passengers" value={d.passengers} onChange={(passengers) => draft.set({ passengers })} max={7} plusLabel="7+" />
          {d.passengers >= 5 ? <Banner kind="info" title="For 5 or more passengers" body="Dispatch will send the SUV (5 seats) or the Grand Highlander (7 seats)." /> : null}
        </View>
      ) : null}

      {step === 2 ? (
        <View style={{ gap: 16 }}>
          <Field label="Full name" value={d.fullName} onChangeText={(fullName) => draft.set({ fullName })} placeholder="Jane Carter" autoComplete="name" textContentType="name" error={errors.fullName} />
          <Field label="Phone number" value={d.phone} onChangeText={(v) => draft.set({ phone: formatUsPhone(v) })} placeholder="513-000-0000" keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" error={errors.phone} hint="Used to text you and to track your ride." />
          <Field label="Email address" value={d.email} onChangeText={(email) => draft.set({ email })} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" error={errors.email} />
        </View>
      ) : null}

      {step === 3 ? (
        <View style={{ gap: 16 }}>
          <View style={{ gap: 6 }}>
            <Text variant="sm" weight={500}>Payment method</Text>
            <PaymentChoice value={d.payment} onChange={(payment) => draft.set({ payment })} />
            {errors.payment ? <Text variant="sm" tone="danger">{errors.payment}</Text> : null}
          </View>
          <Field label="Additional notes (optional)" value={d.notes} onChangeText={(notes) => draft.set({ notes })} placeholder="Flight number, extra luggage, child seat, etc." multiline maxLength={500} counter />
        </View>
      ) : null}

      {step === 4 ? (
        <View style={{ gap: 4 }}>
          <Text tone="muted">Check your ride before sending it to dispatch.</Text>
          <View style={{ marginTop: 8 }}>
            <SummaryRow label="Pickup" value={d.pickup} />
            <SummaryRow label="Destination" value={d.destination} />
            <SummaryRow label="Trip type" value={tripTypes.find((t) => t.value === d.tripType)?.label ?? ''} />
            <SummaryRow label="When" value={`${formatDate(d.date)} · ${formatTime(d.time)}`} />
            <SummaryRow label="Passengers" value={d.passengers >= 7 ? '7+' : String(d.passengers)} />
            <SummaryRow label="Name" value={d.fullName} />
            <SummaryRow label="Phone" value={d.phone} />
            <SummaryRow label="Email" value={d.email} />
            <SummaryRow label="Payment" value={d.payment === 'card' ? 'Credit card' : 'Cash'} />
            {d.notes ? <SummaryRow label="Notes" value={d.notes} /> : null}
          </View>
          <Text tone="accent" weight={600} accessibilityRole="button" onPress={() => setStep(0)} style={{ paddingVertical: 12 }}>Edit ride details</Text>
          {send.error ? <Banner kind="danger" title={send.error} /> : null}
        </View>
      ) : null}
    </Screen>
  )
}
