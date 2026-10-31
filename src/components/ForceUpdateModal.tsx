import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import NetInfo from '@react-native-community/netinfo';
import { alpha, radius, useTheme } from '@/theme';
import { Button } from '@/components/ui';
import { downloadApk, installApk, type ReleaseInfo } from '@/api/updates';
import { APP_REPO_URL } from '@/config';

type Phase = 'idle' | 'downloading' | 'install' | 'done' | 'error';

export function ForceUpdateModal({
  visible,
  release,
}: {
  visible: boolean;
  release: ReleaseInfo | null;
}) {
  const { theme } = useTheme();
  const { palette, primary, primaryText } = theme;
  const [phase, setPhase] = useState<Phase>('idle');
  const [percent, setPercent] = useState(0);
  const [message, setMessage] = useState('');
  const [installed, setInstalled] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback(
    async (url: string) => {
      setPhase('downloading');
      setPercent(0);
      setMessage('');
      try {
        const uri = await downloadApk(url, setPercent);
        setPercent(100);
        setPhase('install');
        await installApk(uri);
        setInstalled(uri);
        setPhase('done');
      } catch (e) {
        setMessage((e as Error).message || '下载失败');
        setPhase('error');
      }
    },
    [],
  );

  // 进入应用 / 检测到更新时：若在线，自动开始下载；若离线，等待恢复后在数秒内自动下载。
  useEffect(() => {
    if (!visible || !release?.download_url) return;
    if (phase !== 'idle') return;
    let cancelled = false;
    const auto = async () => {
      const net = await NetInfo.fetch();
      if (cancelled) return;
      if (net.isConnected) {
        await start(release.download_url!);
      } else {
        timer.current = setTimeout(auto, 4000);
      }
    };
    void auto();
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [visible, release?.download_url, phase, start]);

  if (!visible || !release) return null;

  const downloading = phase === 'downloading';
  const failed = phase === 'error';

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <BlurView intensity={40} tint={palette.mode === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.overlay }]} />
        <View style={[styles.panel, { borderColor: palette.border, backgroundColor: palette.mode === 'dark' ? '#121828' : '#FFFFFF' }]}>
          <View style={styles.panelBody}>
            <View style={[styles.iconWrap, { backgroundColor: alpha(primary, 0.12), borderColor: alpha(primary, 0.3) }]}>
              <Ionicons
                name={downloading ? 'cloud-download' : failed ? 'alert-circle' : 'checkmark-circle'}
                size={32}
                color={downloading ? primary : failed ? palette.danger : palette.success}
              />
            </View>
            <Text style={[styles.title, { color: palette.text }]}>
              {downloading ? '正在下载更新' : failed ? '下载失败' : '发现新版本'}
            </Text>
            <Text style={[styles.tag, { color: primary }]}>{release.tag}</Text>

            {downloading ? (
              <>
                <View style={[styles.progressTrack, { backgroundColor: palette.surfaceSunken }]}>
                  <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: primary }]} />
                </View>
                <Text style={[styles.desc, { color: palette.textDim }]}>已下载 {percent}%</Text>
                <Button title="取消" variant="ghost" onPress={() => setPhase('idle')} />
              </>
            ) : failed ? (
              <>
                <Text style={[styles.desc, { color: palette.textDim }]}>{message}</Text>
                <Button title="重试" onPress={() => { setPhase('idle'); setPercent(0); }} />
                <View style={{ height: 10 }} />
                <Button
                  title="前往发布页下载"
                  variant="ghost"
                  onPress={() => Linking.openURL(release.download_url || release.url || APP_REPO_URL)}
                />
              </>
            ) : phase === 'done' ? (
              <>
                <Text style={[styles.desc, { color: palette.textDim }]}>
                  更新包已就绪，请在系统安装器中完成安装，安装后重启应用即可。
                </Text>
                <Button
                  title="打开安装包"
                  onPress={() => { if (installed) void installApk(installed); }}
                />
              </>
            ) : (
              <>
                <Text style={[styles.desc, { color: palette.textDim }]}>
                  PocketDev {release.tag} 已发布。为保证功能与体验，请立即更新到最新版本后继续使用。
                </Text>
                <Button title="立即更新" onPress={() => start(release.download_url!)} />
                <View style={{ height: 10 }} />
                <Button
                  title="前往发布页"
                  variant="ghost"
                  onPress={() => Linking.openURL(release.url || APP_REPO_URL)}
                />
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  panel: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.xxl,
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
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '800' },
  tag: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  desc: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10, marginBottom: 22 },
  progressTrack: { width: '100%', height: 8, borderRadius: 4, marginTop: 18, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
});
