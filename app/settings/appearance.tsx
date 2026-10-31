import { Divider, Row, SubScreen } from '@/ui';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ACCENTS, alpha, radius, space, useTheme, type ThemeMode } from '@/theme';
import { useAppStore, type AppLanguage } from '@/store/app';

const MODES: { key: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'system', label: '跟随系统', icon: 'phone-portrait-outline' },
  { key: 'light', label: '浅色', icon: 'sunny-outline' },
  { key: 'dark', label: '深色', icon: 'moon-outline' },
];

const LANGS: { key: AppLanguage; label: string }[] = [
  { key: 'zh', label: '简体中文' },
  { key: 'en', label: 'English' },
];

export default function AppearanceScreen() {
  const router = useRouter();
  const { theme, mode, accentId, setMode, setAccentId } = useTheme();
  const { palette, primary } = theme;
  const { prefs, setPrefs } = useAppStore();

  return (
    <SubScreen title="外观与语言" onBack={() => router.back()}>
      <View style={{ paddingHorizontal: space.lg }}>
        <Text style={{ color: palette.textDim, fontSize: 12, marginBottom: 10 }}>主题模式</Text>
        <Row style={{ gap: 8 }}>
          {MODES.map((o) => {
            const on = mode === o.key;
            return (
              <Pressable
                key={o.key}
                onPress={() => setMode(o.key)}
                style={[styles.seg, { borderColor: on ? primary : palette.border, backgroundColor: on ? alpha(primary, 0.12) : palette.surfaceSunken }]}
              >
                <Ionicons name={o.icon} size={14} color={on ? primary : palette.textDim} />
                <Text style={{ color: on ? primary : palette.text, fontSize: 12.5, fontWeight: '600' }}>{o.label}</Text>
              </Pressable>
            );
          })}
        </Row>

        <Text style={{ color: palette.textDim, fontSize: 12, marginVertical: 10 }}>主色调</Text>
        <Row style={{ gap: 12, flexWrap: 'wrap' }}>
          {ACCENTS.map((a) => {
            const on = a.id === accentId;
            return (
              <Pressable
                key={a.id}
                onPress={() => setAccentId(a.id)}
                style={[styles.dot, { backgroundColor: a.primary, borderWidth: 3, borderColor: on ? palette.text : 'transparent' }]}
              >
                {on ? <Ionicons name="checkmark" size={15} color={a.primaryText} /> : null}
              </Pressable>
            );
          })}
        </Row>

        <Divider style={{ marginVertical: 20 }} />

        <Text style={{ color: palette.textDim, fontSize: 12, marginBottom: 10 }}>界面语言</Text>
        <View style={{ gap: 8 }}>
          {LANGS.map((l) => {
            const on = prefs.language === l.key;
            return (
              <Pressable
                key={l.key}
                onPress={() => setPrefs({ language: l.key })}
                style={[styles.langRow, { borderColor: on ? primary : palette.border, backgroundColor: on ? alpha(primary, 0.1) : palette.surface }]}
              >
                <Text style={{ color: palette.text, fontSize: 15, fontWeight: '600', flex: 1 }}>{l.label}</Text>
                {on ? <Ionicons name="checkmark-circle" size={20} color={primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  seg: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1 },
  dot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  langRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: radius.lg, borderWidth: 1 },
});
