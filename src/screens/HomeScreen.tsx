import React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'

interface HomeScreenProps {
  onBegin: () => void
}

export default function HomeScreen({ onBegin }: HomeScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>inUrZone</Text>
        <Text style={styles.subtitle}>Peaceful Rain Experience</Text>
        <Text style={styles.description}>Immerse yourself in calming rainfall, gentle sounds, and timed shower sessions</Text>
      </View>

      <Pressable 
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed
        ]}
        onPress={onBegin}
      >
        <Text style={styles.buttonText}>Begin</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  content: {
    alignItems: 'center',
    marginTop: 80,
  },
  title: {
    fontSize: 48,
    fontFamily: 'Outfit_300Light',
    color: '#ffffff',
    marginBottom: 12,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 2,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 13,
    fontFamily: 'Outfit_300Light',
    color: 'rgba(255, 255, 255, 0.25)',
    maxWidth: 280,
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 80,
  },
  buttonPressed: {
    transform: [{ scale: 0.95 }],
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
    color: '#ffffff',
    letterSpacing: 1.5,
  },
})
