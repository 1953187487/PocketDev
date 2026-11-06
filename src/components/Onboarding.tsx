import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alpha, radius, space, useTheme } from '@/theme';
import { AuroraBackdrop, Button } from '@/ui';
import { useAppStore, type AppLanguage } from '@/store/app';
import { NOTICE_SECTIONS, NOTICE_TITLE, NOTICE_VERSION } from '@/agreements';
import { APP_VERSION } from '@/config';

const LANGS: { key: AppLanguage; label: string }[] = [{ key: 'zh', label: '中文' }, { key: 'en', label: 'English' }];

export function Onboarding() {
  const { theme } = useTheme();
  const { palette, primary, primaryText } = theme;
  const insets = useSafeAreaInsets();
  const { prefs, setPrefs } = useAppStore();
  const [agree, setAgree] = useState(false);
  const [openSec, setOpenSec] = useState<string>('summary');

  const finish = () => setPrefs({ onboarded: true, onboardedVersion: APP_VERSION, agreementsAccepted: true, privacyAccepted: true });

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      <AuroraBackdrop />
      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <View style={[styles.dot, { backgroundColor: primary, width: 22 }]} />
          <View style={[styles.dot, { backgroundColor: palette.border, width: 8 }]} />
        </View>
        <View style={styles.langRow}>
          {LANGS.map(l => (
            <Pressable key={l.key} onPress={() => setPrefs({ language: l.key })} style={[styles.langPill, { borderColor: prefs.language === l.key ? primary : palette.border, backgroundColor: prefs.language === l.key ? alpha(primary, 0.12) : 'transparent' }]}>
              <Text style={{ color: prefs.language === l.key ? primary : palette.textDim, fontSize: 12, fontWeight: '700' }}>{l.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: alpha(primary, 0.14), borderColor: alpha(primary, 0.3) }]}>
            <Ionicons name="shield-checkmark" size={30} color={primary} />
          </View>
          <Text style={[styles.hTitle, { color: palette.text }]}>用户须知协议</Text>
          <Text style={[styles.hSub, { color: palette.textDim }]}>阅读并同意后进入应用；账号登录请在「我的」中完成</Text>
        </View>

        <View style={[styles.noticeHead, { borderColor: alpha(primary, 0.35), backgroundColor: alpha(primary, 0.07) }]}>
          <Text style={{ color: palette.text, fontSize: 17, fontWeight: '900' }}>{NOTICE_TITLE}</Text>
          <Text style={{ color: palette.textDim, fontSize: 12, marginTop: 2 }}>版本 {NOTICE_VERSION} · 共 {NOTICE_SECTIONS.length} 节 · 可展开阅读全文</Text>
        </View>

        {NOTICE_SECTIONS.map(s => {
          const open = openSec === s.key;
          return (
            <Pressable key={s.key} onPress={() => setOpenSec(open ? '' : s.key)} style={[styles.sec, { borderColor: open ? alpha(primary, 0.45) : palette.border, backgroundColor: palette.surface }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: palette.text, fontSize: 14.5, fontWeight: '800', flex: 1 }}>{s.title}</Text>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={palette.textFaint} />
              </View>
              {open ? <Text style={{ color: palette.textDim, fontSize: 13, lineHeight: 21, marginTop: 8 }}>{s.body}</Text> : null}
            </Pressable>
          );
        })}

        <Pressable onPress={() => setAgree(!agree)} style={[styles.agreeRow, { borderColor: agree ? primary : palette.border, backgroundColor: agree ? alpha(primary, 0.1) : palette.surface }]}>
          <View style={[styles.check, { borderColor: agree ? primary : palette.border, backgroundColor: agree ? primary : 'transparent' }]}>
            {agree ? <Ionicons name="checkmark" size={14} color={primaryText} /> : null}
          </View>
          <Text style={{ color: palette.text, fontSize: 14, fontWeight: '700', flex: 1 }}>我已阅读并同意《{NOTICE_TITLE}》</Text>
        </Pressable>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <View style={{ flex: 1 }}>
          <Button title="进入应用" disabled={!agree} onPress={finish} icon="arrow-forward" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 100, elevation: 20 },
  top: { paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dot: { height: 8, borderRadius: 4 },
  langRow: { flexDirection: 'row', gap: 6 },
  langPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  body: { paddingHorizontal: space.lg, paddingTop: 6, gap: 10 },
  hero: { alignItems: 'center', marginVertical: 8 },
  heroIcon: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 10 },
  hTitle: { fontSize: 23, fontWeight: '900', textAlign: 'center' },
  hSub: { fontSize: 13, textAlign: 'center', marginTop: 4, lineHeight: 19 },
  noticeHead: { borderWidth: 1, borderRadius: radius.lg, padding: 14 },
  sec: { borderWidth: 1, borderRadius: radius.md, padding: 12 },
  agreeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: radius.lg, padding: 14, marginTop: 4 },
  check: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: space.lg, paddingTop: 8 },
});
