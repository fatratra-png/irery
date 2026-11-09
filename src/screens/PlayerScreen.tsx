import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { playSound, step, togglePlay, usePlayer } from '../audio/player';
import { Glass, GlassOrb, font, SleepTimerButton, SoundPicker, Touchable, useClock, VolumeSlider } from '../components/ui';
import { SceneStack } from '../scenes/ShaderScene';
import { soundById } from '../sounds';

const IDLE_MS = 12_000;

export function PlayerScreen({ onHome }: { onHome: () => void }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const soundId = usePlayer((s) => s.soundId);
  const playing = usePlayer((s) => s.playing);
  const sound = soundById(soundId);
  const now = useClock();

  // Calm mode: the glass fades away when idle so only the scene remains; any touch brings it back.
  const chrome = useSharedValue(1);
  const [chromeVisible, setChromeVisible] = useState(true);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wake = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    setChromeVisible(true);
    chrome.value = withTiming(1, { duration: 300 });
    idleTimer.current = setTimeout(() => {
      if (!usePlayer.getState().playing) return;
      setChromeVisible(false);
      chrome.value = withTiming(0, { duration: 1400, easing: Easing.out(Easing.quad) });
    }, IDLE_MS);
  }, []);
  useEffect(() => {
    wake();
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current); };
  }, [playing, soundId]);
  const chromeStyle = useAnimatedStyle(() => ({ opacity: chrome.value }));
  const softStyle = useAnimatedStyle(() => ({ opacity: 0.35 + chrome.value * 0.65 }));

  // The interface is in English: keep the date consistent with it.
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  const date = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const orbSize = Math.max(120, Math.min(168, (height - 520) * 0.6));

  return (
    <View style={styles.root} onStartShouldSetResponderCapture={() => { wake(); return false; }}>
      <StatusBar style="light" />
      <SceneStack soundId={sound.id} mood={sound.mood} />

      {!chromeVisible && <Pressable style={StyleSheet.absoluteFill} onPress={wake} accessibilityLabel="Show controls" />}

      <View style={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]} pointerEvents="box-none">
        <Animated.View style={[styles.topBar, chromeStyle]} pointerEvents={chromeVisible ? 'auto' : 'none'}>
          <Touchable onPress={onHome} label="Back to welcome screen">
            <Glass radius={18} style={styles.brand}>
              <Text style={styles.brandText}>irery</Text>
            </Glass>
          </Touchable>
          <SleepTimerButton accent={sound.mood.accent} />
        </Animated.View>

        <Animated.View style={[styles.clockBlock, softStyle]} accessible accessibilityLabel={`${time}, ${date}`}>
          <Text style={styles.clock}>{time}</Text>
          <Text style={styles.date}>{date}</Text>
        </Animated.View>

        <View style={styles.center} pointerEvents="box-none">
          <Touchable onPress={togglePlay} label={playing ? `Pause ${sound.title}` : `Play ${sound.title}`}>
            <GlassOrb mood={sound.mood} playing={playing} size={orbSize}>
              <Ionicons name={playing ? 'pause' : 'play'} size={orbSize * 0.24} color="rgba(255,255,255,0.95)" style={{ marginLeft: playing ? 0 : 4 }} />
            </GlassOrb>
          </Touchable>
          <View style={styles.nowRow}>
            <Animated.View style={chromeStyle} pointerEvents={chromeVisible ? 'auto' : 'none'}>
              <Touchable onPress={() => step(-1)} label="Previous sound" style={styles.stepBtn}>
                <Ionicons name="chevron-back" size={26} color="rgba(255,255,255,0.85)" />
              </Touchable>
            </Animated.View>
            <View style={styles.nowText} accessibilityLiveRegion="polite">
              <Text style={styles.soundTitle}>{sound.title}</Text>
              <Text style={styles.soundHint}>{sound.hint}</Text>
            </View>
            <Animated.View style={chromeStyle} pointerEvents={chromeVisible ? 'auto' : 'none'}>
              <Touchable onPress={() => step(1)} label="Next sound" style={styles.stepBtn}>
                <Ionicons name="chevron-forward" size={26} color="rgba(255,255,255,0.85)" />
              </Touchable>
            </Animated.View>
          </View>
        </View>

        <Animated.View style={chromeStyle} pointerEvents={chromeVisible ? 'auto' : 'none'}>
          <Glass radius={30} style={styles.panel}>
            <SoundPicker currentId={sound.id} onSelect={(id) => void playSound(id)} />
            <View style={styles.volume}>
              <VolumeSlider accent={sound.mood.accent} />
            </View>
          </Glass>
        </Animated.View>
      </View>
    </View>
  );
}

const shadow = { textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 12 };

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0f1a' },
  content: { flex: 1, paddingHorizontal: 12 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, height: 48 },
  brand: { paddingHorizontal: 16, height: 36, justifyContent: 'center' },
  brandText: { fontFamily: font.light, fontSize: 17, letterSpacing: 4, color: 'rgba(255,255,255,0.9)' },
  clockBlock: { alignItems: 'center', marginTop: 8 },
  clock: { fontFamily: font.light, fontSize: 64, letterSpacing: 2, color: '#fff', fontVariant: ['tabular-nums'], ...shadow },
  date: { fontFamily: font.medium, fontSize: 12, letterSpacing: 2.2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)', ...shadow },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nowRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -6 },
  stepBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  nowText: { alignItems: 'center', minWidth: 190 },
  soundTitle: { fontFamily: font.light, fontSize: 30, color: '#fff', letterSpacing: 1, ...shadow },
  soundHint: { fontFamily: font.regular, fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2, ...shadow },
  panel: { paddingTop: 14, paddingBottom: 10, gap: 10 },
  volume: { paddingHorizontal: 22 },
});
