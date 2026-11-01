import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { alpha, radius, space, useTheme, AuroraBackdrop } from '@/ui';
import { useAppStore } from '@/store/app';

interface MoreEntry {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  route: string;
  badge?: string;
  badgeColor?: string;
}

export default function MoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { palette, primary } = theme;
  const { workspaces } = useAppStore();

  const localCount = workspaces.filter((w) => w.kind === 'local').length;

  const entries: MoreEntry[] = [
    {
      icon: 'folder-open-outline',
      title: '本地目录工作区',
      subtitle: '选择手机本地目录作为工作区',
      route: '/more/local',
      badge: localCount ? `${localCount} 个` : '未添加',
    },
    {
      icon: 'phone-portrait-outline',
      title: '手机自动化（小龙虾）',
      subtitle: 'Shizuku / Dhizuku 助手式设备操作',
      route: '/more/automation',
    },
    {
      icon: 'cube-outline',
      title: '本地模型',
      subtitle: '下载或导入本地推理模型文件',
      route: '/settings/models',
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      <AuroraBackdrop />
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Text style={[styles.headerTitle, { color: palette.text }]}>更多功能</Text>
        <Text style={[styles.headerSub, { color: palette.textFaint }]}>扩展能力与本地化工作区</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}>
        <View style={styles.grid}>
          {entries.map((e) => (
            <Pressable
              key={e.route}
              onPress={() => router.push(e.route)}
              style={({ pressed }) => [
                styles.card,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.surface,
                  shadowColor: palette.shadow,
                  shadowOpacity: 0.1,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 2,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={[styles.cardIcon, { backgroundColor: alpha(primary, 0.12) }]}>
                <Ionicons name={e.icon} size={22} color={primary} />
              </View>
              <Text style={[styles.cardTitle, { color: palette.text }]} numberOfLines={1}>
                {e.title}
              </Text>
              <Text style={[styles.cardSub, { color: palette.textDim }]} numberOfLines={2}>
                {e.subtitle}
              </Text>
              <View style={styles.cardFoot}>
                {e.badge ? (
                  <Text style={[styles.cardBadge, { color: palette.textFaint }]}>{e.badge}</Text>
                ) : (
                  <View />
                )}
                <Ionicons name="arrow-up-outline" size={15} color={palette.textFaint} />
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: space.lg, paddingBottom: space.md },
  headerTitle: { fontSize: 26, fontWeight: '800' },
  headerSub: { fontSize: 12.5, marginTop: 2 },
  content: { paddingHorizontal: space.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 16,
    gap: 6,
  },
  cardIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 15.5, fontWeight: '800' },
  cardSub: { fontSize: 12.5, lineHeight: 18, minHeight: 36 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  cardBadge: { fontSize: 11.5, fontWeight: '600' },
});
