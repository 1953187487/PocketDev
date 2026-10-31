import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { alpha, space, type, useTheme, Button, SubScreen } from '@/ui';
import {
  getDeviceBridgeStatus,
  performDeviceAction,
  SUPPORTED_ACTIONS,
  type ActionKind,
  type DeviceAction,
  type DeviceBridgeStatus,
} from '@/api/device';

export default function AutomationScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { palette, primary, primaryText } = theme;
  const [status, setStatus] = useState<DeviceBridgeStatus | null>(null);
  const [pending, setPending] = useState<DeviceAction | null>(null);
  const [result, setResult] = useState<string>('');

  const refresh = useCallback(async () => {
    setStatus(await getDeviceBridgeStatus());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const request = useCallback((a: DeviceAction) => setPending(a), []);

  const confirmRun = useCallback(async () => {
    if (!pending) return;
    const r = await performDeviceAction(pending);
    setPending(null);
    setResult(`${pending.kind}：${r.message}`);
  }, [pending]);

  const kindMeta: Record<ActionKind, string> = {
    tap: '点按坐标',
    swipe: '滑动手势',
    input: '输入文本',
    key: '按键',
    openApp: '打开应用',
    screenshot: '截屏',
  };

  const ready = status?.supported && status.installed && status.running && status.permission;

  return (
    <SubScreen title="手机自动化（小龙虾）" onBack={() => router.back()}>
      <View style={{ paddingHorizontal: space.lg, gap: 12 }}>
        <Text style={{ color: palette.textDim, fontSize: 13, lineHeight: 20 }}>
          通过 Shizuku / Dhizuku 助手式地操作设备。出于安全，每个动作都会先弹出确认，经你逐条同意后才会执行，不做任何批量或自动连续操作。
        </Text>

        <View style={[styles.card, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: ready ? palette.success : status?.supported ? primary : palette.border }]} />
            <Text style={{ color: palette.text, ...type.bodyStrong, flex: 1 }}>
              {status?.supported
                ? `桥接状态：${ready ? '已就绪' : '未就绪'}`
                : '桥接状态：不可用'}
            </Text>
            <Button title="刷新" small variant="secondary" onPress={refresh} />
          </View>
          {status ? (
            <Text style={{ color: palette.textDim, fontSize: 12.5, lineHeight: 19, marginTop: 10 }}>
              {status.message}
            </Text>
          ) : null}
        </View>

        <View style={[styles.card, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          <Text style={{ color: palette.text, ...type.bodyStrong, marginBottom: 8 }}>使用前提</Text>
          <Text style={{ color: palette.textDim, fontSize: 12.5, lineHeight: 19 }}>
            1. 在 Android 设备上安装 Shizuku（或用 Dhizuku 完成 owner 授权）。
            {'\n'}2. 启动 Shizuku 服务（无线调试或 ADB）。
            {'\n'}3. 返回本页点击「刷新」，授予 PocketDev 相应权限。
            {'\n'}4. 选择下方动作并逐条确认执行。
          </Text>
        </View>

        <Text style={{ color: palette.textDim, ...type.caption, marginTop: 4 }}>可选动作</Text>
        {SUPPORTED_ACTIONS.map((a) => (
          <Pressable
            key={a.kind}
            disabled={!ready}
            onPress={() => request({ kind: a.kind, label: a.label, params: {} })}
            style={({ pressed }) => [
              styles.actionRow,
              { borderColor: palette.border, backgroundColor: palette.surface, opacity: ready ? (pressed ? 0.75 : 1) : 0.5 },
            ]}
          >
            <View style={[styles.actionIcon, { backgroundColor: alpha(primary, 0.1) }]}>
              <Ionicons name="git-commit-outline" size={17} color={ready ? primary : palette.textFaint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: ready ? palette.text : palette.textFaint, ...type.bodyStrong }}>{a.label}</Text>
              <Text style={{ color: palette.textFaint, ...type.caption, marginTop: 2 }}>{a.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={palette.textFaint} />
          </Pressable>
        ))}

        {result ? <Text style={{ color: primary, fontSize: 12.5 }}>{result}</Text> : null}
        {!ready ? (
          <Text style={{ color: palette.textFaint, fontSize: 12, textAlign: 'center' }}>
            完成以上前提并刷新成功后，即可逐条执行动作。
          </Text>
        ) : null}
      </View>

      <Modal visible={!!pending} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setPending(null)}>
        <View style={[styles.modalWrap, { backgroundColor: palette.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPending(null)} />
          {pending ? (
            <View style={[styles.modalCard, { borderColor: palette.border, backgroundColor: palette.mode === 'dark' ? '#121828' : '#FFFFFF' }]}>
              <View style={[styles.modalIcon, { backgroundColor: alpha(primary, 0.12), borderColor: alpha(primary, 0.3) }]}>
                <Ionicons name="alert-circle" size={26} color={primary} />
              </View>
              <Text style={{ color: palette.text, ...type.heading, marginTop: 12 }}>确认执行「{kindMeta[pending.kind]}」</Text>
              <Text style={{ color: palette.textDim, fontSize: 13, lineHeight: 20, marginTop: 8, textAlign: 'center' }}>
                该操作将在你的设备上执行，请确认参数无误。PocketDev 每次都会单独向你请求授权，不会自动连续执行。
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                <View style={{ flex: 1 }}>
                  <Button title="取消" variant="ghost" onPress={() => setPending(null)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title="确认执行" onPress={confirmRun} icon="checkmark" />
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  card: { padding: space.md, borderRadius: 14 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  actionIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  modalWrap: { flex: 1, justifyContent: 'center', padding: 24 },
  modalCard: { borderWidth: 1, borderRadius: 20, padding: 22, alignItems: 'center' },
  modalIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
