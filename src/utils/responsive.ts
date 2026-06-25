import { Dimensions, PixelRatio } from 'react-native'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const BASE_WIDTH = 375

const scale = (size: number): number => {
  const ratio = SCREEN_WIDTH / BASE_WIDTH
  const scaled = size * Math.min(ratio, 1.6)
  return Math.round(PixelRatio.roundToNearestPixel(scaled))
}

export const rs = scale
