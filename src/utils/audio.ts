import { Audio } from 'expo-av'

let soundObject: Audio.Sound | null = null

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
    await soundObject.loadAsync(require('../../assets/rain-sound.mp3'))
    await soundObject.setIsLoopingAsync(true)
    await soundObject.playAsync()
  } catch (error) {
    console.error('Error playing audio:', error)
  }
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
