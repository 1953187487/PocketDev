import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { AuroraBackdrop } from '@/ui';
import { alpha, radius, space, useTheme } from '@/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createSave, deleteSave, exportSavePath, listSaves, restoreSave, CloudSaveMeta } from '@/api/cloudsave';

export default function CloudSaveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { palette, primary } = theme;
  const [list, setList] = useState<CloudSaveMeta[]>([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => setList(await listSaves()), []);
  useEffect(() => { load(); }, [load]);

  const onCreate = async () => {
    setBusy(true);
    try { const m = await createSave(); setList(await listSaves()); Alert.alert('备份完成', `已创建：${m.name}\n键数 ${m.keys}，大小 ${(m.size/1024).toFixed(1)} KB（紧凑JSON，本设备）`); }
    catch (e) { Alert.alert('失败', (e as Error).message); }
    setBusy(false);
  };
  const onRestore = (id: string) => Alert.alert('恢复存档', '将覆盖本设备当前同名数据，确定恢复？', [
    { text: '取消', style: 'cancel' },
    { text: '恢复', onPress: async () => { setBusy(true); const r = await restoreSave(id); setBusy(false); Alert.alert(r.ok ? '恢复成功' : '恢复失败', r.ok ? `已恢复 ${r.keys} 项，建议重启应用` : r.error); } },
  ]);
  const onExport = async (id: string) => {
    const p = await exportSavePath(id);
    if (!p) return Alert.alert('失败', '文件不存在');
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(p); else Alert.alert('导出路径', p);
  };
  const onDel = (id: string) => Alert.alert('删除', '删除此存档？', [{ text: '取消', style: 'cancel' }, { text: '删除', style: 'destructive', onPress: async () => { await deleteSave(id); load(); } }]);

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      <AuroraBackdrop />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={[styles.back, { borderColor: palette.border }]}>
          <Ionicons name="chevron-back" size={20} color={palette.text} />
        </Pressable>
        <Text style={[styles.title, { color: palette.text }]}>云存档（本设备）</Text>
      </View>
      <View style={{ paddingHorizontal: space.lg, marginBottom: 8 }}>
        <Text style={{ color: palette.textDim, fontSize: 12.5 }}>登录、会话、公告等数据全部紧凑存档到本设备；不上传外部云。支持备份/恢复/导出。</Text>
        <Pressable disabled={busy} onPress={onCreate} style={[styles.btn, { backgroundColor: alpha(primary, 0.16), marginTop: 10 }]}>
          <Text style={{ color: primary, fontWeight: '800' }}>{busy ? '处理中…' : '立即创建备份'}</Text>
        </Pressable>
      </View>
      <FlatList
        data={list}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ padding: space.lg, gap: 10, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={[styles.card, { borderColor: palette.border, backgroundColor: palette.surface }]}>
            <Text style={{ color: palette.text, fontWeight: '800' }}>{item.name}</Text>
            <Text style={{ color: palette.textDim, fontSize: 12, marginTop: 2 }}>{new Date(item.createdAt).toLocaleString()} · {item.keys}键 · {(item.size/1024).toFixed(1)}KB</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Pressable onPress={() => onRestore(item.id)} style={[styles.mini, { borderColor: palette.border }]}><Text style={{ color: primary, fontWeight: '700' }}>恢复</Text></Pressable>
              <Pressable onPress={() => onExport(item.id)} style={[styles.mini, { borderColor: palette.border }]}><Text style={{ color: palette.text, fontWeight: '700' }}>导出</Text></Pressable>
              <Pressable onPress={() => onDel(item.id)} style={[styles.mini, { borderColor: palette.border }]}><Text style={{ color: '#e74c3c', fontWeight: '700' }}>删除</Text></Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={{ color: palette.textFaint, textAlign: 'center', marginTop: 20 }}>暂无备份</Text>}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space.lg, paddingBottom: space.md },
  back: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800' },
  btn: { borderRadius: radius.md, paddingVertical: 13, alignItems: 'center' },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: 14 },
  mini: { borderWidth: 1, borderRadius: radius.sm, paddingVertical: 8, paddingHorizontal: 12 },
});
