import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Pressable, ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { alpha, radius, space, useTheme } from '@/theme';
import { AuroraBackdrop, Button, Pill } from '@/ui';
import {
  type AccountSession,
  login, logout, sendRegisterCode, checkRegisterCode, completeRegister,
  getAccountSession, fetchMe, pingCloud,
} from '@/api/account';

type Mode = 'login' | 'register_email' | 'register_code' | 'register_password';

export default function MineScreen() {
  const { theme } = useTheme();
  const { palette, primary, primaryText } = theme;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [session, setSession] = useState<AccountSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [conn, setConn] = useState<{ ok?: boolean; msg: string }>({ msg: '检测云端连接中…' });
  const [codeSentHint, setCodeSentHint] = useState('');
  const codeRef = useRef<TextInput>(null);

  const syncAccount = useCallback(async (quiet = false) => {
    if (!quiet) setSyncing(true);
    try {
      const local = await getAccountSession();
      if (local) setSession(local);
      const ping = await pingCloud();
      setConn(ping.ok ? { ok: true, msg: `云端已连接${ping.ms ? ` · ${ping.ms}ms` : ''}` } : { ok: false, msg: ping.error || '云端不可达' });
      if (ping.ok && local?.token) {
        const me = await fetchMe();
        if (me) setSession(me);
        else setSession(local);
      } else if (!local) {
        setSession(null);
      }
    } catch {
      const local = await getAccountSession();
      setSession(local);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { syncAccount(true); }, [syncAccount]));
  useEffect(() => {
    syncAccount();
    const sub = AppState.addEventListener('change', s => { if (s === 'active') syncAccount(true); });
    return () => sub.remove();
  }, [syncAccount]);

  const normEmail = email.trim().toLowerCase();

  const doSendCode = async () => {
    if (!normEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail)) return Alert.alert('提示', '请输入正确的邮箱地址');
    setBusy(true);
    try {
      await pingCloud();
      const r = await sendRegisterCode(normEmail);
      if (!r.ok) return Alert.alert('发送失败', r.error || '验证码发送失败，请检查网络或稍后重试');
      setCodeSentHint(`验证码已发送至 ${normEmail}`);
      setMode('register_code');
      setTimeout(() => codeRef.current?.focus(), 200);
    } finally { setBusy(false); }
  };

  const doVerifyCode = async () => {
    const c = code.trim();
    if (!/^\d{4,8}$/.test(c)) return Alert.alert('提示', '请输入收到的验证码');
    setBusy(true);
    try {
      const r = await checkRegisterCode(normEmail, c);
      if (!r.ok) return Alert.alert('验证失败', r.error || '验证码错误或已过期');
      setMode('register_password');
    } finally { setBusy(false); }
  };

  const doRegister = async () => {
    if (password.length < 6) return Alert.alert('提示', '密码至少 6 位');
    if (password !== confirmPw) return Alert.alert('提示', '两次输入的密码不一致');
    setBusy(true);
    try {
      const r = await completeRegister(normEmail, code.trim(), password, nickname.trim() || normEmail.split('@')[0]);
      if (!r.ok) return Alert.alert('注册失败', r.error || '注册失败，请重试');
      setSession(r.session);
      setPassword(''); setConfirmPw(''); setCode(''); setNickname('');
      setMode('login');
      Alert.alert('注册成功', '账号已创建并登录');
      syncAccount(true);
    } finally { setBusy(false); }
  };

  const doLogin = async () => {
    if (!normEmail) return Alert.alert('提示', '请输入邮箱');
    if (!password) return Alert.alert('提示', '请输入密码');
    setBusy(true);
    try {
      await pingCloud();
      const r = await login(normEmail, password);
      if (!r.ok) return Alert.alert('登录失败', r.error || '邮箱或密码错误，或云端不可达');
      setSession(r.session);
      setPassword('');
      syncAccount(true);
    } finally { setBusy(false); }
  };

  const doLogout = () => {
    Alert.alert('退出登录', '确定要退出当前账号吗？', [
      { text: '取消', style: 'cancel' },
      { text: '退出', style: 'destructive', onPress: async () => { await logout(); setSession(null); setMode('login'); } },
    ]);
  };

  const resetToLogin = () => { setMode('login'); setCode(''); setPassword(''); setConfirmPw(''); setCodeSentHint(''); };

  const inp = [styles.inp, { borderColor: palette.border, color: palette.text, backgroundColor: palette.surface }];
  const label = (t: string) => <Text style={{ color: palette.textDim, fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 10 }}>{t}</Text>;

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      <AuroraBackdrop />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 14, paddingHorizontal: space.lg, paddingBottom: insets.bottom + 110 }} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <Text style={[styles.h1, { color: palette.text }]}>我的</Text>
          <Pressable onPress={() => syncAccount(false)} style={[styles.iconBtn, { backgroundColor: alpha(primary, 0.12) }]}>
            {syncing ? <ActivityIndicator size="small" color={primary} /> : <Ionicons name="sync" size={18} color={primary} />}
          </Pressable>
        </View>

        <Pressable onPress={() => syncAccount(false)} style={[styles.connBar, { borderColor: alpha(conn.ok === false ? '#e05a5a' : palette.success, 0.4), backgroundColor: alpha(conn.ok === false ? '#e05a5a' : palette.success, 0.08) }]}>
          <Ionicons name={conn.ok === false ? 'cloud-offline' : 'cloud-done'} size={18} color={conn.ok === false ? '#e05a5a' : palette.success} />
          <Text style={{ color: palette.text, fontSize: 13, fontWeight: '600', flex: 1 }}>{conn.msg}</Text>
          <Text style={{ color: primary, fontSize: 12 }}>刷新</Text>
        </Pressable>

        {loading ? (
          <View style={[styles.card, { borderColor: palette.border, backgroundColor: palette.surface, alignItems: 'center', paddingVertical: 30 }]}>
            <ActivityIndicator color={primary} />
            <Text style={{ color: palette.textDim, marginTop: 10 }}>正在同步账号信息…</Text>
          </View>
        ) : session ? (
          <View style={[styles.card, { borderColor: alpha(primary, 0.35), backgroundColor: palette.surface }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.avatar, { backgroundColor: alpha(primary, 0.15), borderColor: alpha(primary, 0.35) }]}>
                <Ionicons name="person" size={26} color={primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: palette.text, fontSize: 18, fontWeight: '900' }}>{session.nickname || '用户'}</Text>
                <Text style={{ color: palette.textDim, fontSize: 13, marginTop: 2 }}>{session.email}</Text>
              </View>
              {session.isOfficial ? <Pill text="官方" color={primary} /> : null}
            </View>
            <View style={{ marginTop: 14, gap: 8 }}>
              <Pill text="云端账号已同步" color={palette.success} icon="checkmark-circle" />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <View style={{ flex: 1 }}><Button title="同步信息" variant="ghost" onPress={() => syncAccount(false)} loading={syncing} icon="sync" /></View>
              <View style={{ flex: 1 }}><Button title="退出登录" variant="ghost" onPress={doLogout} icon="log-out-outline" /></View>
            </View>
          </View>
        ) : (
          <View style={[styles.card, { borderColor: palette.border, backgroundColor: palette.surface }]}>
            <View style={styles.segRow}>
              <Pressable onPress={resetToLogin} style={[styles.seg, mode === 'login' && { backgroundColor: alpha(primary, 0.14), borderColor: alpha(primary, 0.4) }, { borderColor: palette.border }]}>
                <Text style={{ color: mode === 'login' ? primary : palette.textDim, fontWeight: '800' }}>登录</Text>
              </Pressable>
              <Pressable onPress={() => { setMode('register_email'); setCodeSentHint(''); }} style={[styles.seg, mode !== 'login' && { backgroundColor: alpha(primary, 0.14), borderColor: alpha(primary, 0.4) }, { borderColor: palette.border }]}>
                <Text style={{ color: mode !== 'login' ? primary : palette.textDim, fontWeight: '800' }}>注册</Text>
              </Pressable>
            </View>

            {mode === 'login' ? (
              <>
                {label('邮箱')}
                <TextInput value={email} onChangeText={setEmail} placeholder="请输入邮箱" placeholderTextColor={palette.textFaint} autoCapitalize="none" keyboardType="email-address" style={inp as any} />
                {label('密码')}
                <TextInput value={password} onChangeText={setPassword} placeholder="请输入密码" placeholderTextColor={palette.textFaint} secureTextEntry style={inp as any} />
                <View style={{ marginTop: 16 }}>
                  <Button title={busy ? '登录中…' : '登录'} onPress={doLogin} loading={busy} icon="log-in-outline" />
                </View>
              </>
            ) : null}

            {mode === 'register_email' ? (
              <>
                <Text style={{ color: palette.textDim, fontSize: 12.5, lineHeight: 19, marginTop: 4 }}>注册流程：填写邮箱 → 发送验证码 → 输入验证码 → 设置密码</Text>
                {label('邮箱')}
                <TextInput value={email} onChangeText={setEmail} placeholder="请输入用于注册的邮箱" placeholderTextColor={palette.textFaint} autoCapitalize="none" keyboardType="email-address" style={inp as any} />
                <View style={{ marginTop: 16 }}>
                  <Button title={busy ? '发送中…' : '发送验证码'} onPress={doSendCode} loading={busy} icon="mail-outline" />
                </View>
              </>
            ) : null}

            {mode === 'register_code' ? (
              <>
                {codeSentHint ? <Text style={{ color: palette.success, fontSize: 13, fontWeight: '600', marginTop: 4 }}>{codeSentHint}</Text> : null}
                {label('验证码')}
                <TextInput ref={codeRef} value={code} onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 8))} placeholder="请输入邮箱收到的验证码" placeholderTextColor={palette.textFaint} keyboardType="number-pad" maxLength={8} style={inp as any} />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                  <View style={{ flex: 1 }}><Button title="重新发送" variant="ghost" onPress={doSendCode} loading={busy} /></View>
                  <View style={{ flex: 1 }}><Button title={busy ? '验证中…' : '验证并下一步'} onPress={doVerifyCode} loading={busy} icon="arrow-forward" /></View>
                </View>
                <Pressable onPress={() => setMode('register_email')}><Text style={{ color: palette.textDim, textAlign: 'center', marginTop: 10, fontSize: 12 }}>修改邮箱</Text></Pressable>
              </>
            ) : null}

            {mode === 'register_password' ? (
              <>
                <Pill text="验证码已通过" color={palette.success} icon="checkmark-circle" />
                {label('设置密码（至少 6 位）')}
                <TextInput value={password} onChangeText={setPassword} placeholder="请输入密码" placeholderTextColor={palette.textFaint} secureTextEntry style={inp as any} />
                {label('确认密码')}
                <TextInput value={confirmPw} onChangeText={setConfirmPw} placeholder="请再次输入密码" placeholderTextColor={palette.textFaint} secureTextEntry style={inp as any} />
                {label('昵称（可选）')}
                <TextInput value={nickname} onChangeText={setNickname} placeholder="给自己起个昵称" placeholderTextColor={palette.textFaint} style={inp as any} />
                <View style={{ marginTop: 16 }}>
                  <Button title={busy ? '提交中…' : '完成注册并登录'} onPress={doRegister} loading={busy} icon="checkmark-done" />
                </View>
              </>
            ) : null}

            {conn.ok === false ? <Text style={{ color: '#e05a5a', fontSize: 12, marginTop: 12, lineHeight: 18 }}>云端当前不可达，登录/注册可能失败。隧道恢复后点顶部“刷新”重试。</Text> : null}
          </View>
        )}

        <Text style={[styles.section, { color: palette.textFaint }]}>功能</Text>
        <View style={[styles.card, { borderColor: palette.border, backgroundColor: palette.surface, padding: 4 }]}>
          <Row icon="settings-outline" label="设置" sub="外观、服务商、模型与更多" onPress={() => router.push('/(tabs)/settings')} palette={palette} primary={primary} />
          <Row icon="megaphone-outline" label="公告" sub="云端公告与通知" onPress={() => router.push('/settings/announcements')} palette={palette} primary={primary} />
          <Row icon="cloud-upload-outline" label="云存档" sub="账号数据云端同步/备份" onPress={() => router.push('/settings/cloudsave')} palette={palette} primary={primary} />
          <Row icon="chatbubbles-outline" label="官方渠道" sub="与官方沟通反馈" onPress={() => router.push('/settings/channel')} palette={palette} primary={primary} />
          <Row icon="shield-checkmark-outline" label="用户须知协议" sub="查看协议与隐私说明" onPress={() => router.push('/settings/agreements')} palette={palette} primary={primary} last />
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ icon, label, sub, onPress, palette, primary, last }: { icon: any; label: string; sub: string; onPress: () => void; palette: any; primary: string; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md, backgroundColor: pressed ? alpha(primary, 0.06) : 'transparent', borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: palette.border })}>
      <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(primary, 0.12) }}>
        <Ionicons name={icon} size={18} color={primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: palette.text, fontSize: 14.5, fontWeight: '700' }}>{label}</Text>
        <Text style={{ color: palette.textDim, fontSize: 12, marginTop: 1 }}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={palette.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  h1: { fontSize: 28, fontWeight: '900' },
  iconBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  connBar: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: radius.md, padding: 10, marginBottom: 12 },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: 14, marginBottom: 12 },
  avatar: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  segRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  seg: { flex: 1, borderWidth: 1, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center' },
  inp: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  section: { fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 4, marginLeft: 2 },
});
