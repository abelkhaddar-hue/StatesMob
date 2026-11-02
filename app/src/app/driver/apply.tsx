import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { Camera, FileText, IdCard, ShieldCheck, type LucideIcon } from 'lucide-react-native'
import { formatUsPhone } from '@/data/booking'
import { services } from '@/data/ride'
import {
  documents, driver, driverCities, eligibleServices, formatBirthDate, STEPS, validate, vehicleTypes,
  type DocCode, type DriverApplication,
} from '@/data/driver'
import { useAction } from '@/data/hooks'
import { color, tokens } from '@/theme'
import { Screen } from '@/ui/layout'
import { Text } from '@/ui/Text'
import { Button } from '@/ui/Button'
import { Banner, Chip } from '@/ui/primitives'
import { Field } from '@/ui/Field'
import { Checkbox, DocumentRow, ReviewSection, StepProgress } from '@/ui/driver'
import { haptic } from '@/ui/haptics'

const titles = ['Tell us about you', 'Verify your phone', 'Your vehicle', 'Upload your documents', 'Review and submit']
const intros = [
  'Use your legal name, as it appears on your driver\'s license.',
  'Passengers and dispatch will reach you on this number.',
  'We use this to match you with the right ride categories.',
  'Clear photos, all four corners visible. We review them within a day.',
  'Check your details, then send your application.',
]
const docIcon: Record<DocCode, LucideIcon> = { license: IdCard, insurance: ShieldCheck, registration: FileText, photo: Camera }

// Inscription chauffeur en 5 étapes. Tout est enregistré au fur et à mesure : on peut quitter et reprendre.
export default function DriverApply() {
  const [a, setA] = useState<DriverApplication>(driver.open)
  const [tried, setTried] = useState(false)
  const errors = tried ? validate(a.step, a) : {}
  // Accepte aussi une fonction, pour les mises à jour qui se chevauchent (plusieurs envois de documents).
  const update = (p: Partial<DriverApplication> | ((x: DriverApplication) => Partial<DriverApplication>)) =>
    setA((x) => { const n = { ...x, ...(typeof p === 'function' ? p(x) : p) }; driver.save(n); return n })
  const goTo = (step: number) => { setTried(false); update({ step }) }
  const submit = useAction(driver.submit)

  useEffect(() => { if (a.submittedAt) router.replace('/driver') }, [a.submittedAt])

  const next = async () => {
    if (Object.keys(validate(a.step, a)).length) { setTried(true); haptic.warning(); return }
    if (a.step < STEPS.length - 1) return goTo(a.step + 1)
    if ((await submit.attempt(a)).ok) { haptic.success(); router.replace('/driver') }
  }
  const back = () => (a.step > 0 ? goTo(a.step - 1) : router.back())

  return (
    <Screen onBack={back} footer={<>
      {submit.error ? <Banner kind="danger" title={submit.error} /> : null}
      {errors.consent ? <Text variant="sm" tone="danger" center accessibilityLiveRegion="polite">{errors.consent}</Text> : null}
      <Button label={a.step === STEPS.length - 1 ? 'Submit application' : 'Continue'} size="lg" fullWidth loading={submit.busy} onPress={next} />
    </>}>
      <StepProgress step={a.step} steps={STEPS} />
      <View style={{ gap: 4 }}>
        <Text variant="xl" heading>{titles[a.step]}</Text>
        <Text tone="muted">{intros[a.step]}</Text>
      </View>
      {a.step === 0 ? <AboutYou a={a} update={update} errors={errors} /> : null}
      {a.step === 1 ? <PhoneStep a={a} update={update} error={errors.phone ?? errors.phoneVerified} /> : null}
      {a.step === 2 ? <VehicleStep a={a} update={update} errors={errors} /> : null}
      {a.step === 3 ? <DocumentsStep a={a} update={update} error={errors.docs} /> : null}
      {a.step === 4 ? <ReviewStep a={a} update={update} goTo={goTo} error={errors.consent} /> : null}
    </Screen>
  )
}

type StepProps = { a: DriverApplication; update: (p: Partial<DriverApplication> | ((x: DriverApplication) => Partial<DriverApplication>)) => void }
type Errors = ReturnType<typeof validate>

function AboutYou({ a, update, errors }: StepProps & { errors: Errors }) {
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}><Field label="First name" value={a.firstName} onChangeText={(firstName) => update({ firstName })} error={errors.firstName} autoComplete="given-name" textContentType="givenName" /></View>
        <View style={{ flex: 1 }}><Field label="Last name" value={a.lastName} onChangeText={(lastName) => update({ lastName })} error={errors.lastName} autoComplete="family-name" textContentType="familyName" /></View>
      </View>
      <Field label="Email" value={a.email} onChangeText={(email) => update({ email })} error={errors.email} placeholder="you@email.com"
        keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
      <Field label="Date of birth" value={a.birthDate} onChangeText={(v) => update({ birthDate: formatBirthDate(v) })} error={errors.birthDate}
        placeholder="MM/DD/YYYY" hint="You need to be 21 or older." keyboardType="number-pad" maxLength={10} autoComplete="birthdate-full" />
      <View style={{ gap: 8 }}>
        <Text variant="sm" weight={500}>Where will you drive?</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {driverCities.map((c) => <Chip key={c} label={c} selected={a.city === c} onPress={() => update({ city: c })} />)}
        </View>
      </View>
    </View>
  )
}

function PhoneStep({ a, update, error }: StepProps & { error?: string }) {
  const [code, setCode] = useState('')
  const [sent, setSent] = useState<string>()
  const send = useAction(driver.sendCode)
  const check = useAction(driver.checkCode)

  const verify = async (c: string) => { if ((await check.attempt(c)).ok) { haptic.success(); update({ phoneVerified: true }); setSent(undefined) } }

  if (a.phoneVerified) {
    return (
      <View style={{ gap: 12 }}>
        <Banner kind="success" title={`${formatUsPhone(a.phone)} is verified`} />
        <Button label="Use another number" variant="ghost" onPress={() => { update({ phoneVerified: false }); setCode('') }} />
      </View>
    )
  }
  return (
    <View style={{ gap: 12 }}>
      <Field label="Mobile number" value={a.phone} onChangeText={(v) => { update({ phone: formatUsPhone(v) }); setSent(undefined); send.setError(undefined) }}
        error={send.error ?? (sent ? undefined : error)} placeholder="513-000-0000" keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" editable={!sent} />
      {!sent ? (
        <Button label="Text me a code" variant="secondary" fullWidth loading={send.busy}
          onPress={async () => { const c = await send.run(a.phone); if (c) { setSent(c); setCode('') } }} />
      ) : (
        <>
          <Banner kind="info" title={`Demo code: ${sent}`} body="In the real app this arrives by text message." />
          <Field label="6-digit code" value={code} maxLength={6} keyboardType="number-pad" autoComplete="sms-otp" textContentType="oneTimeCode" autoFocus
            error={check.error} onChangeText={(v) => { const c = v.replace(/\D/g, ''); setCode(c); check.setError(undefined); if (c.length === 6) verify(c) }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label="Verify" loading={check.busy} disabled={code.length !== 6} onPress={() => verify(code)} />
            <Button label="Change number" variant="ghost" onPress={() => setSent(undefined)} />
          </View>
        </>
      )}
    </View>
  )
}

function VehicleStep({ a, update, errors }: StepProps & { errors: Errors }) {
  const type = vehicleTypes.find((t) => t.code === a.vehicleType)!
  const ok = eligibleServices(a)
  const reason = { standard: '2012 or newer', suv: 'SUV or minivan, 5+ seats', premium: '6+ seats, 2020 or newer' } as const
  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 8 }}>
        <Text variant="sm" weight={500}>Vehicle type</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {vehicleTypes.map((t) => <Chip key={t.code} label={t.label} selected={a.vehicleType === t.code} onPress={() => update({ vehicleType: t.code, seats: t.seats[0] })} />)}
        </View>
      </View>
      {type.seats.length > 1 ? (
        <View style={{ gap: 8 }}>
          <Text variant="sm" weight={500}>Passenger seats</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {type.seats.map((n) => <Chip key={n} label={String(n)} selected={a.seats === n} onPress={() => update({ seats: n })} />)}
          </View>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}><Field label="Make" value={a.make} onChangeText={(make) => update({ make })} error={errors.make} placeholder="Toyota" /></View>
        <View style={{ flex: 1 }}><Field label="Model" value={a.model} onChangeText={(model) => update({ model })} error={errors.model} placeholder="Camry" /></View>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}><Field label="Year" value={a.year} onChangeText={(v) => update({ year: v.replace(/\D/g, '') })} error={errors.year} placeholder="2021" keyboardType="number-pad" maxLength={4} /></View>
        <View style={{ flex: 1 }}><Field label="Color" value={a.color} onChangeText={(c) => update({ color: c })} error={errors.color} placeholder="Silver" /></View>
      </View>
      <Field label="License plate" value={a.plate} onChangeText={(v) => update({ plate: v.toUpperCase() })} error={errors.plate} placeholder="ABC1234" autoCapitalize="characters" maxLength={8} />
      <View style={{ gap: 8, backgroundColor: color('surface'), borderRadius: tokens.radius.lg, padding: 14 }}>
        <Text weight={600}>You can drive</Text>
        {services.map((s) => {
          const yes = ok.includes(s.code)
          return (
            <View key={s.code} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text variant="sm" tone={yes ? 'success' : 'muted'} weight={yes ? 600 : 400}>{yes ? '✓ ' : ''}{s.name}</Text>
              <Text variant="xs" tone="subtle">{reason[s.code]}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

function DocumentsStep({ a, update, error }: StepProps & { error?: string }) {
  const [busy, setBusy] = useState<DocCode[]>([])
  const add = async (code: DocCode) => {
    setBusy((b) => [...b, code])
    try { const file = await driver.upload(code); haptic.success(); update((x) => ({ docs: { ...x.docs, [code]: file } })) }
    finally { setBusy((b) => b.filter((c) => c !== code)) }
  }
  const count = documents.filter((d) => a.docs[d.code]).length
  return (
    <View style={{ gap: 10 }}>
      {documents.map((d) => <DocumentRow key={d.code} icon={docIcon[d.code]} label={d.label} hint={d.hint} file={a.docs[d.code]} busy={busy.includes(d.code)} onPress={() => add(d.code)} />)}
      <Text variant="sm" tone={error ? 'danger' : 'muted'} accessibilityLiveRegion="polite">{error ?? `${count} of ${documents.length} added`}</Text>
      <Text variant="xs" tone="subtle">Demo: tapping a document adds a sample file. Your files are encrypted and only seen by our review team.</Text>
    </View>
  )
}

function ReviewStep({ a, update, goTo, error }: StepProps & { goTo: (s: number) => void; error?: string }) {
  const can = eligibleServices(a).map((c) => services.find((s) => s.code === c)!.name).join(', ')
  return (
    <View style={{ gap: 12 }}>
      <ReviewSection title="About you" lines={[`${a.firstName} ${a.lastName}`, a.email, `Born ${a.birthDate}`, `Driving in ${a.city}`]} onEdit={() => goTo(0)} />
      <ReviewSection title="Phone" lines={[`${formatUsPhone(a.phone)} · verified`]} onEdit={() => goTo(1)} />
      <ReviewSection title="Vehicle" lines={[`${a.year} ${a.make} ${a.model} · ${a.color}`, `Plate ${a.plate} · ${a.seats} seats`, `Categories: ${can}`]} onEdit={() => goTo(2)} />
      <ReviewSection title="Documents" lines={documents.map((d) => `${d.label} · added`)} onEdit={() => goTo(3)} />
      <View style={{ gap: 8, paddingTop: 4 }}>
        <Text weight={600}>Background check</Text>
        <Text variant="sm" tone="muted">Our screening partner will email you a secure link to finish the check. We never ask for your Social Security number in the app.</Text>
      </View>
      <Checkbox checked={a.consent} onChange={(consent) => update({ consent })} invalid={!!error}>
        <Text variant="sm">I agree to a background and driving record check, and to the StatesMob driver terms.</Text>
      </Checkbox>
    </View>
  )
}
