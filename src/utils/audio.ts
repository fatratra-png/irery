import { useRef, useCallback, useEffect } from 'react'
import type { AnimationType } from '../types'

export const VIDEO_IDS: Record<AnimationType, string> = {
  ocean: 'bnC-7CzXKjQ',
  rain: 'mPZkdNFkNgs',
  stars: 'X4YJ4NnVW4I',
}

export const ANIM_LABELS: Record<AnimationType, string> = {
  ocean: 'Ocean Waves',
  rain: 'Gentle Rain',
  stars: 'Shooting Stars',
}

export function getYouTubeUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&modestbranding=1&rel=0`
}
