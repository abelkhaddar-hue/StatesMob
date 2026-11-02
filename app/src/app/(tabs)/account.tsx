import { useCallback, useState } from 'react'
import { View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { CalendarRange, Info, RotateCcw } from 'lucide-react-native'
import { booking, formatUsPhone, serviceAreas } from '@/data/booking'
import { draft } from '@/data/draft'
import { useAction } from '@/data/hooks'
import { color, tokens } from '@/theme'
import { TabScreen } from '@/ui/layout'
import { Text } from '@/ui/Text'
import { Button } from '@/ui/Button'
import { Avatar, Banner, ListGroup, ListRow } from '@/ui/primitives'
import { Field } from '@/ui/Field'
import { haptic } from '@/ui/haptics'
import { CallButton, Eyebrow } from '@/ui/sm'

// Compte : coordonnées enregistrées (pré-remplissent les réservations), dispatch, zones desservies.
export default function Account() {
  const [f, setF] = useState({ fullName: '', phone: '', email: '' })
  const [saved, setSaved] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const save = useAction(booking.saveContact)
  const set = (p: Partial<typeof f>) => { setF((x) => ({ ...x, ...p })); setSaved(false); save.setError(undefined) }

  useFocusEffect(useCallback(() => {
    const c = booking.savedContact()
    setF(c ? { fullName: c.fullName, phone: formatUsPhone(c.phone), email: c.email } : { fullName: '', phone: '', email: '' })
    setSaved(false); setConfirmReset(false)
  }, []))

  const submit = async () => {
    const c = await save.run(f)
    if (c) { haptic.success(); setSaved(true); draft.set({ fullName: c.fullName, phone: formatUsPhone(c.phone), email: c.email }) }
  }

  const reset = () => {
    booking.clearDemo(); draft.reset(); draft.set({ fullName: '', phone: '', email: '' })
    setF({ fullName: '', phone: '', email: '' }); setConfirmReset(false); haptic.success()
  }

  return (
    <TabScreen title="Account">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar name={f.fullName || 'Guest'} size="lg" />
        <View style={{ flex: 1 }}>
          <Text variant="lg" heading numberOfLines={1}>{f.fullName || 'Guest'}</Text>
          <Text variant="sm" tone="muted">{f.phone || 'Add your details to book faster'}</Text>
        </View>
      </View>

      <View style={{ gap: 12 }}>
        <Eyebrow>Your details</Eyebrow>
        <Field label="Full name" value={f.fullName} onChangeText={(fullName) => set({ fullName })} placeholder="Jane Carter" autoComplete="name" textContentType="name" />
        <Field label="Phone" value={f.phone} onChangeText={(v) => set({ phone: formatUsPhone(v) })} placeholder="513-000-0000" keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" />
        <Field label="Email" value={f.email} onChangeText={(email) => set({ email })} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
        {save.error ? <Banner kind="danger" title={save.error} /> : null}
        {saved ? <Banner kind="success" title="Details saved" body="We'll fill them in for your next booking." /> : null}
        <Button label="Save details" variant="secondary" fullWidth loading={save.busy} onPress={submit} />
      </View>

      <CallButton />

      <ListGroup>
        <ListRow icon={CalendarRange} label="Weekly commute" detail="Home ↔ work, billed weekly" onPress={() => router.push('/weekly')} />
        <ListRow icon={RotateCcw} label="Reset demo data" detail="Clear rides and saved details" danger onPress={() => setConfirmReset(true)} />
      </ListGroup>
      {confirmReset ? (
        <View style={{ gap: 8 }}>
          <Banner kind="danger" title="Clear all demo rides and your details?" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label="Yes, clear" variant="danger" onPress={reset} />
            <Button label="Keep" variant="secondary" onPress={() => setConfirmReset(false)} />
          </View>
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        <Eyebrow>Where we drive</Eyebrow>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {serviceAreas.map((a) => (
            <View key={a} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: tokens.radius.pill, borderWidth: 1, borderColor: color('border') }}>
              <Text variant="sm">{a}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
        <Info size={14} color={color('text-muted')} />
        <Text variant="xs" tone="muted">StatesMob 1.0 · Demo — requests are not sent to dispatch yet.</Text>
      </View>
    </TabScreen>
  )
}
