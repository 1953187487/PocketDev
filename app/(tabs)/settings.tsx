import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DEFAULT_BASE_URL, checkModelConfig, getApiKey, getBaseUrl, listModels, listProviderModels, setApiKey, setBaseUrl } from '@/api/client';
import { checkForUpdate, buildDownloadUrl, normalizeBaseUrl } from '@/api/updates';
import type { Model, ProviderModelItem } from '@/api/types';
import { Button, Card, Field, Row, Screen, SectionTitle, Spacer, StatusPill } from '@/components/ui';
import { DonationSection } from '@/components/DonationSection';
import { ACCENTS, useTheme, type ThemeMode } from '@/theme';
import { CONTRIBUTORS, DEVELOPERS } from '@/config';
import { getString, setString } from '@/storage';

const MODE_OPTIONS: { key: ThemeMode; label: string }[] = [
  { key: 'system', label: '跟随系统' },
  { key: 'light', label: '浅色' },
  { key: 'dark', label: '深色' },
];

export default function SettingsScreen() {
  const { theme, mode, accentId, setMode, setAccentId } = useTheme();
  const { palette, primary } = theme;
  const [baseUrl, setBaseUrlState] = useState(DEFAULT_BASE_URL);
  const [apiKey, setApiKeyState] = useState('');
  const [saved, setSaved] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [providerModels, setProviderModels] = useState<ProviderModelItem[]>([]);
  const [testResult, setTestResult] = useState('');
  const [updateState, setUpdateState] = useState('');
  const [hasUpdate, setHasUpdate] = useState(false);
  const [latestTag, setLatestTag] = useState('');
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [pulling, setPulling] = useState(false);

  const load = useCallback(async () => {
    const [b, k] = await Promise.all([getString('base_url'), getString('api_key')]);
    if (b) setBaseUrlState(b);
    if (k) {
      setApiKeyState(k);
      setApiKey(k);
    }
    try {
      setModels(await listModels());
    } catch {
      /* 未配置或未连接时静默 */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveProvider = async () => {
    const nb = normalizeBaseUrl(baseUrl);
    setBaseUrl(nb);
    setApiKey(apiKey);
    await setString('base_url', nb);
    await setString('api_key', apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const doCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateState('');
    const { hasUpdate: has, release } = await checkForUpdate();
    setHasUpdate(has);
    setLatestTag(release?.tag || '');
    setUpdateState(has ? `发现新版本 ${release?.tag}，请立即更新` : '当前已是最新版本');
    setCheckingUpdate(false);
  };

  const doPullModels = async () => {
    setPulling(true);
    setTestResult('');
    try {
      const items = await listProviderModels({ api_key: apiKey, base_url: baseUrl, provider: 'custom' });
      setProviderModels(items);
      setTestResult(`已拉取 ${items.length} 个模型`);
    } catch (e) {
      setTestResult('拉取失败：' + (e as Error).message);
    } finally {
      setPulling(false);
    }
  };

  const doTestModel = async (model: string) => {
    setTestResult('');
    const res = await checkModelConfig({
      provider: 'custom',
      model,
      base_url: baseUrl,
      api_key: apiKey,
      interface_type: 'openai_chat',
    });
    setTestResult(res.success ? `模型 ${model} 连接正常` : `模型 ${model} 连接失败：${res.error || '未知错误'}`);
  };

  const doDownload = async () => {
    if (!latestTag) return;
    const url = buildDownloadUrl(latestTag);
    Alert.alert('下载更新', `将打开浏览器下载 ${latestTag} 的 APK`, [
      { text: '取消', style: 'cancel' },
      { text: '下载', onPress: () => Linking.openURL(url) },
    ]);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 90 }}>
        {/* 外观：双UI + 变色 */}
        <SectionTitle>外观</SectionTitle>
        <Card>
          <Text style={[styles.subtitle, { color: palette.textDim }]}>主题模式（双 UI）</Text>
          <Spacer h={10} />
          <Row style={{ gap: 8 }}>
            {MODE_OPTIONS.map((o) => {
              const active = mode === o.key;
              return (
                <Pressable
                  key={o.key}
                  onPress={() => setMode(o.key)}
                  style={[
                    styles.modeBtn,
                    {
                      borderColor: active ? primary : palette.glassBorder,
                      backgroundColor: active ? primary + '26' : palette.glass,
                    },
                  ]}
                >
                  {active ? <Ionicons name="checkmark" size={14} color={primary} /> : null}
                  <Text style={[styles.modeBtnText, { color: active ? primary : palette.text }]}>{o.label}</Text>
                </Pressable>
              );
            })}
          </Row>
          <Spacer h={14} />
          <Text style={[styles.subtitle, { color: palette.textDim }]}>主色调（变色）</Text>
          <Spacer h={10} />
          <Row style={{ gap: 10, flexWrap: 'wrap' }}>
            {ACCENTS.map((a) => {
              const active = a.id === accentId;
              return (
                <Pressable
                  key={a.id}
                  onPress={() => setAccentId(a.id)}
                  style={[
                    styles.accentDot,
                    { backgroundColor: a.primary },
                    active && { borderColor: palette.text, borderWidth: 3, transform: [{ scale: 1.08 }] },
                  ]}
                >
                  {active ? <Ionicons name="checkmark" size={16} color={a.primaryText} /> : null}
                </Pressable>
              );
            })}
          </Row>
          <Spacer h={10} />
          <Text style={[styles.dim, { color: palette.textDim }]}>
            当前主题：{theme.mode === 'dark' ? '深色' : '浅色'} · 主色：{ACCENTS.find((a) => a.id === accentId)?.name}
          </Text>
        </Card>

        {/* 更新 */}
        <SectionTitle>更新</SectionTitle>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={[styles.title, { color: palette.text }]}>检查更新</Text>
            {hasUpdate ? <StatusPill text="有新版" color={palette.warning} /> : null}
          </Row>
          <Text style={[styles.dim, { color: palette.textDim }]}>检测到新版本后将在应用内提示并强制更新</Text>
          <Spacer h={12} />
          <Row style={{ gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button title="检查更新" onPress={doCheckUpdate} loading={checkingUpdate} />
            </View>
            {hasUpdate ? (
              <View style={{ flex: 1 }}>
                <Button title="立即更新" onPress={doDownload} variant="danger" />
              </View>
            ) : null}
          </Row>
          {updateState ? <Text style={[styles.updateState, { color: primary }]}>{updateState}</Text> : null}
        </Card>

        {/* 自定义服务商 API */}
        <SectionTitle>服务商 API</SectionTitle>
        <Card>
          <Text style={[styles.subtitle, { color: palette.textDim }]}>配置后端地址与 API Key，用于连接 AI 能力层</Text>
          <Spacer h={12} />
          <Field
            label="后端地址 Base URL"
            value={baseUrl}
            onChangeText={setBaseUrlState}
            placeholder="https://monkeycode-ai.com"
            keyboardType="url"
          />
          <Field
            label="API Key"
            value={apiKey}
            onChangeText={setApiKeyState}
            placeholder="输入你的 API Key"
            secureTextEntry
          />
          <Button title={saved ? '已保存' : '保存配置'} onPress={saveProvider} />
        </Card>

        {/* 模型 */}
        <SectionTitle>模型</SectionTitle>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={[styles.subtitle, { color: palette.textDim }]}>拉取服务商模型列表</Text>
            <Button title="拉取" onPress={doPullModels} variant="ghost" loading={pulling} small />
          </Row>
          {providerModels.length > 0 ? (
            <View style={{ marginTop: 12 }}>
              {providerModels.slice(0, 20).map((m) => (
                <Pressable key={m.model} onPress={() => doTestModel(m.model || '')} style={styles.modelRow}>
                  <Text style={{ color: palette.text, flex: 1 }}>{m.model}</Text>
                  <Ionicons name="flask" size={16} color={primary} />
                </Pressable>
              ))}
            </View>
          ) : null}
          {testResult ? (
            <Text style={[styles.updateState, { color: testResult.startsWith('模型') ? palette.success : palette.warning }]}>
              {testResult}
            </Text>
          ) : null}
          <Spacer h={4} />
          <Text style={[styles.dim, { color: palette.textDim }]}>测试模型将执行健康检查（不落库），确认配置可用。</Text>
        </Card>

        {/* 已保存模型 */}
        <SectionTitle>已保存模型</SectionTitle>
        {models.length === 0 ? (
          <Card>
            <Text style={[styles.dim, { color: palette.textDim }]}>暂无模型配置，可先保存服务商 API 后拉取。</Text>
          </Card>
        ) : (
          models.map((m) => (
            <Card key={m.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.repoName, { color: palette.text }]}>{m.model}</Text>
                  <Text style={[styles.dim, { color: palette.textDim }]}>{m.provider} · {m.interface_type}</Text>
                </View>
                {m.is_default ? <StatusPill text="默认" color={primary} /> : null}
              </Row>
            </Card>
          ))
        )}

        {/* 支持作者 */}
        <DonationSection />

        {/* 开发者 / 维护者 */}
        <SectionTitle>开发者</SectionTitle>
        {DEVELOPERS.map((d) => (
          <Card key={d.name} glow>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Row style={{ gap: 12, flex: 1 }}>
                <View style={[styles.avatarBox, { backgroundColor: primary + '26' }]}>
                  <Text style={[styles.avatarText, { color: primary }]}>{d.name.slice(0, 1)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Row style={{ gap: 6 }}>
                    <Text style={[styles.contributorName, { color: palette.text }]}>{d.name}</Text>
                    {d.tag ? <StatusPill text={d.tag} color={primary} /> : null}
                  </Row>
                  <Text style={[styles.dim, { color: palette.textDim }]}>{d.role}</Text>
                </View>
              </Row>
              {d.socials?.map((s) => (
                <Pressable key={s.platform} onPress={() => d.link && Linking.openURL(d.link)}>
                  <Ionicons name="tv" size={20} color={palette.danger} />
                </Pressable>
              ))}
            </Row>
            {d.socials?.length ? (
              <View style={{ marginTop: 10 }}>
                {d.socials.map((s) => (
                  <Pressable key={s.platform} onPress={() => Linking.openURL(s.url)} style={styles.socialRow}>
                    <Ionicons name="tv" size={16} color={palette.danger} />
                    <Text style={[styles.socialText, { color: primary }]}>{s.platform} · {s.label}</Text>
                    <Ionicons name="open-outline" size={14} color={palette.textDim} />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </Card>
        ))}

        {/* 贡献者 */}
        <SectionTitle>贡献者</SectionTitle>
        <Card>
          <Text style={[styles.subtitle, { color: palette.textDim }]}>PocketDev 基于以下项目与贡献者构建：</Text>
          <Spacer h={12} />
          {CONTRIBUTORS.map((c) => (
            <Pressable
              key={c.name}
              onPress={() => c.link && Linking.openURL(c.link)}
              style={styles.contributorRow}
            >
              <View style={[styles.avatarBox, { backgroundColor: primary + '26' }]}>
                <Text style={[styles.avatarText, { color: primary }]}>{c.name.slice(0, 1)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.contributorName, { color: palette.text }]}>{c.name}</Text>
                <Text style={[styles.dim, { color: palette.textDim }]}>{c.role}</Text>
              </View>
              <Ionicons name="open-outline" size={16} color={palette.textDim} />
            </Pressable>
          ))}
        </Card>

        <Spacer h={24} />
        <Text style={[styles.footer, { color: palette.textDim }]}>PocketDev · AGPL-3.0</Text>
        <Text style={[styles.footer, { color: palette.textDim, fontSize: 12 }]}>底层：chaitin/MonkeyCode (AGPL-3.0)</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '800' },
  subtitle: { fontSize: 14 },
  dim: { fontSize: 13, marginTop: 4 },
  repoName: { fontSize: 15, fontWeight: '600' },
  updateState: { fontSize: 13, marginTop: 12 },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  modeBtnText: { fontSize: 13, fontWeight: '600' },
  accentDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#00000022',
  },
  contributorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  avatarBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontWeight: '700', fontSize: 16 },
  contributorName: { fontSize: 14, fontWeight: '600' },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  socialText: { fontSize: 13, fontWeight: '600', flex: 1 },
  footer: { fontSize: 13, textAlign: 'center', marginBottom: 4 },
});
