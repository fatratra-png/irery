import React, { useEffect, useRef, useState } from 'react'
import Svg, { Line, Rect, Defs, LinearGradient, Stop } from 'react-native-svg'
import { Dimensions } from 'react-native'

const { width: W, height: H } = Dimensions.get('window')
const NUM_DROPS = 80

interface Drop {
  x: number
  y: number
  speed: number
  length: number
  opacity: number
  drift: number
}

function createDrop(): Drop {
  return {
    x: Math.random() * W,
    y: -Math.random() * H * 0.5,
    speed: 0.4 + Math.random() * 0.6,
    length: 8 + Math.random() * 12,
    opacity: 0.15 + Math.random() * 0.35,
    drift: -10 + Math.random() * 20,
  }
}

export default function RainDrops() {
  const dropsRef = useRef<Drop[]>(
    Array.from({ length: NUM_DROPS }, createDrop)
  )
  const [drops, setDrops] = useState<Drop[]>(dropsRef.current)

  useEffect(() => {
    let running = true
    const loop = () => {
      if (!running) return
      const arr = dropsRef.current
      for (let i = 0; i < arr.length; i++) {
        arr[i].y += arr[i].speed * 4
        if (arr[i].y > H + 20) {
          arr[i].y = -20
          arr[i].x = Math.random() * W
          arr[i].drift = -10 + Math.random() * 20
        }
      }
      setDrops([...arr])
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
    return () => { running = false }
  }, [])

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <LinearGradient id="rbg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#0d2a3a" />
          <Stop offset="100%" stopColor="#060e20" />
        </LinearGradient>
      </Defs>
      <Rect width={W} height={H} fill="url(#rbg)" />
      {drops.map((d, i) => (
        <Line
          key={i}
          x1={d.x} y1={d.y}
          x2={d.x + d.drift * 0.1} y2={d.y + d.length}
          stroke={`rgba(100,255,218,${d.opacity})`}
          strokeWidth="0.8"
          strokeLinecap="round"
        />
      ))}
    </Svg>
  )
}
