import React from 'react'
import { View, Text, StyleSheet, StatusBar } from 'react-native'
import { WebView } from 'react-native-webview'
import OceanWaves from '../animations/OceanWaves'
import RainDrops from '../animations/RainDrops'
import ShootingStars from '../animations/ShootingStars'
import ExitButton from '../components/ExitButton'
import type { AnimationType } from '../types'
import { getYouTubeUrl, ANIM_LABELS, VIDEO_IDS } from '../utils/audio'

interface Props {
  animation: AnimationType
  onExit: () => void
}

export default function BubbleScreen({ animation, onExit }: Props) {
  const AnimComponent =
    animation === 'ocean'
      ? OceanWaves
      : animation === 'rain'
      ? RainDrops
      : ShootingStars

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

      {/* HUD */}
      <View style={styles.hud}>
        <View style={styles.hudLeft}>
          <View style={styles.hudLogo}>
            <View style={styles.hudBubble} />
            <View style={[styles.hudBubble, styles.hudBubbleSm, { top: 6, left: 14 }]} />
            <View style={[styles.hudBubble, styles.hudBubbleXs, { top: 4, right: 6 }]} />
          </View>
          <Text style={styles.hudLabel}>{ANIM_LABELS[animation]}</Text>
        </View>
        <View style={styles.hudRight}>
          <View style={styles.audioIndicator}>
            <View style={styles.audioBar1} />
            <View style={styles.audioBar2} />
            <View style={styles.audioBar3} />
          </View>
          <ExitButton onPress={onExit} />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060e20',
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
    paddingVertical: 12,
    backgroundColor: 'rgba(6,14,32,0.5)',
  },
  hudLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hudLogo: {
    width: 28,
    height: 28,
    position: 'relative',
    opacity: 0.5,
  },
  hudBubble: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  hudBubbleSm: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  hudBubbleXs: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  audioIndicator: {
    width: 20,
    height: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    opacity: 0.6,
  },
  audioBar1: {
    width: 3,
    height: 10,
    borderRadius: 1.5,
    backgroundColor: 'rgba(100,255,218,0.7)',
  },
  audioBar2: {
    width: 3,
    height: 14,
    borderRadius: 1.5,
    backgroundColor: 'rgba(100,255,218,0.5)',
  },
  audioBar3: {
    width: 3,
    height: 8,
    borderRadius: 1.5,
    backgroundColor: 'rgba(100,255,218,0.3)',
  },
})
