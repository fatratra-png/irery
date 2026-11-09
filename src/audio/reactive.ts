import { makeMutable } from 'react-native-reanimated';
import envelopes from './envelopes.json';
import { getPlaybackTime, usePlayer } from './player';

/**
 * Makes the visuals follow the real audio without a microphone: every sound
 * ships with a pre-computed envelope and list of attacks (scripts/analyze-sounds.py),
 * read here at the current playback position.
 */

interface Envelope {
  duration: number;
  rate: number;
  data: Uint8Array;
  onsets: number[];
}

const decoded: Record<string, Envelope> = {};
for (const [id, e] of Object.entries(envelopes as Record<string, { duration: number; rate: number; env: string; onsets: number[] }>)) {
  const bin = atob(e.env);
  const data = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
  decoded[id] = { duration: e.duration, rate: e.rate, data, onsets: e.onsets };
}

export interface Reactive {
  /** 0..1 smoothed loudness at the playback position. */
  level: number;
  /** Seconds since the most recent attack (large when none). */
  onsetAge: number;
  /** Ages (s) and random seeds of the last four attacks, newest first. */
  ages: [number, number, number, number];
  seeds: [number, number, number, number];
}

/** Read on the UI thread by the shader scenes. */
export const reactive = makeMutable<Reactive>({ level: 0, onsetAge: 30, ages: [30, 30, 30, 30], seeds: [0.11, 0.37, 0.59, 0.83] });

let timer: ReturnType<typeof setInterval> | null = null;
let level = 0;
let prevT = -1;
let prevId = '';
const recent: { at: number; seed: number }[] = [];

function tick() {
  const { soundId, playing } = usePlayer.getState();
  const env = decoded[soundId];
  const now = Date.now();
  if (soundId !== prevId) {
    prevId = soundId;
    prevT = -1;
  }
  let target = 0;
  if (env && playing) {
    const t = getPlaybackTime() % env.duration;
    target = env.data[Math.min(env.data.length - 1, Math.floor(t * env.rate))] / 255;
    // Attacks crossed since the last tick (handles the loop wrapping around).
    if (prevT >= 0) {
      const crossed = t >= prevT
        ? env.onsets.filter((o) => o > prevT && o <= t)
        : env.onsets.filter((o) => o > prevT || o <= t);
      for (let i = 0; i < crossed.length; i++) recent.unshift({ at: now, seed: Math.random() });
      recent.length = Math.min(recent.length, 4);
    }
    prevT = t;
  }
  // Fast attack, slow release — like a VU meter; fades to rest when paused.
  level += (target - level) * (target > level ? 0.45 : 0.12);
  const ages = [0, 1, 2, 3].map((i) => (recent[i] ? (now - recent[i].at) / 1000 : 30)) as Reactive['ages'];
  const seeds = [0, 1, 2, 3].map((i) => (recent[i] ? recent[i].seed : 0.13 * (i + 1))) as Reactive['seeds'];
  reactive.value = { level, onsetAge: ages[0], ages, seeds };
}

export function startReactive() {
  if (!timer) timer = setInterval(tick, 33);
}

export function stopReactive() {
  if (timer) clearInterval(timer);
  timer = null;
}
