import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '@/theme';
import { AppStoreProvider } from '@/store/app';
import { LaunchScreen } from '@/components/LaunchScreen';
import { ForceUpdateModal } from '@/components/ForceUpdateModal';
import { checkForUpdate, type ReleaseInfo } from '@/api/updates';

SplashScreen.preventAutoHideAsync().catch(() => {});

function ThemedRoot() {
  const { theme } = useTheme();
  const [launching, setLaunching] = useState(true);
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);

  const check = useCallback(async () => {
    const { hasUpdate: has, release: rel } = await checkForUpdate();
    setHasUpdate(has);
    setRelease(rel);
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.palette.bg }}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} translucent />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.palette.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
      </Stack>
      {launching ? <LaunchScreen onFinish={() => setLaunching(false)} /> : null}
      <ForceUpdateModal visible={hasUpdate && !launching} release={release} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppStoreProvider>
          <ThemedRoot />
        </AppStoreProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
