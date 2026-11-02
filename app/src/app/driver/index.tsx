import { ActivityIndicator, View } from 'react-native'
import { router } from 'expo-router'
import { BadgeCheck, CalendarCheck, CarFront, FileCheck, Handshake, IdCard, Signpost, Send, ShieldCheck, UserCheck, Wallet, type LucideIcon } from 'lucide-react-native'
import { formatUsPhone } from '@/data/booking'
import { services } from '@/data/ride'
import { driver, eligibleServices, STEPS, type DriverStatus, type DriverView } from '@/data/driver'
import { useLoad } from '@/data/hooks'
import { color, tokens } from '@/theme'
import { Loading, Screen } from '@/ui/layout'
import { Text } from '@/ui/Text'
import { Button } from '@/ui/Button'
import { Banner, PlateBadge } from '@/ui/primitives'
import { InfoRow } from '@/ui/driver'
import { CallButton, Eyebrow } from '@/ui/sm'

// Espace chauffeur : présentation avant la candidature, puis suivi de la validation.
export default function DriverHome() {
  const d = useLoad<DriverView>(driver.current, [], (set) => { const t = setInterval(() => driver.current().then(set), 1000); return () => clearInterval(t) })
  if (!d.data) return <Loading />
  const v = d.data
  if (v.status === 'none' || v.status === 'draft') return <Pitch view={v} />
  return <Review view={v} />
}

function Pitch({ view }: { view: DriverView }) {
  const step = view.application?.step ?? 0
  return (
    <Screen title="Drive with StatesMob" footer={<>
      <Button label={view.status === 'draft' ? `Continue application · ${STEPS[step]}` : 'Start application'} size="lg" fullWidth onPress={() => router.push('/driver/apply')} />
      <Text variant="xs" tone="subtle" center>Takes about 10 minutes · Free to apply</Text>
    </>}>
      <View style={{ gap: 6 }}>
        <Eyebrow tone="accent">Earn on your schedule</Eyebrow>
        <Text variant="xl" heading>Your car, your price, your hours.</Text>
        <Text tone="muted">Passengers name their price and you choose: accept it, or send a counter-offer.</Text>
      </View>
      <View style={{ gap: 16 }}>
        <InfoRow icon={Handshake} title="You set the fare" body="Accept the passenger's price or counter it. No surge rules." />
        <InfoRow icon={Signpost} title="Pick the rides you want" body="See pickup, destination and price before you say yes." />
        <InfoRow icon={Wallet} title="Paid every week" body="Card fares go straight to your bank. Cash stays in your pocket." />
      </View>
      <View style={{ gap: 14, backgroundColor: color('surface'), borderRadius: tokens.radius.lg, padding: 16 }}>
        <Text weight={600}>What you need</Text>
        <Requirement icon={CalendarCheck} label="21 or older" />
        <Requirement icon={IdCard} label="Valid US driver's license" />
        <Requirement icon={CarFront} label="4-door vehicle, 2012 or newer" />
        <Requirement icon={ShieldCheck} label="Insurance in your name" />
      </View>
      {view.status === 'draft' ? <Banner kind="info" title={`Step ${step + 1} of ${STEPS.length} saved`} body="Pick up where you left off." /> : null}
    </Screen>
  )
}

function Requirement({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      <Icon size={tokens.size.icon} color={color('accent')} />
      <Text variant="sm">{label}</Text>
    </View>
  )
}

const stages: { key: DriverStatus | 'sent'; label: string; icon: LucideIcon; body: string }[] = [
  { key: 'sent', label: 'Application sent', icon: Send, body: 'We have everything we need.' },
  { key: 'docs_review', label: 'Documents check', icon: FileCheck, body: 'Our team checks your license, insurance and registration.' },
  { key: 'background_check', label: 'Background check', icon: UserCheck, body: 'Look for an email from our screening partner.' },
  { key: 'approved', label: 'Approved', icon: BadgeCheck, body: 'You can start driving.' },
]

function Review({ view }: { view: DriverView }) {
  const a = view.application!
  const at = stages.findIndex((s) => s.key === view.status)
  const approved = view.status === 'approved'
  const can = eligibleServices(a).map((c) => services.find((s) => s.code === c)!.name).join(' · ')
  return (
    <Screen title="Driver application" footer={<Button label={approved ? 'Back to the app' : 'Done'} size="lg" fullWidth onPress={() => router.dismissTo('/')} />}>
      <View style={{ gap: 4 }} accessibilityLiveRegion="polite">
        <Text variant="xl" heading>{approved ? `You're approved, ${a.firstName}!` : 'We are reviewing your application'}</Text>
        <Text tone="muted">{approved ? `Welcome to StatesMob. We sent your driver kit to ${a.email}.` : 'This usually takes 1 to 3 business days. In this demo, under a minute.'}</Text>
      </View>

      <View style={{ gap: 0 }}>
        {stages.map((s, i) => {
          const done = i < at || approved
          const current = i === at && !approved
          const Icon = s.icon
          return (
            <View key={s.key} accessible accessibilityLabel={`${s.label}, ${done ? 'done' : current ? 'in progress' : 'pending'}`} style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ alignItems: 'center' }}>
                <View style={{
                  width: 36, height: 36, borderRadius: tokens.radius.pill, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: color(done ? 'success' : current ? 'accent' : 'surface-2'),
                }}>
                  {current ? <ActivityIndicator size="small" color={color('on-accent')} /> : <Icon size={18} color={color(done || current ? 'on-accent' : 'text-subtle')} />}
                </View>
                {i < stages.length - 1 ? <View style={{ width: 2, flex: 1, minHeight: 20, backgroundColor: color(done ? 'success' : 'border') }} /> : null}
              </View>
              <View style={{ flex: 1, gap: 2, paddingTop: 7, paddingBottom: 18 }}>
                <Text weight={600} tone={done || current ? 'default' : 'subtle'}>{s.label}</Text>
                {current || (approved && s.key === 'approved') ? <Text variant="sm" tone="muted">{s.body}</Text> : null}
              </View>
            </View>
          )
        })}
      </View>

      <View style={{ gap: 10, backgroundColor: color('surface'), borderRadius: tokens.radius.lg, padding: 16 }}>
        <Eyebrow>Your vehicle</Eyebrow>
        <Text weight={600}>{a.year} {a.make} {a.model} · {a.color}</Text>
        <PlateBadge plate={a.plate} />
        <Text variant="sm" tone="muted">Categories: {can}</Text>
        <Text variant="sm" tone="muted">{formatUsPhone(a.phone)} · {a.city}</Text>
      </View>

      {approved ? <Banner kind="success" title="Driver mode is next" body="Soon you'll go online here, receive ride requests and send your offers." /> : null}
      <CallButton />
    </Screen>
  )
}
