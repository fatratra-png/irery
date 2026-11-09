import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, Text, useWindowDimensions, View, type GestureResponderEvent } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing, type SharedValue } from 'react-native-reanimated';
import { reactive } from '../audio/reactive';
import { useThumbs } from '../scenes/engine';
import { useReducedMotion } from '../scenes/ShaderScene';
import { CATEGORIES, SOUNDS, type Sound } from '../sounds';
import { font, haptic, Touchable } from './ui';

/** Geometry of the carousel for a given screen width. */
export function carouselMetrics(width: number, height: number) {
  const cardW = Math.round(Math.min(310, width * 0.7));
  const cardH = Math.round(Math.min(cardW * 1.45, height * 0.56));
  const gap = 14;
  return { cardW, cardH, gap, item: cardW + gap, side: (width - cardW) / 2, parallax: 1.3 };
}

/** Where a tapped card sits on screen, so the player can grow it to full screen. */
export interface CardRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Three bars dancing with the real loudness: "this one is playing". */
function Equalizer({ color, playing }: { color: string; playing: boolean }) {
  const reduced = useReducedMotion();
  const wob = useSharedValue(0);
  useEffect(() => {
    wob.value = playing && !reduced ? withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }), -1, true) : withTiming(0);
  }, [playing, reduced]);
  return (
    <View style={styles.eq}>
      {[0, 1, 2].map((k) => <EqBar key={k} k={k} wob={wob} color={color} playing={playing} />)}
    </View>
  );
}

function EqBar({ k, wob, color, playing }: { k: number; wob: SharedValue<number>; color: string; playing: boolean }) {
  const on = playing ? 1 : 0;
  const style = useAnimatedStyle(() => {
    const w = k === 1 ? 1 - wob.value : wob.value;
    const l = reactive.value.level;
    return { height: 4 + 10 * Math.min(1, on * (0.25 + 0.2 * w) + l * (0.6 + 0.4 * w)) };
  });
  return <Animated.View style={[styles.eqBar, { backgroundColor: color }, style]} />;
}

function Card({ sound, index, x, active, playing, metrics, onPick }: {
  sound: Sound;
  index: number;
  x: SharedValue<number>;
  active: boolean;
  playing: boolean;
  metrics: ReturnType<typeof carouselMetrics>;
  onPick: (sound: Sound, rect: CardRect, uri: string | undefined) => void;
}) {
  const { cardW, cardH, item, parallax } = metrics;
  const uri = useThumbs((s) => s.thumbs[sound.id]);

  // -1 … 0 … 1 : left neighbour, centred, right neighbour.
  const cardStyle = useAnimatedStyle(() => {
    const d = (x.value - index * item) / item;
    const a = Math.abs(d);
    return {
      opacity: interpolate(a, [0, 1, 2.5], [1, 0.72, 0.35], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(a, [0, 1], [0, 22], Extrapolation.CLAMP) },
        { scale: interpolate(a, [0, 1], [1, 0.86], Extrapolation.CLAMP) },
        { rotateZ: `${interpolate(d, [-1, 0, 1], [-2.5, 0, 2.5], Extrapolation.CLAMP)}deg` },
      ],
    };
  });
  // The picture slides slower than its card: depth.
  const imageStyle = useAnimatedStyle(() => {
    const d = (x.value - index * item) / item;
    return { transform: [{ translateX: interpolate(d, [-1, 0, 1], [cardW * 0.15, 0, -cardW * 0.15], Extrapolation.CLAMP) }] };
  });

  const pick = (e: GestureResponderEvent) => {
    const { pageX, pageY, locationX, locationY } = e.nativeEvent;
    onPick(sound, { x: pageX - locationX, y: pageY - locationY, w: cardW, h: cardH }, uri);
  };

  return (
    <Animated.View style={[{ width: cardW, height: cardH }, cardStyle]}>
      <Touchable onPress={pick} label={`${sound.title}, ${sound.hint}`} hint="Plays this scene in full screen" selected={active} scaleTo={0.95} feedback="light" style={[styles.card, { width: cardW, height: cardH, borderColor: active ? `${sound.mood.accent}cc` : 'rgba(255,255,255,0.14)' }]}>
        <LinearGradient colors={[sound.mood.colors[2], sound.mood.colors[0]]} style={StyleSheet.absoluteFill} />
        {uri ? (
          <Animated.View style={[styles.imageWrap, { width: cardW * parallax, left: -(cardW * (parallax - 1)) / 2 }, imageStyle]}>
            <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" fadeDuration={250} />
          </Animated.View>
        ) : null}
        <LinearGradient colors={['rgba(5,7,12,0)', 'rgba(5,7,12,0.15)', 'rgba(5,7,12,0.78)']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.cardTop}>
          <View style={[styles.cardIcon, { borderColor: `${sound.mood.accent}66` }]}>
            <Ionicons name={sound.icon} size={17} color={sound.mood.accent} />
          </View>
          {active && <Equalizer color={sound.mood.accent} playing={playing} />}
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.cardCategory}>{sound.category}</Text>
          <Text style={styles.cardTitle} numberOfLines={1}>{sound.title}</Text>
          <Text style={styles.cardHint} numberOfLines={1}>{sound.hint}</Text>
        </View>
      </Touchable>
    </Animated.View>
  );
}

/**
 * Every scene as a card on a horizontal reel. The centred card is in focus;
 * the category chips follow it and jump to a category's first scene.
 */
export function SceneCarousel({ currentId, playing, onPick, openKey }: {
  currentId: string;
  playing: boolean;
  onPick: (sound: Sound, rect: CardRect, uri: string | undefined) => void;
  /** Changes each time the carousel is opened: it re-centres on the current sound. */
  openKey: number;
}) {
  const { width, height } = useWindowDimensions();
  const metrics = useMemo(() => carouselMetrics(width, height), [width, height]);
  const { item, side, gap, cardH } = metrics;
  const currentIndex = Math.max(0, SOUNDS.findIndex((s) => s.id === currentId));
  const [focused, setFocused] = useState(currentIndex);
  const x = useSharedValue(currentIndex * item);
  const ref = useAnimatedRef<Animated.ScrollView>();
  const lastFocus = useRef(currentIndex);

  const onScroll = useAnimatedScrollHandler((e) => { x.value = e.contentOffset.x; });

  const jumpTo = (i: number, animated: boolean) => {
    (ref.current as unknown as { scrollTo: (o: { x: number; animated: boolean }) => void } | null)?.scrollTo({ x: i * item, animated });
    if (!animated) x.value = i * item;
    lastFocus.current = i;
    setFocused(i);
  };

  // Re-centre on the playing sound each time the reel opens.
  useEffect(() => {
    const t = setTimeout(() => jumpTo(currentIndex, false), 0);
    return () => clearTimeout(t);
  }, [openKey, width]);

  const settle = (offset: number) => {
    const i = Math.max(0, Math.min(SOUNDS.length - 1, Math.round(offset / item)));
    if (i !== lastFocus.current) {
      lastFocus.current = i;
      setFocused(i);
      haptic('selection');
    }
  };

  const focusedCategory = SOUNDS[focused]?.category;

  return (
    <View>
      <View style={styles.chips} accessibilityRole="tablist">
        {CATEGORIES.map((c) => {
          const on = c === focusedCategory;
          return (
            <Touchable key={c} label={c} selected={on} onPress={() => jumpTo(SOUNDS.findIndex((s) => s.category === c), true)} style={[styles.chip, on && styles.chipOn]}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{c}</Text>
            </Touchable>
          );
        })}
      </View>
      <Animated.ScrollView
        ref={ref}
        horizontal
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        snapToInterval={item}
        decelerationRate="fast"
        disableIntervalMomentum
        contentOffset={{ x: currentIndex * item, y: 0 }}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.x)}
        onScrollEndDrag={(e) => settle(e.nativeEvent.contentOffset.x)}
        contentContainerStyle={{ paddingHorizontal: side - gap / 2, height: cardH + 40, alignItems: 'center' }}
      >
        {SOUNDS.map((s, i) => (
          <View key={s.id} style={{ paddingHorizontal: gap / 2 }}>
            <Card sound={s} index={i} x={x} active={s.id === currentId} playing={playing} metrics={metrics} onPick={onPick} />
          </View>
        ))}
      </Animated.ScrollView>
      <View style={styles.dots} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {SOUNDS.map((s, i) => (
          <View key={s.id} style={[styles.dot, i === focused && { width: 16, backgroundColor: 'rgba(255,255,255,0.85)' }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 6, paddingHorizontal: 12 },
  chip: { paddingHorizontal: 14, height: 34, borderRadius: 17, justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  chipOn: { backgroundColor: 'rgba(255,255,255,0.16)', borderColor: 'rgba(255,255,255,0.3)' },
  chipText: { fontFamily: font.medium, fontSize: 13, letterSpacing: 0.4, color: 'rgba(255,255,255,0.6)' },
  chipTextOn: { color: '#fff' },
  card: { borderRadius: 28, overflow: 'hidden', borderWidth: 1 },
  imageWrap: { position: 'absolute', top: 0, bottom: 0 },
  cardTop: { position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5,7,12,0.35)', borderWidth: 1 },
  cardBottom: { position: 'absolute', left: 18, right: 18, bottom: 18 },
  cardCategory: { fontFamily: font.medium, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' },
  cardTitle: { fontFamily: font.light, fontSize: 28, color: '#fff', marginTop: 2 },
  cardHint: { fontFamily: font.regular, fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  eq: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 30, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 15, backgroundColor: 'rgba(5,7,12,0.35)' },
  eqBar: { width: 3, borderRadius: 1.5 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.3)' },
});
