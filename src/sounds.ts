import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

/** A realistic GPU scene (see src/scenes/shaders.ts) and its settings. */
export interface SceneSpec {
  shader: 'RAIN_GLASS' | 'SEA' | 'POND' | 'STREAM' | 'FIRE' | 'FOREST' | 'NIGHT' | 'CLOUDS' | 'MIST';
  params: Record<string, number>;
  /** Lightning flashes on the sound's real thunder claps. */
  storm?: boolean;
}

export type Category = 'Water' | 'Nature' | 'Focus' | 'Meditate';

export interface Mood {
  /** Top → bottom background gradient, muted on purpose. */
  colors: [string, string, string];
  /** Soft highlight used by the orb, particles and active controls. */
  accent: string;
  scene: SceneSpec;
  /** Seconds for one full breath of the orb (slower = calmer). */
  breath: number;
}

export interface Sound {
  id: string;
  title: string;
  hint: string;
  category: Category;
  icon: ComponentProps<typeof Ionicons>['name'];
  source: number;
  mood: Mood;
  /** Generated locally by scripts/generate-sounds.py (vs. recorded). */
  synthesized?: boolean;
}

export const SOUNDS: Sound[] = [
  // ---------------------------------------------------------------- water
  {
    id: 'rain', title: 'Rain', hint: 'Steady rainfall', category: 'Water', icon: 'rainy-outline',
    source: require('../assets/sounds/rain.mp3'),
    mood: { colors: ['#0f1a2b', '#1a2c42', '#27415b'], accent: '#9cc3e6', scene: { shader: 'RAIN_GLASS', params: { drops: 1 } }, breath: 9 },
  },
  {
    id: 'thunder', title: 'Thunder', hint: 'Distant storm', category: 'Water', icon: 'thunderstorm-outline',
    source: require('../assets/sounds/thunder.mp3'),
    mood: { colors: ['#0c0e18', '#1a1d30', '#2e3350'], accent: '#c7cdf5', scene: { shader: 'RAIN_GLASS', params: { drops: 0.9 }, storm: true }, breath: 10 },
  },
  {
    id: 'water', title: 'Drops', hint: 'Water drops on a pond', category: 'Water', icon: 'water-outline',
    source: require('../assets/sounds/water.mp3'),
    mood: { colors: ['#0a1e25', '#12363c', '#1d5356'], accent: '#8fd3c8', scene: { shader: 'POND', params: { ambient: 1 } }, breath: 8 },
  },
  {
    id: 'stream', title: 'Stream', hint: 'A brook over stones', category: 'Water', icon: 'git-merge-outline',
    source: require('../assets/sounds/stream.mp3'),
    mood: { colors: ['#0d211e', '#173c36', '#275a4b'], accent: '#a7e0c5', scene: { shader: 'STREAM', params: {} }, breath: 8 },
  },
  {
    id: 'ocean', title: 'Ocean', hint: 'Open sea', category: 'Water', icon: 'boat-outline',
    source: require('../assets/sounds/ocean.mp3'),
    mood: { colors: ['#06182a', '#0e324c', '#19536f'], accent: '#89c9e8', scene: { shader: 'SEA', params: { swell: 0.6 } }, breath: 11 },
  },
  {
    id: 'waves', title: 'Shore', hint: 'Waves on the beach', category: 'Water', icon: 'water',
    source: require('../assets/sounds/waves.mp3'),
    mood: { colors: ['#0a2031', '#133c54', '#276478'], accent: '#9fe0e8', scene: { shader: 'SEA', params: { swell: 1 } }, breath: 8 },
  },
  // ---------------------------------------------------------------- nature
  {
    id: 'forest', title: 'Forest', hint: 'Birds and leaves', category: 'Nature', icon: 'leaf-outline',
    source: require('../assets/sounds/forest.mp3'),
    mood: { colors: ['#0c1811', '#183021', '#2a4a32'], accent: '#b5d99c', scene: { shader: 'FOREST', params: {} }, breath: 9 },
  },
  {
    id: 'crickets', title: 'Night', hint: 'Crickets under the stars', category: 'Nature', icon: 'moon-outline', synthesized: true,
    source: require('../assets/sounds/crickets.mp3'),
    mood: { colors: ['#05081a', '#0f1730', '#1b2747'], accent: '#e8e3b5', scene: { shader: 'NIGHT', params: { milky: 1, aurora: 0 } }, breath: 12 },
  },
  {
    id: 'campfire', title: 'Campfire', hint: 'Crackling wood', category: 'Nature', icon: 'flame-outline',
    source: require('../assets/sounds/campfire.mp3'),
    mood: { colors: ['#170c08', '#33170e', '#5c2a15'], accent: '#ffb37a', scene: { shader: 'FIRE', params: {} }, breath: 7 },
  },
  {
    id: 'wind', title: 'Wind', hint: 'Breeze through the hills', category: 'Nature', icon: 'cloudy-outline',
    source: require('../assets/sounds/wind.mp3'),
    mood: { colors: ['#171c23', '#29313b', '#404b57'], accent: '#d5dde6', scene: { shader: 'CLOUDS', params: { wind: 1.3 } }, breath: 10 },
  },
  // ---------------------------------------------------------------- focus
  {
    id: 'lofi', title: 'Lo-fi', hint: 'Mellow beats', category: 'Focus', icon: 'musical-notes-outline',
    source: require('../assets/sounds/lofi.mp3'),
    mood: { colors: ['#1a1223', '#2e2143', '#4a3462'], accent: '#e2b8f0', scene: { shader: 'RAIN_GLASS', params: { drops: 0.25 } }, breath: 6 },
  },
  {
    id: 'keyboard', title: 'Typing', hint: 'Soft keystrokes', category: 'Focus', icon: 'keypad-outline',
    source: require('../assets/sounds/keyboard.mp3'),
    mood: { colors: ['#14141b', '#232331', '#36364b'], accent: '#c9c9ff', scene: { shader: 'RAIN_GLASS', params: { drops: 0 } }, breath: 7 },
  },
  {
    id: 'theta-focus', title: 'Theta', hint: 'Binaural focus · headphones', category: 'Focus', icon: 'headset-outline', synthesized: true,
    source: require('../assets/sounds/theta-focus.mp3'),
    mood: { colors: ['#0d1324', '#1c2747', '#334471'], accent: '#b8c6ff', scene: { shader: 'POND', params: { ambient: 0.35 } }, breath: 10 },
  },
  {
    id: 'white-noise', title: 'White noise', hint: 'Masks everything', category: 'Focus', icon: 'radio-outline',
    source: require('../assets/sounds/white-noise.mp3'),
    mood: { colors: ['#15171a', '#26292e', '#3a3f45'], accent: '#e6e9ed', scene: { shader: 'MIST', params: {} }, breath: 9 },
  },
  {
    id: 'pink-noise', title: 'Pink noise', hint: 'Softer, balanced', category: 'Focus', icon: 'radio-outline', synthesized: true,
    source: require('../assets/sounds/pink-noise.mp3'),
    mood: { colors: ['#1c1216', '#35212b', '#523643'], accent: '#f2c2d4', scene: { shader: 'NIGHT', params: { milky: 0.2, aurora: 0.8 } }, breath: 10 },
  },
  {
    id: 'brown-noise', title: 'Brown noise', hint: 'Deep and warm', category: 'Focus', icon: 'radio-outline', synthesized: true,
    source: require('../assets/sounds/brown-noise.mp3'),
    mood: { colors: ['#17120d', '#2e2319', '#463527'], accent: '#e3c9a8', scene: { shader: 'MIST', params: {} }, breath: 12 },
  },
  // ---------------------------------------------------------------- meditate
  {
    id: 'singing-bowl', title: 'Singing bowl', hint: 'Slow resonant strikes', category: 'Meditate', icon: 'radio-button-on-outline', synthesized: true,
    source: require('../assets/sounds/singing-bowl.mp3'),
    mood: { colors: ['#1c150b', '#362713', '#56401f'], accent: '#f5d28c', scene: { shader: 'POND', params: { ambient: 0.12 } }, breath: 12 },
  },
  {
    id: 'wind-chimes', title: 'Wind chimes', hint: 'Bells in a light breeze', category: 'Meditate', icon: 'notifications-outline', synthesized: true,
    source: require('../assets/sounds/wind-chimes.mp3'),
    mood: { colors: ['#0f1a21', '#1d323b', '#334f58'], accent: '#cfe9ef', scene: { shader: 'CLOUDS', params: { wind: 0.3 } }, breath: 9 },
  },
  {
    id: 'deep-space', title: 'Deep space', hint: 'Slow evolving drone', category: 'Meditate', icon: 'planet-outline', synthesized: true,
    source: require('../assets/sounds/deep-space.mp3'),
    mood: { colors: ['#05050c', '#0c0d22', '#1b1a42'], accent: '#c3b8ff', scene: { shader: 'NIGHT', params: { milky: 0.6, aurora: 1 } }, breath: 14 },
  },
];

export const CATEGORIES: Category[] = ['Water', 'Nature', 'Focus', 'Meditate'];

export const soundById = (id: string | null | undefined) => SOUNDS.find((s) => s.id === id) ?? SOUNDS[0];
