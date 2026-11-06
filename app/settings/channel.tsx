import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuroraBackdrop } from '@/ui';
import { alpha, radius, space, useTheme } from '@/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getChannelMessages, postMessage, officialAutoReply, ChannelMessage } from '@/api/channel';

export default function ChannelScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { palette, primary } = theme;
  const [msgs, setMsgs] = useState<ChannelMessage[]>([]);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<ChannelMessage>>(null);

  const load = useCallback(async () => { setMsgs(await getChannelMessages()); }, []);
  useEffect(() => { load(); }, [load]);

  const send = async () => {
    const t = text.trim(); if (!t) return;
    setText('');
    let next = await postMessage(t, 'me');
    setMsgs(next);
    const reply = officialAutoReply(t);
    if (reply) { next = await postMessage(reply, 'official'); setMsgs(next); }
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: palette.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AuroraBackdrop />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={[styles.back, { borderColor: palette.border }]}>
          <Ionicons name="chevron-back" size={20} color={palette.text} />
        </Pressable>
        <Text style={[styles.title, { color: palette.text }]}>聊天渠道（官方）</Text>
      </View>
      <FlatList
        ref={listRef}
        data={msgs}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: space.lg, gap: 10, paddingBottom: 20 }}
        renderItem={({ item }) => {
          const mine = item.from === 'me';
          return (
            <View style={[styles.bubble, { alignSelf: mine ? 'flex-end' : 'flex-start', backgroundColor: mine ? alpha(primary, 0.18) : palette.surface, borderColor: palette.border }]}>
              <Text style={{ color: palette.textFaint, fontSize: 11, marginBottom: 2 }}>{mine ? '我' : '官方'}</Text>
              <Text style={{ color: palette.text, fontSize: 14.5, lineHeight: 21 }}>{item.text}</Text>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={{ color: palette.textFaint, textAlign: 'center', marginTop: 40 }}>向官方发送消息，获取帮助与公告提示</Text>}
      />
      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10), borderTopColor: palette.border, backgroundColor: alpha(palette.bg, 0.92) }]}>
        <TextInput value={text} onChangeText={setText} placeholder="输入消息…" placeholderTextColor={palette.textFaint} style={[styles.input, { borderColor: palette.border, color: palette.text, backgroundColor: palette.surfaceSunken }]} />
        <Pressable onPress={send} style={[styles.send, { backgroundColor: alpha(primary, 0.18) }]}>
          <Ionicons name="send" size={18} color={primary} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space.lg, paddingBottom: space.md },
  back: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800' },
  bubble: { maxWidth: '86%', borderWidth: 1, borderRadius: radius.lg, padding: 12 },
  composer: { flexDirection: 'row', gap: 10, paddingHorizontal: space.lg, paddingTop: 10, borderTopWidth: 1, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
