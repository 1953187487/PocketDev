import React, { useCallback, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alpha, ACCENTS, radius, space, useTheme, type ThemeMode } from '@/theme';
import { Button, Divider, Field, Pill, Row, Screen, SectionLabel, Spacer, Surface } from '@/components/ui';
import { DonationSection } from '@/components/DonationSection';
import { checkForUpdate, buildDownloadUrl, type ReleaseInfo } from '@/api/updates';
import { listRemoteModels, testProvider } from '@/api/ai';
import { verifyToken } from '@/api/git';
import { useAppStore, DEFAULT_PROVIDER, type GitPlatform, type InterfaceType } from '@/store/app';
import { CONTRIBUTORS, DEVELOPERS } from '@/config';

const MODE_OPTIONS: { key: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'system', label: '跟随系统', icon: 'phone-portrait-outline' },
  { key: 'light', label: '浅色', icon: 'sunny-outline' },
  { key: 'dark', label: '深色', icon: 'moon-outline' },
];

const PLATFORMS: { key: GitPlatform; label: string; tokenHelp: string }[] = [
  { key: 'github', label: 'GitHub', tokenHelp: 'Settings → Developer settings → Personal access tokens' },
  { key: 'gitlab', label: 'GitLab', tokenHelp: 'Settings → Access Tokens' },
  { key: 'gitee', label: 'Gitee', tokenHelp: '设置 → 私人令牌' },
  { key: 'gitea', label: 'Gitea', tokenHelp: 'Settings → Applications → New token' },
];

export default function SettingsScreen() {
  const { theme, mode, accentId, setMode, setAccentId } = useTheme();
  const { palette, primary, primaryText } = theme;
  const insets = useSafeAreaInsets();
  const { provider, setProvider, git, setGit } = useAppStore();

  const [baseUrl, setBaseUrl] = useState(provider.baseUrl);
  const [apiKey, setApiKey] = useState(provider.apiKey);
  const [model, setModel] = useState(provider.model);
  const [iface, setIface] = useState<InterfaceType>(provider.interfaceType);
  const [models, setModels] = useState<string[]>([]);
  const [testState, setTestState] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [pulling, setPulling] = useState(false);

  const [gitPlatform, setGitPlatform] = useState<GitPlatform>(git.platform);
  const [gitBase, setGitBase] = useState(git.baseUrl);
  const [gitToken, setGitToken] = useState(git.token);
  const [gitUsername, setGitUsername] = useState(git.username ?? '');
  const [verifying, setVerifying] = useState(false);
  const [gitMsg, setGitMsg] = useState<{ ok: boolean; msg: string } | null>(null);

  const [updateState, setUpdateState] = useState('');
  const [hasUpdate, setHasUpdate] = useState(false);
  const [latestTag, setLatestTag] = useState('');
  const [checking, setChecking] = useState(false);
  const [release, setRelease] = useState<ReleaseInfo | null>(null);

  const saveProvider = useCallback(
    (patch: Partial<typeof provider>) => {
      const next = { ...provider, ...patch };
      setProvider(next);
      setTestState(null);
    },
    [provider, setProvider],
  );

  const doTest = useCallback(async () => {
    setTesting(true);
    setTestState(null);
    const cfg = { baseUrl, apiKey, model, interfaceType: iface, temperature: provider.temperature };
    const res = await testProvider(cfg);
    setTestState({ ok: res.ok, msg: res.message });
    setTesting(false);
  }, [baseUrl, apiKey, model, iface, provider.temperature]);

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

  const doVerify = useCallback(async () => {
    setVerifying(true);
    setGitMsg(null);
    const res = await verifyToken({ platform: gitPlatform, baseUrl: gitBase, token: gitToken, username: gitUsername });
    setGitMsg({ ok: res.ok, msg: res.message });
    if (res.ok) setGitUsername(res.username ?? gitUsername);
    setVerifying(false);
  }, [gitPlatform, gitBase, gitToken, gitUsername]);

  const saveGit = useCallback(
    () => setGit({ platform: gitPlatform, baseUrl: gitBase, token: gitToken, username: gitUsername }),
    [gitPlatform, gitBase, gitToken, gitUsername, setGit],
  );

  const doCheckUpdate = useCallback(async () => {
    setChecking(true);
    setUpdateState('');
    const { hasUpdate: has, release: rel } = await checkForUpdate();
    setHasUpdate(has);
    setRelease(rel);
    setLatestTag(rel?.tag ?? '');
    setUpdateState(has ? `发现新版本 ${rel?.tag}` : '当前已是最新版本');
    setChecking(false);
  }, []);

  const doDownload = useCallback(() => {
    if (!latestTag) return;
    const url = buildDownloadUrl(latestTag);
    Alert.alert('下载更新', `将打开浏览器下载 ${latestTag} 的 APK`, [
      { text: '取消', style: 'cancel' },
      { text: '下载', onPress: () => Linking.openURL(url) },
    ]);
  }, [latestTag]);

  return (
    <Screen edges={false}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={[styles.title, { color: palette.text }]}>设置</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <SectionLabel>外观</SectionLabel>
        <Surface style={{ marginHorizontal: space.lg }}>
          <Row style={{ gap: 8 }}>
            {MODE_OPTIONS.map((o) => {
              const on = mode === o.key;
              return (
                <Pressable
                  key={o.key}
                  onPress={() => setMode(o.key)}
                  style={[
                    styles.modeBtn,
                    {
                      borderColor: on ? primary : palette.border,
                      backgroundColor: on ? alpha(primary, 0.12) : palette.surfaceSunken,
                    },
                  ]}
                >
                  <Ionicons name={o.icon} size={14} color={on ? primary : palette.textDim} />
                  <Text style={{ color: on ? primary : palette.text, fontSize: 12.5, fontWeight: '600' }}>{o.label}</Text>
                </Pressable>
              );
            })}
          </Row>
          <Spacer h={14} />
          <Row style={{ gap: 10, flexWrap: 'wrap' }}>
            {ACCENTS.map((a) => {
              const on = a.id === accentId;
              return (
                <Pressable
                  key={a.id}
                  onPress={() => setAccentId(a.id)}
                  style={[
                    styles.dot,
                    { backgroundColor: a.primary, borderWidth: 3, borderColor: on ? palette.text : 'transparent' },
                  ]}
                >
                  {on ? <Ionicons name="checkmark" size={15} color={a.primaryText} /> : null}
                </Pressable>
              );
            })}
          </Row>
          <Spacer h={10} />
          <Text style={{ color: palette.textDim, fontSize: 12.5 }}>
            主题：{mode === 'dark' ? '深色' : mode === 'light' ? '浅色' : '跟随系统'} · 主色：
            {ACCENTS.find((a) => a.id === accentId)?.name}
          </Text>
        </Surface>

        <SectionLabel>自定义服务商</SectionLabel>
        <Surface style={{ marginHorizontal: space.lg }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: palette.text, fontSize: 15, fontWeight: '700' }}>服务商与模型</Text>
            <Pill text={iface === 'anthropic' ? 'Anthropic' : 'OpenAI'} icon="server-outline" />
          </Row>
          <Text style={{ color: palette.textDim, fontSize: 12.5, marginTop: 4 }}>
            配置任意 OpenAI 兼容接口（如 DeepSeek、通义、OpenAI、本地 Ollama）或 Anthropic。配置后主页即可直接对话。
          </Text>
          <Spacer h={14} />
          <Text style={{ color: palette.textDim, fontSize: 12, marginBottom: 6 }}>接口类型</Text>
          <Row style={{ gap: 8, marginBottom: 12 }}>
            {[
              { v: 'openai_chat' as const, label: 'OpenAI 兼容' },
              { v: 'anthropic' as const, label: 'Anthropic' },
            ].map((o) => (
              <Pressable
                key={o.v}
                onPress={() => setIface(o.v)}
                style={[
                  styles.seg,
                  { borderColor: iface === o.v ? primary : palette.border, backgroundColor: iface === o.v ? alpha(primary, 0.12) : palette.surfaceSunken },
                ]}
              >
                <Text style={{ color: iface === o.v ? primary : palette.textDim, fontSize: 13, fontWeight: '600' }}>{o.label}</Text>
              </Pressable>
            ))}
          </Row>
          <Field
            label="Base URL"
            value={baseUrl}
            onChangeText={setBaseUrl}
            placeholder={iface === 'anthropic' ? 'https://api.anthropic.com' : 'https://api.deepseek.com/v1'}
            keyboardType="url"
          />
          <Field label="API Key" value={apiKey} onChangeText={setApiKey} placeholder="输入你的 API Key" secureTextEntry />
          <Field
            label="模型名称"
            value={model}
            onChangeText={setModel}
            placeholder={iface === 'anthropic' ? 'claude-3-5-sonnet-latest' : 'deepseek-chat'}
          />
          <Row style={{ gap: 8, marginTop: 4 }}>
            <View style={{ flex: 1 }}>
              <Button title="保存" small onPress={() => saveProvider({ baseUrl, apiKey, model, interfaceType: iface })} icon="save-outline" />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="测试连接" small variant="secondary" onPress={doTest} loading={testing} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="拉取模型" small variant="ghost" onPress={doPull} loading={pulling} />
            </View>
          </Row>
          {models.length > 0 ? (
            <>
              <Divider style={{ marginVertical: 12 }} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {models.slice(0, 40).map((m) => (
                  <Pressable key={m} onPress={() => { setModel(m); saveProvider({ model: m }); }} style={[styles.modelChip, { borderColor: model === m ? primary : palette.border }]}>
                    <Text style={{ color: model === m ? primary : palette.textDim, fontSize: 12.5, fontWeight: '600' }}>{m}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : null}
          {testState ? (
            <View style={[styles.testBox, { backgroundColor: testState.ok ? alpha(palette.success, 0.1) : alpha(palette.danger, 0.1) }]}>
              <Ionicons name={testState.ok ? 'checkmark-circle' : 'alert-circle'} size={16} color={testState.ok ? palette.success : palette.danger} />
              <Text style={{ color: testState.ok ? palette.success : palette.danger, fontSize: 12.5, flex: 1, marginTop: 2 }}>
                {testState.msg}
              </Text>
            </View>
          ) : null}
        </Surface>

        <SectionLabel>访问令牌</SectionLabel>
        <Surface style={{ marginHorizontal: space.lg }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: palette.text, fontSize: 15, fontWeight: '700' }}>仓库访问令牌</Text>
            {git.token ? <Pill text="已配置" color={palette.success} icon="key" /> : <Pill text="未配置" color={palette.textFaint} icon="key-outline" />}
          </Row>
          <Text style={{ color: palette.textDim, fontSize: 12.5, marginTop: 4 }}>
            配置 Personal Access Token 后，仓库页即可列出、创建仓库，无需手动绑定身份。
          </Text>
          <Spacer h={14} />
          <Text style={{ color: palette.textDim, fontSize: 12, marginBottom: 6 }}>托管平台</Text>
          <Row style={{ gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {PLATFORMS.map((p) => (
              <Pressable
                key={p.key}
                onPress={() => setGitPlatform(p.key)}
                style={[
                  styles.seg,
                  { borderColor: gitPlatform === p.key ? primary : palette.border, backgroundColor: gitPlatform === p.key ? alpha(primary, 0.12) : palette.surfaceSunken },
                ]}
              >
                <Text style={{ color: gitPlatform === p.key ? primary : palette.textDim, fontSize: 13, fontWeight: '600' }}>{p.label}</Text>
              </Pressable>
            ))}
          </Row>
          <Field
            label={`${gitPlatform === 'github' ? 'API' : '服务'} 地址（自建可选）`}
            value={gitBase}
            onChangeText={setGitBase}
            placeholder="https://github.com"
            keyboardType="url"
          />
          <Field
            label="访问令牌"
            value={gitToken}
            onChangeText={setGitToken}
            placeholder={PLATFORMS.find((p) => p.key === gitPlatform)?.tokenHelp ?? 'Personal Access Token'}
            secureTextEntry
          />
          <Row style={{ gap: 8, marginTop: 4 }}>
            <View style={{ flex: 1 }}>
              <Button title="验证令牌" small variant="secondary" onPress={doVerify} loading={verifying} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="保存令牌" small onPress={saveGit} icon="save-outline" />
            </View>
          </Row>
          {gitMsg ? (
            <View style={[styles.testBox, { backgroundColor: gitMsg.ok ? alpha(palette.success, 0.1) : alpha(palette.danger, 0.1) }]}>
              <Ionicons name={gitMsg.ok ? 'checkmark-circle' : 'alert-circle'} size={16} color={gitMsg.ok ? palette.success : palette.danger} />
              <Text style={{ color: gitMsg.ok ? palette.success : palette.danger, fontSize: 12.5, flex: 1, marginTop: 2 }}>{gitMsg.msg}</Text>
            </View>
          ) : null}
        </Surface>

        <SectionLabel>更新</SectionLabel>
        <Surface style={{ marginHorizontal: space.lg }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: palette.text, fontSize: 15, fontWeight: '700' }}>检查更新</Text>
            {hasUpdate ? <Pill text="有新版" color={palette.warning} icon="cloud-download-outline" /> : null}
          </Row>
          <Text style={{ color: palette.textDim, fontSize: 12.5, marginTop: 4 }}>检测到新版本会在应用内强制更新</Text>
          <Spacer h={12} />
          <Row style={{ gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button title="检查更新" onPress={doCheckUpdate} loading={checking} small />
            </View>
            {hasUpdate ? (
              <View style={{ flex: 1 }}>
                <Button title="立即更新" onPress={doDownload} variant="danger" small />
              </View>
            ) : null}
          </Row>
          {updateState ? <Text style={{ color: primary, fontSize: 12.5, marginTop: 10 }}>{updateState}</Text> : null}
        </Surface>

        <DonationSection />

        <SectionLabel>开发者</SectionLabel>
        <View style={{ paddingHorizontal: space.lg }}>
          {DEVELOPERS.map((d) => (
            <Surface key={d.name} style={{ marginBottom: space.md }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row style={{ gap: 12, flex: 1 }}>
                  <View style={[styles.avatar, { backgroundColor: alpha(primary, 0.14) }]}>
                    <Text style={{ color: primary, fontWeight: '800' }}>{d.name.slice(0, 1)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Row style={{ gap: 6 }}>
                      <Text style={{ color: palette.text, fontSize: 15, fontWeight: '700' }}>{d.name}</Text>
                      {d.tag ? <Pill text={d.tag} color={primary} /> : null}
                    </Row>
                    <Text style={{ color: palette.textDim, fontSize: 12.5, marginTop: 2 }}>{d.role}</Text>
                  </View>
                </Row>
                {d.link ? (
                  <Pressable onPress={() => Linking.openURL(d.link!)}>
                    <Ionicons name="open-outline" size={16} color={palette.textFaint} />
                  </Pressable>
                ) : null}
              </Row>
            </Surface>
          ))}
        </View>

        <SectionLabel>贡献者</SectionLabel>
        <Surface style={{ marginHorizontal: space.lg }}>
          {CONTRIBUTORS.map((c, i) => (
            <Pressable key={c.name} onPress={() => c.link && Linking.openURL(c.link)} style={{ paddingVertical: 9 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row style={{ gap: 10, flex: 1 }}>
                  <View style={[styles.avatarSm, { backgroundColor: alpha(primary, 0.12) }]}>
                    <Text style={{ color: primary, fontWeight: '700' }}>{c.name.slice(0, 1)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: palette.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>{c.name}</Text>
                    <Text style={{ color: palette.textDim, fontSize: 12 }} numberOfLines={1}>{c.role}</Text>
                  </View>
                </Row>
                <Ionicons name="open-outline" size={14} color={palette.textFaint} />
              </Row>
              {i < CONTRIBUTORS.length - 1 ? <Divider style={{ marginTop: 9 }} /> : null}
            </Pressable>
          ))}
        </Surface>

        <Spacer h={24} />
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: palette.textFaint, fontSize: 12 }}>PocketDev · AGPL-3.0</Text>
          <Text style={{ color: palette.textFaint, fontSize: 11, marginTop: 2 }}>底层：chaitin/MonkeyCode</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.lg, paddingBottom: space.md },
  title: { fontSize: 26, fontWeight: '800' },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  dot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  seg: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1 },
  modelChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1 },
  testBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: radius.md, marginTop: 12 },
  avatar: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarSm: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
