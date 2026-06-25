import React, { useEffect, useState } from 'react'
import { View, StyleSheet, Dimensions, Animated } from 'react-native'

interface Drop {
  id: string
  x: number
  y: Animated.Value
  opacity: Animated.Value
  tilt: number
  speed: number
  length: number
  width: number
  layerOpacity: number
}

export default function RainDrops() {
  const { width, height } = Dimensions.get('window')
  const [drops, setDrops] = useState<Drop[]>([])

  useEffect(() => {
    const newDrops: Drop[] = []
    
    // 3 depth layers
    const layers = [
      { count: 40, speed: 2.5, opacity: 0.3, width: 0.5 },
      { count: 80, speed: 1.8, opacity: 0.5, width: 0.8 },
      { count: 60, speed: 1.2, opacity: 0.7, width: 1.2 },
    ]

    layers.forEach((layer) => {
      for (let i = 0; i < layer.count; i++) {
        const drop: Drop = {
          id: `${layer.speed}-${i}`,
          x: Math.random() * width,
          y: new Animated.Value(-50),
          opacity: new Animated.Value(0),
          tilt: -15 + Math.random() * 30,
          speed: layer.speed,
          length: 8 + Math.random() * 16,
          width: layer.width,
          layerOpacity: layer.opacity,
        }
        newDrops.push(drop)
        animateDrop(drop, width, height)
      }
    })

    setDrops(newDrops)
  }, [width, height])

  const animateDrop = (drop: Drop, screenWidth: number, screenHeight: number) => {
    const delay = Math.random() * drop.speed * 1000

    setTimeout(() => {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(drop.opacity, {
            toValue: drop.layerOpacity * 0.8,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(drop.y, {
            toValue: screenHeight + 50,
            duration: drop.speed * 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(drop.opacity, {
          toValue: 0,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start(() => {
        drop.y.setValue(-50)
        drop.opacity.setValue(0)
        drop.x = Math.random() * screenWidth
        animateDrop(drop, screenWidth, screenHeight)
      })
    }, delay)
  }

  return (
    <View style={styles.container}>
      {/* Gradient background */}
      <View style={styles.background} />

      {/* Rain drops */}
      <View style={styles.rainContainer} pointerEvents="none">
        {drops.map((drop) => (
          <Animated.View
            key={drop.id}
            style={[
              styles.drop,
              {
                left: drop.x,
                transform: [{ translateY: drop.y }],
                opacity: drop.opacity,
              },
            ]}
          >
            <View
              style={[
                styles.dropLine,
                {
                  width: drop.width,
                  height: drop.length,
                  marginLeft: drop.tilt * 0.05,
                  opacity: drop.layerOpacity,
                },
              ]}
            />
          </Animated.View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#00000000',
    overflow: 'hidden',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#00000000',
    zIndex: 0,
  },
  rainContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  drop: {
    position: 'absolute',
    width: 2,
  },
  dropLine: {
    backgroundColor: 'rgba(200, 220, 255, 0.6)',
    borderRadius: 1,
  },
})
