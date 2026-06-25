import React, { useEffect, useState, useCallback } from 'react'
import { View, StyleSheet, Pressable, Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import RainDrops from '../animations/RainDrops'
import { playRainAudio, stopRainAudio, nextSound, getCurrentSoundLabel } from '../utils/audio'

interface RainScreenProps {
  onExit: () => void
}

export default function RainScreen({ onExit }: RainScreenProps) {
  const insets = useSafeAreaInsets()
  const [soundLabel, setSoundLabel] = useState(getCurrentSoundLabel())

  useEffect(() => {
    playRainAudio()
    return () => {
      stopRainAudio()
    }
  }, [])

  const handleNextSound = useCallback(async () => {
    await nextSound()
    setSoundLabel(getCurrentSoundLabel())
  }, [])

  return (
    <View style={styles.container}>
      <RainDrops />
      
      {/* Top HUD */}
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <Pressable
          style={({ pressed }) => [
            styles.soundButton,
            pressed && styles.soundButtonPressed
          ]}
          onPress={handleNextSound}
        >
          <Text style={styles.label}>{soundLabel}</Text>
        </Pressable>
        <Pressable 
          style={({ pressed }) => [
            styles.exitButton,
            pressed && styles.exitButtonPressed
          ]}
          onPress={onExit}
        >
          <Text style={styles.exitButtonText}>Exit</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 10,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Outfit_300Light',
    color: 'rgba(255, 255, 255, 0.35)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  soundButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  soundButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transform: [{ scale: 0.95 }],
  },
  exitButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  exitButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transform: [{ scale: 0.95 }],
  },
  exitButtonText: {
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
})
