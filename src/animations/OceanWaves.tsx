import React, { useRef, useEffect } from 'react'
import { Animated, Dimensions, View, StyleSheet } from 'react-native'
import Svg, { Path, Defs, LinearGradient, Stop, Rect } from 'react-native-svg'

const { width: W, height: H } = Dimensions.get('window')

const LAYERS = [
  { bottom: 0.82, height: 28, amp: 10, freq: 2.2, speed: 22, id: 'w0', color: 'rgba(60,220,200,0.12)' },
  { bottom: 0.65, height: 36, amp: 16, freq: 2.8, speed: 17, id: 'w1', color: 'rgba(80,240,210,0.18)' },
  { bottom: 0.45, height: 44, amp: 22, freq: 3.3, speed: 13, id: 'w2', color: 'rgba(100,255,218,0.25)' },
  { bottom: 0.22, height: 52, amp: 30, freq: 3.8, speed: 9, id: 'w3', color: 'rgba(60,230,200,0.32)' },
  { bottom: 0, height: 60, amp: 40, freq: 4.2, speed: 6.5, id: 'w4', color: 'rgba(100,255,218,0.4)' },
]

function genPath(amp: number, freq: number): string {
  const pts: string[] = []
  const steps = 60
  for (let j = 0; j <= steps; j++) {
    const x = (j / steps) * 1440
    const t = (j / steps) * Math.PI * 2 * freq
    const y = 180 + Math.sin(t) * amp + Math.sin(t * 2.3 + 1) * amp * 0.3 + Math.sin(t * 0.7 + 0.5) * amp * 0.15
    pts.push(`${j === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
  }
  pts.push('L1440,220 L0,220 Z')
  return pts.join(' ')
}

interface Sparkle {
  x: number
  y: number
  size: number
  delay: number
  dur: number
}

const SPARKLES: Sparkle[] = Array.from({ length: 40 }, (_, i) => ({
  x: Math.random() * 100,
  y: 72 + Math.random() * 20,
  size: 1 + Math.random() * 2,
  delay: Math.random() * 6,
  dur: 3 + Math.random() * 4,
}))

export default function OceanWaves() {
  const anims = useRef(LAYERS.map(() => new Animated.Value(0))).current
  const sparkleAnims = useRef(SPARKLES.map(() => new Animated.Value(0))).current

  useEffect(() => {
    const loops = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: LAYERS[i].speed * 500, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: LAYERS[i].speed * 500, useNativeDriver: true }),
        ])
      )
    )
    loops.forEach((l) => l.start())

    const sLoops = sparkleAnims.map((anim, i) => {
      const s = SPARKLES[i]
      return Animated.loop(
        Animated.sequence([
          Animated.delay(s.delay * 1000),
          Animated.timing(anim, { toValue: 1, duration: s.dur * 400, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: s.dur * 600, useNativeDriver: true }),
        ])
      )
    })
    sLoops.forEach((l) => l.start())

    return () => {
      loops.forEach((l) => l.stop())
      sLoops.forEach((l) => l.stop())
    }
  }, [anims, sparkleAnims])

  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="obg3d" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#050d1a" />
            <Stop offset="35%" stopColor="#0a1628" />
            <Stop offset="65%" stopColor="#112240" />
            <Stop offset="100%" stopColor="#0a0e27" />
          </LinearGradient>
        </Defs>
        <Rect width={W} height={H} fill="url(#obg3d)" />
      </Svg>

      {LAYERS.map((L, i) => {
        const shift = 10 + i * 8
        const tx = anims[i].interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, -(W * shift / 100), 0],
        })
        const h = L.height + L.amp * 2
        const svgH = (h / 900) * H
        return (
          <Animated.View
            key={L.id}
            style={{
              position: 'absolute',
              bottom: L.bottom * H,
              left: -(W * 0.1),
              width: W * 1.2,
              height: svgH,
              transform: [{ translateX: tx }],
            }}
          >
            <Svg width="100%" height="100%" viewBox="0 0 1440 220" preserveAspectRatio="none">
              <Path d={genPath(L.amp, L.freq)} fill={L.color} />
            </Svg>
          </Animated.View>
        )
      })}

      {SPARKLES.map((s, i) => {
        const opacity = sparkleAnims[i].interpolate({
          inputRange: [0, 0.3, 0.6, 1],
          outputRange: [0, 1, 0.6, 0],
        })
        const scale = sparkleAnims[i].interpolate({
          inputRange: [0, 0.3, 1],
          outputRange: [0.5, 1.2, 0.5],
        })
        return (
          <Animated.View
            key={`sp${i}`}
            style={{
              position: 'absolute',
              left: `${s.x}%`,
              bottom: `${s.y}%`,
              width: s.size,
              height: s.size,
              borderRadius: s.size / 2,
              backgroundColor: 'rgba(255,255,255,0.7)',
              opacity,
              transform: [{ scale }],
              shadowColor: 'rgba(100,255,218,0.4)',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 1,
              shadowRadius: s.size * 3,
              elevation: 5,
            }}
          />
        )
      })}
    </View>
  )
}
