import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Orb } from '../components/Orb';
import { Glass, font, Touchable } from '../components/ui';
import { SceneStack } from '../scenes/ShaderScene';
import type { Sound } from '../sounds';

export function WelcomeScreen({ sound, onBegin }: { sound: Sound; onBegin: () => void }) {
  const insets = useSafeAreaInsets();
  const appear = useSharedValue(0);
  useEffect(() => {
    appear.value = withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) });
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: appear.value, transform: [{ translateY: (1 - appear.value) * 16 }] }));

  return (
    <View style={styles.root}>
      <SceneStack soundId={sound.id} mood={sound.mood} />
      <Animated.View style={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28 }, style]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Orb mood={sound.mood} playing size={160}>
            <Text style={styles.title} accessibilityRole="header">Irery</Text>
          </Orb>
        </View>
        <Glass radius={30} style={styles.card}>
          <Text style={styles.tagline}>Your own quiet bubble</Text>
          <Text style={styles.body}>Nineteen soundscapes and living scenes, entirely offline. Breathe in, breathe out.</Text>
          <Touchable onPress={onBegin} label="Begin" feedback="medium" scaleTo={0.96}>
            <View style={[styles.button, { backgroundColor: sound.mood.accent }]}>
              <Text style={styles.buttonText}>Begin</Text>
            </View>
          </Touchable>
          <Text style={styles.footnote}>Continue with “{sound.title}”</Text>
        </Glass>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0f1a' },
  content: { flex: 1, paddingHorizontal: 16 },
  title: { fontFamily: font.light, fontSize: 32, color: '#fff', letterSpacing: 3 },
  card: { padding: 24, alignItems: 'center', gap: 12 },
  tagline: { fontFamily: font.medium, fontSize: 13, letterSpacing: 2.4, textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)' },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 23, color: 'rgba(255,255,255,0.7)', textAlign: 'center', maxWidth: 300 },
  button: { minWidth: 220, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  buttonText: { fontFamily: font.semibold, fontSize: 16, letterSpacing: 1.6, color: '#0b0f1a' },
  footnote: { fontFamily: font.regular, fontSize: 12, color: 'rgba(255,255,255,0.5)' },
});
