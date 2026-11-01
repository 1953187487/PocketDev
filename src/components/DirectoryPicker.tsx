import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import { alpha, radius, space, useTheme } from '@/theme';
import { COMMON_DIRS, listDir, stat, resolveEntry, isSafUri, safName, requestDirectoryPermission } from '@/api/localfs';

interface Entry {
  name: string;
  isDir: boolean;
}

export interface DirectoryPickerProps {
  visible: boolean;
  onClose: () => void;
  onPick: (path: string) => void;
  /** dir=选择目录（默认）；file=可选择文件作为附件。 */
  mode?: 'dir' | 'file';
  /** 起始浏览目录，默认为应用私有目录。 */
  startPath?: string;
}

/** 目录/文件选择器：浏览手机目录（私有目录 + SAF 授权的任意系统目录）。 */
export function DirectoryPicker({ visible, onClose, onPick, mode = 'dir', startPath }: DirectoryPickerProps) {
  const { theme } = useTheme();
  const { palette, primary } = theme;
  const insets = useSafeAreaInsets();

  const [cwd, setCwd] = useState(startPath || FileSystem.documentDirectory || '/');
  const [stack, setStack] = useState<string[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async (dir: string) => {
    setLoading(true);
    const names = await listDir(dir, 500);
    const out: Entry[] = [];
    for (const n of names) {
      const s = await stat(resolveEntry(dir, n));
      if (s.exists) out.push({ name: n, isDir: s.isDirectory });
    }
    out.sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1));
    setEntries(out);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (visible) {
      const start = startPath || FileSystem.documentDirectory || '/';
      setCwd(start);
      setStack([]);
      setMsg('');
      void load(start);
    }
  }, [visible, startPath, load]);

  const enter = useCallback(
    (e: Entry) => {
      if (!e.isDir) return;
      const p = resolveEntry(cwd, e.name);
      setStack((s) => [...s, cwd]);
      setCwd(p);
      void load(p);
    },
    [cwd, load],
  );

  const back = useCallback(() => {
    setStack((s) => {
      if (!s.length) return s;
      const next = [...s];
      const parent = next.pop()!;
      setCwd(parent);
      void load(parent);
      return next;
    });
  }, [load]);

  const jump = useCallback(
    (p: string) => {
      setStack((s) => [...s, cwd]);
      setCwd(p);
      setMsg('');
      void load(p);
    },
    [cwd, load],
  );

  const pickSystem = useCallback(async () => {
    setMsg('');
    const uri = await requestDirectoryPermission();
    if (!uri) {
      setMsg('未授权或已取消');
      return;
    }
    setStack((s) => [...s, cwd]);
    setCwd(uri);
    void load(uri);
  }, [cwd, load]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12, backgroundColor: palette.mode === 'dark' ? '#121828' : '#FFFFFF', borderColor: palette.border }]}>
          <View style={styles.titleRow}>
            <Pressable onPress={back} hitSlop={8} disabled={!stack.length}>
              <Ionicons name="arrow-back" size={20} color={stack.length ? palette.textDim : palette.textFaint} />
            </Pressable>
            <Text style={[styles.title, { color: palette.text }]} numberOfLines={1}>
              {isSafUri(cwd) ? safName(cwd) : cwd}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={palette.textDim} />
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {COMMON_DIRS.slice(0, 5).map((d) => (
              <Pressable
                key={d.path}
                onPress={() => jump(d.path)}
                style={[styles.chip, { borderColor: palette.border, backgroundColor: palette.surface }]}
              >
                <Text style={{ color: palette.textDim, fontSize: 12, fontWeight: '600' }}>{d.label}</Text>
              </Pressable>
            ))}
            <Pressable onPress={pickSystem} style={[styles.chip, { borderColor: alpha(primary, 0.5), backgroundColor: alpha(primary, 0.08) }]}>
              <Ionicons name="folder-open-outline" size={13} color={primary} />
              <Text style={{ color: primary, fontSize: 12, fontWeight: '700' }}>系统目录选择器</Text>
            </Pressable>
          </View>

          {msg ? <Text style={{ color: palette.danger, fontSize: 12, marginTop: 8 }}>{msg}</Text> : null}

          <ScrollView style={{ flex: 1, marginTop: 8 }}>
            {loading ? (
              <Text style={{ color: palette.textFaint, fontSize: 13, textAlign: 'center', marginTop: 20 }}>加载中…</Text>
            ) : entries.length === 0 ? (
              <Text style={{ color: palette.textFaint, fontSize: 13, textAlign: 'center', marginTop: 20 }}>空目录</Text>
            ) : (
              entries.map((e) => (
                <Pressable
                  key={e.name}
                  onPress={() => enter(e)}
                  style={[styles.row, { borderColor: palette.border, backgroundColor: palette.surface }]}
                >
                  <Ionicons name={e.isDir ? 'folder' : 'document-text-outline'} size={18} color={e.isDir ? primary : palette.textDim} />
                  <Text style={{ color: palette.text, fontSize: 14, flex: 1 }} numberOfLines={1}>
                    {isSafUri(e.name) ? safName(e.name) : e.name}
                  </Text>
                  {e.isDir && mode !== 'file' ? (
                    <Pressable
                      hitSlop={8}
                      onPress={() => onPick(resolveEntry(cwd, e.name))}
                      style={[styles.pickBtn, { borderColor: alpha(primary, 0.5), backgroundColor: alpha(primary, 0.08) }]}
                    >
                      <Text style={{ color: primary, fontSize: 12, fontWeight: '700' }}>选择</Text>
                    </Pressable>
                  ) : null}
                  {!e.isDir && mode === 'file' ? (
                    <Pressable
                      hitSlop={8}
                      onPress={() => onPick(resolveEntry(cwd, e.name))}
                      style={[styles.pickBtn, { borderColor: alpha(primary, 0.5), backgroundColor: alpha(primary, 0.08) }]}
                    >
                      <Text style={{ color: primary, fontSize: 12, fontWeight: '700' }}>引用</Text>
                    </Pressable>
                  ) : null}
                </Pressable>
              ))
            )}
          </ScrollView>

          {mode !== 'file' ? (
            <Pressable onPress={() => onPick(cwd)} style={[styles.pickBtn, styles.pickBottom, { backgroundColor: primary, borderColor: primary }]}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>将当前目录设为工作区</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '82%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: space.lg,
    paddingTop: 14,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  title: { flex: 1, fontSize: 16, fontWeight: '800' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 7,
  },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  pickBottom: {
    alignSelf: 'center',
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
});
