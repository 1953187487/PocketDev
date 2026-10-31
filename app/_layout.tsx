import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import NetInfo from '@react-native-community/netinfo';
import { ThemeProvider, useTheme } from '@/theme';
import { AppStoreProvider, useAppStore } from '@/store/app';
import { LaunchScreen } from '@/components/LaunchScreen';
import { ForceUpdateModal } from '@/components/ForceUpdateModal';
import { Onboarding } from '@/components/Onboarding';
import { StarReminder } from '@/components/StarReminder';
import { checkForUpdate, type ReleaseInfo } from '@/api/updates';
import { APP_VERSION } from '@/config';

SplashScreen.preventAutoHideAsync().catch(() => {});

function ThemedRoot() {
  const { theme } = useTheme();
  const { prefs, providerReady } = useAppStore();
  const [launching, setLaunching] = useState(true);
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    if (checking) return;
    setChecking(true);
    try {
      const { hasUpdate: has, release: rel } = await checkForUpdate();
      setHasUpdate(has);
      setRelease(rel);
    } finally {
      setChecking(false);
    }
  }, [checking]);

  // 每次进入软件自动检查版本更新。
  useEffect(() => {
    check();
  }, [check]);

  // 断网恢复后数秒内自动重新检查，触发更新下载。
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        const t = setTimeout(check, 3000);
        return () => clearTimeout(t);
      }
    });
    return unsub;
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
      <ForceUpdateModal visible={hasUpdate && !launching && prefs.onboarded} release={release} />
      {providerReady && (!prefs.onboarded || prefs.onboardedVersion !== APP_VERSION) ? <Onboarding /> : null}
      <StarReminder />
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
