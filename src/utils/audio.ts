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
  require('../../assets/sound-keyboard.mp3'),
  require('../../assets/sound-jazz.mp3'),
  require('../../assets/sound-electro.mp3'),
  require('../../assets/sound-pop.mp3'),
  require('../../assets/sound-glasses.mp3'),
  require('../../assets/sound-asmr.mp3'),
  require('../../assets/sound-birds.mp3'),
  require('../../assets/sound-cyclone.mp3'),
] as const

const LABELS = [
  'Ocean', 'Forest', 'Lo-fi', 'Waves', 'Thunder',
  'Campfire', 'Stream', 'Keyboard', 'Jazz', 'Electro',
  'Pop', 'Glasses', 'ASMR', 'Birds', 'Cyclone',
] as const

export function getCurrentSoundLabel(): string {
  return LABELS[currentIndex]
}

export function getSoundsCount(): number {
  return SOUNDS.length
}

export async function playRainAudio(index?: number) {
  try {
    if (index !== undefined) {
      currentIndex = index
    }

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

export async function previousSound() {
  currentIndex = (currentIndex - 1 + SOUNDS.length) % SOUNDS.length
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
