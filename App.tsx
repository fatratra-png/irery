import { Outfit_300Light, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, useFonts } from '@expo-google-fonts/outfit';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { pause, playSound, restorePrefs, usePlayer } from './src/audio/player';
import { startReactive, stopReactive } from './src/audio/reactive';
import { PlayerScreen } from './src/screens/PlayerScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { soundById } from './src/sounds';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function App() {
  // Fonts are bundled with the app: no network needed.
  const [fontsLoaded] = useFonts({ Outfit_300Light, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold });
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [screen, setScreen] = useState<'welcome' | 'player'>('welcome');
  const soundId = usePlayer((s) => s.soundId);

  useEffect(() => {
    restorePrefs().finally(() => setPrefsLoaded(true));
    startReactive(); // feeds the scenes with the audio envelope at the playback position
    return stopReactive;
  }, []);

  const ready = fontsLoaded && prefsLoaded;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: '#0b0f1a' }} />;

  return (
    <SafeAreaProvider>
      {screen === 'welcome' ? (
        <WelcomeScreen
          sound={soundById(soundId)}
          onBegin={() => {
            setScreen('player');
            void playSound(soundId); // started from a tap, so autoplay is always allowed
          }}
        />
      ) : (
        <PlayerScreen
          onHome={() => {
            pause();
            setScreen('welcome');
          }}
        />
      )}
    </SafeAreaProvider>
  );
}
