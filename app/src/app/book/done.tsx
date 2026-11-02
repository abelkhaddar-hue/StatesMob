import { View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { CircleCheck } from 'lucide-react-native'
import { color } from '@/theme'
import { Screen } from '@/ui/layout'
import { Text } from '@/ui/Text'
import { Button } from '@/ui/Button'
import { CallButton, Eyebrow, StatusTimeline } from '@/ui/sm'

// Demande envoyée : comme sur le site, c'est l'équipe de dispatch qui confirme ensuite.
export default function BookDone() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const home = () => router.replace('/')
  return (
    <Screen close onBack={home} footer={<>
      <Button label="Track this ride" size="lg" onPress={() => router.replace({ pathname: '/track/[id]', params: { id } })} />
      <Button label="Back to home" variant="ghost" fullWidth onPress={home} />
    </>}>
      <View style={{ alignItems: 'center', gap: 10, paddingVertical: 8 }}>
        <CircleCheck size={56} color={color('accent')} />
        <Text variant="xl" heading center>Request sent</Text>
        <Eyebrow tone="accent">{`Reference ${id}`}</Eyebrow>
        <Text tone="muted" center>Our dispatch team will confirm your ride and text you the details. Keep your reference handy.</Text>
      </View>
      <StatusTimeline status="requested" />
      <CallButton />
    </Screen>
  )
}
