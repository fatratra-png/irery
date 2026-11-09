import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { SLEEP_OPTIONS, setSleepTimer, setVolume, usePlayer } from '../audio/player';
import { reactive } from '../audio/reactive';
import { useReducedMotion } from '../scenes/ShaderScene';
import { CATEGORIES, SOUNDS, type Category, type Mood, type Sound } from '../sounds';

export const font = {
  light: 'Outfit_300Light',
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
};

const tap = () => {
  if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => undefined);
};

/* ------------------------------------------------------------------ */

export function Touchable({ onPress, label, children, style, selected }: { onPress: () => void; label: string; children: React.ReactNode; style?: StyleProp<ViewStyle>; selected?: boolean }) {
  return (
    <Pressable
      onPress={() => { tap(); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={selected === undefined ? undefined : { selected }}
      hitSlop={8}
      style={({ pressed }) => [style, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]}
    >
      {children}
    </Pressable>
  );
}

/**
 * Frosted glass. Real blur on iOS and web; on Android a translucent tint
 * (native blur cannot sample the GPU scene underneath).
 */
export function Glass({ children, style, radius = 24, strength = 28 }: { children?: React.ReactNode; style?: StyleProp<ViewStyle>; radius?: number; strength?: number }) {
  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
      <BlurView intensity={strength} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === 'android' ? 'rgba(14,18,28,0.55)' : 'rgba(14,18,28,0.18)' }]} />
      <LinearGradient colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.02)']} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,0.16)' }]} pointerEvents="none" />
      {children}
    </View>
  );
}

/* ------------------------------------------------------------------ */

/**
 * A glass orb that breathes at the sound's own pace and swells with the
 * real loudness of the audio (pre-computed envelope).
 */
export function GlassOrb({ mood, playing, size = 168, children }: { mood: Mood; playing: boolean; size?: number; children?: React.ReactNode }) {
  const reduced = useReducedMotion();
  const breath = useSharedValue(0);
  useEffect(() => {
    if (reduced || !playing) {
      breath.value = withTiming(0.3, { duration: 800 });
      return;
    }
    breath.value = 0;
    breath.value = withRepeat(withTiming(1, { duration: (mood.breath * 1000) / 2, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [mood.breath, playing, reduced]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.97 + breath.value * 0.04 + (reduced ? 0 : reactive.value.level * 0.05) }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + breath.value * 0.25 + reactive.value.level * 0.4,
    transform: [{ scale: 1 + breath.value * 0.06 + reactive.value.level * 0.1 }],
  }));

  return (
    <View style={{ width: size * 1.9, height: size * 1.9, alignItems: 'center', justifyContent: 'center' }}>
      {/* Soft glow: concentric, nearly transparent discs instead of one flat disc. */}
      <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, haloStyle]} pointerEvents="none">
        {[1.75, 1.5, 1.3, 1.14].map((k) => (
          <View key={k} style={{ position: 'absolute', width: size * k, height: size * k, borderRadius: (size * k) / 2, backgroundColor: mood.accent, opacity: 0.045 }} />
        ))}
      </Animated.View>
      <Animated.View style={orbStyle}>
        <Glass radius={size / 2} strength={40} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <LinearGradient
            colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
            start={{ x: 0.3, y: 0 }}
            end={{ x: 0.6, y: 0.6 }}
            style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
          />
          {children}
        </Glass>
      </Animated.View>
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

function SoundTile({ sound, active, onPress }: { sound: Sound; active: boolean; onPress: () => void }) {
  const accent = sound.mood.accent;
  return (
    <Touchable onPress={onPress} label={`${sound.title}, ${sound.hint}`} selected={active} style={[styles.tile, active && { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: `${accent}99` }]}>
      <LinearGradient colors={[sound.mood.colors[2], sound.mood.colors[0]]} style={[styles.tileIcon, active && { borderColor: accent }]}>
        <Ionicons name={sound.icon} size={20} color={active ? accent : 'rgba(255,255,255,0.8)'} />
      </LinearGradient>
      <Text numberOfLines={1} style={[styles.tileTitle, active && { color: '#fff' }]}>{sound.title}</Text>
    </Touchable>
  );
}

/** Category tabs + a horizontal row of sounds. */
export function SoundPicker({ currentId, onSelect }: { currentId: string; onSelect: (id: string) => void }) {
  const current = SOUNDS.find((s) => s.id === currentId);
  const [category, setCategory] = useState<Category>(current?.category ?? 'Water');
  const list = SOUNDS.filter((s) => s.category === category);
  const scroll = useRef<ScrollViewInstance>(null);

  useEffect(() => {
    if (current && current.category !== category) setCategory(current.category);
  }, [currentId]);

  return (
    <View>
      <View style={styles.tabs} accessibilityRole="tablist">
        {CATEGORIES.map((c) => (
          <Touchable
            key={c}
            onPress={() => { setCategory(c); scroll.current?.scrollTo({ x: 0, animated: false }); }}
            label={c}
            selected={c === category}
            style={[styles.tab, c === category && styles.tabActive]}
          >
            <Text style={[styles.tabText, c === category && styles.tabTextActive]}>{c}</Text>
          </Touchable>
        ))}
      </View>
      <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tiles}>
        {list.map((s) => <SoundTile key={s.id} sound={s} active={s.id === currentId} onPress={() => onSelect(s.id)} />)}
      </ScrollView>
    </View>
  );
}

/* ------------------------------------------------------------------ */

export function VolumeSlider({ accent }: { accent: string }) {
  const volume = usePlayer((s) => s.volume);
  const width = useRef(1);
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => setVolume(e.nativeEvent.locationX / width.current),
      onPanResponderMove: (e) => setVolume(e.nativeEvent.locationX / width.current),
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
        <View style={[styles.volumeThumb, { left: `${volume * 100}%` }]} />
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
      <Glass radius={18} style={styles.pill}>
        <Ionicons name={sleepEndsAt ? 'moon' : 'moon-outline'} size={15} color={sleepEndsAt ? accent : 'rgba(255,255,255,0.75)'} />
        <Text style={[styles.pillText, sleepEndsAt ? { color: accent } : null]}>{sleepEndsAt ? `${mm}:${ss}` : 'Sleep'}</Text>
      </Glass>
    </Touchable>
  );
}

/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginBottom: 12 },
  tab: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 14 },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.12)' },
  tabText: { fontFamily: font.medium, fontSize: 13, letterSpacing: 0.4, color: 'rgba(255,255,255,0.55)' },
  tabTextActive: { color: '#fff' },
  tiles: { gap: 10, paddingHorizontal: 16 },
  tile: {
    width: 88,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tileIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  tileTitle: { fontFamily: font.medium, fontSize: 12, color: 'rgba(255,255,255,0.7)', maxWidth: 80 },
  volumeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  volumeTrackHit: { flex: 1, height: 32, justifyContent: 'center' },
  volumeTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  volumeFill: { height: 4 },
  volumeThumb: { position: 'absolute', width: 16, height: 16, borderRadius: 8, marginLeft: -8, backgroundColor: '#fff' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36 },
  pillText: { fontFamily: font.medium, fontSize: 13, color: 'rgba(255,255,255,0.85)', fontVariant: ['tabular-nums'] },
});
