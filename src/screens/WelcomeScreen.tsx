import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BreathingOrb, font, Touchable } from '../components/ui';
import { MoodBackground, SceneLayer } from '../components/scenes/Scenes';
import type { Sound } from '../sounds';

export function WelcomeScreen({ sound, onBegin }: { sound: Sound; onBegin: () => void }) {
  const insets = useSafeAreaInsets();
  const appear = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, []);

  return (
    <View style={styles.root}>
      <MoodBackground mood={sound.mood} />
      <SceneLayer key={sound.id} mood={sound.mood} />
      <Animated.View
        style={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32, opacity: appear, transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] },
        ]}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <BreathingOrb mood={sound.mood} playing>
            <Text style={styles.title} accessibilityRole="header">Irery</Text>
          </BreathingOrb>
          <Text style={styles.tagline}>Your own quiet bubble</Text>
          <Text style={styles.body}>Nineteen gentle soundscapes that work fully offline. Breathe in, breathe out.</Text>
        </View>
        <Touchable onPress={onBegin} label="Begin" style={[styles.button, { borderColor: `${sound.mood.accent}66` }]}>
          <Text style={styles.buttonText}>Begin</Text>
        </Touchable>
        <Text style={styles.footnote}>Continue with “{sound.title}”</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0f1a' },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 32 },
  title: { fontFamily: font.light, fontSize: 34, color: '#fff', letterSpacing: 3 },
  tagline: { fontFamily: font.medium, fontSize: 13, letterSpacing: 2.4, textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginTop: 8 },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 23, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 14, maxWidth: 300 },
  button: {
    minWidth: 200,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontFamily: font.medium, fontSize: 16, letterSpacing: 2, color: '#fff' },
  footnote: { fontFamily: font.regular, fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 14 },
});
