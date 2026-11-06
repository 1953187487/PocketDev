import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuroraBackdrop, Pill, SectionLabel, Surface } from '@/ui';
import { alpha, radius, space, useTheme } from '@/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AccountSession, accountSnapshot, completeRegister, login, logout,
  sendRegisterCode, checkRegisterCode, OFFICIAL_EMAIL, OFFICIAL_PASSWORD, OFFICIAL_NICK, MAIL_SERVER_URL, getMailConfig, setMailConfig, ensureOfficialAccount,
} from '@/api/account';

export default function AccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { palette, primary } = theme;
  const [session, setSession] = useState<AccountSession | null>(null);
  const [users, setUsers] = useState(0);
  const [mode, setMode] = useState<'login' | 'register' | 'verify' | 'setpw'>('login');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [nick, setNick] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [mailUser, setMailUser] = useState('2865529057@qq.com');
  const [mailPass, setMailPass] = useState('');

  const refresh = useCallback(async () => {
    await ensureOfficialAccount();
    const s = await accountSnapshot();
    setSession(s.session);
    setUsers(s.users);
    const mc = await getMailConfig();
    if (mc.user) setMailUser(mc.user);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const onSendCode = async () => {
    setBusy(true); setDevCode(null);
    const r = await sendRegisterCode(email);
    setBusy(false);
    if (!r.ok) return Alert.alert('发送失败', r.error);
    if (r.devCode) setDevCode(r.devCode);
    Alert.alert('验证码已发送', r.devCode ? `（邮件服务未配置，开发码：${r.devCode}）` : '请查收邮箱验证码（10分钟有效）');
    setMode('verify');
  };

  const onVerify = async () => {
    setBusy(true);
    const r = await checkRegisterCode(email, code);
    setBusy(false);
    if (!r.ok) return Alert.alert('验证失败', r.error);
    setMode('setpw');
  };

  const onRegisterDone = async () => {
    setBusy(true);
    const r = await completeRegister(email, code, pw, nick);
    setBusy(false);
    if (!r.ok) return Alert.alert('注册失败', r.error);
    setSession(r.session);
    Alert.alert('注册成功', '已登录');
    setMode('login'); setCode(''); setPw(''); setNick(''); refresh();
  };

  const onLogin = async () => {
    setBusy(true);
    const r = await login(email, pw);
    setBusy(false);
    if (!r.ok) return Alert.alert('登录失败', r.error);
    setSession(r.session);
    Alert.alert('登录成功', `欢迎 ${r.session.nickname}`);
    refresh();
  };

  const onLogout = async () => {
    await logout();
    setSession(null);
    refresh();
  };

  const saveMail = async () => {
    const mc = await getMailConfig();
    await setMailConfig({ ...mc, user: mailUser.trim(), pass: mailPass.trim(), serverUrl: MAIL_SERVER_URL, autoSend: true });
    Alert.alert('已保存', '邮件配置已保存在本设备（授权码不入库）');
  };

  const fillOfficial = () => { setEmail(OFFICIAL_EMAIL); setPw(OFFICIAL_PASSWORD); setMode('login'); };

  const inp = [styles.input, { borderColor: palette.border, color: palette.text, backgroundColor: palette.surfaceSunken }];

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      <AuroraBackdrop />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={[styles.back, { borderColor: palette.border }]}>
          <Ionicons name="chevron-back" size={20} color={palette.text} />
        </Pressable>
        <Text style={[styles.title, { color: palette.text }]}>账号与登录</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionLabel>当前状态</SectionLabel>
        <View style={{ paddingHorizontal: space.lg, marginBottom: 10 }}>
          <Surface>
            {session ? (
              <View style={{ gap: 6 }}>
                <Text style={{ color: palette.text, fontSize: 16, fontWeight: '800' }}>{session.nickname}</Text>
                <Text style={{ color: palette.textDim, fontSize: 13 }}>{session.email}</Text>
                <Pill text={session.isOfficial ? '官方账号' : '已登录'} color={palette.success} icon="checkmark-circle" />
                <Pressable onPress={onLogout} style={[styles.btn, { backgroundColor: alpha('#e74c3c', 0.12), marginTop: 6 }]}>
                  <Text style={{ color: '#e74c3c', fontWeight: '700' }}>退出登录</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: 6 }}>
                <Text style={{ color: palette.text, fontSize: 15, fontWeight: '700' }}>未登录</Text>
                <Text style={{ color: palette.textDim, fontSize: 12.5 }}>本设备账号数：{users} · 数据全部保存在本设备</Text>
              </View>
            )}
          </Surface>
        </View>

        {!session ? (
          <>
            <SectionLabel>{mode === 'login' ? '登录' : mode === 'register' ? '注册（1/3 输入邮箱）' : mode === 'verify' ? '注册（2/3 验证码）' : '注册（3/3 设置密码）'}</SectionLabel>
            <View style={{ paddingHorizontal: space.lg, gap: 10 }}>
              <TextInput value={email} onChangeText={setEmail} placeholder="邮箱" placeholderTextColor={palette.textFaint} autoCapitalize="none" keyboardType="email-address" style={inp as any} editable={mode === 'login' || mode === 'register'} />
              {mode === 'login' ? (
                <>
                  <TextInput value={pw} onChangeText={setPw} placeholder="密码" placeholderTextColor={palette.textFaint} secureTextEntry style={inp as any} />
                  <Pressable disabled={busy} onPress={onLogin} style={[styles.btn, { backgroundColor: alpha(primary, 0.16) }]}>
                    <Text style={{ color: primary, fontWeight: '800' }}>{busy ? '登录中…' : '邮箱+密码登录'}</Text>
                  </Pressable>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Pressable onPress={() => setMode('register')} style={{ flex: 1 }}><Text style={{ color: primary, textAlign: 'center' }}>去注册</Text></Pressable>
                    <Pressable onPress={fillOfficial} style={{ flex: 1 }}><Text style={{ color: palette.textDim, textAlign: 'center' }}>填入官方账号</Text></Pressable>
                  </View>
                </>
              ) : null}
              {mode === 'register' ? (
                <>
                  <Pressable disabled={busy} onPress={onSendCode} style={[styles.btn, { backgroundColor: alpha(primary, 0.16) }]}>
                    <Text style={{ color: primary, fontWeight: '800' }}>{busy ? '发送中…' : '发送验证码到邮箱'}</Text>
                  </Pressable>
                  <Pressable onPress={() => setMode('login')}><Text style={{ color: palette.textDim, textAlign: 'center' }}>返回登录</Text></Pressable>
                </>
              ) : null}
              {mode === 'verify' ? (
                <>
                  <TextInput value={code} onChangeText={setCode} placeholder="6位验证码" placeholderTextColor={palette.textFaint} keyboardType="number-pad" style={inp as any} />
                  {devCode ? <Text style={{ color: palette.textFaint, fontSize: 12 }}>开发码：{devCode}</Text> : null}
                  <Pressable disabled={busy} onPress={onVerify} style={[styles.btn, { backgroundColor: alpha(primary, 0.16) }]}>
                    <Text style={{ color: primary, fontWeight: '800' }}>验证</Text>
                  </Pressable>
                </>
              ) : null}
              {mode === 'setpw' ? (
                <>
                  <TextInput value={nick} onChangeText={setNick} placeholder="昵称（可选）" placeholderTextColor={palette.textFaint} style={inp as any} />
                  <TextInput value={pw} onChangeText={setPw} placeholder="设置密码（至少6位）" placeholderTextColor={palette.textFaint} secureTextEntry style={inp as any} />
                  <Pressable disabled={busy} onPress={onRegisterDone} style={[styles.btn, { backgroundColor: alpha(primary, 0.16) }]}>
                    <Text style={{ color: primary, fontWeight: '800' }}>{busy ? '提交中…' : '完成注册并登录'}</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          </>
        ) : null}

        <SectionLabel>内置官方账号</SectionLabel>
        <View style={{ paddingHorizontal: space.lg }}>
          <Surface>
            <Text style={{ color: palette.text, fontWeight: '700' }}>{OFFICIAL_NICK}</Text>
            <Text style={{ color: palette.textDim, fontSize: 12.5, marginTop: 2 }}>{OFFICIAL_EMAIL}</Text>
            <Text style={{ color: palette.textFaint, fontSize: 12, marginTop: 4 }}>默认密码（本地）：{OFFICIAL_PASSWORD}</Text>
          </Surface>
        </View>

        <SectionLabel>QQ邮箱发送配置（本设备）</SectionLabel>
        <View style={{ paddingHorizontal: space.lg, gap: 10 }}>
          <Text style={{ color: palette.textDim, fontSize: 12.5 }}>发件邮箱 + SMTP 授权码仅保存在本设备，不入库。需启动本地服务：node mail-server/server.js（端口 {MAIL_SERVER_URL}）</Text>
          <TextInput value={mailUser} onChangeText={setMailUser} placeholder="QQ邮箱，如 2865529057@qq.com" placeholderTextColor={palette.textFaint} autoCapitalize="none" style={inp as any} />
          <TextInput value={mailPass} onChangeText={setMailPass} placeholder="SMTP授权码（非登录密码）" placeholderTextColor={palette.textFaint} secureTextEntry style={inp as any} />
          <Pressable onPress={saveMail} style={[styles.btn, { backgroundColor: alpha(primary, 0.12) }]}>
            <Text style={{ color: primary, fontWeight: '700' }}>保存邮件配置</Text>
          </Pressable>
        </View>

        <SectionLabel>快捷入口</SectionLabel>
        <View style={{ paddingHorizontal: space.lg, gap: 10 }}>
          <NavRow icon="chatbubbles-outline" label="聊天渠道（官方）" onPress={() => router.push('/settings/channel')} palette={palette} primary={primary} />
          <NavRow icon="megaphone-outline" label="公告" onPress={() => router.push('/settings/announcements')} palette={palette} primary={primary} />
          <NavRow icon="cloud-upload-outline" label="云存档（本设备）" onPress={() => router.push('/settings/cloudsave')} palette={palette} primary={primary} />
        </View>
      </ScrollView>
    </View>
  );
}

function NavRow({ icon, label, onPress, palette, primary }: any) {
  return (
    <Pressable onPress={onPress} style={[styles.btn, { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, flexDirection: 'row', justifyContent: 'space-between' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Ionicons name={icon} size={18} color={primary} />
        <Text style={{ color: palette.text, fontWeight: '700' }}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={palette.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space.lg, paddingBottom: space.md },
  back: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800' },
  content: { paddingBottom: 40 },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  btn: { borderRadius: radius.md, paddingVertical: 13, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
});
