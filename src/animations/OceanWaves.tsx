import React, { useRef, useEffect } from 'react'
import { Animated, Dimensions } from 'react-native'
import Svg, { Path, Defs, LinearGradient, Stop, Rect } from 'react-native-svg'

const { width: W, height: H } = Dimensions.get('window')

interface WaveConfig {
  id: string
  gradientStops: { offset: string; color: string }[]
  height: number
  duration: number
  reverse?: boolean
  alt?: boolean
  d: string
}

const WAVES: WaveConfig[] = [
  {
    id: 'w1',
    gradientStops: [
      { offset: '0%', color: 'rgba(100,255,218,0)' },
      { offset: '10%', color: 'rgba(100,255,218,0.35)' },
      { offset: '30%', color: 'rgba(100,255,218,0.55)' },
      { offset: '50%', color: 'rgba(100,255,218,0.65)' },
      { offset: '70%', color: 'rgba(100,255,218,0.55)' },
      { offset: '90%', color: 'rgba(100,255,218,0.35)' },
      { offset: '100%', color: 'rgba(100,255,218,0)' },
    ],
    height: 90,
    duration: 11000,
    d: 'M0,55 C120,35 240,75 360,55 C480,35 600,75 720,55 C840,35 960,75 1080,55 C1200,35 1320,75 1440,55 L1440,100 L0,100 Z',
  },
  {
    id: 'w2',
    gradientStops: [
      { offset: '0%', color: 'rgba(20,80,120,0)' },
      { offset: '20%', color: 'rgba(20,80,120,0.4)' },
      { offset: '50%', color: 'rgba(10,60,100,0.6)' },
      { offset: '80%', color: 'rgba(20,80,120,0.4)' },
      { offset: '100%', color: 'rgba(20,80,120,0)' },
    ],
    height: 70,
    duration: 15000,
    reverse: true,
    d: 'M0,65 C180,45 360,85 540,65 C720,45 900,85 1080,65 C1260,45 1440,85 1440,65 L1440,100 L0,100 Z',
  },
  {
    id: 'w3',
    gradientStops: [
      { offset: '0%', color: 'rgba(100,255,218,0)' },
      { offset: '50%', color: 'rgba(100,255,218,0.25)' },
      { offset: '100%', color: 'rgba(100,255,218,0)' },
    ],
    height: 50,
    duration: 13000,
    alt: true,
    d: 'M0,75 C240,55 480,95 720,75 C960,55 1200,95 1440,75 L1440,100 L0,100 Z',
  },
]

export default function OceanWaves() {
  const anims = useRef(WAVES.map(() => new Animated.Value(0))).current

  useEffect(() => {
    const loops = anims.map((anim, i) => {
      const wave = WAVES[i]
      if (wave.alt) {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: 1, duration: wave.duration / 3, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 2, duration: wave.duration / 3, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration: wave.duration / 3, useNativeDriver: true }),
          ])
        )
      }
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: wave.duration / 2, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: wave.duration / 2, useNativeDriver: true }),
        ])
      )
    })
    loops.forEach((l) => l.start())
    return () => loops.forEach((l) => l.stop())
  }, [anims])

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <LinearGradient id="obg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#0a1628" />
          <Stop offset="50%" stopColor="#0f1a3a" />
          <Stop offset="100%" stopColor="#0a0e27" />
        </LinearGradient>
        {WAVES.map((w) => (
          <LinearGradient key={w.id} id={w.id} x1="0%" y1="0%" x2="100%" y2="0%">
            {w.gradientStops.map((s, j) => (
              <Stop key={j} offset={s.offset} stopColor={s.color} />
            ))}
          </LinearGradient>
        ))}
      </Defs>
      <Rect width={W} height={H} fill="url(#obg)" />
      <Rect x={0} y={H - 120} width={W} height={120} fill="transparent" />
      {WAVES.map((w, i) => {
        const tx = anims[i].interpolate({
          inputRange: w.alt ? [0, 1, 2] : [0, 0.5, 1],
          outputRange: w.alt
            ? [-(W * 0.1), -(W * 0.3), -(W * 0.2)]
            : w.reverse
            ? [-(W * 0.5), -(W * 0.25), 0]
            : [0, -(W * 0.25), -(W * 0.5)],
        })
        return (
          <Animated.View
            key={w.id}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: W * 2,
              height: w.height,
              transform: [{ translateX: tx }],
            }}
          >
            <Svg width="100%" height="100%" viewBox="0 0 1440 100" preserveAspectRatio="none">
              <Path d={w.d} fill={`url(#${w.id})`} />
            </Svg>
          </Animated.View>
        )
      })}
      <Rect
        x={0} y={H - 1} width={W} height={1}
        fill="transparent"
        opacity={0}
      />
    </Svg>
  )
}
