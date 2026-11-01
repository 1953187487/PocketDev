import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alpha, radius, space, useTheme } from '@/theme';
import { listDir, readTextFile, writeTextFile, makeDir, renamePath, removePath, stat, resolveEntry, isSafUri, safName } from '@/api/localfs';

interface FileEntry {
  name: string;
  isDir: boolean;
}

export interface FileManagerProps {
  visible: boolean;
  onClose: () => void;
  root: string;
  onPick?: (path: string, content: string) => void;
}

type ConfirmAction =
  | { type: 'rename'; path: string; name: string }
  | { type: 'delete'; path: string; name: string }
  | { type: 'newFile'; dir: string }
  | { type: 'newDir'; dir: string }
  | null;

/** 文件管理器：浏览本地工作区目录，查看/编辑/新建/重命名/删除。 */
export function FileManager({ visible, onClose, root, onPick }: FileManagerProps) {
  const { theme } = useTheme();
  const { palette, primary } = theme;
  const insets = useSafeAreaInsets();

  const [cwd, setCwd] = useState(root);
  const [stack, setStack] = useState<string[]>([]);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState<{ path: string; name: string; content: string } | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [confirmText, setConfirmText] = useState('');
  const [toast, setToast] = useState('');

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  }, []);

  const load = useCallback(async (dir: string) => {
    setLoading(true);
    const names = await listDir(dir, 500);
    const out: FileEntry[] = [];
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
      setCwd(root);
      setStack([]);
      void load(root);
    }
  }, [visible, root, load]);

  const open = useCallback(
    async (e: FileEntry) => {
      const p = resolveEntry(cwd, e.name);
      if (e.isDir) {
        setStack((s) => [...s, cwd]);
        setCwd(p);
        void load(p);
        return;
      }
      const content = await readTextFile(p);
      if (content == null) {
        flash('读取失败（过大或非文本）');
        return;
      }
      setViewing({ path: p, name: e.name, content });
      setDraft(content);
    },
    [cwd, load, flash],
  );

  const doConfirm = useCallback(async () => {
    if (!confirm) return;
    const c = confirm;
    setConfirm(null);
    setConfirmText('');
    if (c.type === 'rename') {
      const newName = confirmText.trim();
      if (!newName || isSafUri(c.path)) return;
      const dir = c.path.replace(/\/+$/, '').split('/').slice(0, -1).join('/');
      const ok = await renamePath(c.path, `${dir}/${newName}`);
      flash(ok ? '重命名成功' : '重命名失败');
      void load(cwd);
    } else if (c.type === 'delete') {
      const ok = await removePath(c.path);
      flash(ok ? '已删除' : '删除失败');
      void load(cwd);
    } else if (c.type === 'newFile') {
      const name = confirmText.trim();
      if (!name || isSafUri(c.dir)) return;
      const ok = await writeTextFile(`${c.dir}/${name}`, '');
      flash(ok ? '文件已创建' : '创建失败');
      void load(cwd);
    } else if (c.type === 'newDir') {
      const name = confirmText.trim();
      if (!name || isSafUri(c.dir)) return;
      const ok = await makeDir(`${c.dir}/${name}`);
      flash(ok ? '文件夹已创建' : '创建失败');
      void load(cwd);
    }
  }, [confirm, confirmText, cwd, load, flash]);

  const save = useCallback(async () => {
    if (!viewing) return;
    setSaving(true);
    const ok = await writeTextFile(viewing.path, draft);
    setSaving(false);
    flash(ok ? '已保存' : '保存失败');
    if (ok) setViewing((v) => (v ? { ...v, content: draft } : v));
  }, [viewing, draft, flash]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12, backgroundColor: palette.mode === 'dark' ? '#121828' : '#FFFFFF', borderColor: palette.border }]}>
          {toast ? (
            <View style={[styles.toast, { backgroundColor: alpha(primary, 0.14), borderColor: alpha(primary, 0.4) }]}>
              <Text style={{ color: primary, fontSize: 12.5, fontWeight: '600' }}>{toast}</Text>
            </View>
          ) : null}

          {viewing ? (
            <>
              <View style={styles.titleRow}>
                <Text style={[styles.title, { color: palette.text }]} numberOfLines={1}>{isSafUri(viewing.path) ? safName(viewing.path) : viewing.name}</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Pressable onPress={save} hitSlop={8} disabled={saving}>
                    <Ionicons name="save-outline" size={20} color={primary} />
                  </Pressable>
                  <Pressable onPress={() => setViewing(null)} hitSlop={8}>
                    <Ionicons name="close" size={22} color={palette.textDim} />
                  </Pressable>
                </View>
              </View>
              <ScrollView style={{ flex: 1, marginTop: 10 }}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  multiline
                  style={[styles.editor, { color: palette.text, borderColor: palette.border, backgroundColor: palette.surface }]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </ScrollView>
            </>
          ) : (
            <>
              <View style={styles.titleRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Pressable onPress={() => { const s = [...stack]; const parent = s.pop(); if (parent !== undefined) { setStack(s); setCwd(parent); void load(parent); } }} hitSlop={8} disabled={cwd === root}>
                  <Ionicons name="arrow-back" size={20} color={cwd === root ? palette.textFaint : palette.textDim} />
                </Pressable>
                <Text style={[styles.title, { color: palette.text }]} numberOfLines={1}>{isSafUri(cwd) ? safName(cwd) : cwd}</Text>
              </View>
              {!isSafUri(cwd) ? (
                <>
                  <Pressable onPress={() => setConfirm({ type: 'newFile', dir: cwd })} hitSlop={8}>
                    <Ionicons name="create-outline" size={20} color={palette.textDim} />
                  </Pressable>
                  <Pressable onPress={() => setConfirm({ type: 'newDir', dir: cwd })} hitSlop={8}>
                    <Ionicons name="folder-open-outline" size={20} color={palette.textDim} />
                  </Pressable>
                </>
              ) : null}
                <Pressable onPress={onClose} hitSlop={8}>
                  <Ionicons name="close" size={22} color={palette.textDim} />
                </Pressable>
              </View>
              <ScrollView style={{ flex: 1, marginTop: 8 }}>
                {loading ? (
                  <Text style={{ color: palette.textFaint, fontSize: 13, textAlign: 'center', marginTop: 20 }}>加载中…</Text>
                ) : entries.length === 0 ? (
                  <Text style={{ color: palette.textFaint, fontSize: 13, textAlign: 'center', marginTop: 20 }}>空目录</Text>
                ) : (
                  entries.map((e) => (
                    <Pressable
                      key={e.name}
                      onPress={() => open(e)}
                      onLongPress={isSafUri(cwd) ? undefined : () => setConfirm({ type: 'rename', path: resolveEntry(cwd, e.name), name: e.name })}
                      style={[styles.row, { borderColor: palette.border, backgroundColor: palette.surface }]}
                    >
                      <Ionicons name={e.isDir ? 'folder' : 'document-text-outline'} size={18} color={e.isDir ? primary : palette.textDim} />
                      <Text style={{ color: palette.text, fontSize: 14, flex: 1 }} numberOfLines={1}>{isSafUri(e.name) ? safName(e.name) : e.name}</Text>
                      <Pressable hitSlop={8} onPress={() => setConfirm({ type: 'delete', path: resolveEntry(cwd, e.name), name: e.name })}>
                        <Ionicons name="trash-outline" size={16} color={palette.textFaint} />
                      </Pressable>
                    </Pressable>
                  ))
                )}
              </ScrollView>
            </>
          )}

          {confirm ? (
            <View style={[styles.confirmBox, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={{ color: palette.text, fontSize: 14, fontWeight: '700' }}>
                {confirm.type === 'delete' ? `删除「${confirm.name}」？` : confirm.type === 'rename' ? `重命名「${confirm.name}」` : confirm.type === 'newFile' ? '新建文件' : '新建文件夹'}
              </Text>
              {confirm.type === 'delete' ? (
                <Text style={{ color: palette.textDim, fontSize: 12.5, marginTop: 4 }}>此操作不可撤销（目录将递归删除）。</Text>
              ) : (
                <TextInput
                  value={confirmText}
                  onChangeText={setConfirmText}
                  placeholder={confirm.type === 'rename' ? '新名称' : '名称'}
                  placeholderTextColor={palette.textFaint}
                  autoFocus
                  style={[styles.input, { color: palette.text, borderColor: palette.border }]}
                />
              )}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <Pressable onPress={() => { setConfirm(null); setConfirmText(''); }} style={[styles.btn, { borderColor: palette.border }]}>
                  <Text style={{ color: palette.textDim, fontSize: 13.5, fontWeight: '600' }}>取消</Text>
                </Pressable>
                <Pressable onPress={doConfirm} style={[styles.btn, { backgroundColor: primary, borderColor: primary }]}>
                  <Text style={{ color: '#fff', fontSize: 13.5, fontWeight: '700' }}>确定</Text>
                </Pressable>
              </View>
            </View>
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
    height: '78%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: space.lg,
    paddingTop: 14,
  },
  toast: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    zIndex: 20,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  title: { flex: 1, fontSize: 16, fontWeight: '800' },
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
  editor: {
    flex: 1,
    minHeight: 300,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
    fontSize: 13.5,
    textAlignVertical: 'top',
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 10,
    fontSize: 14,
  },
  confirmBox: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    bottom: 24,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
