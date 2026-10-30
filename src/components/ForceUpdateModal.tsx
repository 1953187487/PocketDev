import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/theme';
import { Button } from '@/components/ui';
import type { ReleaseInfo } from '@/api/updates';
import { APP_REPO_URL } from '@/config';

export function ForceUpdateModal({
  visible,
  release,
}: {
  visible: boolean;
  release: ReleaseInfo | null;
}) {
  const { theme } = useTheme();
  const { palette, primary, primaryText, accent } = theme;
  if (!visible || !release) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <BlurView intensity={40} tint={palette.mode === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.overlay }]} />
        <View style={[styles.panel, { borderColor: palette.glassBorder }]}>
          <BlurView intensity={40} tint={palette.mode === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.glassStrong }]} />
          <View style={styles.panelBody}>
            <View style={[styles.iconWrap, { backgroundColor: accent.primary + '2B', borderColor: accent.primary + '55' }]}>
              <Ionicons name="cloud-download" size={34} color={primary} />
            </View>
            <Text style={[styles.title, { color: palette.text }]}>发现新版本</Text>
            <Text style={[styles.tag, { color: primary }]}>{release.tag}</Text>
            <Text style={[styles.desc, { color: palette.textDim }]}>
              PocketDev {release.tag} 已发布。为保证功能与体验，请立即更新到最新版本后继续使用。
            </Text>
            <Button
              title="立即更新"
              onPress={() => {
                if (release.download_url) Linking.openURL(release.download_url);
              }}
            />
            <View style={{ height: 10 }} />
            <Button
              title="前往发布页"
              variant="ghost"
              onPress={() => Linking.openURL(release.url || APP_REPO_URL)}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  panel: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  panelBody: { padding: 24, alignItems: 'center' },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '800' },
  tag: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  desc: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10, marginBottom: 22 },
});
