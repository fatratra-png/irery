import React, { useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts, Outfit_300Light, Outfit_400Regular } from '@expo-google-fonts/outfit'
import HomeScreen from './src/screens/HomeScreen'
import RainScreen from './src/screens/RainScreen'

type ScreenType = 'home' | 'rain'

export default function App() {
  const [fontsLoaded] = useFonts({
    Outfit_300Light,
    Outfit_400Regular,
  })
  const [screen, setScreen] = useState<ScreenType>('home')

  const handleBegin = () => {
    setScreen('rain')
  }

  const handleExit = () => {
    setScreen('home')
  }

  if (!fontsLoaded) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color="rgba(255,255,255,0.4)" size="large" />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        {screen === 'home' ? (
          <HomeScreen onBegin={handleBegin} />
        ) : (
          <RainScreen onExit={handleExit} />
        )}
      </View>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
})
