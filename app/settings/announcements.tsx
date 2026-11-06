import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuroraBackdrop, SectionLabel } from '@/ui';
import { alpha, radius, space, useTheme } from '@/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listAnnouncements, publishAnnouncement, removeAnnouncement, Announcement } from '@/api/announcements';
import { getAccountSession } from '@/api/account';

export default function AnnouncementsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { palette, primary } = theme;
  const [list, setList] = useState<Announcement[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [canPub, setCanPub] = useState(false);
  const [author, setAuthor] = useState('官方');

  const load = useCallback(async () => {
    setList(await listAnnouncements());
    const s = await getAccountSession();
    setCanPub(!!s); // 登录用户可发布；官方账号发布标记为官方
    if (s) setAuthor(s.isOfficial ? 'PocketDev 官方' : s.nickname);
  }, []);
  useEffect(() => { load(); }, [load]);

  const publish = async () => {
    if (!title.trim() || !body.trim()) return Alert.alert('提示', '请填写标题和内容');
    await publishAnnouncement({ title, body, level: 'info' });
    setTitle(''); setBody('');
    load();
    Alert.alert('已发布', '公告已保存在本设备（可通过渠道分享）');
  };

  const del = (id: string) => Alert.alert('删除公告', '确定删除？', [
    { text: '取消', style: 'cancel' },
    { text: '删除', style: 'destructive', onPress: async () => { await removeAnnouncement(id); load(); } },
  ]);

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      <AuroraBackdrop />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={[styles.back, { borderColor: palette.border }]}>
          <Ionicons name="chevron-back" size={20} color={palette.text} />
        </Pressable>
        <Text style={[styles.title, { color: palette.text }]}>公告</Text>
      </View>
      <FlatList
        data={list}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: space.lg, gap: 12, paddingBottom: 40 }}
        ListHeaderComponent={canPub ? (
          <View style={{ gap: 10, marginBottom: 8 }}>
            <SectionLabel>发布公告</SectionLabel>
            <TextInput value={title} onChangeText={setTitle} placeholder="公告标题" placeholderTextColor={palette.textFaint} style={[styles.inp, { borderColor: palette.border, color: palette.text, backgroundColor: palette.surfaceSunken }]} />
            <TextInput value={body} onChangeText={setBody} placeholder="公告内容（将保存在本设备，可用于通知）" placeholderTextColor={palette.textFaint} multiline style={[styles.inp, { borderColor: palette.border, color: palette.text, backgroundColor: palette.surfaceSunken, minHeight: 90, textAlignVertical: 'top' }]} />
            <Pressable onPress={publish} style={[styles.btn, { backgroundColor: alpha(primary, 0.16) }]}>
              <Text style={{ color: primary, fontWeight: '800' }}>发布公告</Text>
            </Pressable>
          </View>
        ) : <Text style={{ color: palette.textFaint, marginBottom: 8 }}>登录后可发布公告</Text>}
        renderItem={({ item }) => (
          <Pressable onLongPress={() => del(item.id)} style={[styles.card, { borderColor: palette.border, backgroundColor: palette.surface }]}>
            <Text style={{ color: palette.text, fontSize: 16, fontWeight: '800' }}>{item.title}</Text>
            <Text style={{ color: palette.textDim, fontSize: 12, marginTop: 2 }}>{item.author} · {new Date(item.createdAt).toLocaleString()}</Text>
            <Text style={{ color: palette.text, fontSize: 14, marginTop: 8, lineHeight: 21 }}>{item.body}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={{ color: palette.textFaint, textAlign: 'center', marginTop: 30 }}>暂无公告</Text>}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space.lg, paddingBottom: space.md },
  back: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800' },
  inp: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  btn: { borderRadius: radius.md, paddingVertical: 13, alignItems: 'center' },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: 14 },
});
