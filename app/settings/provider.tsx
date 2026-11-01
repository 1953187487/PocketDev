import { Button, Divider, Field, Pill, Row, SubScreen } from '@/ui';
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { alpha, radius, space, useTheme } from '@/theme';
import { listRemoteModels, normalizeBaseUrl, testProvider, isLocalEndpoint } from '@/api/ai';
import { detectLocalServices, LOCAL_CANDIDATES } from '@/api/local';
import { useAppStore, type InterfaceType } from '@/store/app';
import { safeBack } from '@/navigation';

export default function ProviderScreen() {
  const { theme } = useTheme();
  const { palette, primary } = theme;
  const { provider, setProvider } = useAppStore();

  const [baseUrl, setBaseUrl] = useState(provider.baseUrl);
  const [apiKey, setApiKey] = useState(provider.apiKey);
  const [model, setModel] = useState(provider.model);
  const [iface, setIface] = useState<InterfaceType>(provider.interfaceType);
  const [temperature, setTemperature] = useState(provider.temperature);
  const [models, setModels] = useState<string[]>([]);
  const [testState, setTestState] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState<Array<{ label: string; baseUrl: string; model: string; models: string[] }>>([]);

  const scanLocal = useCallback(async () => {
    setScanning(true);
    try {
      const found = await detectLocalServices();
      setDetected(found);
      setTestState(
        found.length
          ? { ok: true, msg: `检测到 ${found.length} 个本地服务，点击即可直连` }
          : { ok: false, msg: '未检测到本地模型服务，请先启动 Ollama / LM Studio' },
      );
    } finally {
      setScanning(false);
    }
  }, []);

  const save = useCallback(
    (patch: Partial<typeof provider>) => {
      const url = normalizeBaseUrl(baseUrl.trim(), iface);
      if (!/^https?:\/\//.test(url)) {
        Alert.alert('地址格式有误', 'Base URL 需以 http:// 或 https:// 开头');
        return;
      }
      if (!url.endsWith('/v1')) {
        Alert.alert('地址格式有误', 'OpenAI 兼容服务商地址必须以 /v1 结尾（例如 https://api.deepseek.com/v1）');
        return;
      }
      setProvider({ ...provider, ...patch, baseUrl: url, apiKey, model, interfaceType: iface, temperature });
      Alert.alert('已保存', `服务商配置已保存，主页即可开始对话\n已自动补全地址：${url}`);
      safeBack('/(tabs)/settings');
    },
    [provider, setProvider, baseUrl, apiKey, model, iface, temperature],
  );

  const doTest = useCallback(async () => {
    setTesting(true);
    setTestState(null);
    const cfg = { baseUrl, apiKey, model, interfaceType: iface, temperature };
    const res = await testProvider(cfg);
    setTestState({ ok: res.ok, msg: res.message });
    setTesting(false);
  }, [baseUrl, apiKey, model, iface, temperature]);

  const doPull = useCallback(async () => {
    setPulling(true);
    setTestState(null);
    try {
      const list = await listRemoteModels({ baseUrl, apiKey });
      setModels(list);
      setTestState({ ok: true, msg: `拉取到 ${list.length} 个模型，点击即可填入` });
    } catch (e) {
      setTestState({ ok: false, msg: (e as Error).message });
    } finally {
      setPulling(false);
    }
  }, [baseUrl, apiKey]);

  return (
    <SubScreen title="自定义服务商" onBack={() => safeBack('/(tabs)/settings')}>
      <View style={{ paddingHorizontal: space.lg }}>
        <Text style={{ color: palette.textDim, fontSize: 13, lineHeight: 20, marginBottom: 16 }}>
          配置任意 OpenAI 兼容接口（DeepSeek、通义、OpenAI、本地 Ollama / LM Studio）或 Anthropic。配置后主页即可直接对话。
        </Text>

        <Text style={{ color: palette.textDim, fontSize: 12, marginBottom: 8 }}>接口类型</Text>
        <Row style={{ gap: 8, marginBottom: 16 }}>
          {[
            { v: 'openai_chat' as const, label: 'OpenAI 兼容' },
            { v: 'anthropic' as const, label: 'Anthropic' },
          ].map((o) => (
            <Pressable
              key={o.v}
              onPress={() => setIface(o.v)}
              style={[styles.seg, { borderColor: iface === o.v ? primary : palette.border, backgroundColor: iface === o.v ? alpha(primary, 0.12) : palette.surfaceSunken }]}
            >
              <Text style={{ color: iface === o.v ? primary : palette.textDim, fontSize: 13, fontWeight: '600' }}>{o.label}</Text>
            </Pressable>
          ))}
        </Row>

        {/* 本地模型一键直连 */}
        <View style={[styles.localBox, { borderColor: isLocalEndpoint(baseUrl) ? primary : palette.border, backgroundColor: palette.surfaceSunken }]}>
          <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: palette.textDim, fontSize: 12, fontWeight: '600' }}>本地模型直连</Text>
            <Pressable onPress={scanLocal} disabled={scanning}>
              <Text style={{ color: primary, fontSize: 11.5, fontWeight: '700' }}>{scanning ? '检测中…' : '自动检测'}</Text>
            </Pressable>
          </Row>
          <Text style={{ color: palette.textDim, fontSize: 11.5, lineHeight: 17, marginBottom: 8 }}>
            本机运行的 Ollama / LM Studio / llama.cpp 无需注册，检测后点一下自动填好地址与模型，API Key 留空即可。
          </Text>
          {detected.length > 0 ? (
            <View style={{ gap: 8, marginBottom: 8 }}>
              {detected.map((d) => (
                <Pressable
                  key={d.baseUrl}
                  onPress={() => {
                    setBaseUrl(d.baseUrl);
                    setModel(d.models[0] ?? d.model);
                    setApiKey('');
                    setIface('openai_chat');
                  }}
                  style={[styles.localChip, { borderColor: baseUrl === d.baseUrl ? primary : palette.border, flex: 1 }]}
                >
                  <Ionicons name="hardware-chip-outline" size={13} color={baseUrl === d.baseUrl ? primary : palette.success} />
                  <Text style={{ color: baseUrl === d.baseUrl ? primary : palette.text, fontSize: 12, fontWeight: '700' }}>{d.label}</Text>
                  <Text style={{ color: palette.textFaint, fontSize: 11, flex: 1 }} numberOfLines={1}>
                    {d.models.length ? `${d.models.length} 个模型` : '未列出模型'}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Row style={{ gap: 8, flexWrap: 'wrap' }}>
            {LOCAL_CANDIDATES.map((e) => (
              <Pressable
                key={e.baseUrl}
                onPress={() => {
                  setBaseUrl(e.baseUrl);
                  setModel(e.model);
                  setApiKey('');
                  setIface('openai_chat');
                }}
                style={[styles.localChip, { borderColor: baseUrl === e.baseUrl ? primary : palette.border }]}
              >
                <Ionicons name="hardware-chip-outline" size={13} color={baseUrl === e.baseUrl ? primary : palette.textDim} />
                <Text style={{ color: baseUrl === e.baseUrl ? primary : palette.textDim, fontSize: 12, fontWeight: '600' }}>{e.label}</Text>
              </Pressable>
            ))}
          </Row>
        </View>

        <Field label="Base URL" value={baseUrl} onChangeText={setBaseUrl} placeholder={iface === 'anthropic' ? 'https://api.anthropic.com' : 'https://api.deepseek.com/v1'} keyboardType="url" hint={iface === 'openai_chat' ? '地址需以 /v1 结尾，保存时自动补全（如 https://api.deepseek.com/v1）' : 'Anthropic 地址会自动补 /v1'} />
        <Field label="API Key" value={apiKey} onChangeText={setApiKey} placeholder="输入你的 API Key" secureTextEntry hint="本地模型可留空或填本地占位值" />
        <Field label="模型名称" value={model} onChangeText={setModel} placeholder={iface === 'anthropic' ? 'claude-3-5-sonnet-latest' : 'deepseek-chat'} />

        <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ color: palette.textDim, fontSize: 12, fontWeight: '600' }}>采样温度</Text>
          <Text style={{ color: primary, fontSize: 13, fontWeight: '700' }}>{temperature.toFixed(1)}</Text>
        </Row>
        <View style={styles.slider}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setTemperature((t) => Math.max(0, Math.min(1.5, Math.round((t - 0.05) * 20) / 20)))} />
          <View style={[styles.sliderTrack, { backgroundColor: palette.surfaceSunken }]} />
          <View style={[styles.sliderFill, { width: `${(temperature / 1.5) * 100}%`, backgroundColor: primary }]} />
          <View style={[styles.sliderThumb, { left: `${(temperature / 1.5) * 100}%` }]} />
        </View>

        <Row style={{ gap: 8, marginTop: 16 }}>
          <View style={{ flex: 1 }}>
            <Button title="测试连接" small variant="secondary" onPress={doTest} loading={testing} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="拉取模型" small variant="ghost" onPress={doPull} loading={pulling} />
          </View>
        </Row>

        {models.length > 0 ? (
          <>
            <Divider style={{ marginVertical: 14 }} />
            <Text style={{ color: palette.textDim, fontSize: 12, marginBottom: 8 }}>可选模型（点击填入）</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: space.lg }}>
              {models.slice(0, 60).map((m) => (
                <Pressable key={m} onPress={() => setModel(m)} style={[styles.modelChip, { borderColor: model === m ? primary : palette.border }]}>
                  <Text style={{ color: model === m ? primary : palette.textDim, fontSize: 12.5, fontWeight: '600' }}>{m}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        {testState ? (
          <View style={[styles.testBox, { backgroundColor: testState.ok ? alpha(palette.success, 0.1) : alpha(palette.danger, 0.1) }]}>
            <Ionicons name={testState.ok ? 'checkmark-circle' : 'alert-circle'} size={16} color={testState.ok ? palette.success : palette.danger} />
            <Text style={{ color: testState.ok ? palette.success : palette.danger, fontSize: 12.5, flex: 1, marginTop: 2 }}>{testState.msg}</Text>
          </View>
        ) : null}

        <View style={{ marginTop: 20 }}>
          <Button title="保存配置" icon="save-outline" onPress={() => save({})} />
        </View>
      </View>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  seg: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1 },
  localBox: { borderRadius: radius.lg, borderWidth: 1, padding: 12, marginBottom: 16 },
  localChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 7, paddingHorizontal: 10, borderRadius: radius.md, borderWidth: 1 },
  slider: { height: 28, justifyContent: 'center' },
  sliderTrack: { position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 3 },
  sliderFill: { height: 6, borderRadius: 3, position: 'absolute', left: 0 },
  sliderThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
    marginLeft: -10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  modelChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1 },
  testBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: radius.md, marginTop: 14 },
});
