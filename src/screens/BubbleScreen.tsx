import React, { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, Animated, Easing, Dimensions } from 'react-native'
import { WebView } from 'react-native-webview'
import { Leaf, Wind } from 'lucide-react-native'
import OceanWaves from '../animations/OceanWaves'
import RainDrops from '../animations/RainDrops'
import ShootingStars from '../animations/ShootingStars'
import ExitButton from '../components/ExitButton'
import type { AnimationType } from '../types'
import { getYouTubeUrl, ANIM_LABELS, VIDEO_IDS } from '../utils/audio'

const { width: W } = Dimensions.get('window')

interface Props {
  animation: AnimationType
  onExit: () => void
}

export default function BubbleScreen({ animation, onExit }: Props) {
  const [showBreath, setShowBreath] = useState(false)
  const [breathText, setBreathText] = useState('Inhale')
  const breathScale = useRef(new Animated.Value(1.0)).current

  const AnimComponent =
    animation === 'ocean'
      ? OceanWaves
      : animation === 'rain'
      ? RainDrops
      : ShootingStars

  useEffect(() => {
    let interval: any = null

    if (showBreath) {
      breathScale.setValue(1.0)
      
      const animLoop = Animated.loop(
        Animated.sequence([
          // Inhale (4s)
          Animated.timing(breathScale, {
            toValue: 1.4,
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          // Hold (4s)
          Animated.delay(4000),
          // Exhale (4s)
          Animated.timing(breathScale, {
            toValue: 1.0,
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          // Hold (4s)
          Animated.delay(4000),
        ])
      )
      animLoop.start()

      const startTime = Date.now()
      const texts = ['Inhale', 'Hold', 'Exhale', 'Hold']
      setBreathText(texts[0])

      interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) % 16000
        const phase = Math.floor(elapsed / 4000)
        setBreathText(texts[phase])
      }, 100)

      return () => {
        animLoop.stop()
        if (interval) clearInterval(interval)
      }
    } else {
      breathScale.stopAnimation()
      breathScale.setValue(1.0)
    }
  }, [showBreath, breathScale])

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <View style={styles.animContainer}>
        <AnimComponent />
      </View>

      {/* hidden YouTube audio */}
      <View style={styles.webviewContainer}>
        <WebView
          source={{ uri: getYouTubeUrl(VIDEO_IDS[animation]) }}
          style={styles.webview}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>

      {/* Central 3D-like Glass Breathing Guide */}
      {showBreath && (
        <View style={styles.breathingContainer} pointerEvents="none">
          <Animated.View
            style={[
              styles.breathingBubble,
              { transform: [{ scale: breathScale }] }
            ]}
          >
            {/* 3D Refractive Glare sheen */}
            <View style={styles.bubbleGlare} />
            <Text style={styles.breathingText}>{breathText}</Text>
          </Animated.View>
        </View>
      )}

      {/* HUD Overlay */}
      <View style={styles.hud}>
        <View style={styles.hudLeft}>
          <Leaf size={16} color="rgba(255,255,255,0.3)" />
          <Text style={styles.hudLabel}>{ANIM_LABELS[animation]}</Text>
        </View>
        <View style={styles.hudRight}>
          <TouchableOpacity
            onPress={() => setShowBreath(!showBreath)}
            activeOpacity={0.7}
            style={[styles.hudBtn, showBreath && styles.hudBtnActive]}
          >
            <Wind
              size={18}
              color={showBreath ? '#ffffff' : 'rgba(255,255,255,0.4)'}
            />
          </TouchableOpacity>
          <ExitButton onPress={onExit} />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  animContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  webviewContainer: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 1,
    height: 1,
    opacity: 0,
    pointerEvents: 'none',
    zIndex: 0,
  },
  webview: {
    width: 1,
    height: 1,
    backgroundColor: 'transparent',
  },
  breathingContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  breathingBubble: {
    width: W * 0.44,
    height: W * 0.44,
    borderRadius: (W * 0.44) / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    position: 'relative',
    overflow: 'hidden',
    elevation: 4,
  },
  bubbleGlare: {
    position: 'absolute',
    top: 12,
    left: 24,
    width: W * 0.12,
    height: W * 0.06,
    borderRadius: (W * 0.06),
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    transform: [{ rotate: '-15deg' }],
  },
  breathingText: {
    fontSize: 14,
    fontFamily: 'Nunito_300Light',
    letterSpacing: 2.5,
    color: 'rgba(255,255,255,0.65)',
    textTransform: 'uppercase',
  },
  hud: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
  },
  hudLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    gap: 8,
  },
  hudLabel: {
    fontSize: 11,
    fontFamily: 'Nunito_300Light',
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
  },
  hudRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hudBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudBtnActive: {
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
})
