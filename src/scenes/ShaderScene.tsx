import { Canvas, Circle, Fill, Group, Mask, RadialGradient, Shader, useClock, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Easing, useDerivedValue, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { reactive } from '../audio/reactive';
import type { Mood } from '../sounds';
import { effectFor, RENDER_SCALE, staticUniforms } from './engine';

const REVEAL_MS = 1250;
const REVEAL_REDUCED_MS = 500;

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

/**
 * Where the next scene starts to appear, as fractions of the screen
 * (the tapped card, the side the user swiped from, the orb…).
 * Set it just before changing sound.
 */
const nextOrigin = { x: 0.5, y: 0.42, ms: REVEAL_MS };
export function setRevealOrigin(x: number, y: number, ms = REVEAL_MS) {
  nextOrigin.x = Math.min(1, Math.max(0, x));
  nextOrigin.y = Math.min(1, Math.max(0, y));
  nextOrigin.ms = ms;
}
/** The next change of scene starts from the orb, at the usual pace. */
function takeOrigin() {
  const o = { ...nextOrigin };
  nextOrigin.x = 0.5; nextOrigin.y = 0.42; nextOrigin.ms = REVEAL_MS;
  return o;
}

/** One scene, drawn inside the shared canvas. */
function SceneLayer({ mood, w, h, clock, timeScale }: { mood: Mood; w: number; h: number; clock: SharedValue<number>; timeScale: number }) {
  const effect = effectFor(mood.scene.shader);
  const statics = useMemo(() => staticUniforms(mood), [mood]);
  const storm = mood.scene.storm ? 1 : 0;
  const needsFlash = mood.scene.shader === 'RAIN_GLASS';

  const uniforms = useDerivedValue(() => {
    const r = reactive.value;
    return {
      ...statics,
      iResolution: [w, h],
      iTime: (clock.value / 1000) * timeScale,
      level: r.level,
      onsetAge: r.onsetAge,
      ages: r.ages,
      seeds: r.seeds,
      ...(needsFlash ? { flash: storm * Math.exp(-r.onsetAge * 3.5) * 0.9 } : {}),
    };
  });

  if (!effect) return <Fill color={mood.colors[1]} />;
  return (
    <Fill>
      <Shader source={effect} uniforms={uniforms} />
    </Fill>
  );
}

/**
 * The incoming scene grows out of a point as a soft-edged disc, like a drop of
 * colour spreading in water. Only during this ~1 s do two shaders run.
 */
function Reveal({ w, h, origin, reduced, onDone, children }: { w: number; h: number; origin: { x: number; y: number; ms: number }; reduced: boolean; onDone: () => void; children: React.ReactNode }) {
  const cx = origin.x * w;
  const cy = origin.y * h;
  // Radius at which the solid core (72 % of the disc) covers the farthest corner.
  const maxR = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy)) / 0.72;
  const p = useSharedValue(0);
  useEffect(() => {
    const ms = reduced ? REVEAL_REDUCED_MS : origin.ms;
    p.value = withTiming(1, { duration: ms, easing: Easing.bezier(0.45, 0, 0.2, 1) });
    const t = setTimeout(onDone, ms + 60);
    return () => clearTimeout(t);
  }, []);
  // With reduced motion the disc is already huge: it reads as a plain cross-fade.
  const r = useDerivedValue(() => (reduced ? maxR : Math.max(1, p.value * maxR)));
  const opacity = useDerivedValue(() => (reduced ? p.value : Math.min(1, p.value * 2.5)));

  return (
    <Mask
      mask={
        <Group opacity={opacity}>
          <Circle cx={cx} cy={cy} r={r}>
            <RadialGradient c={vec(cx, cy)} r={r} colors={['#ffffffff', '#ffffffff', '#ffffff00']} positions={[0, 0.72, 1]} />
          </Circle>
        </Group>
      }
    >
      {children}
    </Mask>
  );
}

interface Layer {
  key: string;
  mood: Mood;
  origin: { x: number; y: number; ms: number };
}

/**
 * The live scene for the current sound, rendered at half resolution in a single
 * canvas. When the sound changes, the new scene spreads out over the old one.
 */
export function SceneStack({ soundId, mood }: { soundId: string; mood: Mood }) {
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const w = Math.ceil(width * RENDER_SCALE);
  const h = Math.ceil(height * RENDER_SCALE);
  const clock = useClock();
  const timeScale = reduced ? 0.15 : 1; // "reduce motion": the scene barely drifts
  const [layers, setLayers] = useState<Layer[]>([{ key: soundId, mood, origin: { ...nextOrigin } }]);

  useEffect(() => {
    const origin = takeOrigin();
    setLayers((l) => (l[l.length - 1].key === soundId ? l : [...l.slice(-1), { key: soundId, mood, origin }]));
  }, [soundId]);

  return (
    <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: mood.colors[0] }]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* Scale the wrapper, not the canvas: on web the canvas element ignores its own transform. */}
      <View style={{ width: w, height: h, transform: [{ scale: 1 / RENDER_SCALE }] }}>
        <Canvas style={{ width: w, height: h }}>
          {layers.map((layer, i) =>
            i === 0 ? (
              <SceneLayer key={layer.key} mood={layer.mood} w={w} h={h} clock={clock} timeScale={timeScale} />
            ) : (
              <Reveal key={layer.key} w={w} h={h} origin={layer.origin} reduced={reduced} onDone={() => setLayers((l) => l.slice(-1))}>
                <SceneLayer mood={layer.mood} w={w} h={h} clock={clock} timeScale={timeScale} />
              </Reveal>
            ),
          )}
        </Canvas>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
