import { Canvas, Fill, Shader, useClock } from '@shopify/react-native-skia';
import { useEffect, useRef } from 'react';
import { Platform, Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { Easing, useAnimatedStyle, useDerivedValue, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { reactive } from '../audio/reactive';
import { effectFor, rgb } from '../scenes/engine';
import { useReducedMotion } from '../scenes/ShaderScene';
import type { Mood } from '../sounds';

/** The sphere's diameter is this fraction of the canvas; the rest is glow and rings. */
const SPHERE = 0.62;
/** The orb is soft except for its highlight: 0.6× resolution is plenty. */
const ORB_SCALE = 0.6;

const SPRING = { damping: 14, stiffness: 220, mass: 0.7 };

/**
 * A liquid-glass sphere drawn by a shader. Its light swirls with the sound,
 * sends a ring out on each attack (and on each tap), breathes at the mood's
 * pace and blends its colour into the next sound's.
 */
export function Orb({ mood, playing, size, onPress, label, children }: { mood: Mood; playing: boolean; size: number; onPress?: () => void; label?: string; children?: React.ReactNode }) {
  const reduced = useReducedMotion();
  const canvas = size / SPHERE;
  const cw = Math.ceil(canvas * ORB_SCALE);
  const effect = effectFor('ORB');
  const clock = useClock();

  // Colour morph: from the previous mood to the new one.
  const from = useSharedValue([...rgb(mood.accent), ...rgb(mood.colors[0])]);
  const to = useSharedValue([...rgb(mood.accent), ...rgb(mood.colors[0])]);
  const morph = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const k = morph.value;
    from.value = from.value.map((v, i) => v + (to.value[i] - v) * k);
    to.value = [...rgb(mood.accent), ...rgb(mood.colors[0])];
    morph.value = 0;
    morph.value = withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) });
  }, [mood]);

  const play = useSharedValue(playing ? 1 : 0);
  useEffect(() => { play.value = withTiming(playing ? 1 : 0, { duration: 700 }); }, [playing]);

  // A tap sends its own ring, even when the sound has no attacks.
  const tapAt = useSharedValue(-1e9);

  const uniforms = useDerivedValue(() => {
    const k = morph.value;
    const c = from.value.map((v, i) => v + (to.value[i] - v) * k);
    const r = reactive.value;
    const tapAge = (clock.value - tapAt.value) / 1000;
    return {
      iResolution: [cw, cw],
      iTime: (clock.value / 1000) * (reduced ? 0.2 : 1),
      level: r.level * play.value,
      onsetAge: Math.min(r.onsetAge, tapAge),
      playing: play.value,
      accent: [c[0], c[1], c[2]],
      deep: [c[3], c[4], c[5]],
    };
  });

  // Breathing + press spring, composed on the compositor (no re-render).
  const breath = useSharedValue(0);
  useEffect(() => {
    if (reduced || !playing) {
      breath.value = withTiming(0.3, { duration: 900 });
      return;
    }
    breath.value = withRepeat(withTiming(1, { duration: (mood.breath * 1000) / 2, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [mood.breath, playing, reduced]);
  const press = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: press.value * (0.975 + breath.value * 0.035) }] }));

  // Icon pops when it changes (play ↔ pause).
  const pop = useSharedValue(1);
  useEffect(() => { pop.value = withSequence(withTiming(0.7, { duration: 90 }), withSpring(1, SPRING)); }, [playing]);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  const body = (
    <Animated.View style={[{ width: canvas, height: canvas, alignItems: 'center', justifyContent: 'center' }, style]}>
      {effect ? (
        <View pointerEvents="none" style={{ position: 'absolute', width: cw, height: cw, transform: [{ scale: 1 / ORB_SCALE }] }}>
          <Canvas style={{ width: cw, height: cw }}>
            <Fill>
              <Shader source={effect} uniforms={uniforms} />
            </Fill>
          </Canvas>
        </View>
      ) : (
        <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: mood.accent, opacity: 0.5 }} />
      )}
      <Animated.View style={iconStyle} pointerEvents="none">{children}</Animated.View>
    </Animated.View>
  );

  if (!onPress) return body;
  return (
    <View style={{ width: canvas, height: canvas, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute' }} pointerEvents="none">{body}</View>
      {/* Only the sphere is touchable, not its glow. */}
      <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      onPressIn={() => { press.value = withSpring(0.9, SPRING); }}
      onPressOut={() => { press.value = withSpring(1, { ...SPRING, damping: 9 }); }}
      onPress={() => {
        tapAt.value = clock.value;
        if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
        onPress();
      }}
      />
    </View>
  );
}
