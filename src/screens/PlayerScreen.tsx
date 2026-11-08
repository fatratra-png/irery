import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { playSound, step, togglePlay, usePlayer } from '../audio/player';
import { MoodBackground, SceneLayer } from '../components/scenes/Scenes';
import { BreathingOrb, font, SleepTimerButton, SoundPicker, Touchable, useClock, VolumeSlider } from '../components/ui';
import { soundById } from '../sounds';

const IDLE_MS = 12_000;

export function PlayerScreen({ onHome }: { onHome: () => void }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const soundId = usePlayer((s) => s.soundId);
  const playing = usePlayer((s) => s.playing);
  const sound = soundById(soundId);
  const now = useClock();

  // Calm mode: controls fade away when idle; any touch brings them back.
  const chrome = useRef(new Animated.Value(1)).current;
  const [chromeVisible, setChromeVisible] = useState(true);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wake = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    setChromeVisible(true);
    Animated.timing(chrome, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    idleTimer.current = setTimeout(() => {
      if (!usePlayer.getState().playing) return;
      setChromeVisible(false);
      Animated.timing(chrome, { toValue: 0, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    }, IDLE_MS);
  }, []);
  useEffect(() => {
    wake();
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current); };
  }, [playing, soundId]);

  // The interface is in English: keep the date consistent with it.
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  const date = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const orbScale = Math.max(0.6, Math.min(1, (height - 460) / 320));

  return (
    <View style={styles.root} onStartShouldSetResponderCapture={() => { wake(); return false; }}>
      <StatusBar style="light" />
      <MoodBackground mood={sound.mood} />
      <SceneLayer key={sound.id} mood={sound.mood} />

      {/* Tap on empty space wakes the controls without doing anything else. */}
      {!chromeVisible && <Pressable style={StyleSheet.absoluteFill} onPress={wake} accessibilityLabel="Show controls" />}

      <View style={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]} pointerEvents="box-none">
        <Animated.View style={[styles.topBar, { opacity: chrome }]} pointerEvents={chromeVisible ? 'auto' : 'none'}>
          <Touchable onPress={onHome} label="Back to welcome screen" style={styles.brand}>
            <Text style={styles.brandText}>irery</Text>
          </Touchable>
          <SleepTimerButton accent={sound.mood.accent} />
        </Animated.View>

        <View style={styles.clockBlock} accessible accessibilityLabel={`${time}, ${date}`}>
          <Text style={styles.clock}>{time}</Text>
          <Text style={styles.date}>{date}</Text>
        </View>

        <View style={styles.center} pointerEvents="box-none">
          <View style={{ transform: [{ scale: orbScale }] }}>
            <Touchable onPress={togglePlay} label={playing ? `Pause ${sound.title}` : `Play ${sound.title}`}>
              <BreathingOrb mood={sound.mood} playing={playing}>
                <Ionicons name={playing ? 'pause' : 'play'} size={40} color="rgba(255,255,255,0.9)" style={{ marginLeft: playing ? 0 : 4 }} />
              </BreathingOrb>
            </Touchable>
          </View>

          <View style={styles.nowRow}>
            <Animated.View style={{ opacity: chrome }} pointerEvents={chromeVisible ? 'auto' : 'none'}>
              <Touchable onPress={() => step(-1)} label="Previous sound" style={styles.stepBtn}>
                <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.7)" />
              </Touchable>
            </Animated.View>
            <View style={styles.nowText} accessibilityLiveRegion="polite">
              <Text style={styles.soundTitle}>{sound.title}</Text>
              <Text style={styles.soundHint}>{sound.hint}</Text>
            </View>
            <Animated.View style={{ opacity: chrome }} pointerEvents={chromeVisible ? 'auto' : 'none'}>
              <Touchable onPress={() => step(1)} label="Next sound" style={styles.stepBtn}>
                <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.7)" />
              </Touchable>
            </Animated.View>
          </View>
        </View>

        <Animated.View style={[styles.bottom, { opacity: chrome }]} pointerEvents={chromeVisible ? 'auto' : 'none'}>
          <SoundPicker currentId={sound.id} onSelect={(id) => void playSound(id)} />
          <View style={styles.volume}>
            <VolumeSlider accent={sound.mood.accent} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0f1a' },
  content: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 48 },
  brand: { paddingVertical: 6 },
  brandText: { fontFamily: font.light, fontSize: 20, letterSpacing: 4, color: 'rgba(255,255,255,0.8)' },
  clockBlock: { alignItems: 'center', marginTop: 4 },
  clock: { fontFamily: font.light, fontSize: 56, letterSpacing: 2, color: 'rgba(255,255,255,0.88)', fontVariant: ['tabular-nums'] },
  date: { fontFamily: font.medium, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  stepBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  nowText: { alignItems: 'center', minWidth: 190 },
  soundTitle: { fontFamily: font.light, fontSize: 30, color: '#fff', letterSpacing: 1 },
  soundHint: { fontFamily: font.regular, fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  bottom: { gap: 14 },
  volume: { paddingHorizontal: 28 },
});
