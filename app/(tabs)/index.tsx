import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getBaseUrl, getApiKey } from '@/api/client';
import { checkForUpdate } from '@/api/updates';
import { Card, Row, StatusPill, Spacer, Screen } from '@/components/ui';
import { APP_REPO_URL, BASE_LAYER_REPO } from '@/config';
import { useTheme } from '@/theme';
import { getString, setString } from '@/storage';

export default function HomeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { palette, primary, accent } = theme;
  const [online, setOnline] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [backend, setBackend] = useState('');
  const [configured, setConfigured] = useState(false);

  const load = useCallback(async () => {
    const base = getBaseUrl();
    const key = getApiKey();
    setBackend(base);
    setConfigured(!!key);
    try {
      const res = await fetch(base + '/api/v1/users/status', {
        headers: key ? { Authorization: `Bearer ${key}` } : undefined,
      });
      setOnline(res.ok);
    } catch {
      setOnline(false);
    }
    const upd = await checkForUpdate();
    setHasUpdate(upd.hasUpdate);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const quickActions = [
    { icon: 'git-branch', title: '仓库配置', desc: '绑定 Git 身份并选择仓库', onPress: () => router.push('/repo'), color: primary },
    { icon: 'settings', title: '设置', desc: '主题 · 服务商 API · 模型 · 更新', onPress: () => router.push('/settings'), color: accent.primary },
  ];

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 90 }}>
        <Card glow>
          <Row style={{ justifyContent: 'space-between' }}>
            <View>
              <Text style={[styles.title, { color: palette.text }]}>PocketDev</Text>
              <Text style={[styles.subtitle, { color: palette.textDim }]}>手机端 AI 开发工具 · 1.0</Text>
            </View>
            <StatusPill text={online ? '在线' : '离线'} color={online ? palette.success : palette.danger} />
          </Row>
          <Spacer h={16} />
          <View style={styles.statRow}>
            <Stat label="后端" value={backend.replace(/^https?:\/\//, '') || '未配置'} />
            <Stat label="API Key" value={configured ? '已配置' : '未配置'} color={configured ? palette.success : palette.textDim} />
            <Stat label="更新" value={hasUpdate ? '可用' : '最新'} color={hasUpdate ? palette.warning : palette.success} />
          </View>
          {hasUpdate ? (
            <Pressable onPress={() => router.push('/settings')} style={[styles.updateBanner, { backgroundColor: palette.warning + '1F' }]}>
              <Ionicons name="cloud-download" size={18} color={palette.warning} />
              <Text style={[styles.updateBannerText, { color: palette.warning }]}>发现新版本，请立即更新</Text>
            </Pressable>
          ) : null}
        </Card>

        <Text style={[styles.section, { color: palette.textDim }]}>快捷入口</Text>
        {quickActions.map((a) => (
          <Card key={a.title} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onPress={a.onPress} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.iconBox, { backgroundColor: a.color + '26' }]}>
                <Ionicons name={a.icon as any} size={22} color={a.color} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.qaTitle, { color: palette.text }]}>{a.title}</Text>
                <Text style={[styles.qaDesc, { color: palette.textDim }]}>{a.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={palette.textDim} />
            </Pressable>
          </Card>
        ))}

        <Text style={[styles.section, { color: palette.textDim }]}>能力说明</Text>
        <Card>
          <Text style={[styles.abilityTitle, { color: palette.text }]}>底层平台</Text>
          <Text style={[styles.abilityText, { color: palette.textDim }]}>
            本工具基于 {BASE_LAYER_REPO} 的 AI 能力层构建，采用 AGPL-3.0 协议开源。
          </Text>
          <Spacer h={8} />
          <Pressable onPress={() => Linking.openURL(`https://github.com/${BASE_LAYER_REPO}`)}>
            <Text style={[styles.link, { color: primary }]}>查看底层仓库 →</Text>
          </Pressable>
          <Spacer h={12} />
          <Text style={[styles.abilityTitle, { color: palette.text }]}>核心能力</Text>
          <Text style={[styles.abilityText, { color: palette.textDim }]}>
            · AI 开发任务（develop / review）\n· Git 身份与仓库绑定\n· 自定义服务商 API（OpenAI / Anthropic）\n· 模型拉取 / 测试 / 健康检查\n· 双主题 · 变色 · 液态玻璃 UI\n· 应用内强制更新
          </Text>
        </Card>

        <Spacer h={24} />
        <Text style={[styles.footer, { color: palette.textDim }]}>PocketDev · AGPL-3.0 · 基于 MonkeyCode 底层</Text>
        <Pressable onPress={() => Linking.openURL(APP_REPO_URL)}>
          <Text style={[styles.link, { color: primary, textAlign: 'center' }]}>github.com/1953187487/PocketDev</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  const { theme } = useTheme();
  const { palette } = theme;
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: palette.textDim }]}>{label}</Text>
      <Text style={[styles.statValue, { color: color ?? palette.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 2 },
  statRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1 },
  statLabel: { fontSize: 12, marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: '700' },
  updateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    padding: 10,
    marginTop: 14,
  },
  updateBannerText: { fontSize: 13, fontWeight: '600' },
  section: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  qaTitle: { fontSize: 16, fontWeight: '600' },
  qaDesc: { fontSize: 13, marginTop: 2 },
  abilityTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  abilityText: { fontSize: 13, lineHeight: 20 },
  link: { fontSize: 13, fontWeight: '600' },
  footer: { fontSize: 12, textAlign: 'center', marginBottom: 6 },
});
