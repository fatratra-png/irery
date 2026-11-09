import { Skia, type SkImage, type SkRuntimeEffect, type SkSurface } from '@shopify/react-native-skia';
import { create } from 'zustand';
import { SOUNDS, type Mood, type Sound } from '../sounds';
import * as SHADERS from './shaders';

/** Scenes are soft, so rendering them at half resolution is invisible and quarters the GPU work. */
export const RENDER_SCALE = 0.5;

export type ShaderKey = keyof typeof SHADERS;

const effects = new Map<ShaderKey, SkRuntimeEffect | null>();

export function effectFor(key: ShaderKey): SkRuntimeEffect | null {
  if (!effects.has(key)) {
    const effect = Skia.RuntimeEffect.Make(SHADERS[key]);
    if (!effect) console.warn(`[scene] shader ${key} failed to compile`);
    effects.set(key, effect);
  }
  return effects.get(key)!;
}

/**
 * Compiles every shader up front (during the splash screen), so switching
 * sounds never stalls on a shader compilation.
 */
export function prewarmShaders() {
  const keys = new Set<ShaderKey>(['ORB', ...SOUNDS.map((s) => s.mood.scene.shader)]);
  keys.forEach((k) => effectFor(k));
}

export const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

/** Uniforms that never change for a given mood. */
export function staticUniforms(mood: Mood) {
  return {
    c0: rgb(mood.colors[0]),
    c1: rgb(mood.colors[1]),
    c2: rgb(mood.colors[2]),
    accent: rgb(mood.accent),
    ...mood.scene.params,
  };
}

/** Full uniform set for a still frame (thumbnails). */
function stillUniforms(mood: Mood, w: number, h: number) {
  return {
    ...staticUniforms(mood),
    iResolution: [w, h],
    iTime: 14.0,
    level: 0.6,
    onsetAge: 0.6,
    ages: [0.6, 2.4, 5.0, 8.0],
    seeds: [0.11, 0.37, 0.59, 0.83],
    ...(mood.scene.shader === 'RAIN_GLASS' ? { flash: 0 } : {}),
  };
}

/**
 * One offscreen GPU surface, reused for every still: on web each new surface
 * is a new WebGL context, and browsers only allow a handful.
 */
let still: { surface: SkSurface; w: number; h: number } | null = null;
function surfaceFor(w: number, h: number): SkSurface | null {
  if (still && still.w === w && still.h === h) return still.surface;
  const surface = Skia.Surface.MakeOffscreen(w, h) ?? Skia.Surface.Make(w, h);
  still = surface ? { surface, w, h } : null;
  return surface;
}

/** Renders one still frame of a scene into an image (GPU when available). */
export function renderStill(sound: Sound, w: number, h: number): SkImage | null {
  const effect = effectFor(sound.mood.scene.shader);
  if (!effect) return null;
  const surface = surfaceFor(w, h);
  if (!surface) return null;
  const u = stillUniforms(sound.mood, w, h);
  const ordered: number[] = [];
  // Runtime-effect uniforms are passed in declaration order.
  for (let i = 0; i < effect.getUniformCount(); i++) {
    const name = effect.getUniformName(i);
    const v = (u as Record<string, number | number[]>)[name];
    if (Array.isArray(v)) ordered.push(...v);
    else ordered.push(v ?? 0);
  }
  const paint = Skia.Paint();
  paint.setShader(effect.makeShader(ordered));
  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color('black'));
  canvas.drawPaint(paint);
  surface.flush();
  return surface.makeImageSnapshot().makeNonTextureImage();
}

/* ------------------------------------------------------------------ */
/* Card thumbnails, generated one per frame after start-up.            */
/* ------------------------------------------------------------------ */

interface ThumbState {
  thumbs: Record<string, string>;
}

export const useThumbs = create<ThumbState>(() => ({ thumbs: {} }));

let thumbsStarted = false;

/** Fills useThumbs with data-URI stills of every scene, without blocking the UI. */
export function generateThumbnails(w: number, h: number) {
  if (thumbsStarted) return;
  thumbsStarted = true;
  const queue = [...SOUNDS];
  const next = () => {
    const sound = queue.shift();
    if (!sound) return;
    try {
      const img = renderStill(sound, Math.round(w), Math.round(h));
      const b64 = img?.encodeToBase64();
      if (b64) useThumbs.setState((s) => ({ thumbs: { ...s.thumbs, [sound.id]: `data:image/png;base64,${b64}` } }));
    } catch (err) {
      console.warn('[scene] thumbnail failed for', sound.id, err);
    }
    setTimeout(next, 16);
  };
  setTimeout(next, 300);
}
