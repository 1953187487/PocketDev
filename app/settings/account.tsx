import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuroraBackdrop, Pill, SectionLabel, Surface } from '@/ui';
import { alpha, radius, space, useTheme } from '@/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AccountSession, accountSnapshot, completeRegister, login, logout,
  sendRegisterCode, checkRegisterCode, OFFICIAL_EMAIL, OFFICIAL_NICK,
  getCloudBase, setCloudBase, defaultCloudBase,
} from '@/api/account';

export default function AccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { palette, primary } = theme;
  const [session, setSession] = useState<AccountSession | null>(null);
  const [mode, setMode] = useState<'login' | 'register' | 'verify' | 'setpw'>('login');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [nick, setNick] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [apiBase, setApiBase] = useState('');

  const refresh = useCallback(async () => {
    const s = await accountSnapshot();
    setSession(s.session);
    setApiBase(await getCloudBase());
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const onSendCode = async () => {
    setBusy(true);
    const r = await sendRegisterCode(email);
    setBusy(false);
    if (!r.ok) return Alert.alert('发送失败', r.error || '请检查云端服务地址与网络');
    Alert.alert('验证码已发送', '请查收邮箱验证码（10分钟有效）');
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
    setSession(r.session); Alert.alert('注册成功', '已通过云端登录');
    setMode('login'); setCode(''); setPw(''); setNick(''); refresh();
  };
  const onLogin = async () => {
    setBusy(true);
    const r = await login(email, pw);
    setBusy(false);
    if (!r.ok) {
      if (String(r.error||'').includes('重复登录')) {
        Alert.alert('登录受限', r.error + '\n是否强制登录（踢下其他会话）？', [
          { text:'取消', style:'cancel' },
          { text:'强制登录', onPress: async()=>{ const rr=await login(email,pw,true); if(rr.ok){ setSession(rr.session); refresh(); } else Alert.alert('失败', rr.error); } }
        ]);
        return;
      }
      return Alert.alert('登录失败', r.error);
    }
    setSession(r.session); refresh();
  };
  const onLogout = async () => { await logout(); setSession(null); refresh(); };
  const saveBase = async () => { await setCloudBase(apiBase); Alert.alert('已保存', '云端服务地址已更新'); };

  const inp = [styles.input, { borderColor: palette.border, color: palette.text, backgroundColor: palette.surfaceSunken }];

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      <AuroraBackdrop />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={[styles.back, { borderColor: palette.border }]}>
          <Ionicons name="chevron-back" size={20} color={palette.text} />
        </Pressable>
        <Text style={[styles.title, { color: palette.text }]}>云端账号</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionLabel>云端服务</SectionLabel>
        <View style={{ paddingHorizontal: space.lg, gap: 8, marginBottom: 8 }}>
          <Text style={{ color: palette.textDim, fontSize: 12.5 }}>登录/存档/公告/渠道走云端服务器（非本地模式）。请填写后端地址（https）。</Text>
          <TextInput value={apiBase} onChangeText={setApiBase} placeholder={defaultCloudBase()} placeholderTextColor={palette.textFaint} autoCapitalize="none" style={inp as any} />
          <Pressable onPress={saveBase} style={[styles.btn, { backgroundColor: alpha(primary, 0.12) }]}><Text style={{ color: primary, fontWeight: '700' }}>保存云端地址</Text></Pressable>
        </View>

        <SectionLabel>当前状态</SectionLabel>
        <View style={{ paddingHorizontal: space.lg, marginBottom: 10 }}>
          <Surface>
            {session ? (
              <View style={{ gap: 6 }}>
                <Text style={{ color: palette.text, fontSize: 16, fontWeight: '800' }}>{session.nickname}</Text>
                <Text style={{ color: palette.textDim, fontSize: 13 }}>{session.email}</Text>
                <Pill text={session.isOfficial ? '官方账号(云端)' : '云端已登录'} color={palette.success} icon="cloud-done" />
                <Pressable onPress={onLogout} style={[styles.btn, { backgroundColor: alpha('#e74c3c', 0.12), marginTop: 6 }]}>
                  <Text style={{ color: '#e74c3c', fontWeight: '700' }}>退出云端登录</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={{ color: palette.text, fontSize: 15, fontWeight: '700' }}>未登录（请先连接云端并登录）</Text>
            )}
          </Surface>
        </View>

        {!session ? (
          <>
            <SectionLabel>{mode === 'login' ? '云端登录' : mode === 'register' ? '注册（1/3 邮箱）' : mode === 'verify' ? '注册（2/3 验证码）' : '注册（3/3 设置密码）'}</SectionLabel>
            <View style={{ paddingHorizontal: space.lg, gap: 10 }}>
              <TextInput value={email} onChangeText={setEmail} placeholder="邮箱" placeholderTextColor={palette.textFaint} autoCapitalize="none" keyboardType="email-address" style={inp as any} editable={mode === 'login' || mode === 'register'} />
              {mode === 'login' ? (<>
                <TextInput value={pw} onChangeText={setPw} placeholder="密码" placeholderTextColor={palette.textFaint} secureTextEntry style={inp as any} />
                <Pressable disabled={busy} onPress={onLogin} style={[styles.btn, { backgroundColor: alpha(primary, 0.16) }]}><Text style={{ color: primary, fontWeight: '800' }}>{busy ? '登录中…' : '云端登录'}</Text></Pressable>
                <View style={{ flexDirection:'row', gap:10 }}>
                  <Pressable onPress={() => setMode('register')} style={{ flex:1 }}><Text style={{ color: primary, textAlign:'center' }}>注册</Text></Pressable>
                  <Pressable onPress={() => { setEmail(OFFICIAL_EMAIL); setMode('login'); }} style={{ flex:1 }}><Text style={{ color: palette.textDim, textAlign:'center' }}>填入官方邮箱</Text></Pressable>
                </View>
              </>) : null}
              {mode === 'register' ? (<>
                <Pressable disabled={busy} onPress={onSendCode} style={[styles.btn, { backgroundColor: alpha(primary, 0.16) }]}><Text style={{ color: primary, fontWeight: '800' }}>{busy ? '发送中…' : '发送验证码'}</Text></Pressable>
                <Pressable onPress={() => setMode('login')}><Text style={{ color: palette.textDim, textAlign:'center' }}>返回登录</Text></Pressable>
              </>) : null}
              {mode === 'verify' ? (<>
                <TextInput value={code} onChangeText={setCode} placeholder="6位验证码" placeholderTextColor={palette.textFaint} keyboardType="number-pad" style={inp as any} />
                <Pressable disabled={busy} onPress={onVerify} style={[styles.btn, { backgroundColor: alpha(primary, 0.16) }]}><Text style={{ color: primary, fontWeight: '800' }}>验证</Text></Pressable>
              </>) : null}
              {mode === 'setpw' ? (<>
                <TextInput value={nick} onChangeText={setNick} placeholder="昵称（可选）" placeholderTextColor={palette.textFaint} style={inp as any} />
                <TextInput value={pw} onChangeText={setPw} placeholder="设置密码（至少6位）" placeholderTextColor={palette.textFaint} secureTextEntry style={inp as any} />
                <Pressable disabled={busy} onPress={onRegisterDone} style={[styles.btn, { backgroundColor: alpha(primary, 0.16) }]}><Text style={{ color: primary, fontWeight: '800' }}>{busy ? '提交中…' : '完成注册并云端登录'}</Text></Pressable>
              </>) : null}
            </View>
          </>
        ) : null}

        <SectionLabel>入口</SectionLabel>
        <View style={{ paddingHorizontal: space.lg, gap: 10 }}>
          <NavRow icon="chatbubbles-outline" label="聊天渠道（云端）" onPress={() => router.push('/settings/channel')} palette={palette} primary={primary} />
          <NavRow icon="megaphone-outline" label="公告（云端）" onPress={() => router.push('/settings/announcements')} palette={palette} primary={primary} />
          <NavRow icon="cloud-upload-outline" label="云存档（云端）" onPress={() => router.push('/settings/cloudsave')} palette={palette} primary={primary} />
          <NavRow icon="shield-checkmark-outline" label="用户须知协议" onPress={() => router.push('/settings/agreements')} palette={palette} primary={primary} />
        </View>
      </ScrollView>
    </View>
  );
}
function NavRow({ icon, label, onPress, palette, primary }: any) {
  return (
    <Pressable onPress={onPress} style={[styles.btn, { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, flexDirection: 'row', justifyContent: 'space-between' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Ionicons name={icon} size={18} color={primary} /><Text style={{ color: palette.text, fontWeight: '700' }}>{label}</Text></View>
      <Ionicons name="chevron-forward" size={16} color={palette.textFaint} />
    </Pressable>
  );
}
const styles = StyleSheet.create({
  root:{flex:1}, header:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:space.lg,paddingBottom:space.md},
  back:{width:36,height:36,borderRadius:18,borderWidth:1,alignItems:'center',justifyContent:'center'},
  title:{fontSize:22,fontWeight:'800'}, content:{paddingBottom:40},
  input:{borderWidth:1,borderRadius:radius.md,paddingHorizontal:14,paddingVertical:12,fontSize:15},
  btn:{borderRadius:radius.md,paddingVertical:13,paddingHorizontal:14,alignItems:'center',justifyContent:'center'},
});
