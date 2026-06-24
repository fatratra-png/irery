import React, { useEffect, useRef, useState } from 'react'
import Svg, { Circle, Rect, Line, Defs, LinearGradient, Stop } from 'react-native-svg'
import { Dimensions } from 'react-native'

const { width: W, height: H } = Dimensions.get('window')

interface Drop {
  x: number
  y: number
  len: number
  speed: number
  drift: number
  opacity: number
  width: number
}

interface Splash {
  x: number
  life: number
}

const LAYERS = [
  { count: 60, size: 0.5, speed: 1.2, drift: 8, opacity: 0.2, color: 'rgba(180,150,255,0.2)' },
  { count: 45, size: 0.9, speed: 2.0, drift: 18, opacity: 0.35, color: 'rgba(100,255,218,0.3)' },
  { count: 25, size: 1.5, speed: 3.2, drift: 35, opacity: 0.5, color: 'rgba(100,255,218,0.4)' },
]

function createDrop(layer: typeof LAYERS[0]): Drop {
  return {
    x: Math.random() * W,
    y: -Math.random() * H * 0.5,
    len: layer.size * (6 + Math.random() * 10),
    speed: layer.speed * (0.7 + Math.random() * 0.6),
    drift: (Math.random() - 0.5) * layer.drift * 2,
    opacity: layer.opacity * (0.5 + Math.random() * 0.5),
    width: Math.max(0.5, layer.size * 0.6),
  }
}

const ALL_DROPS: Drop[] = LAYERS.flatMap((L) =>
  Array.from({ length: L.count }, () => createDrop(L))
)

function createSplash(): Splash {
  return { x: Math.random() * W, life: -Math.random() * 3 }
}

const SPLASHES: Splash[] = Array.from({ length: 20 }, createSplash)

export default function RainDrops() {
  const dropsRef = useRef<Drop[]>(ALL_DROPS.map((d) => ({ ...d })))
  const splashesRef = useRef<Splash[]>(SPLASHES.map((s) => ({ ...s })))
  const [tick, setTick] = useState(0)
  const windRef = useRef(0)

  useEffect(() => {
    let running = true
    let windTimer = 0
    const loop = () => {
      if (!running) return
      windTimer++
      if (windTimer > 120) {
        windRef.current = (Math.random() - 0.5) * 2
        windTimer = 0
      }
      const drops = dropsRef.current
      for (let i = 0; i < drops.length; i++) {
        const d = drops[i]
        d.y += d.speed * 3
        d.x += d.drift * 0.05 + windRef.current * 0.3
        if (d.y > H + 20) {
          d.y = -20
          d.x = Math.random() * W
          d.drift = (Math.random() - 0.5) * (LAYERS[i < 60 ? 0 : i < 105 ? 1 : 2].drift * 2)
        }
      }
      const splashes = splashesRef.current
      for (let i = 0; i < splashes.length; i++) {
        splashes[i].life += 0.03
        if (splashes[i].life > 1) {
          splashes[i].x = Math.random() * W
          splashes[i].life = 0
        }
      }
      setTick((t) => t + 1)
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
    return () => { running = false }
  }, [])

  const time = Date.now() * 0.001
  const flash = Math.sin(time * 0.08) > 0.98 ? Math.sin(time * 0.08) - 0.97 : 0

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <LinearGradient id="rbg3d" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#08041a" />
          <Stop offset="40%" stopColor="#0f0a2a" />
          <Stop offset="100%" stopColor="#0a0e27" />
        </LinearGradient>
      </Defs>

      <Rect width={W} height={H} fill="url(#rbg3d)" />

      {flash > 0 && (
        <Rect width={W} height={H} fill="rgba(200,220,255,0.6)" opacity={flash * 5} />
      )}

      {dropsRef.current.map((d, i) => (
        <Line
          key={i}
          x1={d.x}
          y1={d.y}
          x2={d.x + d.drift * 0.08 + windRef.current * 0.2}
          y2={d.y + d.len}
          stroke={`rgba(100,255,218,${d.opacity})`}
          strokeWidth={d.width}
          strokeLinecap="round"
        />
      ))}

      {splashesRef.current.map((s, i) => {
        const life = Math.max(0, Math.min(1, s.life))
        const alpha = 1 - life
        const spread = life * 15
        return (
          <React.Fragment key={`sp${i}`}>
            <Circle cx={s.x - spread} cy={H - 2} r={1} fill="rgba(100,255,218,0.3)" opacity={alpha} />
            <Circle cx={s.x + spread * 0.5} cy={H - 4} r={0.8} fill="rgba(100,255,218,0.2)" opacity={alpha} />
            <Circle cx={s.x - spread * 0.3} cy={H - 1} r={0.6} fill="rgba(100,255,218,0.15)" opacity={alpha} />
          </React.Fragment>
        )
      })}
    </Svg>
  )
}
