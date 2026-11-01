import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, space, useTheme } from '@/theme';
import { generateAndroidScaffold } from '@/api/scaffold';

export interface ScaffoldSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 目标工作区目录。 */
  root: string;
  workspaceName: string;
  onDone: (files: string[]) => void;
}

/** Android 项目脚手架生成入口。 */
export function ScaffoldSheet({ visible, onClose, root, workspaceName, onDone }: ScaffoldSheetProps) {
  const { theme } = useTheme();
  const { palette, primary } = theme;
  const insets = useSafeAreaInsets();
  const [pkg, setPkg] = useState('com.example.pocketapp');
  const [name, setName] = useState(workspaceName || 'PocketApp');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const doGenerate = async () => {
    setRunning(true);
    setError('');
    try {
      const result = await generateAndroidScaffold(root, { packageName: pkg, appName: name });
      if (result.error) {
        setError(result.error);
        return;
      }
      onDone(result.files);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 18, backgroundColor: palette.mode === 'dark' ? '#121828' : '#FFFFFF', borderColor: palette.border }]}>
          <View style={styles.handle} />
          <Text style={[styles.title, { color: palette.text }]}>生成 Android 脚手架</Text>
          <Text style={{ color: palette.textDim, fontSize: 12.5, marginBottom: 14 }}>
            在「{workspaceName}」下生成 Gradle + Manifest + 入口源码，供后续 AI 开发
          </Text>
          <Text style={[styles.label, { color: palette.textFaint }]}>应用名</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="PocketApp"
            placeholderTextColor={palette.textFaint}
            style={[styles.input, { color: palette.text, borderColor: palette.border }]}
          />
          <Text style={[styles.label, { color: palette.textFaint }]}>包名</Text>
          <TextInput
            value={pkg}
            onChangeText={setPkg}
            placeholder="com.example.pocketapp"
            placeholderTextColor={palette.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { color: palette.text, borderColor: palette.border }]}
          />
          {error ? (
            <Text style={{ color: palette.danger, fontSize: 12.5, marginTop: 10 }}>{error}</Text>
          ) : null}
          <Pressable
            onPress={doGenerate}
            disabled={running}
            style={[styles.btn, { backgroundColor: primary, opacity: running ? 0.6 : 1 }]}
          >
            <Ionicons name="construct" size={16} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 14.5, fontWeight: '700' }}>
              {running ? '生成中…' : '生成脚手架'}
            </Text>
          </Pressable>
          <Pressable onPress={onClose} style={[styles.btn, styles.btnGhost, { borderColor: palette.border }]}>
            <Text style={{ color: palette.textDim, fontSize: 14, fontWeight: '600' }}>取消</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: space.lg, paddingTop: 10 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#00000033', alignSelf: 'center', marginBottom: 14 },
  title: { fontSize: 19, fontWeight: '800', marginBottom: 4 },
  label: { fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 5 },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14.5 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: radius.lg,
    paddingVertical: 13,
    marginTop: 16,
  },
  btnGhost: { borderWidth: 1, marginTop: 8 },
});
