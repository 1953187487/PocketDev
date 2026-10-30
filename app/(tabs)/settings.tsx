import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DEFAULT_BASE_URL, checkModelConfig, getApiKey, getBaseUrl, listModels, listProviderModels, setApiKey, setBaseUrl } from '@/api/client';
import { checkForUpdate, buildDownloadUrl, normalizeBaseUrl } from '@/api/updates';
import type { Model, ModelInterfaceType, ProviderModelItem } from '@/api/types';
import { Button, Card, Field, Row, SectionTitle, Spacer, StatusPill } from '@/components/ui';
import { CONTRIBUTORS, THEME } from '@/config';
import { getString, setString } from '@/storage';

const t = THEME.dark;

export default function SettingsScreen() {
  const [baseUrl, setBaseUrlState] = useState(DEFAULT_BASE_URL);
  const [apiKey, setApiKeyState] = useState('');
  const [saved, setSaved] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [providerModels, setProviderModels] = useState<ProviderModelItem[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [testing, setTesting] = useState(false);
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
    setUpdateState(has ? `发现新版本 ${release?.tag}` : '当前已是最新版本');
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
    setTesting(true);
    setTestResult('');
    const res = await checkModelConfig({
      provider: 'custom',
      model,
      base_url: baseUrl,
      api_key: apiKey,
      interface_type: 'openai_chat',
    });
    setTesting(false);
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
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {/* 更新 */}
      <SectionTitle>更新</SectionTitle>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={styles.title}>检查更新</Text>
          {hasUpdate ? <StatusPill text="有新版" color={t.warning} /> : null}
        </Row>
        <Text style={styles.dim}>PocketDev 当前版本 1.0.0</Text>
        <Spacer h={12} />
        <Row style={{ gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button title="检查更新" onPress={doCheckUpdate} loading={checkingUpdate} />
          </View>
          {hasUpdate ? (
            <View style={{ flex: 1 }}>
              <Button title="下载 APK" onPress={doDownload} variant="danger" />
            </View>
          ) : null}
        </Row>
        {updateState ? <Text style={styles.updateState}>{updateState}</Text> : null}
      </Card>

      {/* 自定义服务商 API */}
      <SectionTitle>服务商 API</SectionTitle>
      <Card>
        <Text style={styles.subtitle}>配置后端地址与 API Key，用于连接 AI 能力层</Text>
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
        <Button title={saved ? '已保存' : '保存配置'} onPress={saveProvider} variant={saved ? 'primary' : 'primary'} />
      </Card>

      {/* 模型 */}
      <SectionTitle>模型</SectionTitle>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={styles.subtitle}>拉取服务商模型列表</Text>
          <Button title="拉取" onPress={doPullModels} variant="ghost" loading={pulling} />
        </Row>
        {providerModels.length > 0 ? (
          <View style={{ marginTop: 12 }}>
            {providerModels.slice(0, 20).map((m) => (
              <Pressable key={m.model} onPress={() => doTestModel(m.model || '')} style={styles.modelRow}>
                <Text style={{ color: t.text, flex: 1 }}>{m.model}</Text>
                <Ionicons name="flask" size={16} color={t.primary} />
              </Pressable>
            ))}
          </View>
        ) : null}
        {testResult ? (
          <Text style={[styles.updateState, testResult.startsWith('模型') ? { color: t.success } : { color: t.warning }]}>
            {testResult}
          </Text>
        ) : null}
        <Spacer h={4} />
        <Text style={styles.dim}>测试模型将执行健康检查（不落库），确认配置可用。</Text>
      </Card>

      {/* 已保存模型 */}
      <SectionTitle>已保存模型</SectionTitle>
      {models.length === 0 ? (
        <Card>
          <Text style={styles.dim}>暂无模型配置，可先保存服务商 API 后拉取。</Text>
        </Card>
      ) : (
        models.map((m) => (
          <Card key={m.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.repoName}>{m.model}</Text>
                <Text style={styles.dim}>{m.provider} · {m.interface_type}</Text>
              </View>
              {m.is_default ? <StatusPill text="默认" color={t.accent} /> : null}
            </Row>
          </Card>
        ))
      )}

      {/* 感谢者 */}
      <SectionTitle>感谢者</SectionTitle>
      <Card>
        <Text style={styles.subtitle}>感谢以下项目与贡献者，PocketDev 基于他们构建：</Text>
        <Spacer h={12} />
        {CONTRIBUTORS.map((c) => (
          <Pressable
            key={c.name}
            onPress={() => c.link && Linking.openURL(c.link)}
            style={styles.contributorRow}
          >
            <View style={styles.avatarBox}>
              <Text style={styles.avatarText}>{c.name.slice(0, 1)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contributorName}>{c.name}</Text>
              <Text style={styles.dim}>{c.role}</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={t.textDim} />
          </Pressable>
        ))}
      </Card>

      <Spacer h={24} />
      <Text style={styles.footer}>PocketDev · AGPL-3.0</Text>
      <Text style={[styles.footer, { fontSize: 12 }]}>底层：chaitin/MonkeyCode (AGPL-3.0)</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  title: { fontSize: 18, fontWeight: '800', color: t.text },
  subtitle: { fontSize: 14, color: t.textDim },
  dim: { color: t.textDim, fontSize: 13, marginTop: 4 },
  repoName: { color: t.text, fontSize: 15, fontWeight: '600' },
  updateState: { color: t.primary, fontSize: 13, marginTop: 12 },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.border,
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
    backgroundColor: t.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: t.primary, fontWeight: '700', fontSize: 16 },
  contributorName: { color: t.text, fontSize: 14, fontWeight: '600' },
  footer: { color: t.textDim, fontSize: 13, textAlign: 'center', marginBottom: 4 },
});