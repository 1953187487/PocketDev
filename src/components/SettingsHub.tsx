import { AuroraBackdrop, Divider, Pill, SectionLabel } from '@/ui';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { alpha, radius, space, useTheme } from '@/theme';
import { useAppStore } from '@/store/app';
import { APP_VERSION } from '@/config';

type IconName = keyof typeof Ionicons.glyphMap;

interface Entry {
  icon: IconName;
  title: string;
  subtitle: string;
  route: string;
  badge?: { text: string; color?: string; icon?: IconName };
}

export function SettingsHub() {
  const { theme } = useTheme();
  const { palette, primary } = theme;
  const router = useRouter();
  const { provider, git, prefs, localModels } = useAppStore();

  const entries: Entry[] = [
    {
      icon: 'server-outline',
      title: '自定义服务商',
      subtitle: provider.model ? `模型：${provider.model}` : '配置 AI 对话的服务商与模型',
      route: '/settings/provider',
      badge: provider.apiKey ? { text: '已配置', color: palette.success, icon: 'checkmark-circle' } : undefined,
    },
    {
      icon: 'key-outline',
      title: '仓库配置',
      subtitle: git.token ? `已连接 ${git.platform}${git.username ? ` · ${git.username}` : ''}` : '配置访问令牌，一键授权代码托管平台',
      route: '/settings/repo',
      badge: git.token ? { text: '已连接', color: palette.success, icon: 'key' } : undefined,
    },
    {
      icon: 'extension-puzzle-outline',
      title: '模型管理',
      subtitle: localModels.length ? `${localModels.length} 个本地模型` : '下载 / 导入本地模型（翻译、语音、对话）',
      route: '/settings/models',
      badge: localModels.length ? { text: `${localModels.length}`, icon: 'cube' } : undefined,
    },
    {
      icon: 'color-palette-outline',
      title: '外观与语言',
      subtitle: `${prefs.language === 'zh' ? '中文' : 'English'} · 主题${prefs.language === 'zh' ? '模式' : 'mode'}`,
      route: '/settings/appearance',
    },
    {
      icon: 'cloud-download-outline',
      title: '检查更新',
      subtitle: `当前版本 v${APP_VERSION}${prefs.autoUpdate ? ' · 自动更新已开启' : ' · 自动更新已关闭'}`,
      route: '/settings/update',
    },
    {
      icon: 'shield-checkmark-outline',
      title: '协议与隐私',
      subtitle: prefs.agreementsAccepted ? '开源协议 · 用户须知 · 隐私协议' : '阅读并同意相关协议',
      route: '/settings/agreements',
      badge: prefs.privacyAccepted ? { text: '已同意', color: palette.success, icon: 'shield-checkmark' } : undefined,
    },
    {
      icon: 'information-circle-outline',
      title: '关于 PocketDev',
      subtitle: '开发者 · 贡献者 · 赞助支持 · 版本信息',
      route: '/settings/about',
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      <AuroraBackdrop />
      <View style={[styles.header, { paddingTop: 0 }]}>
        <Text style={[styles.title, { color: palette.text }]}>设置</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionLabel>配置</SectionLabel>
        {entries.slice(0, 3).map((e, i) => (
          <EntryCard key={e.route} entry={e} last={i === 2} palette={palette} primary={primary} onPress={() => router.push(e.route)} />
        ))}
        <SectionLabel>通用</SectionLabel>
        {entries.slice(3).map((e, i, arr) => (
          <EntryCard key={e.route} entry={e} last={i === arr.length - 1} palette={palette} primary={primary} onPress={() => router.push(e.route)} />
        ))}
        <View style={{ alignItems: 'center', marginTop: space.xl }}>
          <Pill text={`PocketDev v${APP_VERSION} · AGPL-3.0`} color={palette.textFaint} icon="logo-github" />
        </View>
      </ScrollView>
    </View>
  );
}

function EntryCard({
  entry,
  last,
  palette,
  primary,
  onPress,
}: {
  entry: Entry;
  last: boolean;
  palette: { text: string; textDim: string; textFaint: string; border: string; surface: string };
  primary: string;
  onPress: () => void;
}) {
  return (
    <View style={{ paddingHorizontal: space.lg, marginBottom: 10 }}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          { borderColor: palette.border, backgroundColor: palette.surface, opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <View style={[styles.cardIcon, { backgroundColor: alpha(primary, 0.12) }]}>
          <Ionicons name={entry.icon} size={20} color={primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: palette.text, fontSize: 15, fontWeight: '700' }}>{entry.title}</Text>
          <Text style={{ color: palette.textDim, fontSize: 12.5, marginTop: 2 }} numberOfLines={1}>
            {entry.subtitle}
          </Text>
        </View>
        {entry.badge ? <Pill text={entry.badge.text} color={entry.badge.color} icon={entry.badge.icon} /> : null}
        <Ionicons name="chevron-forward" size={17} color={palette.textFaint} />
      </Pressable>
      {!last ? <Divider style={{ marginHorizontal: 4 }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: space.lg, paddingBottom: space.md },
  title: { fontSize: 26, fontWeight: '800' },
  content: { paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  cardIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
