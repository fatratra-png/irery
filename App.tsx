import React, { useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts, ChelaOne_400Regular } from '@expo-google-fonts/chela-one'
import { Nunito_300Light, Nunito_400Regular } from '@expo-google-fonts/nunito'
import HomeScreen from './src/screens/HomeScreen'
import BubbleScreen from './src/screens/BubbleScreen'
import type { AnimationType, ScreenType } from './src/types'

export default function App() {
  const [fontsLoaded] = useFonts({
    ChelaOne_400Regular,
    Nunito_300Light,
    Nunito_400Regular,
  })
  const [screen, setScreen] = useState<ScreenType>('home')
  const [animation, setAnimation] = useState<AnimationType>('ocean')

  const handleEnter = (anim: AnimationType) => {
    setAnimation(anim)
    setScreen('bubble')
  }

  const handleExit = () => {
    setScreen('home')
  }

  if (!fontsLoaded) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color="rgba(100,255,218,0.5)" size="large" />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        {screen === 'home' ? (
          <HomeScreen onEnter={handleEnter} />
        ) : (
          <BubbleScreen animation={animation} onExit={handleExit} />
        )}
      </View>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060e20',
  },
})
