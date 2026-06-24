import React, { useEffect, useRef } from 'react'
import { Animated, Easing, View, StyleSheet } from 'react-native'
import Svg, {
  Circle,
  Line,
  Defs,
  RadialGradient,
  Stop,
} from 'react-native-svg'

export default function Logo({ size = 160 }: { size?: number }) {
  const floatAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [floatAnim])

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  })

  const bubbles = [
    { cx: 120, cy: 120, r: 55, id: 'lb1', delay: 0 },
    { cx: 82, cy: 82, r: 32, id: 'lb2', delay: 100 },
    { cx: 162, cy: 88, r: 28, id: 'lb3', delay: 150 },
    { cx: 95, cy: 156, r: 22, id: 'lb2', delay: 250 },
    { cx: 148, cy: 150, r: 38, id: 'lb1', delay: 50 },
    { cx: 55, cy: 130, r: 14, id: 'lb3', delay: 300 },
    { cx: 175, cy: 145, r: 12, id: 'lb2', delay: 200 },
  ]

  const lines = [
    { x1: 120, y1: 120, x2: 82, y2: 82 },
    { x1: 120, y1: 120, x2: 162, y2: 88 },
    { x1: 120, y1: 120, x2: 148, y2: 150 },
    { x1: 82, y1: 82, x2: 55, y2: 130 },
    { x1: 162, y1: 88, x2: 175, y2: 145 },
    { x1: 148, y1: 150, x2: 95, y2: 156 },
  ]

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        <Svg width={size} height={size} viewBox="0 0 240 240">
          <Defs>
            <RadialGradient id="lb1" cx="40%" cy="35%">
              <Stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
              <Stop offset="100%" stopColor="rgba(100,255,218,0.1)" />
            </RadialGradient>
            <RadialGradient id="lb2" cx="40%" cy="35%">
              <Stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
              <Stop offset="100%" stopColor="rgba(179,136,255,0.1)" />
            </RadialGradient>
            <RadialGradient id="lb3" cx="40%" cy="35%">
              <Stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
              <Stop offset="100%" stopColor="rgba(100,255,218,0.08)" />
            </RadialGradient>
          </Defs>
          {lines.map((l, i) => (
            <Line
              key={`l${i}`}
              x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          ))}
          {bubbles.map((b, i) => (
            <Circle
              key={`b${i}`}
              cx={b.cx} cy={b.cy} r={b.r}
              fill={`url(${b.id})`}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="0.5"
              opacity={0.9}
            />
          ))}
        </Svg>
      </Animated.View>
      <View style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: size * 1.2,
        height: size * 1.2,
        marginTop: -(size * 0.6),
        marginLeft: -(size * 0.6),
        borderRadius: (size * 1.2) / 2,
        backgroundColor: 'rgba(100,255,218,0.04)',
      }} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
})
