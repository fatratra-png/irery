import { Canvas, Fill, Shader, Skia, useClock } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { reactive } from '../audio/reactive';
import type { Mood } from '../sounds';
import * as SHADERS from './shaders';

/** GPU work is quartered by rendering at half resolution; these scenes are soft, so it doesn't show. */
const RENDER_SCALE = 0.5;
const FADE_MS = 1600;

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

const effects = new Map<string, ReturnType<typeof Skia.RuntimeEffect.Make>>();
function effectFor(key: keyof typeof SHADERS) {
  if (!effects.has(key)) {
    const effect = Skia.RuntimeEffect.Make(SHADERS[key]);
    if (!effect) console.warn(`[scene] shader ${key} failed to compile`);
    effects.set(key, effect);
  }
  return effects.get(key)!;
}

/** One realistic scene, animated by the clock and the sound being played. */
function ShaderLayer({ mood, reduced }: { mood: Mood; reduced: boolean }) {
  const { width, height } = useWindowDimensions();
  const w = Math.ceil(width * RENDER_SCALE);
  const h = Math.ceil(height * RENDER_SCALE);
  const effect = effectFor(mood.scene.shader);
  const clock = useClock();
  const timeScale = reduced ? 0.15 : 1; // "reduce motion": the scene barely drifts

  const statics = useMemo(
    () => ({
      c0: rgb(mood.colors[0]),
      c1: rgb(mood.colors[1]),
      c2: rgb(mood.colors[2]),
      accent: rgb(mood.accent),
      ...mood.scene.params,
    }),
    [mood],
  );
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
  }, [statics, w, h, timeScale]);

  if (!effect) return <View style={[StyleSheet.absoluteFill, { backgroundColor: mood.colors[1] }]} />;
  return (
    <View style={styles.center} pointerEvents="none">
      {/* Scale the wrapper, not the canvas: on web the canvas element ignores its own transform. */}
      <View style={{ width: w, height: h, transform: [{ scale: 1 / RENDER_SCALE }] }}>
        <Canvas style={{ width: w, height: h }}>
          <Fill>
            <Shader source={effect} uniforms={uniforms} />
          </Fill>
        </Canvas>
      </View>
    </View>
  );
}

function FadeIn({ children, onDone }: { children: React.ReactNode; onDone?: () => void }) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: FADE_MS, easing: Easing.inOut(Easing.quad) });
    const t = setTimeout(() => onDone?.(), FADE_MS + 50);
    return () => clearTimeout(t);
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[StyleSheet.absoluteFill, style]}>{children}</Animated.View>;
}

/**
 * The scene for the current sound. When the sound changes, the new scene
 * fades in over the old one (two shaders run only during the cross-fade).
 */
export function SceneStack({ soundId, mood }: { soundId: string; mood: Mood }) {
  const reduced = useReducedMotion();
  const [layers, setLayers] = useState([{ key: soundId, mood }]);

  useEffect(() => {
    setLayers((l) => (l[l.length - 1].key === soundId ? l : [...l.slice(-1), { key: soundId, mood }]));
  }, [soundId]);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: mood.colors[0] }]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {layers.map((layer, i) =>
        i === 0 ? (
          <View key={layer.key} style={StyleSheet.absoluteFill}>
            <ShaderLayer mood={layer.mood} reduced={reduced} />
          </View>
        ) : (
          <FadeIn key={layer.key} onDone={() => setLayers((l) => l.slice(-1))}>
            <ShaderLayer mood={layer.mood} reduced={reduced} />
          </FadeIn>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
