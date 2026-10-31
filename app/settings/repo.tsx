import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { alpha, radius, space, useTheme } from '@/theme';
import { Button, Divider, Field, Pill, Row, SubScreen } from '@/components/ui';
import { verifyToken } from '@/api/git';
import { GIT_HOSTS } from '@/api/git';
import { useAppStore, type GitPlatform } from '@/store/app';

export default function RepoScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { palette, primary } = theme;
  const { git, setGit } = useAppStore();

  const [platform, setPlatform] = useState<GitPlatform>(git.platform);
  const [baseUrl, setBaseUrl] = useState(git.baseUrl);
  const [token, setToken] = useState(git.token);
  const [username, setUsername] = useState(git.username ?? '');
  const [verifying, setVerifying] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; msg: string } | null>(null);

  // 平台切换时刷新默认地址
  useEffect(() => {
    setBaseUrl(GIT_HOSTS[platform].web);
  }, [platform]);

  const doVerify = useCallback(async () => {
    setVerifying(true);
    setMsg(null);
    const res = await verifyToken({ platform, baseUrl, token, username });
    setMsg({ ok: res.ok, msg: res.message });
    if (res.ok) {
      setUsername(res.username ?? username);
      setGit({ platform, baseUrl, token, username: res.username ?? username, avatar: res.avatar });
      Alert.alert('授权成功', `已一键授权 ${GIT_HOSTS[platform].label}：${res.username ?? username}`);
      router.back();
    }
    setVerifying(false);
  }, [platform, baseUrl, token, username, setGit, router]);

  return (
    <SubScreen title="仓库配置" onBack={() => router.back()}>
      <View style={{ paddingHorizontal: space.lg }}>
        <Text style={{ color: palette.textDim, fontSize: 13, lineHeight: 20, marginBottom: 16 }}>
          选择代码托管平台，粘贴 Personal Access Token 一键授权，即可直连你的仓库。
        </Text>

        {git.token ? (
          <View style={[styles.connected, { borderColor: alpha(palette.success, 0.4), backgroundColor: alpha(palette.success, 0.08) }]}>
            <Ionicons name="checkmark-circle" size={20} color={palette.success} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: palette.text, fontSize: 14, fontWeight: '700' }}>已连接 {GIT_HOSTS[git.platform].label}</Text>
              {git.username ? <Text style={{ color: palette.textDim, fontSize: 12.5 }}>@{git.username}</Text> : null}
            </View>
            <Pill text="已授权" color={palette.success} icon="shield-checkmark" />
          </View>
        ) : null}

        <Text style={{ color: palette.textDim, fontSize: 12, marginBottom: 8, marginTop: 12 }}>托管平台</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {(Object.keys(GIT_HOSTS) as GitPlatform[]).map((p) => (
            <Pressable
              key={p}
              onPress={() => setPlatform(p)}
              style={[styles.plat, { borderColor: platform === p ? primary : palette.border, backgroundColor: platform === p ? alpha(primary, 0.12) : palette.surfaceSunken }]}
            >
              <Text style={{ color: platform === p ? primary : palette.textDim, fontSize: 13, fontWeight: '700' }}>{GIT_HOSTS[p].label}</Text>
              {git.platform === p && git.token ? <Ionicons name="checkmark" size={13} color={palette.success} style={{ marginLeft: 4 }} /> : null}
            </Pressable>
          ))}
        </View>

        <Field
          label={`${platform === 'github' ? 'API' : '服务'} 地址`}
          value={baseUrl}
          onChangeText={setBaseUrl}
          placeholder={GIT_HOSTS[platform].web}
          keyboardType="url"
          hint={platform === 'github' ? '自建 GitHub Enterprise 才需修改' : '自建实例才需修改'}
        />
        <Field
          label="访问令牌 (PAT)"
          value={token}
          onChangeText={setToken}
          placeholder={platform === 'github' ? 'ghp_...' : platform === 'gitlab' ? 'glpat-...' : platform === 'gitee' ? '粘贴私人令牌' : 'token'}
          secureTextEntry
          hint="令牌仅保存在设备本地，用于直连平台，不会上传任何服务器"
        />

        {msg ? (
          <View style={[styles.testBox, { backgroundColor: msg.ok ? alpha(palette.success, 0.1) : alpha(palette.danger, 0.1) }]}>
            <Ionicons name={msg.ok ? 'checkmark-circle' : 'alert-circle'} size={16} color={msg.ok ? palette.success : palette.danger} />
            <Text style={{ color: msg.ok ? palette.success : palette.danger, fontSize: 12.5, flex: 1, marginTop: 2 }}>{msg.msg}</Text>
          </View>
        ) : null}

        <View style={{ marginTop: 18 }}>
          <Button title={git.token ? '重新授权' : '一键授权'} icon="shield-checkmark-outline" onPress={doVerify} loading={verifying} />
        </View>

        <Divider style={{ marginVertical: 20 }} />

        <Text style={{ color: palette.textDim, fontSize: 12, lineHeight: 18 }}>
          如何获取令牌：
          {'\n'}· {GIT_HOSTS[platform].label}：Settings → Developer settings → Personal access tokens → Generate new token（勾选 repo 权限）
          {'\n'}· 令牌不填时也可以先用「一键授权」验证当前已保存的配置。
        </Text>
      </View>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  plat: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1 },
  connected: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.lg, borderWidth: 1, marginBottom: 4 },
  testBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: radius.md, marginTop: 14 },
});