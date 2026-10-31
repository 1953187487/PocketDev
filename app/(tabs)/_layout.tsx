import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { GlassTabBar } from '@/components/GlassTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...(props as any)} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '对话',
          tabBarLabel: '对话',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="repo"
        options={{
          title: '仓库',
          tabBarLabel: '仓库',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'git-branch' : 'git-branch-outline'} size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '设置',
          tabBarLabel: '设置',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={20} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
