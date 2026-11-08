import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { Mood } from '../../sounds';

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

/** Deterministic pseudo-random numbers so particles don't jump on re-render. */
function seeded(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

/**
 * Repeats an animation forever by restarting it when it finishes.
 * (Animated.loop only runs its first iteration on react-native-web.)
 */
export function repeat(build: (first: boolean) => Animated.CompositeAnimation) {
  let alive = true;
  let current: Animated.CompositeAnimation | null = null;
  const run = (first: boolean) => {
    if (!alive) return;
    current = build(first);
    current.start(({ finished }) => { if (finished) run(false); });
  };
  run(true);
  return () => { alive = false; current?.stop(); };
}

/** A looping 0→1 driver; `delay` only offsets the first cycle so particles stay staggered. */
function useLoop(duration: number, delay = 0, reduced = false) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) {
      v.setValue(0.5);
      return;
    }
    return repeat((first) => {
      v.setValue(0);
      return Animated.timing(v, { toValue: 1, duration, delay: first ? delay : 0, easing: Easing.linear, useNativeDriver: true });
    });
  }, [duration, delay, reduced]);
  return v;
}

/** A looping value that eases back and forth between 0 and 1. */
function usePingPong(duration: number, delay = 0, reduced = false) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) {
      v.setValue(0.5);
      return;
    }
    return repeat((first) =>
      Animated.sequence([
        Animated.delay(first ? delay : 0),
        Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
  }, [duration, delay, reduced]);
  return v;
}

interface SceneProps {
  mood: Mood;
  reduced: boolean;
}

/* ------------------------------------------------------------------ */
/* particle primitives                                                 */
/* ------------------------------------------------------------------ */

function RainDrop({ x, len, speed, delay, color, height, slant, reduced }: { x: number; len: number; speed: number; delay: number; color: string; height: number; slant: number; reduced: boolean }) {
  const p = useLoop(speed, delay, reduced);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: -len,
        width: 1.4,
        height: len,
        borderRadius: 1,
        backgroundColor: color,
        opacity: 0.45,
        transform: [
          { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, height + len * 2] }) },
          { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, slant] }) },
          { rotate: `${-Math.atan2(slant, height) * (180 / Math.PI)}deg` },
        ],
      }}
    />
  );
}

function Rain({ mood, reduced, flashes = false }: SceneProps & { flashes?: boolean }) {
  const { width, height } = useWindowDimensions();
  const drops = useMemo(() => {
    const r = seeded(11);
    const n = Math.round(24 + mood.intensity * 36);
    return Array.from({ length: n }, () => ({ x: r() * (width + 80) - 40, len: 12 + r() * 22, speed: 900 + r() * 900, delay: r() * 1800 }));
  }, [width, mood.intensity]);
  return (
    <>
      {drops.map((d, i) => (
        <RainDrop key={i} {...d} color={mood.accent} height={height} slant={-40} reduced={reduced} />
      ))}
      {flashes && !reduced && <Lightning />}
    </>
  );
}

/** Occasional soft sheet lightning for the storm. */
function Lightning() {
  const o = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const strike = () => {
      if (!alive) return;
      Animated.sequence([
        Animated.timing(o, { toValue: 0.22, duration: 90, useNativeDriver: true }),
        Animated.timing(o, { toValue: 0.05, duration: 120, useNativeDriver: true }),
        Animated.timing(o, { toValue: 0.16, duration: 80, useNativeDriver: true }),
        Animated.timing(o, { toValue: 0, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
      timer = setTimeout(strike, 7000 + Math.random() * 9000);
    };
    timer = setTimeout(strike, 3000);
    return () => { alive = false; clearTimeout(timer); };
  }, []);
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#dfe6ff', opacity: o }]} />;
}

function Ripple({ x, y, size, duration, delay, color, reduced }: { x: number; y: number; size: number; duration: number; delay: number; color: string; reduced: boolean }) {
  const p = useLoop(duration, delay, reduced);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.2,
        borderColor: color,
        opacity: p.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.45, 0] }),
        transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.1, 1] }) }, { scaleY: 0.45 }],
      }}
    />
  );
}

function Ripples({ mood, reduced, centered = false }: SceneProps & { centered?: boolean }) {
  const { width, height } = useWindowDimensions();
  const rings = useMemo(() => {
    const r = seeded(23);
    const n = centered ? 4 : Math.round(5 + mood.intensity * 6);
    return Array.from({ length: n }, (_, i) => ({
      x: centered ? width / 2 : r() * width,
      y: centered ? height * 0.42 : height * (0.45 + r() * 0.5),
      size: centered ? Math.max(width, height) * 0.9 : 120 + r() * 220,
      duration: centered ? mood.breath * 1000 : 3800 + r() * 3200,
      delay: centered ? (i * mood.breath * 1000) / 4 : r() * 5000,
    }));
  }, [width, height, mood.intensity, mood.breath, centered]);
  return <>{rings.map((p, i) => <Ripple key={i} {...p} color={mood.accent} reduced={reduced} />)}</>;
}

function Wave({ y, color, opacity, duration, amplitude, width, reduced }: { y: number; color: string; opacity: number; duration: number; amplitude: number; width: number; reduced: boolean }) {
  const p = usePingPong(duration, 0, reduced);
  const bob = usePingPong(duration * 0.63, 400, reduced);
  const w = width * 2.4;
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: -width * 0.7,
        top: y,
        width: w,
        height: w,
        borderRadius: w / 2,
        backgroundColor: color,
        opacity,
        transform: [
          { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [-amplitude, amplitude] }) },
          { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, amplitude * 0.35] }) },
        ],
      }}
    />
  );
}

function Waves({ mood, reduced }: SceneProps) {
  const { width, height } = useWindowDimensions();
  const speed = 1 - mood.intensity * 0.4;
  return (
    <>
      <Wave y={height * 0.62} color={mood.accent} opacity={0.07} duration={9000 * speed} amplitude={60} width={width} reduced={reduced} />
      <Wave y={height * 0.7} color={mood.accent} opacity={0.08} duration={7000 * speed} amplitude={80} width={width} reduced={reduced} />
      <Wave y={height * 0.79} color={mood.accent} opacity={0.1} duration={5600 * speed} amplitude={100} width={width} reduced={reduced} />
    </>
  );
}

/** Generic drifting dot used by fireflies, embers, stream, wind, bokeh, sparkles. */
function Dot({
  x, y, dx, dy, size, duration, delay, color, glow, peak, stretch = 1, reduced,
}: { x: number; y: number; dx: number; dy: number; size: number; duration: number; delay: number; color: string; glow: boolean; peak: number; stretch?: number; reduced: boolean }) {
  const p = useLoop(duration, delay, reduced);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size * stretch,
        height: size,
        borderRadius: size,
        backgroundColor: color,
        shadowColor: color,
        shadowOpacity: glow ? 0.9 : 0,
        shadowRadius: glow ? size * 1.5 : 0,
        opacity: p.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, peak, peak, 0] }),
        transform: [
          { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
          { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
        ],
      }}
    />
  );
}

type DotKind = 'fireflies' | 'embers' | 'stream' | 'wind' | 'bokeh' | 'stars' | 'grain' | 'sparkles';

function Dots({ mood, reduced, kind }: SceneProps & { kind: DotKind }) {
  const { width, height } = useWindowDimensions();
  const dots = useMemo(() => {
    const r = seeded(kind.length * 97);
    const base = { fireflies: 22, embers: 26, stream: 28, wind: 16, bokeh: 12, stars: 60, grain: 70, sparkles: 20 }[kind];
    const n = Math.round(base * (0.6 + mood.intensity * 0.6));
    return Array.from({ length: n }, () => {
      switch (kind) {
        case 'fireflies':
          return { x: r() * width, y: height * (0.2 + r() * 0.7), dx: (r() - 0.5) * 80, dy: (r() - 0.5) * 80, size: 3 + r() * 3, duration: 4000 + r() * 4000, delay: r() * 4000, glow: true, peak: 0.85 };
        case 'embers':
          return { x: width * (0.25 + r() * 0.5), y: height * (0.85 + r() * 0.15), dx: (r() - 0.5) * 120, dy: -height * (0.4 + r() * 0.4), size: 2 + r() * 3, duration: 3500 + r() * 3500, delay: r() * 4000, glow: true, peak: 0.9 };
        case 'stream':
          return { x: -40, y: height * (0.55 + r() * 0.4), dx: width + 80, dy: (r() - 0.5) * 30, size: 2 + r() * 2.5, duration: 3000 + r() * 3000, delay: r() * 4000, glow: false, peak: 0.55, stretch: 3 + r() * 4 };
        case 'wind':
          return { x: -width * 0.4, y: height * r(), dx: width * 1.6, dy: (r() - 0.5) * 60, size: 1.2, duration: 2600 + r() * 2600, delay: r() * 5000, glow: false, peak: 0.3, stretch: 60 + r() * 90 };
        case 'bokeh':
          return { x: r() * width - 40, y: r() * height, dx: (r() - 0.5) * 60, dy: -30 - r() * 60, size: 40 + r() * 90, duration: 9000 + r() * 8000, delay: r() * 6000, glow: false, peak: 0.12 };
        case 'stars':
          return { x: r() * width, y: r() * height * 0.75, dx: 0, dy: 0, size: 1 + r() * 2, duration: 2500 + r() * 4000, delay: r() * 4000, glow: r() > 0.7, peak: 0.4 + r() * 0.5 };
        case 'grain':
          return { x: r() * width, y: r() * height, dx: (r() - 0.5) * 6, dy: (r() - 0.5) * 6, size: 1 + r() * 1.5, duration: 600 + r() * 900, delay: r() * 1000, glow: false, peak: 0.35 };
        case 'sparkles':
          return { x: r() * width, y: height * (0.05 + r() * 0.6), dx: (r() - 0.5) * 20, dy: 10 + r() * 30, size: 2 + r() * 2.5, duration: 2200 + r() * 2600, delay: r() * 5000, glow: true, peak: 0.85 };
      }
    });
  }, [width, height, kind, mood.intensity]);
  return <>{dots.map((d, i) => <Dot key={i} {...d} color={mood.accent} reduced={reduced} />)}</>;
}

/** Huge soft colour blobs drifting slowly — used by the noise and drone moods. */
function AuroraBlob({ x, y, size, colors, duration, delay, reduced }: { x: number; y: number; size: number; colors: [string, string]; duration: number; delay: number; reduced: boolean }) {
  const p = usePingPong(duration, delay, reduced);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
        transform: [
          { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [-size * 0.12, size * 0.12] }) },
          { scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.15] }) },
        ],
      }}
    >
      {/* Stacked translucent discs approximate a soft radial glow (no hard edge). */}
      {[1, 0.8, 0.62, 0.46, 0.32, 0.2].map((k, i) => (
        <View key={i} style={{ position: 'absolute', width: size * k, height: size * k, borderRadius: (size * k) / 2, backgroundColor: i % 2 ? colors[1] : colors[0], opacity: 0.035 }} />
      ))}
    </Animated.View>
  );
}

function Aurora({ mood, reduced }: SceneProps) {
  const { width, height } = useWindowDimensions();
  const s = Math.max(width, height);
  return (
    <>
      <AuroraBlob x={width * 0.2} y={height * 0.25} size={s * 0.9} colors={[mood.accent, mood.colors[2]]} duration={14000} delay={0} reduced={reduced} />
      <AuroraBlob x={width * 0.85} y={height * 0.55} size={s * 0.8} colors={[mood.colors[2], mood.accent]} duration={17000} delay={2000} reduced={reduced} />
      <AuroraBlob x={width * 0.4} y={height * 0.9} size={s * 0.7} colors={[mood.accent, mood.colors[1]]} duration={12000} delay={4000} reduced={reduced} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* public                                                              */
/* ------------------------------------------------------------------ */

/** The animated layer that matches the sound's mood. Re-mounts (and fades) on change. */
export const SceneLayer = memo(function SceneLayer({ mood }: { mood: Mood }) {
  const reduced = useReducedMotion();
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, []);
  const props = { mood, reduced };
  let content: React.ReactNode;
  switch (mood.scene) {
    case 'rain': content = <Rain {...props} />; break;
    case 'storm': content = <Rain {...props} flashes />; break;
    case 'ripples': content = <Ripples {...props} centered={mood.intensity < 0.45} />; break;
    case 'waves': content = <Waves {...props} />; break;
    case 'aurora': content = <><Aurora {...props} /><Dots {...props} kind="stars" /></>; break;
    default: content = <Dots {...props} kind={mood.scene} />;
  }
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: fade }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {content}
    </Animated.View>
  );
});

/**
 * Background gradient that cross-fades between moods: the previous gradient
 * stays underneath while the new one fades in on top.
 */
export function MoodBackground({ mood }: { mood: Mood }) {
  const [layers, setLayers] = useState<{ key: number; colors: Mood['colors'] }[]>([{ key: 0, colors: mood.colors }]);
  const fade = useRef(new Animated.Value(1)).current;
  const key = useRef(0);

  useEffect(() => {
    if (layers[layers.length - 1].colors === mood.colors) return;
    key.current += 1;
    setLayers((l) => [l[l.length - 1], { key: key.current, colors: mood.colors }]);
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start(() => {
      setLayers((l) => l.slice(-1));
    });
  }, [mood.colors]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {layers.map((layer, i) => {
        const top = i === layers.length - 1 && layers.length > 1;
        return (
          <Animated.View key={layer.key} style={[StyleSheet.absoluteFill, top && { opacity: fade }]}>
            <LinearGradient colors={layer.colors} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
          </Animated.View>
        );
      })}
    </View>
  );
}
