import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { create } from 'zustand';
import { SOUNDS, soundById, type Sound } from '../sounds';

const CROSSFADE_MS = 1600;
const SLEEP_FADE_MS = 30_000;
const STORAGE_KEY = 'irery:prefs';

interface PlayerState {
  soundId: string;
  playing: boolean;
  volume: number;
  /** Epoch ms when the sleep timer ends (null = off). */
  sleepEndsAt: number | null;
  sleepMinutes: number | null;
}

export const usePlayer = create<PlayerState>(() => ({
  soundId: SOUNDS[0].id,
  playing: false,
  volume: 0.8,
  sleepEndsAt: null,
  sleepMinutes: null,
}));

let active: AudioPlayer | null = null;
let activeId: string | null = null;
let fadeTimer: ReturnType<typeof setInterval> | null = null;
let sleepTimer: ReturnType<typeof setInterval> | null = null;
let audioModeSet = false;
/** 0–1 multiplier applied on top of the user volume (sleep fade-out). */
let sleepGain = 1;

const effectiveVolume = () => usePlayer.getState().volume * sleepGain;

async function ensureAudioMode() {
  if (audioModeSet) return;
  audioModeSet = true;
  // Keep playing with the screen off, on silent mode, and duck under other apps politely.
  await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'duckOthers' }).catch(() => undefined);
}

function persist() {
  const { soundId, volume } = usePlayer.getState();
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ soundId, volume })).catch(() => undefined);
}

export async function restorePrefs() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const { soundId, volume } = JSON.parse(raw);
    usePlayer.setState({
      soundId: soundById(soundId).id,
      volume: typeof volume === 'number' ? Math.min(1, Math.max(0, volume)) : 0.8,
    });
  } catch { /* first launch or corrupted prefs: keep defaults */ }
}

function lockScreen(player: AudioPlayer, sound: Sound) {
  try {
    player.setActiveForLockScreen(true, { title: sound.title, artist: 'Irery', albumTitle: sound.hint });
  } catch { /* not supported on this platform */ }
}

/** Ramps volumes of the outgoing and incoming players together. */
function crossfade(from: AudioPlayer | null, to: AudioPlayer, ms: number) {
  if (fadeTimer) clearInterval(fadeTimer);
  const start = Date.now();
  const fromStart = from?.volume ?? 0;
  fadeTimer = setInterval(() => {
    const k = Math.min(1, (Date.now() - start) / ms);
    const eased = k * k * (3 - 2 * k); // smoothstep: no audible "corner"
    to.volume = effectiveVolume() * eased;
    if (from) from.volume = fromStart * (1 - eased);
    if (k >= 1) {
      clearInterval(fadeTimer!);
      fadeTimer = null;
      if (from) {
        from.pause();
        from.remove();
      }
    }
  }, 40);
}

/** Starts (or switches to) a sound, cross-fading from the current one. */
export async function playSound(id: string) {
  await ensureAudioMode();
  const sound = soundById(id);
  usePlayer.setState({ soundId: sound.id, playing: true });
  persist();

  if (active && activeId === sound.id) {
    active.play();
    crossfade(null, active, 600);
    return;
  }

  const next = createAudioPlayer(sound.source);
  next.loop = true;
  next.volume = 0;
  next.play();
  lockScreen(next, sound);
  const previous = active;
  active = next;
  activeId = sound.id;
  crossfade(previous, next, previous ? CROSSFADE_MS : 900);
}

export function pause() {
  usePlayer.setState({ playing: false });
  const p = active;
  if (!p) return;
  // A short fade-out instead of an abrupt stop.
  if (fadeTimer) clearInterval(fadeTimer);
  const startVol = p.volume;
  const start = Date.now();
  fadeTimer = setInterval(() => {
    const k = Math.min(1, (Date.now() - start) / 500);
    p.volume = startVol * (1 - k);
    if (k >= 1) {
      clearInterval(fadeTimer!);
      fadeTimer = null;
      p.pause();
    }
  }, 40);
}

export function togglePlay() {
  const { playing, soundId } = usePlayer.getState();
  if (playing) pause();
  else void playSound(soundId);
}

export function step(delta: 1 | -1) {
  const i = SOUNDS.findIndex((s) => s.id === usePlayer.getState().soundId);
  void playSound(SOUNDS[(i + delta + SOUNDS.length) % SOUNDS.length].id);
}

export function setVolume(v: number) {
  const volume = Math.min(1, Math.max(0, v));
  usePlayer.setState({ volume });
  if (active && !fadeTimer && usePlayer.getState().playing) active.volume = volume * sleepGain;
  persist();
}

/** Sleep timer: plays for `minutes`, fading out gently over the last 30 s. */
export function setSleepTimer(minutes: number | null) {
  if (sleepTimer) clearInterval(sleepTimer);
  sleepTimer = null;
  sleepGain = 1;
  if (active && usePlayer.getState().playing && !fadeTimer) active.volume = effectiveVolume();
  if (!minutes) {
    usePlayer.setState({ sleepEndsAt: null, sleepMinutes: null });
    return;
  }
  const endsAt = Date.now() + minutes * 60_000;
  usePlayer.setState({ sleepEndsAt: endsAt, sleepMinutes: minutes });
  sleepTimer = setInterval(() => {
    const left = endsAt - Date.now();
    if (left <= 0) {
      clearInterval(sleepTimer!);
      sleepTimer = null;
      pause();
      sleepGain = 1;
      usePlayer.setState({ sleepEndsAt: null, sleepMinutes: null });
      return;
    }
    if (left < SLEEP_FADE_MS) {
      sleepGain = left / SLEEP_FADE_MS;
      if (active && !fadeTimer && usePlayer.getState().playing) active.volume = effectiveVolume();
    }
  }, 250);
}

export const SLEEP_OPTIONS = [null, 15, 30, 45, 60, 90] as const;
