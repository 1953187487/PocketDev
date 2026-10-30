import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getBaseUrl, getApiKey } from '@/api/client';
import { checkForUpdate } from '@/api/updates';
import { Card, Row, StatusPill, Spacer } from '@/components/ui';
import { APP_REPO_URL, BASE_LAYER_REPO, THEME } from '@/config';
import { getString, setString } from '@/storage';

const t = THEME.dark;

export default function HomeScreen() {
  const router = useRouter();
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
    { icon: 'git-branch', title: '仓库配置', desc: '绑定 Git 身份并选择仓库', onPress: () => router.push('/repo'), color: t.primary },
    { icon: 'settings', title: '设置', desc: '服务商 API · 模型 · 更新', onPress: () => router.push('/settings'), color: t.accent },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <Text style={styles.title}>PocketDev</Text>
            <Text style={styles.subtitle}>手机端 AI 开发工具 · 1.0</Text>
          </View>
          <StatusPill text={online ? '在线' : '离线'} color={online ? t.success : t.danger} />
        </Row>
        <Spacer h={16} />
        <View style={styles.statRow}>
          <Stat label="后端" value={backend.replace(/^https?:\/\//, '') || '未配置'} />
          <Stat label="API Key" value={configured ? '已配置' : '未配置'} color={configured ? t.success : t.textDim} />
          <Stat label="更新" value={hasUpdate ? '可用' : '最新'} color={hasUpdate ? t.warning : t.success} />
        </View>
        {hasUpdate ? (
          <Pressable onPress={() => router.push('/settings')} style={styles.updateBanner}>
            <Ionicons name="download" size={18} color={t.warning} />
            <Text style={styles.updateBannerText}>发现新版本，前往设置更新</Text>
          </Pressable>
        ) : null}
      </Card>

      <Text style={styles.section}>快捷入口</Text>
      {quickActions.map((a) => (
        <Card key={a.title} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={a.onPress} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.iconBox, { backgroundColor: a.color + '22' }]}>
              <Ionicons name={a.icon as any} size={22} color={a.color} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.qaTitle}>{a.title}</Text>
              <Text style={styles.qaDesc}>{a.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.textDim} />
          </Pressable>
        </Card>
      ))}

      <Text style={styles.section}>能力说明</Text>
      <Card>
        <Text style={styles.abilityTitle}>底层平台</Text>
        <Text style={styles.abilityText}>
          本工具基于 {BASE_LAYER_REPO} 的 AI 能力层构建，采用 AGPL-3.0 协议开源。
        </Text>
        <Spacer h={8} />
        <Pressable onPress={() => Linking.openURL(`https://github.com/${BASE_LAYER_REPO}`)}>
          <Text style={styles.link}>查看底层仓库 →</Text>
        </Pressable>
        <Spacer h={12} />
        <Text style={styles.abilityTitle}>核心能力</Text>
        <Text style={styles.abilityText}>
          · AI 开发任务（develop / review）\n· Git 身份与仓库绑定\n· 自定义服务商 API（OpenAI / Anthropic）\n· 模型拉取 / 测试 / 健康检查\n· 在线更新检测
        </Text>
      </Card>

      <Spacer h={24} />
      <Text style={styles.footer}>PocketDev · AGPL-3.0 · 基于 MonkeyCode 底层</Text>
      <Pressable onPress={() => Linking.openURL(APP_REPO_URL)}>
        <Text style={[styles.link, { textAlign: 'center' }]}>github.com/1953187487/PocketDev</Text>
      </Pressable>
    </ScrollView>
  );
}

function Stat({ label, value, color = t.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  title: { fontSize: 26, fontWeight: '800', color: t.text },
  subtitle: { fontSize: 14, color: t.textDim, marginTop: 2 },
  statRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1 },
  statLabel: { fontSize: 12, color: t.textDim, marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: '700' },
  updateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: t.warning + '15',
    borderRadius: 10,
    padding: 10,
    marginTop: 14,
  },
  updateBannerText: { color: t.warning, fontSize: 13, fontWeight: '600' },
  section: {
    color: t.textDim,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  qaTitle: { color: t.text, fontSize: 16, fontWeight: '600' },
  qaDesc: { color: t.textDim, fontSize: 13, marginTop: 2 },
  abilityTitle: { color: t.text, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  abilityText: { color: t.textDim, fontSize: 13, lineHeight: 20 },
  link: { color: t.primary, fontSize: 13, fontWeight: '600' },
  footer: { color: t.textDim, fontSize: 12, textAlign: 'center', marginBottom: 6 },
});
