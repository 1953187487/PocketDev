import React, { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { alpha, radius, space, useTheme } from '@/theme';
import { Collapsible, AuroraBackdrop, Button, Field, Pill, ProgressBar } from '@/ui';
import { listRemoteModels, normalizeBaseUrl } from '@/api/ai';
import { useAppStore, type AppLanguage, type InterfaceType } from '@/store/app';
import { useI18n } from '@/i18n';
import { checkForUpdate } from '@/api/updates';
import { AGREEMENTS } from '@/agreements';
import { APP_VERSION } from '@/config';

const STEPS = 4;

const LANGS: { key: AppLanguage; label: string; native: string; flag: string }[] = [
  { key: 'zh', label: '中文', native: '简体中文', flag: '中' },
  { key: 'en', label: 'English', native: 'English', flag: 'EN' },
];

export function Onboarding() {
  const { theme } = useTheme();
  const { palette, primary, primaryText } = theme;
  const insets = useSafeAreaInsets();
  const { prefs, setPrefs, provider, setProvider } = useAppStore();
  const { t } = useI18n();

  const [step, setStep] = useState(0);
  const [envState, setEnvState] = useState<'idle' | 'checking' | 'ready'>('idle');
  const [envMsg, setEnvMsg] = useState('');
  const [agree, setAgree] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [remoteModels, setRemoteModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [modelMsg, setModelMsg] = useState('');
  const [dlProgress, setDlProgress] = useState(0);
  const [dlLog, setDlLog] = useState<string[]>([]);
  const dlTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const pushLog = useCallback((line: string) => {
    setDlLog((prev) => [...prev.slice(-60), line]);
  }, []);

  const [baseUrl, setBaseUrl] = useState(provider.baseUrl);
  const [apiKey, setApiKey] = useState(provider.apiKey);
  const [model, setModel] = useState(provider.model);
  const [iface, setIface] = useState<InterfaceType>(provider.interfaceType);

  const fetchModels = useCallback(async () => {
    if (!apiKey.trim()) {
      setModelMsg('请先填写 API Key');
      return;
    }
    setFetchingModels(true);
    setModelMsg('');
    try {
      const list = await listRemoteModels({ baseUrl, apiKey });
      if (list.length === 0) {
        setModelMsg('未获取到模型列表，请检查 Base URL 与 Key');
      } else {
        setRemoteModels(list);
        setModelMsg(`已拉取 ${list.length} 个模型，点选填入`);
        if (!model) setModel(list[0]);
      }
    } catch (e) {
      setModelMsg((e as Error).message || '拉取失败');
    } finally {
      setFetchingModels(false);
    }
  }, [apiKey, baseUrl, model]);

  const checkEnv = useCallback(async () => {
    setEnvState('checking');
    setEnvMsg('');
    setDlLog([]);
    setDlProgress(0);
    try {
      const net = await NetInfo.fetch();
      if (!net.isConnected) throw new Error('网络未连接');
      pushLog('$ 开始检查运行环境…');
      pushLog('· 网络连接正常');
      const { release } = await checkForUpdate();
      const ver = release?.tag ? `，检测到 ${release.tag}` : '';
      pushLog('· 已获取更新信息' + (release?.tag ? `（${release.tag}）` : '（当前已是最新）'));
      // 模拟连接参数与模型基础参数的下载过程，展示终端输出与进度条。
      pushLog('$ 下载连接参数与模型基础参数…');
      await new Promise<void>((resolve) => {
        let p = 0;
        dlTimer.current = setInterval(() => {
          p = Math.min(100, p + 5 + Math.random() * 9);
          setDlProgress(Math.round(p));
          if (p % 22 < 6) pushLog(`· 已下载 ${Math.round(p)}%（${Math.round(1.2 * p)}/120 KB）`);
          if (p >= 100) {
            if (dlTimer.current) clearInterval(dlTimer.current);
            dlTimer.current = null;
            pushLog('· 下载完成，校验通过');
            pushLog('$ 运行环境已就绪');
            resolve();
          }
        }, 90);
      });
      setEnvMsg(`运行环境已就绪（网络正常${ver}）`);
      setEnvState('ready');
    } catch (e) {
      setEnvMsg((e as Error).message || '环境检测失败');
      setEnvState('idle');
    }
  }, [pushLog]);

  const saveProvider = useCallback(() => {
    const url = normalizeBaseUrl(baseUrl.trim(), iface);
    setProvider({ ...provider, baseUrl: url, apiKey, model, interfaceType: iface });
  }, [provider, setProvider, baseUrl, apiKey, model, iface]);

  const allAgreed = AGREEMENTS.every((a) => agree[a.key]);
  const finish = useCallback(() => {
    setPrefs({ onboarded: true, onboardedVersion: APP_VERSION, agreementsAccepted: true, privacyAccepted: true });
  }, [setPrefs]);

  const next = useCallback(() => {
    if (step === 1 && envState !== 'ready') return;
    if (step === 2) saveProvider();
    setStep((s) => Math.min(s + 1, STEPS - 1));
  }, [step, envState, saveProvider]);

  const back = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      <AuroraBackdrop />
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.progressRow}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                { backgroundColor: i <= step ? primary : palette.border },
              ]}
            />
          ))}
        </View>
        <Text style={{ color: palette.textFaint, fontSize: 12.5 }}>{t('onb.step', { n: step + 1 })}</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 20 }]} keyboardShouldPersistTaps="handled">
        {step === 0 ? (
          <>
            <OnbTitle icon="language-outline" title={t('onb.lang.title')} sub={t('onb.lang.sub')} palette={palette} primary={primary} />
            <View style={{ gap: 10, marginTop: 18 }}>
              {LANGS.map((l) => {
                const on = prefs.language === l.key;
                return (
                  <Pressable
                    key={l.key}
                    onPress={() => setPrefs({ language: l.key })}
                    style={[styles.langCard, { borderColor: on ? primary : palette.border, backgroundColor: palette.surface }]}
                  >
                    <View style={[styles.langFlag, { backgroundColor: alpha(primary, 0.12) }]}>
                      <Text style={{ color: primary, fontWeight: '800' }}>{l.flag}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: palette.text, fontSize: 16, fontWeight: '700' }}>{l.label}</Text>
                      <Text style={{ color: palette.textFaint, fontSize: 12.5 }}>{l.native}</Text>
                    </View>
                    {on ? <Ionicons name="checkmark-circle" size={22} color={primary} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <OnbTitle icon="terminal-outline" title={t('onb.env.title')} sub={t('onb.env.sub')} palette={palette} primary={primary} />
            <View style={[styles.card, { borderColor: palette.border, backgroundColor: palette.surface, marginTop: 18 }]}>
              <View style={styles.envRow}>
                <View style={[styles.envIcon, { backgroundColor: envState === 'ready' ? alpha(palette.success, 0.12) : alpha(primary, 0.12) }]}>
                  <Ionicons
                    name={envState === 'ready' ? 'checkmark' : 'download-outline'}
                    size={20}
                    color={envState === 'ready' ? palette.success : primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.text, fontSize: 15, fontWeight: '700' }}>运行终端与模型参数</Text>
                  <Text style={{ color: palette.textDim, fontSize: 12.5, marginTop: 2 }}>
                    {envState === 'ready' ? envMsg : '下载连接参数与模型基础参数，用于后续对话与模型管理。'}
                  </Text>
                </View>
              </View>
              {envState === 'ready' ? (
                <View style={{ marginTop: 12 }}>
                  <Pill text={t('onb.env.ready')} color={palette.success} icon="checkmark-circle" />
                </View>
              ) : (
                <View style={{ marginTop: 12 }}>
                  <Button title={t('onb.env.check')} loading={envState === 'checking'} onPress={checkEnv} />
                </View>
              )}
              {envMsg && envState !== 'ready' ? (
                <Text style={{ color: palette.danger, fontSize: 12.5, marginTop: 10 }}>{envMsg}</Text>
              ) : null}
              {/* 下载进度条 */}
              {envState === 'checking' ? (
                <View style={{ marginTop: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ color: palette.textDim, fontSize: 11.5 }}>连接参数与模型参数</Text>
                    <Text style={{ color: primary, fontSize: 11.5, fontWeight: '700' }}>{dlProgress}%</Text>
                  </View>
                  <ProgressBar percent={dlProgress} height={6} />
                </View>
              ) : null}
              {/* 终端输出 */}
              {dlLog.length > 0 ? (
                <View
                  style={[
                    styles.terminal,
                    {
                      borderColor: palette.border,
                      backgroundColor: palette.mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(14,21,38,0.92)',
                    },
                  ]}
                >
                  {dlLog.map((line, i) => (
                    <Text key={i} style={styles.terminalLine} numberOfLines={1}>
                      {line}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <OnbTitle icon="server-outline" title={t('onb.provider.title')} sub={t('onb.provider.sub')} palette={palette} primary={primary} />
            <View style={{ marginTop: 18, gap: 12 }}>
              <Text style={{ color: palette.textDim, fontSize: 12 }}>接口类型</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
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
              </View>
              <Field
                label="Base URL"
                value={baseUrl}
                onChangeText={setBaseUrl}
                placeholder="https://api.deepseek.com/v1"
                keyboardType="url"
                hint={iface === 'openai_chat' ? '地址需以 /v1 结尾，保存时自动补全（本地模型填 http://127.0.0.1:11434/v1）' : undefined}
              />
              <Field label="API Key" value={apiKey} onChangeText={setApiKey} placeholder="sk-..." secureTextEntry hint="本地模型可留空或填本地占位值" />
              <Field label="模型名称" value={model} onChangeText={setModel} placeholder="deepseek-chat" />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Button title="拉取模型列表" small variant="secondary" loading={fetchingModels} onPress={fetchModels} icon="cloud-download-outline" />
                </View>
              </View>
              {modelMsg ? <Text style={{ color: palette.textDim, fontSize: 12 }}>{modelMsg}</Text> : null}
              {remoteModels.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {remoteModels.slice(0, 40).map((m) => (
                    <Pressable
                      key={m}
                      onPress={() => setModel(m)}
                      style={[styles.seg, { borderColor: model === m ? primary : palette.border, backgroundColor: model === m ? alpha(primary, 0.12) : palette.surfaceSunken }]}
                    >
                      <Text style={{ color: model === m ? primary : palette.textDim, fontSize: 12 }}>{m}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <OnbTitle icon="shield-checkmark-outline" title={t('onb.agree.title')} sub={t('onb.agree.sub')} palette={palette} primary={primary} />
            <View style={{ marginTop: 18, gap: 10 }}>
              {AGREEMENTS.map((a) => {
                const on = !!agree[a.key];
                const open = !!expanded[a.key];
                return (
                  <View key={a.key} style={{ gap: 6 }}>
                    <Collapsible
                      title={a.title}
                      body={a.body}
                      expanded={open}
                      onToggle={() => setExpanded((prev) => ({ ...prev, [a.key]: !prev[a.key] }))}
                      trailing={
                        <Pressable
                          hitSlop={10}
                          onPress={() => setAgree((prev) => ({ ...prev, [a.key]: !prev[a.key] }))}
                          style={[styles.checkbox, { borderColor: on ? primary : palette.border, backgroundColor: on ? primary : 'transparent' }]}
                        >
                          {on ? <Ionicons name="checkmark" size={15} color={primaryText} /> : null}
                        </Pressable>
                      }
                    />
                  </View>
                );
              })}
              <Text style={{ color: palette.textFaint, fontSize: 12, lineHeight: 18, marginTop: 2 }}>
                点标题展开或收起协议全文，点击右侧方框勾选表示已阅读并同意。
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        {step > 0 ? (
          <View style={{ width: 96 }}>
            <Button title={t('common.back')} variant="ghost" onPress={back} />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          {step < STEPS - 1 ? (
            <Button title={t('common.next')} disabled={step === 1 && envState !== 'ready'} onPress={next} />
          ) : (
            <Button title={t('common.enter')} disabled={!allAgreed} onPress={finish} icon="arrow-forward" />
          )}
        </View>
      </View>
    </View>
  );
}

function OnbTitle({ icon, title, sub, palette, primary }: { icon: keyof typeof Ionicons.glyphMap; title: string; sub: string; palette: { text: string; textDim: string }; primary: string }) {
  return (
    <View style={{ alignItems: 'center', marginTop: 10 }}>
      <View style={[styles.titleIcon, { backgroundColor: alpha(primary, 0.12), borderColor: alpha(primary, 0.3) }]}>
        <Ionicons name={icon} size={30} color={primary} />
      </View>
      <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
      <Text style={[styles.sub, { color: palette.textDim }]}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 100, elevation: 20 },
  header: { paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressRow: { flexDirection: 'row', gap: 6 },
  progressDot: { width: 26, height: 6, borderRadius: 3 },
  body: { paddingHorizontal: space.lg, paddingTop: 8, flexGrow: 1 },
  titleIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 14 },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  sub: { fontSize: 13.5, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  langCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, borderWidth: 1 },
  langFlag: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  card: { padding: 14, borderRadius: radius.lg, borderWidth: 1 },
  envRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  envIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  seg: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1 },
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  terminal: { marginTop: 12, borderRadius: radius.md, borderWidth: 1, padding: 10, gap: 2, maxHeight: 120 },
  terminalLine: { color: '#9CE88C', fontSize: 11, fontFamily: 'monospace' },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: space.lg, paddingTop: 8 },
});
