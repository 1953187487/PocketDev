import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { alpha, radius, space, useTheme } from '@/theme';
import { Button, Divider, Pill, Row, SubScreen } from '@/components/ui';
import { AGREEMENTS } from '@/agreements';
import { useAppStore } from '@/store/app';
import { APP_REPO_URL } from '@/config';

const SECURITY_ITEMS: { icon: keyof typeof Ionicons.glyphMap; title: string; desc: string }[] = [
  { icon: 'lock-closed-outline', title: '本地加密存储', desc: '服务商配置与访问令牌仅保存在设备私有目录，卸载即清除' },
  { icon: 'phone-portrait-outline', title: '最小权限原则', desc: '仅申请实现功能所必需的权限，可随时在系统设置关闭' },
  { icon: 'cloud-offline-outline', title: '无第三方采集', desc: '不部署数据采集服务器，不使用 Cookie、不做设备指纹' },
  { icon: 'git-network-outline', title: '直连不中转', desc: '请求由设备直连你的服务商与代码托管平台，我们不经手' },
  { icon: 'shield-checkmark-outline', title: '本地模型优先', desc: '支持完全离线的翻译、语音与对话，最大化隐私保护' },
];

export default function AgreementsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { palette, primary } = theme;
  const { prefs, setPrefs } = useAppStore();
  const [open, setOpen] = useState<string | null>('privacy');

  const allAccepted = prefs.agreementsAccepted && prefs.privacyAccepted;

  return (
    <SubScreen title="协议与隐私" onBack={() => router.back()}>
      <View style={{ paddingHorizontal: space.lg }}>
        <Text style={{ color: palette.textDim, fontSize: 13, lineHeight: 20, marginBottom: 16 }}>
          PocketDev 遵循 AGPL-3.0 开源协议，并以用户隐私为第一优先级。以下协议可随时查阅。
        </Text>

        {AGREEMENTS.map((a) => {
          const expanded = open === a.key;
          const accepted = a.key === 'privacy' ? prefs.privacyAccepted : prefs.agreementsAccepted;
          return (
            <View key={a.key} style={[styles.card, { borderColor: expanded ? alpha(primary, 0.4) : palette.border, backgroundColor: palette.surface }]}>
              <Pressable onPress={() => setOpen(expanded ? null : a.key)} style={styles.cardHead}>
                <View style={[styles.icon, { backgroundColor: alpha(primary, 0.1) }]}>
                  <Ionicons
                    name={a.key === 'oss' ? 'logo-github' : a.key === 'notice' ? 'information-circle-outline' : 'shield-checkmark-outline'}
                    size={18}
                    color={primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.text, fontSize: 15, fontWeight: '700' }}>{a.title}</Text>
                  <Text style={{ color: palette.textFaint, fontSize: 12, marginTop: 2 }}>
                    {accepted ? '已同意' : '未同意'} · 点击展开全文
                  </Text>
                </View>
                {accepted ? <Pill text="已同意" color={palette.success} icon="checkmark-circle" /> : null}
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={17} color={palette.textFaint} />
              </Pressable>
              {expanded ? (
                <>
                  <Divider style={{ marginVertical: 12 }} />
                  <Text style={{ color: palette.textDim, fontSize: 13, lineHeight: 22 }}>{a.body}</Text>
                </>
              ) : null}
            </View>
          );
        })}

        <Text style={{ color: palette.textDim, fontSize: 12, marginTop: 22, marginBottom: 10 }}>安全承诺</Text>
        {SECURITY_ITEMS.map((s) => (
          <Row key={s.title} style={{ gap: 12, paddingVertical: 10, alignItems: 'flex-start' }}>
            <View style={[styles.iconSm, { backgroundColor: alpha(primary, 0.1) }]}>
              <Ionicons name={s.icon} size={16} color={primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: palette.text, fontSize: 14, fontWeight: '600' }}>{s.title}</Text>
              <Text style={{ color: palette.textFaint, fontSize: 12, marginTop: 2, lineHeight: 18 }}>{s.desc}</Text>
            </View>
          </Row>
        ))}

        <View style={{ marginTop: 18 }}>
          <Button
            title={allAccepted ? '已同意全部协议' : '同意全部协议'}
            icon={allAccepted ? 'checkmark-circle' : 'checkmark'}
            variant={allAccepted ? 'secondary' : 'primary'}
            onPress={() => {
              setPrefs({ agreementsAccepted: true, privacyAccepted: true });
              router.back();
            }}
          />
        </View>

        <Text style={{ color: palette.textFaint, fontSize: 12, marginTop: 12, lineHeight: 18 }}>
          隐私问题反馈：{APP_REPO_URL}
        </Text>
      </View>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.lg, padding: 14, marginBottom: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  iconSm: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
