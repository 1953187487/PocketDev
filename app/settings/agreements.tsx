import { AuroraBackdrop, Button, Pill, SubScreen } from '@/ui';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { alpha, radius, space, useTheme } from '@/theme';
import { NOTICE_SECTIONS, NOTICE_TITLE, NOTICE_VERSION, REFERENCES } from '@/agreements';
import { useAppStore } from '@/store/app';
import { APP_REPO_URL } from '@/config';

export default function AgreementsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { palette, primary, primaryText } = theme;
  const { prefs, setPrefs } = useAppStore();
  const [open, setOpen] = useState<string | null>('summary');
  const accepted = !!prefs.agreementsAccepted && !!prefs.privacyAccepted;

  return (
    <SubScreen title="用户须知协议" onBack={() => router.back()}>
      <View style={{ paddingHorizontal: space.lg, paddingBottom: 24 }}>
        <View style={[styles.hero, { borderColor: alpha(primary, 0.35), backgroundColor: alpha(primary, 0.08) }]}>
          <View style={[styles.heroIcon, { backgroundColor: alpha(primary, 0.16) }]}>
            <Ionicons name="shield-checkmark" size={26} color={primary} />
          </View>
          <Text style={{ color: palette.text, fontSize: 20, fontWeight: '900', marginTop: 10 }}>{NOTICE_TITLE}</Text>
          <Text style={{ color: palette.textDim, fontSize: 12.5, marginTop: 4, textAlign: 'center', lineHeight: 18 }}>
            已合并开源说明、使用须知与隐私条款 · 版本 {NOTICE_VERSION}
          </Text>
          <View style={{ marginTop: 10 }}>
            <Pill text={accepted ? '你已同意' : '请阅读并同意'} color={accepted ? palette.success : primary} icon={accepted ? 'checkmark-circle' : 'alert-circle'} />
          </View>
        </View>

        {NOTICE_SECTIONS.map((s) => {
          const expanded = open === s.key;
          return (
            <Pressable key={s.key} onPress={() => setOpen(expanded ? null : s.key)} style={[styles.card, { borderColor: expanded ? alpha(primary, 0.45) : palette.border, backgroundColor: palette.surface }]}>
              <View style={styles.row}>
                <Text style={{ color: palette.text, fontSize: 15, fontWeight: '800', flex: 1 }}>{s.title}</Text>
                <Ionicons name={expanded ? 'chevron-up-circle' : 'chevron-down-circle-outline'} size={20} color={expanded ? primary : palette.textFaint} />
              </View>
              {expanded ? <Text style={{ color: palette.textDim, fontSize: 13.5, lineHeight: 22, marginTop: 10 }}>{s.body}</Text> : null}
            </Pressable>
          );
        })}

        <Text style={{ color: palette.textFaint, fontSize: 12, marginTop: 14, marginBottom: 8 }}>第三方与致谢</Text>
        <View style={{ gap: 6 }}>
          {REFERENCES.map((r) => (
            <Pressable key={r.name} onPress={() => Linking.openURL(r.url)} style={[styles.ref, { borderColor: palette.border, backgroundColor: palette.surfaceSunken }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: palette.text, fontSize: 13, fontWeight: '700' }}>{r.name}</Text>
                <Text style={{ color: palette.textFaint, fontSize: 11.5 }}>{r.license} · {r.note}</Text>
              </View>
              <Ionicons name="open-outline" size={15} color={palette.textFaint} />
            </Pressable>
          ))}
        </View>

        <View style={{ marginTop: 18, gap: 10 }}>
          <Button
            title={accepted ? '已同意（可重新确认）' : '我已阅读并同意《用户须知协议》'}
            icon="checkmark-done"
            variant={accepted ? 'secondary' : 'primary'}
            onPress={() => { setPrefs({ agreementsAccepted: true, privacyAccepted: true }); router.back(); }}
          />
          <Text style={{ color: palette.textFaint, fontSize: 11.5, lineHeight: 17, textAlign: 'center' }}>反馈：{APP_REPO_URL}/issues</Text>
        </View>
      </View>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  hero: { borderWidth: 1, borderRadius: radius.xl, padding: 18, alignItems: 'center', marginBottom: 14 },
  heroIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: 14, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ref: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: radius.md, padding: 10 },
});
