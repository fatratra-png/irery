import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Image, PanResponder, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { playSound, step, togglePlay, usePlayer } from '../audio/player';
import { Orb } from '../components/Orb';
import { SceneCarousel, type CardRect } from '../components/SceneCarousel';
import { Glass, font, haptic, SleepTimerButton, Touchable, useClock, VolumeSlider } from '../components/ui';
import { SceneStack, setRevealOrigin, useReducedMotion } from '../scenes/ShaderScene';
import { soundById, type Sound } from '../sounds';

const IDLE_MS = 12_000;
const MODE_SPRING = { damping: 20, stiffness: 140, mass: 0.9 };
const GROW_MS = 640;

type Mode = 'immersive' | 'browse';

interface Expanding {
  rect: CardRect;
  uri?: string;
  colors: [string, string, string];
}

export function PlayerScreen({ onHome }: { onHome: () => void }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const soundId = usePlayer((s) => s.soundId);
  const playing = usePlayer((s) => s.playing);
  const sound = soundById(soundId);
  const now = useClock();

  /* ---------------------------------------------------------------- modes */
  const [mode, setModeState] = useState<Mode>('immersive');
  const modeRef = useRef<Mode>('immersive');
  const [openKey, setOpenKey] = useState(0);
  const browse = useSharedValue(0); // 0 = immersive, 1 = carousel
  const setMode = useCallback((m: Mode) => {
    modeRef.current = m;
    setModeState(m);
    if (m === 'browse') setOpenKey((k) => k + 1);
    browse.value = reduced ? withTiming(m === 'browse' ? 1 : 0, { duration: 250 }) : withSpring(m === 'browse' ? 1 : 0, MODE_SPRING);
  }, [reduced]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (modeRef.current === 'browse') { setMode('immersive'); return true; }
      return false;
    });
    return () => sub.remove();
  }, [setMode]);

  /* ---------------------------------------- calm mode: controls fade when idle */
  const chrome = useSharedValue(1);
  const [chromeVisible, setChromeVisible] = useState(true);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wake = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    setChromeVisible(true);
    chrome.value = withTiming(1, { duration: 280 });
    idleTimer.current = setTimeout(() => {
      if (!usePlayer.getState().playing || modeRef.current === 'browse') return;
      setChromeVisible(false);
      chrome.value = withTiming(0, { duration: 1400, easing: Easing.out(Easing.quad) });
    }, IDLE_MS);
  }, []);
  useEffect(() => {
    wake();
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current); };
  }, [playing, soundId, mode]);

  /* ------------------------------------------- swipes on the immersive scene */
  const drag = useSharedValue(0); // horizontal finger offset
  const lift = useSharedValue(0); // upward finger offset (negative)
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponderCapture: () => { wake(); return false; },
        onMoveShouldSetPanResponder: (_, g) => {
          if (modeRef.current !== 'immersive') return false;
          const ax = Math.abs(g.dx), ay = Math.abs(g.dy);
          return (ax > 14 && ax > ay * 1.2) || (g.dy < -14 && ay > ax * 1.2);
        },
        onPanResponderMove: (_, g) => {
          if (Math.abs(g.dx) > Math.abs(g.dy)) { drag.value = g.dx; lift.value = 0; }
          else { lift.value = Math.min(0, g.dy); drag.value = 0; }
        },
        onPanResponderRelease: (_, g) => {
          const horizontal = Math.abs(g.dx) > Math.abs(g.dy);
          if (horizontal && (Math.abs(g.dx) > 70 || Math.abs(g.vx) > 0.5)) {
            const dir = g.dx < 0 ? 1 : -1;
            // The next scene flows in from the side the finger came from.
            setRevealOrigin(dir === 1 ? 1 : 0, 0.5, 1000);
            const out = -dir * width * 0.45;
            drag.value = withSequence(withTiming(out, { duration: 150 }), withTiming(-out * 0.6, { duration: 0 }), withSpring(0, { damping: 16, stiffness: 170 }));
            haptic('light');
            step(dir);
          } else {
            drag.value = withSpring(0, { damping: 14, stiffness: 200 });
          }
          if (!horizontal && (g.dy < -80 || g.vy < -0.5)) setMode('browse');
          lift.value = withSpring(0, { damping: 16, stiffness: 200 });
        },
        onPanResponderTerminate: () => {
          drag.value = withSpring(0);
          lift.value = withSpring(0);
        },
      }),
    [width, setMode],
  );

  /* ------------------------------------ a picked card grows into the scene */
  const [expanding, setExpanding] = useState<Expanding | null>(null);
  const grow = useSharedValue(0);
  const pick = useCallback((s: Sound, rect: CardRect, uri: string | undefined) => {
    setRevealOrigin((rect.x + rect.w / 2) / width, (rect.y + rect.h / 2) / height, 700);
    if (s.id !== usePlayer.getState().soundId || !usePlayer.getState().playing) void playSound(s.id);
    if (!reduced) {
      setExpanding({ rect, uri, colors: s.mood.colors });
      grow.value = 0;
      grow.value = withTiming(1, { duration: GROW_MS, easing: Easing.bezier(0.3, 0, 0.1, 1) });
      setTimeout(() => setExpanding(null), GROW_MS + 80);
    }
    setMode('immersive');
  }, [width, height, reduced, setMode]);

  /* ---------------------------------------------------------------- styles */
  const sceneStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + browse.value * 0.08 + lift.value * -0.0003 }] }));
  const dimStyle = useAnimatedStyle(() => ({ opacity: browse.value * 0.55 }));
  const immersiveStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, browse.value * 1.6),
    transform: [{ translateY: browse.value * -40 + lift.value * 0.25 }, { scale: 1 - browse.value * 0.06 }],
  }));
  const chromeStyle = useAnimatedStyle(() => ({ opacity: chrome.value }));
  const softStyle = useAnimatedStyle(() => ({ opacity: 0.35 + chrome.value * 0.65 }));
  const orbMove = useAnimatedStyle(() => ({ transform: [{ translateX: drag.value * 0.12 }] }));
  const titleMove = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(0.85, Math.abs(drag.value) / (width * 0.5)),
    transform: [{ translateX: drag.value * 0.55 }],
  }));
  const hintStyle = useAnimatedStyle(() => ({ opacity: chrome.value * (1 + lift.value / 60), transform: [{ translateY: lift.value * 0.4 }] }));
  const browseStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, browse.value * 1.4 - 0.4),
    transform: [{ translateY: (1 - browse.value) * 70 }],
  }));
  const growStyle = useAnimatedStyle(() => {
    if (!expanding) return { opacity: 0 };
    const g = grow.value;
    const { rect } = expanding;
    return {
      left: rect.x * (1 - g),
      top: rect.y * (1 - g),
      width: rect.w + (width - rect.w) * g,
      height: rect.h + (height - rect.h) * g,
      borderRadius: 28 * (1 - g),
      opacity: g < 0.55 ? 1 : 1 - (g - 0.55) / 0.45,
    };
  });

  // The interface is in English: keep the date consistent with it.
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  const date = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const orbSize = Math.max(118, Math.min(170, (height - 500) * 0.6));
  const immersive = mode === 'immersive';

  return (
    <View style={styles.root} {...pan.panHandlers}>
      <StatusBar style="light" />
      <Animated.View style={[StyleSheet.absoluteFill, sceneStyle]} pointerEvents="none">
        <SceneStack soundId={sound.id} mood={sound.mood} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.dim, dimStyle]} pointerEvents="none" />

      {/* ------------------------------------------------ immersive player */}
      <Animated.View
        style={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }, immersiveStyle]}
        pointerEvents={immersive ? 'box-none' : 'none'}
        accessibilityElementsHidden={!immersive}
        importantForAccessibility={immersive ? 'auto' : 'no-hide-descendants'}
      >
        <Animated.View style={[styles.topBar, chromeStyle]} pointerEvents={chromeVisible ? 'box-none' : 'none'}>
          <Touchable onPress={onHome} label="Back to welcome screen">
            <Glass radius={18} style={styles.brand} blur={false}>
              <Text style={styles.brandText}>irery</Text>
            </Glass>
          </Touchable>
          <SleepTimerButton accent={sound.mood.accent} />
        </Animated.View>

        <Animated.View style={[styles.clockBlock, softStyle]} pointerEvents="none" accessible accessibilityLabel={`${time}, ${date}`}>
          <Text style={styles.clock}>{time}</Text>
          <Text style={styles.date}>{date}</Text>
        </Animated.View>

        <View style={styles.center} pointerEvents="box-none">
          <Animated.View style={orbMove}>
            <Orb mood={sound.mood} playing={playing} size={orbSize} onPress={togglePlay} label={playing ? `Pause ${sound.title}` : `Play ${sound.title}`}>
              <Ionicons name={playing ? 'pause' : 'play'} size={orbSize * 0.22} color="rgba(255,255,255,0.95)" style={{ marginLeft: playing ? 0 : 4 }} />
            </Orb>
          </Animated.View>
          <View style={styles.nowRow} pointerEvents="box-none">
            <Animated.View style={chromeStyle} pointerEvents={chromeVisible ? 'auto' : 'none'}>
              <Touchable onPress={() => { setRevealOrigin(0, 0.5, 1000); step(-1); }} label="Previous sound" style={styles.stepBtn} feedback="light">
                <Ionicons name="chevron-back" size={26} color="rgba(255,255,255,0.85)" />
              </Touchable>
            </Animated.View>
            <Animated.View style={[styles.nowText, titleMove]} pointerEvents="none" accessibilityLiveRegion="polite">
              <Text style={styles.soundTitle}>{sound.title}</Text>
              <Text style={styles.soundHint}>{sound.hint}</Text>
            </Animated.View>
            <Animated.View style={chromeStyle} pointerEvents={chromeVisible ? 'auto' : 'none'}>
              <Touchable onPress={() => { setRevealOrigin(1, 0.5, 1000); step(1); }} label="Next sound" style={styles.stepBtn} feedback="light">
                <Ionicons name="chevron-forward" size={26} color="rgba(255,255,255,0.85)" />
              </Touchable>
            </Animated.View>
          </View>
        </View>

        <Animated.View style={chromeStyle} pointerEvents={chromeVisible ? 'box-none' : 'none'}>
          <Animated.View style={[styles.swipeHint, hintStyle]} pointerEvents="none">
            <Ionicons name="chevron-up" size={16} color="rgba(255,255,255,0.6)" />
            <Text style={styles.swipeHintText}>Swipe up for scenes</Text>
          </Animated.View>
          <Glass radius={26} style={styles.bar}>
            <Touchable onPress={() => setMode('browse')} label="Browse scenes" style={styles.scenesBtn} feedback="light">
              <Ionicons name="albums-outline" size={18} color="#fff" />
              <Text style={styles.scenesText}>Scenes</Text>
            </Touchable>
            <View style={styles.barVolume}>
              <VolumeSlider accent={sound.mood.accent} />
            </View>
          </Glass>
        </Animated.View>
      </Animated.View>

      {/* ---------------------------------------------------- scene carousel */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.browse, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 18 }, browseStyle]}
        pointerEvents={immersive ? 'none' : 'box-none'}
        accessibilityElementsHidden={immersive}
        importantForAccessibility={immersive ? 'no-hide-descendants' : 'auto'}
        accessibilityViewIsModal={!immersive}
      >
        <View style={styles.browseHeader}>
          <View>
            <Text style={styles.browseKicker}>Now playing · {sound.title}</Text>
            <Text style={styles.browseTitle} accessibilityRole="header">Choose a scene</Text>
          </View>
          <Touchable onPress={() => setMode('immersive')} label="Close scenes" style={styles.closeBtn}>
            <Glass radius={22} style={styles.closeGlass} blur={false}>
              <Ionicons name="chevron-down" size={22} color="#fff" />
            </Glass>
          </Touchable>
        </View>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          {/* Mounted once opened, then kept: re-opening is instant. */}
          {openKey > 0 && <SceneCarousel currentId={sound.id} playing={playing} onPick={pick} openKey={openKey} />}
        </View>
        <Text style={styles.browseFoot}>Swipe to explore · tap a scene to step in</Text>
      </Animated.View>

      {/* --------------------------------- the picked card, growing to full screen */}
      {expanding && (
        <Animated.View style={[styles.grow, growStyle]} pointerEvents="none">
          <LinearGradient colors={[expanding.colors[2], expanding.colors[0]]} style={StyleSheet.absoluteFill} />
          {expanding.uri && <Image source={{ uri: expanding.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />}
        </Animated.View>
      )}
    </View>
  );
}

const shadow = { textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 12 };

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0f1a', overflow: 'hidden' },
  dim: { backgroundColor: '#05070c' },
  content: { ...StyleSheet.absoluteFill, paddingHorizontal: 12 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, height: 48 },
  brand: { paddingHorizontal: 16, height: 36, justifyContent: 'center' },
  brandText: { fontFamily: font.light, fontSize: 17, letterSpacing: 4, color: 'rgba(255,255,255,0.9)' },
  clockBlock: { alignItems: 'center', marginTop: 8 },
  clock: { fontFamily: font.light, fontSize: 64, letterSpacing: 2, color: '#fff', fontVariant: ['tabular-nums'], ...shadow },
  date: { fontFamily: font.medium, fontSize: 12, letterSpacing: 2.2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)', ...shadow },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nowRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -10 },
  stepBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  nowText: { alignItems: 'center', minWidth: 190 },
  soundTitle: { fontFamily: font.light, fontSize: 30, color: '#fff', letterSpacing: 1, ...shadow },
  soundHint: { fontFamily: font.regular, fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2, ...shadow },
  swipeHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 10 },
  swipeHintText: { fontFamily: font.medium, fontSize: 12, letterSpacing: 0.8, color: 'rgba(255,255,255,0.6)', ...shadow },
  bar: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingLeft: 8, paddingRight: 18, gap: 10 },
  scenesBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)' },
  scenesText: { fontFamily: font.medium, fontSize: 14, color: '#fff' },
  barVolume: { flex: 1 },
  browse: { justifyContent: 'space-between' },
  browseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, marginTop: 8 },
  browseKicker: { fontFamily: font.medium, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' },
  browseTitle: { fontFamily: font.light, fontSize: 30, color: '#fff', marginTop: 2 },
  closeBtn: { width: 44, height: 44 },
  closeGlass: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  browseFoot: { fontFamily: font.regular, fontSize: 13, color: 'rgba(255,255,255,0.55)', textAlign: 'center' },
  grow: { position: 'absolute', overflow: 'hidden' },
});
