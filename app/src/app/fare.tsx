import { useEffect, useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { formatUSD, rides, type Payment, type RideRequest } from '@/data/ride'
import { draft } from '@/data/draft'
import { useAction } from '@/data/hooks'
import { Screen } from '@/ui/layout'
import { Text } from '@/ui/Text'
import { Button } from '@/ui/Button'
import { Banner } from '@/ui/primitives'
import { FareInput, Keypad, PaymentPicker } from '@/ui/ride'

// Proposer son prix. Avec ?raise=<demande> : l'augmenter pendant la recherche.
export default function Fare() {
  const { raise } = useLocalSearchParams<{ raise?: string }>()
  const d = draft.get()
  const [req, setReq] = useState<RideRequest>()
  const [cents, setCents] = useState<number | null>(raise ? null : d.offeredCents)
  const [pay, setPay] = useState<Payment>(d.payment)
  const raiseAction = useAction(rides.raiseFare)

  useEffect(() => {
    if (raise) rides.request(raise).then((r) => { setReq(r); setCents(r.offeredCents + 200) }).catch(() => {})
  }, [raise])

  const minimum = raise ? (req ? req.offeredCents + 100 : Infinity) : d.quote?.recommendedCents ?? 0

  const onKey = (k: string) => setCents((c) => {
    const usd = Math.floor((c ?? 0) / 100)
    if (k === 'del') { const n = Math.floor(usd / 10); return n ? n * 100 : null }
    if (k === '+2') return (usd + 2) * 100
    const n = usd * 10 + Number(k)
    return n > 999 ? c : n * 100
  })

  if (!raise && !d.quote) {
    return <Screen title="Your price" close><Banner kind="warning" title="Pick a destination first" body="The suggested price depends on the trip." /></Screen>
  }

  const ok = cents != null && cents >= minimum
  return (
    <Screen title={raise ? 'Raise your price' : 'Your price'} close footer={
      <Button size="lg" label={raise ? `Offer ${cents ? formatUSD(cents) : ''}` : 'Done'} disabled={!ok} loading={raiseAction.busy}
        onPress={async () => {
          if (!cents) return
          if (raise) { if ((await raiseAction.attempt(raise, cents)).ok) router.back() }
          else { draft.set({ offeredCents: cents, payment: pay }); router.back() }
        }} />
    }>
      {raise ? <Text tone="muted" center>Now {req ? formatUSD(req.offeredCents) : '…'}. A higher price gets more drivers interested.</Text>
        : <Text tone="muted" center>Name your price. Drivers nearby accept it or send a counter-offer.</Text>}
      <FareInput cents={cents} minimumCents={minimum} raising={!!raise} />
      {raiseAction.error ? <Banner kind="danger" title={raiseAction.error} /> : null}
      <Keypad onKey={onKey} />
      {!raise ? <PaymentPicker value={pay} onChange={setPay} /> : null}
    </Screen>
  )
}
