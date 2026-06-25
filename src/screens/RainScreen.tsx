import React, { useEffect, useState, useCallback, useRef } from 'react'
import { View, StyleSheet, Pressable, Text, Animated, StatusBar } from 'react-native'
import RainDrops from '../animations/RainDrops'
import {
  playRainAudio, stopRainAudio, nextSound, previousSound,
  getCurrentSoundLabel, setVolume,
} from '../utils/audio'

interface RainScreenProps {
  onExit: () => void
}

const DURATIONS = [15, 30, 45, 60]

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function RainScreen({ onExit }: RainScreenProps) {
  const [phase, setPhase] = useState<'setup' | 'active' | 'completed'>('setup')
  const [selectedDuration, setSelectedDuration] = useState(DURATIONS[0])
  const [timeLeft, setTimeLeft] = useState(0)
  const [soundLabel, setSoundLabel] = useState(getCurrentSoundLabel())
  const [volume, setVolumeState] = useState(0.5)
  const [showVolume, setShowVolume] = useState(false)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const volumeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start()
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

  const startShower = useCallback(async () => {
    setTimeLeft(selectedDuration * 60)
    setPhase('active')
    await playRainAudio()
  }, [selectedDuration])

  useEffect(() => {
    if (phase === 'active') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current)
            setPhase('completed')
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => {
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }
  }, [phase])

  useEffect(() => {
    if (phase === 'active') {
      playRainAudio()
      return () => { stopRainAudio() }
    }
  }, [phase])

  const handleNextSound = useCallback(async () => {
    await nextSound()
    setSoundLabel(getCurrentSoundLabel())
  }, [])

  const handlePreviousSound = useCallback(async () => {
    await previousSound()
    setSoundLabel(getCurrentSoundLabel())
  }, [])

  const handleVolumeChange = useCallback(() => {
    const newVol = volume >= 1 ? 0 : Math.min(1, volume + 0.2)
    setVolumeState(newVol)
    setVolume(newVol)
  }, [volume])

  const toggleVolumeSlider = useCallback(() => {
    const toValue = showVolume ? 0 : 1
    Animated.timing(volumeAnim, {
      toValue,
      duration: 200,
      useNativeDriver: false,
    }).start()
    setShowVolume(!showVolume)
  }, [showVolume])

  if (phase === 'setup') {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <RainDrops />
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <Text style={styles.setupTitle}>Hour Shower</Text>
          <Text style={styles.setupSubtitle}>Set your shower duration</Text>
          <View style={styles.durationRow}>
            {DURATIONS.map((d) => (
              <Pressable
                key={d}
                style={[
                  styles.durationButton,
                  selectedDuration === d && styles.durationButtonSelected,
                ]}
                onPress={() => setSelectedDuration(d)}
              >
                <Text
                  style={[
                    styles.durationText,
                    selectedDuration === d && styles.durationTextSelected,
                  ]}
                >
                  {d}min
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.startButton} onPress={startShower}>
            <Text style={styles.startText}>Begin Shower</Text>
          </Pressable>
        </Animated.View>
      </View>
    )
  }

  if (phase === 'completed') {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <RainDrops />
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <Text style={styles.completedIcon}>✦</Text>
          <Text style={styles.completedTitle}>Shower Complete</Text>
          <Text style={styles.completedSubtitle}>You've finished your {selectedDuration}-minute session</Text>
          <View style={styles.completedRow}>
            <Pressable style={styles.completedButton} onPress={() => setPhase('setup')}>
              <Text style={styles.completedButtonText}>New Shower</Text>
            </Pressable>
            <Pressable style={styles.completedButton} onPress={onExit}>
              <Text style={styles.completedButtonText}>Exit</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <RainDrops />

      {/* Progress ring background */}
      <View style={styles.progressBg} />

      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {/* Timer */}
        <Animated.Text style={[styles.timer, { transform: [{ scale: pulseAnim }] }]}>
          {formatTime(timeLeft)}
        </Animated.Text>

        {/* Sound label */}
        <Text style={styles.soundCategory}>{soundLabel}</Text>
      </Animated.View>

      {/* Bottom controls */}
      <View style={styles.bottomBar}>
        <Pressable
          style={({ pressed }) => [styles.controlButton, pressed && styles.buttonPressed]}
          onPress={handlePreviousSound}
        >
          <Text style={styles.controlIcon}>◂</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.controlButton, pressed && styles.buttonPressed]}
          onPress={toggleVolumeSlider}
        >
          <Text style={styles.controlIcon}>{volume === 0 ? '○' : '●'}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.controlButton, pressed && styles.buttonPressed]}
          onPress={handleNextSound}
        >
          <Text style={styles.controlIcon}>▸</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.controlButton, pressed && styles.buttonPressed]}
          onPress={() => {
            if (timerRef.current) clearInterval(timerRef.current)
            stopRainAudio()
            setPhase('setup')
          }}
        >
          <Text style={styles.controlIcon}>■</Text>
        </Pressable>
      </View>

      {/* Volume bar */}
      {showVolume && (
        <Animated.View style={[styles.volumeContainer, { opacity: volumeAnim }]}>
          <View style={styles.volumeTrack}>
            <View style={[styles.volumeFill, { width: `${volume * 100}%` }]} />
          </View>
          <Pressable style={styles.volumeKnobArea} onPress={handleVolumeChange}>
            <Text style={styles.volumeLabel}>{Math.round(volume * 100)}%</Text>
          </Pressable>
        </Animated.View>
      )}
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

  // Setup
  setupTitle: {
    fontSize: 42,
    fontFamily: 'Outfit_300Light',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 4,
    marginBottom: 8,
  },
  setupSubtitle: {
    fontSize: 13,
    fontFamily: 'Outfit_300Light',
    color: 'rgba(255, 255, 255, 0.35)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 40,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 40,
  },
  durationButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  durationButtonSelected: {
    borderColor: 'rgba(255, 255, 255, 0.5)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  durationText: {
    fontSize: 15,
    fontFamily: 'Outfit_300Light',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 1,
  },
  durationTextSelected: {
    color: '#ffffff',
  },
  startButton: {
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  startText: {
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    color: '#ffffff',
    letterSpacing: 1.5,
  },

  // Active
  progressBg: {
    position: 'absolute',
    bottom: 120,
    left: 40,
    right: 40,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    zIndex: 4,
  },
  timer: {
    fontSize: 96,
    fontFamily: 'Outfit_300Light',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 6,
    marginBottom: 12,
  },
  soundCategory: {
    fontSize: 14,
    fontFamily: 'Outfit_300Light',
    color: 'rgba(255, 255, 255, 0.3)',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  // Completed
  completedIcon: {
    fontSize: 48,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 16,
  },
  completedTitle: {
    fontSize: 28,
    fontFamily: 'Outfit_300Light',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 2,
    marginBottom: 8,
  },
  completedSubtitle: {
    fontSize: 13,
    fontFamily: 'Outfit_300Light',
    color: 'rgba(255, 255, 255, 0.3)',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 40,
  },
  completedRow: {
    flexDirection: 'row',
    gap: 16,
  },
  completedButton: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  completedButtonText: {
    fontSize: 13,
    fontFamily: 'Outfit_400Regular',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 1,
  },

  // Controls
  bottomBar: {
    position: 'absolute',
    bottom: 50,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    zIndex: 10,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transform: [{ scale: 0.92 }],
  },
  controlIcon: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
  },

  // Volume
  volumeContainer: {
    position: 'absolute',
    bottom: 110,
    left: 40,
    right: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
  },
  volumeTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
  },
  volumeFill: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 2,
  },
  volumeKnobArea: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  volumeLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_300Light',
    color: 'rgba(255, 255, 255, 0.3)',
    letterSpacing: 1,
  },
})
