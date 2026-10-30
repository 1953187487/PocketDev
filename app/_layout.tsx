import React, { useCallback, useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '@/theme';
import { ForceUpdateModal } from '@/components/ForceUpdateModal';
import { checkForUpdate, type ReleaseInfo } from '@/api/updates';

function ThemedRoot() {
  const { theme } = useTheme();
  const [checking, setChecking] = useState(true);
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    const { hasUpdate: has, release: rel } = await checkForUpdate();
    setHasUpdate(has);
    setRelease(rel);
    setChecking(false);
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return (
    <>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.palette.surface },
          headerTintColor: theme.palette.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: theme.palette.bg },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <ForceUpdateModal visible={hasUpdate} release={release} />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemedRoot />
    </ThemeProvider>
  );
}
