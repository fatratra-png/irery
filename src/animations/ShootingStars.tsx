import React, { useEffect, useRef, useState } from 'react'
import { Dimensions } from 'react-native'
import Svg, { Circle, Defs, RadialGradient, Stop, Rect, Line } from 'react-native-svg'

const { width: W, height: H } = Dimensions.get('window')

interface Star {
  x: number
  y: number
  r: number
  phase: number
  speed: number
  depth: number
  color: string
  glow: number
}

interface ShooterParticle {
  x: number
  y: number
  size: number
  alpha: number
}

interface Shooter {
  startX: number
  startY: number
  mx: number
  my: number
  progress: number
  speed: number
  delay: number
  particles: ShooterParticle[]
}

const STAR_LAYERS = [
  { count: 80, size: 0.5, speed: 0.3, color: '#fff', glow: 0 },
  { count: 50, size: 1, speed: 0.5, color: '#fff', glow: 0 },
  { count: 30, size: 1.5, speed: 0.7, color: 'rgba(255,255,255,0.85)', glow: 3 },
  { count: 15, size: 2, speed: 0.9, color: '#fff', glow: 5 },
  { count: 8, size: 2.5, speed: 1.2, color: 'rgba(255,255,255,0.95)', glow: 6 },
]

function createShooter(): Shooter {
  const numP = 3 + Math.floor(Math.random() * 3)
  const particles: ShooterParticle[] = []
  for (let i = 0; i < numP; i++) {
    particles.push({
      x: -(i + 1) * (12 + Math.random() * 8),
      y: (Math.random() - 0.5) * 8,
      size: 1 + Math.random() * 1.5,
      alpha: 0.5 - i * 0.12,
    })
  }
  return {
    startX: 0.05 * W + Math.random() * 0.65 * W,
    startY: 0.02 * H + Math.random() * 0.2 * H,
    mx: 150 + Math.random() * 250,
    my: 80 + Math.random() * 160,
    progress: -(Math.random() * 3),
    speed: 0.006 + Math.random() * 0.004,
    delay: Math.random() * 5,
    particles,
  }
}

const STARS: Star[] = STAR_LAYERS.flatMap((L, li) =>
  Array.from({ length: L.count }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    r: L.size,
    phase: Math.random() * Math.PI * 2,
    speed: L.speed * (0.7 + Math.random() * 0.6),
    depth: li,
    color: L.color,
    glow: L.glow,
  }))
)

const SHOOTERS: Shooter[] = Array.from({ length: 8 }, createShooter)

export default function ShootingStars() {
  const [tick, setTick] = useState(0)
  const shootersRef = useRef(SHOOTERS)

  useEffect(() => {
    let running = true
    const loop = () => {
      if (!running) return
      const shooters = shootersRef.current
      for (let i = 0; i < shooters.length; i++) {
        const s = shooters[i]
        s.progress += s.speed
        if (s.progress > 1.2) {
          Object.assign(s, createShooter())
          s.progress = -s.delay
        }
      }
      setTick((t) => t + 1)
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
    return () => { running = false }
  }, [])

  const time = Date.now() * 0.001

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <RadialGradient id="bgStar" cx="50%" cy="40%" r="70%">
          <Stop offset="0%" stopColor="#080808" />
          <Stop offset="50%" stopColor="#040404" />
          <Stop offset="100%" stopColor="#000000" />
        </RadialGradient>
        <RadialGradient id="nebA" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="rgba(255,255,255,0.025)" />
          <Stop offset="70%" stopColor="transparent" />
        </RadialGradient>
        <RadialGradient id="nebB" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="rgba(255,255,255,0.018)" />
          <Stop offset="70%" stopColor="transparent" />
        </RadialGradient>
        <RadialGradient id="nebC" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="rgba(255,255,255,0.012)" />
          <Stop offset="70%" stopColor="transparent" />
        </RadialGradient>
      </Defs>

      <Rect width={W} height={H} fill="url(#bgStar)" />

      {/* Milky way dust */}
      <Rect
        x={0} y={H * 0.15} width={W} height={H * 0.35}
        fill="rgba(255,255,255,0.008)"
        opacity={0.6}
        transform={`rotate(-8, ${W / 2}, ${H * 0.325})`}
      />

      {STARS.map((s, i) => {
        const cx = (s.x / 100) * W
        const cy = (s.y / 100) * H
        const twinkle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * s.speed + s.phase))
        const parallaxX = Math.sin(time * 0.02 * (s.depth + 1)) * s.depth * 1.5
        const parallaxY = Math.cos(time * 0.015 * (s.depth + 1)) * s.depth * 0.8
        return (
          <React.Fragment key={i}>
            {s.glow > 0 && (
              <Circle
                cx={cx + parallaxX}
                cy={cy + parallaxY}
                r={s.glow}
                fill={s.color}
                opacity={twinkle * 0.15}
              />
            )}
            <Circle
              cx={cx + parallaxX}
              cy={cy + parallaxY}
              r={s.r}
              fill={s.color}
              opacity={twinkle}
            />
          </React.Fragment>
        )
      })}

      {/* Nebula clouds */}
      <Circle cx={W * 0.05} cy={H * 0.05} r={80} fill="url(#nebA)" opacity={0.3 + 0.4 * Math.sin(time * 0.5)} />
      <Circle cx={W * 0.75} cy={H * 0.6} r={70} fill="url(#nebB)" opacity={0.3 + 0.3 * Math.sin(time * 0.4 + 2)} />
      <Circle cx={W * 0.4} cy={H * 0.3} r={60} fill="url(#nebC)" opacity={0.3 + 0.3 * Math.sin(time * 0.6 + 1)} />

      {/* Shooting stars */}
      {shootersRef.current.map((s, i) => {
        const p = Math.max(0, Math.min(1, s.progress))
        if (p <= 0 || p >= 1) return null
        const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
        const cx = s.startX + s.mx * ease
        const cy = s.startY + s.my * ease
        const alpha = p < 0.04 ? p / 0.04 : p > 0.9 ? (1 - p) / 0.1 : 1

        const angle = Math.atan2(s.my, s.mx)

        return (
          <React.Fragment key={`sh${i}`}>
            {/* Particles */}
            {s.particles.map((pt, j) => {
              const pDist = pt.x * ease * 0.5
              const pX = cx + pDist * Math.cos(angle) - pt.y * Math.sin(angle)
              const pY = cy + pDist * Math.sin(angle) + pt.y * Math.cos(angle)
              return (
                <Circle
                  key={`pt${j}`}
                  cx={pX}
                  cy={pY}
                  r={pt.size}
                  fill="rgba(255,255,255,0.4)"
                  opacity={pt.alpha * alpha}
                />
              )
            })}

            {/* Tail */}
            <Line
              x1={cx}
              y1={cy}
              x2={cx - 80 * Math.cos(angle)}
              y2={cy - 80 * Math.sin(angle)}
              stroke={`rgba(255,255,255,${alpha * 0.3})`}
              strokeWidth={1.5}
              strokeLinecap="round"
            />

            {/* Glow ring */}
            <Circle
              cx={cx}
              cy={cy}
              r={12}
              fill="transparent"
              stroke={`rgba(255,255,255,${alpha * 0.15})`}
              strokeWidth={1}
              opacity={alpha * 0.6}
            />

            {/* Head */}
            <Circle
              cx={cx}
              cy={cy}
              r={2.5}
              fill="#fff"
              opacity={alpha * 0.95}
            />
          </React.Fragment>
        )
      })}
    </Svg>
  )
}
