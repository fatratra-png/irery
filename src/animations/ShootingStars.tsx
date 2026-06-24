import React, { useEffect, useState } from 'react'
import Svg, { Circle, Defs, RadialGradient, Stop, Rect } from 'react-native-svg'
import { Dimensions } from 'react-native'

const { width: W, height: H } = Dimensions.get('window')

interface Star {
  x: number
  y: number
  r: number
  phase: number
  speed: number
  layer: 'tiny' | 'medium' | 'bright'
}

interface Shooter {
  x: number
  y: number
  delay: number
}

const STARS: Star[] = [
  ...Array.from({ length: 60 }, (_, i) => ({
    x: (i * 1.7) % 100,
    y: (i * 2.8) % 100,
    r: 1,
    phase: Math.random() * Math.PI * 2,
    speed: 0.5 + (i % 7) * 0.15,
    layer: 'tiny' as const,
  })),
  ...Array.from({ length: 30 }, (_, i) => ({
    x: (i * 3.5 + 1) % 100,
    y: (i * 4.2 + 2) % 100,
    r: 2,
    phase: Math.random() * Math.PI * 2,
    speed: 0.4 + (i % 6) * 0.12,
    layer: 'medium' as const,
  })),
  ...Array.from({ length: 15 }, (_, i) => ({
    x: (i * 7.1 + 3) % 100,
    y: (i * 8.3 + 4) % 100,
    r: 3,
    phase: Math.random() * Math.PI * 2,
    speed: 0.3 + i * 0.04,
    layer: 'bright' as const,
  })),
]

const SHOOTERS: Shooter[] = Array.from({ length: 6 }, (_, i) => ({
  x: 5 + i * 15,
  y: 2 + i * 7,
  delay: i * 0.85,
}))

export default function ShootingStars() {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let running = true
    let last = performance.now()
    const loop = (now: number) => {
      if (!running) return
      const dt = now - last
      if (dt > 30) {
        setTick((t) => t + 1)
        last = now
      }
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
    return () => { running = false }
  }, [])

  const time = Date.now() * 0.001

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <RadialGradient id="nebula1" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="rgba(100,255,218,0.08)" />
          <Stop offset="70%" stopColor="transparent" />
        </RadialGradient>
        <RadialGradient id="nebula2" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="rgba(100,255,218,0.06)" />
          <Stop offset="70%" stopColor="transparent" />
        </RadialGradient>
      </Defs>
      <Rect width={W} height={H} fill="#060816" />

      {STARS.map((s, i) => {
        const cx = (s.x / 100) * W
        const cy = (s.y / 100) * H
        const fill = s.layer === 'medium'
          ? 'rgba(100,255,218,0.9)'
          : '#fff'
        const baseOpacity = s.layer === 'tiny' ? 0.15 : s.layer === 'medium' ? 0.3 : 0.4
        const opacity = baseOpacity + (1 - baseOpacity) * (0.5 + 0.5 * Math.sin(time * s.speed + s.phase))
        return (
          <Circle
            key={i}
            cx={cx}
            cy={cy}
            r={s.r}
            fill={fill}
            opacity={opacity}
          />
        )
      })}

      {SHOOTERS.map((s, i) => {
        const t = ((time + s.delay) % 3.4) / 3.4
        const p = Math.min(1, t * 7)
        if (p <= 0 || p >= 1) return null
        const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
        const dx = 180 * ease
        const dy = 120 * ease
        const cx = (s.x / 100) * W + dx
        const cy = (s.y / 100) * H + dy
        const alpha = p < 0.04 ? p / 0.04 : p > 0.9 ? (1 - p) / 0.1 : 1
        const angle = -145 * (Math.PI / 180)

        return (
          <React.Fragment key={`sh${i}`}>
            <Circle cx={cx} cy={cy} r={2} fill={`rgba(255,255,255,${alpha * 0.9})`} />
            <Circle
              cx={cx} cy={cy} r={8}
              fill="transparent"
              stroke={`rgba(100,255,218,${alpha * 0.3})`}
              strokeWidth={0.5}
              opacity={alpha * 0.5}
            />
          </React.Fragment>
        )
      })}

      <Circle
        cx={W * 0.92} cy={H * 0.04}
        r={64}
        fill="url(#nebula1)"
        opacity={0.4 + 0.4 * Math.sin(time * 0.8)}
      />
      <Circle
        cx={W * 0.12} cy={H * 0.84}
        r={48}
        fill="url(#nebula2)"
        opacity={0.3 + 0.3 * Math.sin(time * 0.6 + 2)}
      />
    </Svg>
  )
}
