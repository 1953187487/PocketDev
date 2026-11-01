import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alpha, radius, space, useTheme } from '@/theme';
import { listSessions, searchSessions, deleteSession, clearSessions, type Session } from '@/api/sessions';

export interface HistorySheetProps {
  visible: boolean;
  onClose: () => void;
  currentId: string | null;
  onOpen: (s: Session) => void;
  onNew: () => void;
}

/** 会话历史与消息搜索。 */
export function HistorySheet({ visible, onClose, currentId, onOpen, onNew }: HistorySheetProps) {
  const { theme } = useTheme();
  const { palette, primary } = theme;
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [hits, setHits] = useState<{ session: Session; snippet: string }[]>([]);

  const load = useCallback(async () => {
    setSessions(await listSessions());
  }, []);

  useEffect(() => {
    if (visible) {
      setQ('');
      void load();
    }
  }, [visible, load]);

  const doSearch = useCallback(async (text: string) => {
    setQ(text);
    if (text.trim()) setHits(await searchSessions(text));
    else setHits([]);
  }, []);

  const fmtTime = (t: number) => {
    const d = new Date(t);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12, backgroundColor: palette.mode === 'dark' ? '#121828' : '#FFFFFF', borderColor: palette.border }]}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: palette.text }]}>历史会话</Text>
            <Pressable onPress={onNew} hitSlop={8} style={[styles.newBtn, { borderColor: alpha(primary, 0.5) }]}>
              <Ionicons name="add" size={15} color={primary} />
              <Text style={{ color: primary, fontSize: 12.5, fontWeight: '700' }}>新会话</Text>
            </Pressable>
          </View>

          <TextInput
            value={q}
            onChangeText={doSearch}
            placeholder="搜索消息内容…"
            placeholderTextColor={palette.textFaint}
            style={[styles.search, { color: palette.text, borderColor: palette.border, backgroundColor: palette.surface }]}
          />

          <ScrollView style={{ flex: 1, marginTop: 10 }}>
            {q.trim() ? (
              hits.length === 0 ? (
                <Text style={{ color: palette.textFaint, fontSize: 13, textAlign: 'center', marginTop: 20 }}>无匹配消息</Text>
              ) : (
                hits.map((h) => (
                  <Pressable key={h.session.id} onPress={() => onOpen(h.session)} style={[styles.item, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: palette.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>{h.session.title}</Text>
                      {h.snippet ? <Text style={{ color: palette.textDim, fontSize: 12.5, marginTop: 3 }} numberOfLines={2}>{h.snippet}</Text> : null}
                    </View>
                    <Text style={{ color: palette.textFaint, fontSize: 11 }}>{fmtTime(h.session.updatedAt)}</Text>
                  </Pressable>
                ))
              )
            ) : sessions.length === 0 ? (
              <Text style={{ color: palette.textFaint, fontSize: 13, textAlign: 'center', marginTop: 20 }}>暂无历史会话</Text>
            ) : (
              sessions.map((s) => (
                <Pressable key={s.id} onPress={() => onOpen(s)} style={[styles.item, { borderColor: currentId === s.id ? primary : palette.border, backgroundColor: currentId === s.id ? alpha(primary, 0.06) : palette.surface }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: palette.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>{s.title}</Text>
                    {s.workspaceName ? <Text style={{ color: palette.textFaint, fontSize: 11.5, marginTop: 2 }}>{s.workspaceName}</Text> : null}
                  </View>
                  <Text style={{ color: palette.textFaint, fontSize: 11 }}>{fmtTime(s.updatedAt)}</Text>
                  <Pressable onPress={() => { void deleteSession(s.id).then(load); }} hitSlop={8}>
                    <Ionicons name="trash-outline" size={15} color={palette.textFaint} />
                  </Pressable>
                </Pressable>
              ))
            )}
          </ScrollView>

          {!q.trim() && sessions.length > 0 ? (
            <Pressable
              onPress={() => { void clearSessions().then(load); }}
              style={[styles.clearBtn, { borderColor: palette.border }]}
            >
              <Ionicons name="trash-outline" size={14} color={palette.textDim} />
              <Text style={{ color: palette.textDim, fontSize: 12.5, fontWeight: '600' }}>清空全部会话</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '80%', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: space.lg, paddingTop: 10 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#00000033', alignSelf: 'center', marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  title: { fontSize: 17, fontWeight: '800' },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1 },
  search: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, borderWidth: 1, marginBottom: 8 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, marginTop: 4 },
});
