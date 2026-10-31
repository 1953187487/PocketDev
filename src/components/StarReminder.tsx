import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, Linking, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { alpha, useTheme } from '@/theme';
import { GlassPane, Button } from '@/ui';
import { getObject, setObject } from '@/storage';
import { APP_REPO_URL } from '@/config';

const STAR_KEY = 'star_reminder';
/** 使用满 1 小时后提醒一次去 GitHub 点 Star。 */
const THRESHOLD_MS = 60 * 60 * 1000;

interface StarState {
  uptimeMs: number;
  prompted: boolean;
}

export function StarReminder() {
  const { theme } = useTheme();
  const { palette, primary } = theme;
  const [visible, setVisible] = useState(false);
  const stateRef = useRef<StarState>({ uptimeMs: 0, prompted: false });
  const lastActiveRef = useRef<number | null>(null);

  const maybePrompt = useCallback(() => {
    if (stateRef.current.uptimeMs >= THRESHOLD_MS && !stateRef.current.prompted) setVisible(true);
  }, []);

  const flush = useCallback(() => {
    const last = lastActiveRef.current;
    if (last == null) return;
    stateRef.current.uptimeMs += Date.now() - last;
    lastActiveRef.current = null;
    void setObject(STAR_KEY, { ...stateRef.current });
  }, []);

  useEffect(() => {
    let alive = true;
    void getObject<Partial<StarState>>(STAR_KEY).then((saved) => {
      if (!alive) return;
      stateRef.current = { uptimeMs: saved?.uptimeMs ?? 0, prompted: saved?.prompted ?? false };
      lastActiveRef.current = Date.now();
      maybePrompt();
    });
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        lastActiveRef.current = Date.now();
      } else {
        flush();
        maybePrompt();
      }
    });
    return () => {
      alive = false;
      sub.remove();
      flush();
    };
  }, [flush, maybePrompt]);

  const dismiss = useCallback(() => {
    setVisible(false);
    stateRef.current.uptimeMs = 0;
    void setObject(STAR_KEY, { ...stateRef.current });
  }, []);

  const goStar = useCallback(() => {
    setVisible(false);
    stateRef.current.prompted = true;
    void setObject(STAR_KEY, { ...stateRef.current });
    void Linking.openURL(APP_REPO_URL);
  }, []);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <BlurView intensity={40} tint={palette.mode === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.overlay }]} />
        <GlassPane intensity={24} style={styles.panel}>
          <View style={styles.panelBody}>
            <View style={[styles.iconWrap, { backgroundColor: alpha(primary, 0.12), borderColor: alpha(primary, 0.3) }]}>
              <Ionicons name="star" size={32} color={palette.warning} />
            </View>
            <Text style={[styles.title, { color: palette.text }]}>喜欢 PocketDev 吗？</Text>
            <Text style={[styles.desc, { color: palette.textDim }]}>
              你已经使用 PocketDev 一段时间了。如果它对你有所帮助，欢迎到 GitHub 给项目点个 Star，这是对维护者最大的鼓励。
            </Text>
            <Button title="去 GitHub 点 Star" onPress={goStar} />
            <View style={{ height: 10 }} />
            <Button title="稍后再说" variant="ghost" onPress={dismiss} />
          </View>
        </GlassPane>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, overflow: 'hidden' },
  panel: { width: '100%', maxWidth: 360 },
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
  desc: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 12, marginBottom: 22 },
});
