import { View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { CalendarCheck } from 'lucide-react-native'
import { color } from '@/theme'
import { Screen } from '@/ui/layout'
import { Text } from '@/ui/Text'
import { Button } from '@/ui/Button'
import { CallButton, Eyebrow } from '@/ui/sm'

export default function WeeklyDone() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const home = () => router.replace('/')
  return (
    <Screen close onBack={home} footer={<Button label="Back to home" size="lg" onPress={home} />}>
      <View style={{ alignItems: 'center', gap: 10, paddingVertical: 8 }}>
        <CalendarCheck size={56} color={color('accent')} />
        <Text variant="xl" heading center>Weekly ride requested</Text>
        <Eyebrow tone="accent">{`Reference ${id}`}</Eyebrow>
        <Text tone="muted" center>We’ll review your schedule and follow up with your weekly rate by text or email.</Text>
      </View>
      <CallButton />
    </Screen>
  )
}
