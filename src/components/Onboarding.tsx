import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { alpha, radius, space, useTheme } from '@/theme';
import { AuroraBackdrop, Button, Pill } from '@/ui';
import { useAppStore, type AppLanguage } from '@/store/app';
import { useI18n } from '@/i18n';
import { NOTICE_SECTIONS, NOTICE_TITLE, NOTICE_VERSION } from '@/agreements';
import { APP_VERSION } from '@/config';
import { getCloudBase, setCloudBase, login, sendRegisterCode, checkRegisterCode, completeRegister } from '@/api/account';

const STEPS = [
  { key: 'agree', icon: 'shield-checkmark' as const, title: '用户须知协议', sub: '三项协议已合并，阅读后勾选同意' },
  { key: 'cloud', icon: 'cloud-outline' as const, title: '云端服务', sub: '配置云端地址并检查连接' },
  { key: 'auth', icon: 'person-circle-outline' as const, title: '云端账号', sub: '注册或登录（邮箱验证码 → 设置密码）' },
  { key: 'ready', icon: 'sparkles' as const, title: '准备完成', sub: '开始使用 PocketDev' },
];

const LANGS: { key: AppLanguage; label: string }[] = [
  { key: 'zh', label: '中文' },
  { key: 'en', label: 'English' },
];

export function Onboarding() {
  const { theme } = useTheme();
  const { palette, primary, primaryText } = theme;
  const insets = useSafeAreaInsets();
  const { prefs, setPrefs } = useAppStore();
  const { t } = useI18n();

  const [step, setStep] = useState(0);
  const [agree, setAgree] = useState(false);
  const [openSec, setOpenSec] = useState<string>('summary');
  const [cloudUrl, setCloudUrl] = useState('');
  const [cloudOk, setCloudOk] = useState<boolean | null>(null);
  const [cloudMsg, setCloudMsg] = useState('');
  const [checking, setChecking] = useState(false);
  // auth
  const [authMode, setAuthMode] = useState<'login'|'register'|'verify'|'setpw'>('login');
  const [email, setEmail] = useState(''); const [code, setCode] = useState(''); const [pw, setPw] = useState(''); const [nick, setNick] = useState('');
  const [busy, setBusy] = useState(false); const [authed, setAuthed] = useState(false);

  React.useEffect(() => { (async()=>{ setCloudUrl(await getCloudBase()); })(); }, []);

  const checkCloud = useCallback(async () => {
    setChecking(true); setCloudMsg(''); setCloudOk(null);
    try {
      const net = await NetInfo.fetch();
      if (!net.isConnected) throw new Error('网络未连接');
      await setCloudBase(cloudUrl);
      const base = cloudUrl.trim().replace(/\/+$/,'');
      const r = await fetch(base + '/health');
      const j = await r.json().catch(()=>({}));
      if (!r.ok || !j.ok) throw new Error(j.error || '云端响应异常');
      setCloudOk(true); setCloudMsg(`已连接：${j.service||'cloud'} v${j.version||'?'}${j.mail?' · 邮件可用':''}`);
    } catch(e:any){ setCloudOk(false); setCloudMsg(e?.message||'连接失败（请确认地址可达，HTTPS/端口/防火墙）'); }
    setChecking(false);
  }, [cloudUrl]);

  const doSend = async()=>{ setBusy(true); const r=await sendRegisterCode(email); setBusy(false); if(!r.ok) return Alert.alert('发送失败',r.error); Alert.alert('验证码已发送','请查收邮箱'); setAuthMode('verify'); };
  const doVerify = async()=>{ setBusy(true); const r=await checkRegisterCode(email,code); setBusy(false); if(!r.ok) return Alert.alert('验证失败',r.error); setAuthMode('setpw'); };
  const doComplete = async()=>{ setBusy(true); const r=await completeRegister(email,code,pw,nick); setBusy(false); if(!r.ok) return Alert.alert('失败',r.error); setAuthed(true); Alert.alert('注册成功','云端账号已登录'); };
  const doLogin = async()=>{ setBusy(true); const r=await login(email,pw); setBusy(false); if(!r.ok) return Alert.alert('登录失败',r.error); setAuthed(true); };

  const canNext = step===0 ? agree : step===1 ? !!cloudOk : step===2 ? authed : true;
  const finish = () => setPrefs({ onboarded: true, onboardedVersion: APP_VERSION, agreementsAccepted: true, privacyAccepted: true });

  const inp = [styles.inp, { borderColor: palette.border, color: palette.text, backgroundColor: palette.surfaceSunken }];

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      <AuroraBackdrop />
      <View style={[styles.top, { paddingTop: insets.top + 10 }]}>
        <View style={styles.dots}>
          {STEPS.map((_,i)=>(<View key={i} style={[styles.dot,{ backgroundColor: i<=step?primary:palette.border, width: i===step?22:8 }]} />))}
        </View>
        <View style={styles.langRow}>
          {LANGS.map(l=>(
            <Pressable key={l.key} onPress={()=>setPrefs({language:l.key})} style={[styles.langPill,{ borderColor: prefs.language===l.key?primary:palette.border, backgroundColor: prefs.language===l.key?alpha(primary,0.12):'transparent' }]}>
              <Text style={{ color: prefs.language===l.key?primary:palette.textDim, fontSize:12, fontWeight:'700' }}>{l.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.body,{ paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={[styles.heroIcon,{ backgroundColor: alpha(primary,0.14), borderColor: alpha(primary,0.3) }]}>
            <Ionicons name={STEPS[step].icon} size={30} color={primary} />
          </View>
          <Text style={[styles.hTitle,{ color: palette.text }]}>{STEPS[step].title}</Text>
          <Text style={[styles.hSub,{ color: palette.textDim }]}>{STEPS[step].sub}</Text>
        </View>

        {step===0 ? (
          <View style={{ gap:10 }}>
            <View style={[styles.noticeHead,{ borderColor: alpha(primary,0.35), backgroundColor: alpha(primary,0.07) }]}>
              <Text style={{ color: palette.text, fontSize:17, fontWeight:'900' }}>{NOTICE_TITLE}</Text>
              <Text style={{ color: palette.textDim, fontSize:12, marginTop:2 }}>版本 {NOTICE_VERSION} · 共 {NOTICE_SECTIONS.length} 节 · 可展开阅读全文</Text>
            </View>
            {NOTICE_SECTIONS.map(s=>{
              const open=openSec===s.key;
              return (
                <Pressable key={s.key} onPress={()=>setOpenSec(open?'':s.key)} style={[styles.sec,{ borderColor: open?alpha(primary,0.45):palette.border, backgroundColor: palette.surface }]}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                    <Text style={{ color: palette.text, fontSize:14.5, fontWeight:'800', flex:1 }}>{s.title}</Text>
                    <Ionicons name={open?'chevron-up':'chevron-down'} size={16} color={palette.textFaint} />
                  </View>
                  {open ? <Text style={{ color: palette.textDim, fontSize:13, lineHeight:21, marginTop:8 }}>{s.body}</Text> : null}
                </Pressable>
              );
            })}
            <Pressable onPress={()=>setAgree(!agree)} style={[styles.agreeRow,{ borderColor: agree?primary:palette.border, backgroundColor: agree?alpha(primary,0.1):palette.surface }]}>
              <View style={[styles.check,{ borderColor: agree?primary:palette.border, backgroundColor: agree?primary:'transparent' }]}>
                {agree ? <Ionicons name="checkmark" size={14} color={primaryText} /> : null}
              </View>
              <Text style={{ color: palette.text, fontSize:14, fontWeight:'700', flex:1 }}>我已阅读并同意《{NOTICE_TITLE}》（含隐私与云端账号条款）</Text>
            </Pressable>
          </View>
        ) : null}

        {step===1 ? (
          <View style={[styles.card,{ borderColor: palette.border, backgroundColor: palette.surface }]}>
            <Text style={{ color: palette.textDim, fontSize:13, lineHeight:20, marginBottom:10 }}>PocketDev 1.0.7 已全面采用云端登录（本地模式已移除）。请填写可用的云端后端地址（如 https://...）。</Text>
            <TextInput value={cloudUrl} onChangeText={setCloudUrl} placeholder="https://your-cloud-host:17888" placeholderTextColor={palette.textFaint} autoCapitalize="none" style={inp as any} />
            <View style={{ marginTop:10 }}><Button title={checking?'检查中…':'检查连接'} loading={checking} onPress={checkCloud} icon="cloud-done-outline" /></View>
            {cloudMsg ? <Text style={{ color: cloudOk?palette.success:palette.danger, fontSize:12.5, marginTop:10 }}>{cloudMsg}</Text> : null}
          </View>
        ) : null}

        {step===2 ? (
          <View style={[styles.card,{ borderColor: palette.border, backgroundColor: palette.surface, gap:10 }]}>
            {authed ? <Pill text="云端账号已就绪" color={palette.success} icon="checkmark-circle" /> : null}
            {!authed ? (<>
              <TextInput value={email} onChangeText={setEmail} placeholder="邮箱" placeholderTextColor={palette.textFaint} autoCapitalize="none" keyboardType="email-address" style={inp as any} />
              {authMode==='login'||authMode==='register'||authMode==='setpw' ? <TextInput value={pw} onChangeText={setPw} placeholder={authMode==='setpw'?'设置密码(≥6位)':'密码'} placeholderTextColor={palette.textFaint} secureTextEntry style={inp as any} /> : null}
              {authMode==='verify'? <TextInput value={code} onChangeText={setCode} placeholder="6位验证码" placeholderTextColor={palette.textFaint} keyboardType="number-pad" style={inp as any} /> : null}
              {authMode==='setpw'? <TextInput value={nick} onChangeText={setNick} placeholder="昵称(可选)" placeholderTextColor={palette.textFaint} style={inp as any} /> : null}
              {authMode==='login'? (<><Button title={busy?'登录中…':'登录'} onPress={doLogin} loading={busy} /><Pressable onPress={()=>setAuthMode('register')}><Text style={{color:primary,textAlign:'center'}}>没有账号？去注册（邮箱验证码）</Text></Pressable></>) : null}
              {authMode==='register'? (<><Button title={busy?'发送中…':'发送验证码'} onPress={doSend} loading={busy} /><Pressable onPress={()=>setAuthMode('login')}><Text style={{color:palette.textDim,textAlign:'center'}}>返回登录</Text></Pressable></>) : null}
              {authMode==='verify'? <Button title="验证" onPress={doVerify} loading={busy} /> : null}
              {authMode==='setpw'? <Button title={busy?'提交中…':'完成注册并登录'} onPress={doComplete} loading={busy} /> : null}
              <Text style={{color:palette.textFaint,fontSize:11.5}}>流程：邮箱→验证码→设置密码→登录；同账号不支持重复并发登录（云端）。</Text>
            </>) : <Text style={{color:palette.textDim}}>可进入下一步。</Text>}
          </View>
        ) : null}

        {step===3 ? (
          <View style={[styles.card,{ borderColor: palette.border, backgroundColor: palette.surface, alignItems:'center', gap:10 }]}>
            <Pill text="云端模式" color={primary} icon="cloud" />
            <Pill text={agree?'协议已同意':'-'} color={palette.success} icon="shield-checkmark" />
            <Pill text={authed?'账号已登录':'未登录'} color={authed?palette.success:palette.danger} icon="person" />
            <Text style={{ color: palette.textDim, fontSize:13, textAlign:'center', lineHeight:20, marginTop:6 }}>你可以在设置中修改云端地址、管理账号、查看公告与云存档。</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer,{ paddingBottom: Math.max(insets.bottom,14) }]}>
        {step>0 ? <View style={{width:90}}><Button title="上一步" variant="ghost" onPress={()=>setStep(s=>Math.max(0,s-1))} /></View> : <View style={{width:90}} />}
        <View style={{flex:1}}>
          {step<STEPS.length-1 ? <Button title="下一步" disabled={!canNext} onPress={()=>setStep(s=>Math.min(STEPS.length-1,s+1))} /> : <Button title="进入应用" onPress={finish} icon="arrow-forward" />}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:{...StyleSheet.absoluteFillObject,zIndex:100,elevation:20},
  top:{paddingHorizontal:space.lg,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  dots:{flexDirection:'row',gap:6,alignItems:'center'}, dot:{height:8,borderRadius:4},
  langRow:{flexDirection:'row',gap:6}, langPill:{paddingHorizontal:10,paddingVertical:5,borderRadius:999,borderWidth:1},
  body:{paddingHorizontal:space.lg,paddingTop:6},
  hero:{alignItems:'center',marginVertical:8},
  heroIcon:{width:68,height:68,borderRadius:22,alignItems:'center',justifyContent:'center',borderWidth:1,marginBottom:10},
  hTitle:{fontSize:23,fontWeight:'900',textAlign:'center'}, hSub:{fontSize:13,textAlign:'center',marginTop:4,lineHeight:19},
  noticeHead:{borderWidth:1,borderRadius:radius.lg,padding:14},
  sec:{borderWidth:1,borderRadius:radius.md,padding:12},
  agreeRow:{flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderRadius:radius.lg,padding:14,marginTop:4},
  check:{width:22,height:22,borderRadius:7,borderWidth:1.5,alignItems:'center',justifyContent:'center'},
  card:{borderWidth:1,borderRadius:radius.lg,padding:14},
  inp:{borderWidth:1,borderRadius:radius.md,paddingHorizontal:14,paddingVertical:12,fontSize:15},
  footer:{flexDirection:'row',gap:10,paddingHorizontal:space.lg,paddingTop:8},
});
