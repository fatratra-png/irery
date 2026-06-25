import { Audio } from 'expo-av'

let soundObject: Audio.Sound | null = null
let currentIndex = 0

const SOUNDS = [
  require('../../assets/sound-ocean.mp3'),
  require('../../assets/sound-forest.mp3'),
  require('../../assets/sound-lofi.mp3'),
  require('../../assets/sound-waves.mp3'),
  require('../../assets/sound-thunder.mp3'),
  require('../../assets/sound-campfire.mp3'),
  require('../../assets/sound-stream.mp3'),
] as const

const LABELS = ['Ocean', 'Forest', 'Lo-fi', 'Waves', 'Thunder', 'Campfire', 'Stream'] as const

export function getCurrentSoundLabel(): string {
  return LABELS[currentIndex]
}

export async function playRainAudio() {
  try {
    if (soundObject) {
      await soundObject.unloadAsync()
    }

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    })

    soundObject = new Audio.Sound()
    await soundObject.loadAsync(SOUNDS[currentIndex])
    await soundObject.setIsLoopingAsync(true)
    await soundObject.playAsync()
  } catch (error) {
    console.error('Error playing audio:', error)
  }
}

export async function nextSound() {
  currentIndex = (currentIndex + 1) % SOUNDS.length
  await playRainAudio()
}

export async function stopRainAudio() {
  try {
    if (soundObject) {
      await soundObject.stopAsync()
      await soundObject.unloadAsync()
      soundObject = null
    }
  } catch (error) {
    console.error('Error stopping audio:', error)
  }
}

export async function setVolume(volume: number) {
  try {
    if (soundObject) {
      await soundObject.setVolumeAsync(Math.max(0, Math.min(1, volume)))
    }
  } catch (error) {
    console.error('Error setting volume:', error)
  }
}
