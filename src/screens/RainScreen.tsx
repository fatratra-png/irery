import React, { useEffect, useState, useCallback, useRef } from 'react'
import { View, StyleSheet, Pressable, Text, Animated, StatusBar } from 'react-native'
import RainDrops from '../animations/RainDrops'
import { playRainAudio, stopRainAudio, nextSound, getCurrentSoundLabel } from '../utils/audio'

interface RainScreenProps {
  onExit: () => void
}

function useClock(): string {
  const [time, setTime] = useState(() => {
    const now = new Date()
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  })
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date()
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }))
    }, 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

function useDate(): string {
  const [date, setDate] = useState(() => {
    const now = new Date()
    return now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
  })
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date()
      setDate(now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }))
    }, 60000)
    return () => clearInterval(id)
  }, [])
  return date
}

export default function RainScreen({ onExit }: RainScreenProps) {
  const time = useClock()
  const date = useDate()
  const [soundLabel, setSoundLabel] = useState(getCurrentSoundLabel())
  const pulseAnim = useRef(new Animated.Value(1)).current
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start()
  }, [])

  useEffect(() => {
    playRainAudio()
    return () => {
      stopRainAudio()
    }
  }, [])

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.85, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    )
    pulse.start()
    return () => pulse.stop()
  }, [])

  const handleNextSound = useCallback(async () => {
    await nextSound()
    setSoundLabel(getCurrentSoundLabel())
  }, [])

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <RainDrops />

      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.Text style={[styles.clock, { transform: [{ scale: pulseAnim }] }]}>
          {time}
        </Animated.Text>
        <Text style={styles.date}>{date}</Text>
      </Animated.View>

      <View style={styles.bottomBar}>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={handleNextSound}
        >
          <Text style={styles.label}>{soundLabel}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={onExit}
        >
          <Text style={styles.label}>Exit</Text>
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
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  clock: {
    fontSize: 82,
    fontFamily: 'Outfit_300Light',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 4,
  },
  date: {
    fontSize: 13,
    fontFamily: 'Outfit_300Light',
    color: 'rgba(255, 255, 255, 0.25)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 60,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  buttonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    transform: [{ scale: 0.95 }],
  },
  label: {
    fontSize: 11,
    fontFamily: 'Outfit_300Light',
    color: 'rgba(255, 255, 255, 0.35)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
})
