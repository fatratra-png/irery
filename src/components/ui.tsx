import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { PanResponder, Platform, Pressable, StyleSheet, Text, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SLEEP_OPTIONS, setSleepTimer, setVolume, usePlayer } from '../audio/player';

export const font = {
  light: 'Outfit_300Light',
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
};

export type Haptic = 'selection' | 'light' | 'medium' | 'none';

export function haptic(kind: Haptic = 'selection') {
  if (Platform.OS === 'web' || kind === 'none') return;
  const run = kind === 'selection'
    ? Haptics.selectionAsync()
    : Haptics.impactAsync(kind === 'light' ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
  void run.catch(() => undefined);
}

/** Springs used across the interface: quick to press, a touch of bounce on release. */
export const SPRING_IN = { damping: 18, stiffness: 420, mass: 0.6 };
export const SPRING_OUT = { damping: 11, stiffness: 260, mass: 0.6 };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** A button that sinks under the finger and springs back. */
export function Touchable({ onPress, label, children, style, selected, scaleTo = 0.94, feedback = 'selection', hint }: {
  onPress: (e: GestureResponderEvent) => void;
  label: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  selected?: boolean;
  scaleTo?: number;
  feedback?: Haptic;
  hint?: string;
}) {
  const scale = useSharedValue(1);
  const pressed = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      onPressIn={() => { scale.value = withSpring(scaleTo, SPRING_IN); }}
      onPressOut={() => { scale.value = withSpring(1, SPRING_OUT); }}
      onPress={(e) => { haptic(feedback); onPress(e); }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={selected === undefined ? undefined : { selected }}
      hitSlop={8}
      style={[style, pressed]}
    >
      {children}
    </AnimatedPressable>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Frosted glass. Real blur on iOS and web; on Android a translucent tint
 * (native blur cannot sample the GPU scene underneath).
 * `blur={false}` keeps the look with a tint only: a live blur over a moving
 * scene is re-computed every frame, so small or numerous panels skip it.
 */
export function Glass({ children, style, radius = 24, strength = 28, blur = true }: { children?: React.ReactNode; style?: StyleProp<ViewStyle>; radius?: number; strength?: number; blur?: boolean }) {
  const realBlur = blur && Platform.OS !== 'android';
  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
      {realBlur && <BlurView intensity={strength} tint="dark" style={StyleSheet.absoluteFill} />}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: realBlur ? 'rgba(14,18,28,0.18)' : 'rgba(12,16,26,0.46)' }]} />
      <LinearGradient colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.02)']} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,0.16)' }]} pointerEvents="none" />
      {children}
    </View>
  );
}

/* ------------------------------------------------------------------ */

export function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/* ------------------------------------------------------------------ */

export function VolumeSlider({ accent }: { accent: string }) {
  const volume = usePlayer((s) => s.volume);
  const width = useRef(1);
  const grab = useSharedValue(1);
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ scale: grab.value }] }));
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Keep the finger: the scene behind would otherwise take it as a swipe.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        grab.value = withSpring(1.45, SPRING_IN);
        setVolume(e.nativeEvent.locationX / width.current);
      },
      onPanResponderMove: (e) => setVolume(e.nativeEvent.locationX / width.current),
      onPanResponderRelease: () => { grab.value = withSpring(1, SPRING_OUT); },
      onPanResponderTerminate: () => { grab.value = withSpring(1, SPRING_OUT); },
    }),
  ).current;
  return (
    <View style={styles.volumeRow}>
      <Ionicons name="volume-low-outline" size={18} color="rgba(255,255,255,0.55)" />
      <View
        {...pan.panHandlers}
        onLayout={(e) => { width.current = e.nativeEvent.layout.width; }}
        style={styles.volumeTrackHit}
        accessibilityRole="adjustable"
        accessibilityLabel="Volume"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(volume * 100) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => setVolume(volume + (e.nativeEvent.actionName === 'increment' ? 0.1 : -0.1))}
      >
        <View style={styles.volumeTrack}>
          <View style={[styles.volumeFill, { width: `${volume * 100}%`, backgroundColor: accent }]} />
        </View>
        <Animated.View style={[styles.volumeThumb, { left: `${volume * 100}%` }, thumbStyle]} />
      </View>
      <Ionicons name="volume-high-outline" size={18} color="rgba(255,255,255,0.55)" />
    </View>
  );
}

/** Cycles Off → 15 → 30 → 45 → 60 → 90 min; shows the time left when active. */
export function SleepTimerButton({ accent }: { accent: string }) {
  const { sleepEndsAt, sleepMinutes } = usePlayer();
  const [, force] = useState(0);
  useEffect(() => {
    if (!sleepEndsAt) return;
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [sleepEndsAt]);

  const next = () => {
    const i = SLEEP_OPTIONS.indexOf((sleepMinutes ?? null) as (typeof SLEEP_OPTIONS)[number]);
    setSleepTimer(SLEEP_OPTIONS[(i + 1) % SLEEP_OPTIONS.length]);
  };
  const left = sleepEndsAt ? Math.max(0, sleepEndsAt - Date.now()) : 0;
  const mm = Math.floor(left / 60000);
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
  const label = sleepEndsAt ? `Sleep timer, ${mm} minutes left. Tap to change` : 'Sleep timer off. Tap to set';

  return (
    <Touchable onPress={next} label={label}>
      <Glass radius={18} style={styles.pill} blur={false}>
        <Ionicons name={sleepEndsAt ? 'moon' : 'moon-outline'} size={15} color={sleepEndsAt ? accent : 'rgba(255,255,255,0.75)'} />
        <Text style={[styles.pillText, sleepEndsAt ? { color: accent } : null]}>{sleepEndsAt ? `${mm}:${ss}` : 'Sleep'}</Text>
      </Glass>
    </Touchable>
  );
}

/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  volumeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  volumeTrackHit: { flex: 1, height: 32, justifyContent: 'center' },
  volumeTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  volumeFill: { height: 4 },
  volumeThumb: { position: 'absolute', width: 16, height: 16, borderRadius: 8, marginLeft: -8, backgroundColor: '#fff' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36 },
  pillText: { fontFamily: font.medium, fontSize: 13, color: 'rgba(255,255,255,0.85)', fontVariant: ['tabular-nums'] },
});
