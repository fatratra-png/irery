import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance, type StyleProp, type ViewStyle } from 'react-native';
import { SLEEP_OPTIONS, setSleepTimer, setVolume, usePlayer } from '../audio/player';
import { CATEGORIES, SOUNDS, type Category, type Mood, type Sound } from '../sounds';
import { repeat, useReducedMotion } from './scenes/Scenes';

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
      style={({ pressed }) => [style, pressed && { opacity: 0.6, transform: [{ scale: 0.96 }] }]}
    >
      {children}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */

/** A soft glowing orb that breathes at the sound's own pace. */
export function BreathingOrb({ mood, playing, children }: { mood: Mood; playing: boolean; children?: React.ReactNode }) {
  const reduced = useReducedMotion();
  const breath = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced || !playing) {
      Animated.timing(breath, { toValue: 0.3, duration: 800, useNativeDriver: true }).start();
      return;
    }
    const half = (mood.breath * 1000) / 2;
    return repeat(() =>
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: half, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: half, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
  }, [mood.breath, playing, reduced]);

  const ring = (size: number, opacity: number, range: [number, number]) => (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: mood.accent,
        opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [opacity * 0.5, opacity] }),
        transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: range }) }],
      }}
    />
  );

  return (
    <View style={styles.orbWrap} accessibilityElementsHidden={!children}>
      {ring(300, 0.05, [0.85, 1.05])}
      {ring(230, 0.07, [0.88, 1.04])}
      {ring(170, 0.1, [0.9, 1.03])}
      <View style={[styles.orbCore, { borderColor: `${mood.accent}55` }]}>{children}</View>
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
    <Touchable onPress={onPress} label={`${sound.title}, ${sound.hint}`} selected={active} style={[styles.tile, active && { backgroundColor: `${accent}26`, borderColor: `${accent}80` }]}>
      <View style={[styles.tileIcon, { backgroundColor: active ? accent : 'rgba(255,255,255,0.06)' }]}>
        <Ionicons name={sound.icon} size={20} color={active ? '#0b0f1a' : 'rgba(255,255,255,0.75)'} />
      </View>
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
            style={styles.tab}
          >
            <Text style={[styles.tabText, c === category && styles.tabTextActive]}>{c}</Text>
            {c === category && <View style={[styles.tabDot, { backgroundColor: current?.mood.accent ?? '#fff' }]} />}
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
      <Ionicons name="volume-low-outline" size={18} color="rgba(255,255,255,0.5)" />
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
        <View style={[styles.volumeThumb, { left: `${volume * 100}%`, backgroundColor: accent }]} />
      </View>
      <Ionicons name="volume-high-outline" size={18} color="rgba(255,255,255,0.5)" />
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
    <Touchable onPress={next} label={label} style={[styles.pill, sleepEndsAt ? { borderColor: `${accent}80`, backgroundColor: `${accent}1f` } : null]}>
      <Ionicons name={sleepEndsAt ? 'moon' : 'moon-outline'} size={15} color={sleepEndsAt ? accent : 'rgba(255,255,255,0.6)'} />
      <Text style={[styles.pillText, sleepEndsAt ? { color: accent } : null]}>{sleepEndsAt ? `${mm}:${ss}` : 'Sleep'}</Text>
    </Touchable>
  );
}

/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  orbWrap: { width: 300, height: 300, alignItems: 'center', justifyContent: 'center' },
  orbCore: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 12 },
  tab: { paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  tabText: { fontFamily: font.medium, fontSize: 13, letterSpacing: 0.6, color: 'rgba(255,255,255,0.45)' },
  tabTextActive: { color: '#fff' },
  tabDot: { width: 4, height: 4, borderRadius: 2, marginTop: 5 },
  tiles: { gap: 10, paddingHorizontal: 20 },
  tile: {
    width: 92,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  tileIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { fontFamily: font.medium, fontSize: 12, color: 'rgba(255,255,255,0.65)', maxWidth: 80 },
  volumeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  volumeTrackHit: { flex: 1, height: 32, justifyContent: 'center' },
  volumeTrack: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  volumeFill: { height: 3 },
  volumeThumb: { position: 'absolute', width: 14, height: 14, borderRadius: 7, marginLeft: -7 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  pillText: { fontFamily: font.medium, fontSize: 13, color: 'rgba(255,255,255,0.7)', fontVariant: ['tabular-nums'] },
});
