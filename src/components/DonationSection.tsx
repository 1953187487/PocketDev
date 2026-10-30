import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/theme';
import { Card, Row, Spacer, SectionTitle } from '@/components/ui';
import { DONATION, MAIN_DEVELOPER } from '@/config';

function QrModal({
  source,
  label,
  tip,
  visible,
  onClose,
}: {
  source: number;
  label: string;
  tip: string;
  visible: boolean;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const { palette, primary } = theme;
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={styles.mBackdrop}>
        <BlurView intensity={40} tint={palette.mode === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.overlay }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.mPanel, { borderColor: palette.glassBorder }]}>
          <View style={styles.mPanelInner}>
            <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={[styles.mTitle, { color: palette.text }]}>{label}收款码</Text>
              <Pressable onPress={onClose} style={[styles.mClose, { backgroundColor: primary + '22' }]}>
                <Ionicons name="close" size={20} color={primary} />
              </Pressable>
            </Row>
            <Image source={source} style={styles.mImage} resizeMode="contain" />
            <Text style={[styles.mTip, { color: palette.textDim }]}>{tip}</Text>
            <Text style={[styles.mHint, { color: palette.textDim }]}>打开 {label}「扫一扫」对准上方收款码即可</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function DonationSection() {
  const { theme } = useTheme();
  const { palette, primary } = theme;
  const [open, setOpen] = useState<'alipay' | 'wechat' | null>(null);

  return (
    <>
      <SectionTitle>支持作者</SectionTitle>
      <Card glow>
        <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={[styles.title, { color: palette.text }]}>{DONATION.title}</Text>
            <Text style={[styles.desc, { color: palette.textDim }]}>{DONATION.desc}</Text>
          </View>
          <View style={[styles.devBadge, { backgroundColor: primary + '22', borderColor: primary + '55' }]}>
            <Text style={[styles.devBadgeText, { color: primary }]}>{MAIN_DEVELOPER.name}</Text>
          </View>
        </Row>
        <Spacer h={14} />
        <Row style={{ gap: 12 }}>
          {([
            { key: 'alipay' as const, item: DONATION.alipay },
            { key: 'wechat' as const, item: DONATION.wechat },
          ]).map(({ key, item }) => (
            <Pressable key={key} onPress={() => setOpen(key)} style={[styles.qrCard, { borderColor: palette.glassBorder }]}>
              <View style={[styles.qrThumb, { backgroundColor: '#FFFFFF' }]}>
                <Image source={item.qr} style={styles.qrThumbImg} resizeMode="cover" />
              </View>
              <View style={{ flex: 1, marginTop: 10, alignItems: 'center' }}>
                <Text style={[styles.qrName, { color: palette.text }]}>{item.name}</Text>
                <Text style={[styles.qrTip, { color: palette.textDim }]}>{item.tip}</Text>
                <View style={[styles.qrBtn, { backgroundColor: primary + '22' }]}>
                  <Ionicons name="qr-code-outline" size={13} color={primary} />
                  <Text style={{ color: primary, fontSize: 12, fontWeight: '600', marginLeft: 4 }}>查看收款码</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </Row>
      </Card>

      {open ? (
        <QrModal
          source={open === 'alipay' ? DONATION.alipay.qr : DONATION.wechat.qr}
          label={open === 'alipay' ? DONATION.alipay.name : DONATION.wechat.name}
          tip={open === 'alipay' ? DONATION.alipay.tip : DONATION.wechat.tip}
          visible
          onClose={() => setOpen(null)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '700' },
  desc: { fontSize: 13, lineHeight: 19, color: '#8A94AD', marginTop: 4 },
  devBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  devBadgeText: { fontSize: 13, fontWeight: '700' },
  qrCard: { flex: 1, padding: 10, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  qrThumb: { width: '100%', height: 110, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  qrThumbImg: { width: '100%', height: '100%' },
  qrName: { fontSize: 15, fontWeight: '700' },
  qrTip: { fontSize: 12, marginTop: 2 },
  qrBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, marginTop: 8 },
  mBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  mPanel: { width: '100%', maxWidth: 380, borderRadius: 26, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
  mPanelInner: { padding: 18 },
  mTitle: { fontSize: 18, fontWeight: '800' },
  mClose: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  mImage: { width: '100%', height: 420, borderRadius: 14 },
  mTip: { fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 12 },
  mHint: { fontSize: 12, textAlign: 'center', marginTop: 4 },
});
