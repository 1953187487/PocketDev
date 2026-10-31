import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alpha, radius, useTheme } from '@/theme';

export interface TabBarProps {
  state: { routes: { key: string; name: string; params?: Record<string, unknown> }[]; index: number };
  navigation: { emit: (e: { target: string; type: string }) => { defaultPrevented: boolean }; navigate: (name: string) => void };
  insets?: { bottom: number };
  descriptors: Record<string, { options: { tabBarLabel?: string; tabBarIcon?: (p: { color: string; size: number; focused: boolean }) => React.ReactNode } }>;
}

export function GlassTabBar(props: TabBarProps) {
  const { theme } = useTheme();
  const { palette, primary } = theme;
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10);
  const { state, navigation } = props;

  const focus = (key: string, route: { key: string; name: string }) => {
    const event = navigation.emit({ target: key, type: 'tabPress' });
    if (!event.defaultPrevented) navigation.navigate(route.name);
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: bottomPad }]}>
      <View style={styles.frame}>
        <BlurView
          intensity={palette.mode === 'dark' ? 46 : 62}
          tint={palette.mode === 'dark' ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: palette.mode === 'dark' ? 'rgba(9,13,26,0.72)' : 'rgba(255,255,255,0.66)',
              borderRadius: radius.xxl,
            },
          ]}
        />
        <View style={[StyleSheet.absoluteFill, { borderRadius: radius.xxl, borderWidth: 1, borderColor: palette.border }]} />
        <View style={styles.items}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const opts = props.descriptors?.[route.key]?.options ?? {};
            const label = (opts.tabBarLabel as string) ?? route.name;
            return (
              <Pressable
                key={route.key}
                onPress={() => focus(route.key, route)}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                style={({ pressed }) => [
                  styles.item,
                  focused && { backgroundColor: alpha(primary, palette.mode === 'dark' ? 0.17 : 0.12) },
                  pressed && { transform: [{ scale: 0.96 }] },
                ]}
              >
                {opts.tabBarIcon ? (
                  opts.tabBarIcon({ color: focused ? primary : palette.textFaint, size: 20, focused })
                ) : null}
                <Text style={[styles.label, { color: focused ? primary : palette.textFaint }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12 },
  frame: { height: 58, borderRadius: radius.xxl, overflow: 'hidden' },
  items: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 5, gap: 4 },
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: radius.xl,
    height: '100%',
  },
  label: { fontSize: 12, fontWeight: '600' },
});

export const TAB_BAR_SPACE = Platform.select({ ios: 96, android: 96, default: 96 });
