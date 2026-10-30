import React from 'react';
import { StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/theme';

export default function TabsLayout() {
  const { theme } = useTheme();
  const { palette, primary } = theme;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: palette.surface },
        headerTintColor: palette.text,
        headerTitleStyle: { fontWeight: '700' },
        headerBackground: () => (
          <BlurView intensity={40} tint={palette.mode === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        ),
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopColor: palette.glassBorder,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarBackground: () => (
          <BlurView intensity={45} tint={palette.mode === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        ),
        tabBarActiveTintColor: primary,
        tabBarInactiveTintColor: palette.textDim,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '主页',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="repo"
        options={{
          title: '仓库',
          tabBarIcon: ({ color, size }) => <Ionicons name="git-branch" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '设置',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
