import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { alpha, radius, space, useTheme } from '@/theme';
import { Divider, Pill, Row, SubScreen } from '@/components/ui';
import { DonationSection } from '@/components/DonationSection';
import { CONTRIBUTORS, DEVELOPERS, APP_VERSION, APP_REPO_URL, MAIN_DEVELOPER } from '@/config';

export default function AboutScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { palette, primary } = theme;

  return (
    <SubScreen title="关于 PocketDev" onBack={() => router.back()}>
      <View style={{ paddingHorizontal: space.lg }}>
        <View style={{ alignItems: 'center', marginBottom: 18 }}>
          <View style={[styles.logo, { backgroundColor: alpha(primary, 0.14), borderColor: alpha(primary, 0.3) }]}>
            <Ionicons name="sparkles" size={34} color={primary} />
          </View>
          <Text style={{ color: palette.text, fontSize: 22, fontWeight: '800', marginTop: 10 }}>PocketDev</Text>
          <Text style={{ color: palette.textDim, fontSize: 13, marginTop: 2 }}>手机端 AI 开发助手</Text>
          <Pill text={`v${APP_VERSION} · AGPL-3.0`} color={primary} icon="logo-github" />
        </View>

        <Text style={{ color: palette.textDim, fontSize: 12, marginBottom: 10 }}>开发者</Text>
        {DEVELOPERS.map((d) => (
          <Pressable
            key={d.name}
            onPress={() => d.link && Linking.openURL(d.link)}
            style={[styles.card, { borderColor: palette.border, backgroundColor: palette.surface }]}
          >
            <View style={[styles.avatar, { backgroundColor: alpha(primary, 0.14) }]}>
              <Text style={{ color: primary, fontWeight: '800', fontSize: 18 }}>{d.name.slice(0, 1)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Row style={{ gap: 6 }}>
                <Text style={{ color: palette.text, fontSize: 15, fontWeight: '700' }}>{d.name}</Text>
                {d.tag ? <Pill text={d.tag} color={primary} /> : null}
              </Row>
              <Text style={{ color: palette.textDim, fontSize: 12.5, marginTop: 2 }}>{d.role}</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={palette.textFaint} />
          </Pressable>
        ))}

        <Text style={{ color: palette.textDim, fontSize: 12, marginTop: 18, marginBottom: 10 }}>贡献者</Text>
        <View style={[styles.card, { borderColor: palette.border, backgroundColor: palette.surface }]}>
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
        </View>

        <DonationSection />

        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <Text style={{ color: palette.textFaint, fontSize: 12 }}>底层：chaitin/MonkeyCode · AGPL-3.0</Text>
          <Pressable onPress={() => Linking.openURL(APP_REPO_URL)} style={{ marginTop: 6 }}>
            <Pill text="访问仓库" color={primary} icon="logo-github" />
          </Pressable>
        </View>
      </View>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  logo: { width: 80, height: 80, borderRadius: 26, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: 14, marginBottom: 8 },
  avatar: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarSm: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
