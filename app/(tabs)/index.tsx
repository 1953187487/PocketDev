import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alpha, radius, space, useTheme } from '@/theme';
import { AuroraBackdrop } from '@/components/ui';
import { useAppStore, useActiveWorkspace, type Workspace } from '@/store/app';
import { streamChat, ChatError } from '@/api/ai';

interface Bubble {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  streaming?: boolean;
  error?: boolean;
}

const SUGGESTIONS = [
  { icon: 'code-slash' as const, title: '写一段代码', prompt: '帮我写一段可复用的 TypeScript 工具函数' },
  { icon: 'git-branch' as const, title: '整理仓库', prompt: '请分析当前仓库结构并给出优化建议' },
  { icon: 'bulb' as const, title: '设计方案', prompt: '为这个需求设计一个技术方案' },
  { icon: 'search' as const, title: '解释代码', prompt: '解释这段代码的作用和实现思路' },
];

export default function ChatScreen() {
  const { theme } = useTheme();
  const { palette, primary, primaryText } = theme;
  const insets = useSafeAreaInsets();
  const { provider, providerReady, workspaces } = useAppStore();
  const activeWs = useActiveWorkspace();

  const [messages, setMessages] = useState<Bubble[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [wsOpen, setWsOpen] = useState(false);
  const [keyboardOn, setKeyboardOn] = useState(false);
  const [scrollToBottom, setScrollToBottom] = useState(0);
  const listRef = useRef<FlatList<Bubble>>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const kShow = Keyboard.addListener('keyboardDidShow', () => setKeyboardOn(true));
    const kHide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOn(false));
    return () => {
      kShow.remove();
      kHide.remove();
    };
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  const append = useCallback((b: Bubble) => {
    setMessages((prev) => [...prev, b]);
  }, []);

  const patch = useCallback((id: string, fn: (b: Bubble) => Bubble) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? fn(m) : m)));
  }, []);

  const scrollToEnd = useCallback(() => {
    setScrollToBottom((v) => v + 1);
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const systemPrompt = useCallback(
    (ws: Workspace | null) => {
      const parts = [
        '你是 PocketDev 内置的 AI 开发助手，专业、可靠、语言与用户保持一致（默认使用中文）。',
        '请给出结构清晰、可直接使用的回答；涉及代码时用 Markdown 代码块，并注明语言。',
      ];
      if (ws) {
        parts.push(`当前工作区：${ws.name}${ws.repoFullName ? `（仓库：${ws.repoFullName}${ws.branch ? `，分支 ${ws.branch}` : ''}）` : ''}。回答时优先结合该仓库上下文。`);
      }
      return parts.join('\n');
    },
    [],
  );

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || sending) return;
      if (!provider.apiKey.trim()) {
        append({ id: `sys-${Date.now()}`, role: 'assistant', text: '尚未配置服务商。请前往「设置 → 自定义服务商」填写 API Key 与模型。', error: true });
        setWsOpen(true);
        return;
      }
      setInput('');
      append({ id: `u-${Date.now()}`, role: 'user', text: content });
      const aid = `a-${Date.now()}`;
      append({ id: aid, role: 'assistant', text: '', streaming: true });
      setSending(true);
      scrollToEnd();

      const history = messages
        .filter((m) => !m.error)
        .map((m) => ({ role: m.role, content: m.text }))
        .slice(-14);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const full = await streamChat(
          provider,
          [{ role: 'system', content: systemPrompt(activeWs) }, ...history, { role: 'user', content }],
          {
            signal: controller.signal,
            onDelta: (d) => {
              patch(aid, (b) => ({ ...b, text: b.text + d }));
              scrollToEnd();
            },
          },
        );
        patch(aid, (b) => ({ ...b, text: full, streaming: false }));
      } catch (e) {
        const err = e as Error;
        patch(aid, (b) => ({
          ...b,
          text: err instanceof ChatError ? err.message : '请求失败，请检查网络或服务商配置',
          streaming: false,
          error: true,
        }));
      } finally {
        setSending(false);
        abortRef.current = null;
      }
    },
    [sending, provider, messages, activeWs, append, patch, scrollToEnd, systemPrompt],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setSending(false);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setSending(false);
  }, []);

  const chooseWs = useCallback((ws: Workspace | null) => {
    setWsOpen(false);
    append({
      id: `sys-${Date.now()}`,
      role: 'assistant',
      text: ws ? `已切换到工作区：${ws.name}${ws.repoFullName ? `（${ws.repoFullName}）` : ''}` : '已切换为无工作区模式',
    });
  }, [append]);

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerTitle}>
        <View style={[styles.logoDot, { backgroundColor: primary }]}>
          <Ionicons name="sparkles" size={13} color={primaryText} />
        </View>
        <View>
          <Text style={[styles.headerName, { color: palette.text }]}>PocketDev</Text>
          <Text style={[styles.headerSub, { color: palette.textFaint }]}>
            {provider.model || 'AI 开发助手'}
          </Text>
        </View>
      </View>
      <View style={styles.headerActions}>
        <Pressable
          onPress={() => setWsOpen(true)}
          style={[styles.wsChip, { borderColor: activeWs ? alpha(primary, 0.5) : palette.border }]}
        >
          <Ionicons name="folder-open" size={13} color={activeWs ? primary : palette.textFaint} />
          <Text style={{ color: activeWs ? primary : palette.textFaint, fontSize: 12, fontWeight: '600', maxWidth: 96 }} numberOfLines={1}>
            {activeWs ? activeWs.name : '选择工作区'}
          </Text>
          <Ionicons name="chevron-down" size={12} color={activeWs ? primary : palette.textFaint} />
        </Pressable>
        {messages.length > 0 ? (
          <Pressable onPress={clearChat} style={[styles.iconWrap, { borderColor: palette.border }]}>
            <Ionicons name="trash-outline" size={16} color={palette.textFaint} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyLogo, { backgroundColor: alpha(primary, 0.12), borderColor: alpha(primary, 0.3) }]}>
        <Ionicons name="sparkles" size={30} color={primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: palette.text }]}>有什么可以帮你？</Text>
      <Text style={[styles.emptySub, { color: palette.textDim }]}>
        {provider.model ? `当前模型：${provider.model}` : '先在设置中配置自定义服务商'}
      </Text>
      <View style={styles.suggestions}>
        {SUGGESTIONS.map((s) => (
          <Pressable
            key={s.title}
            onPress={() => send(s.prompt)}
            style={({ pressed }) => [
              styles.sug,
              { borderColor: palette.border, backgroundColor: palette.surface, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <View style={[styles.sugIcon, { backgroundColor: alpha(primary, 0.12) }]}>
              <Ionicons name={s.icon} size={16} color={primary} />
            </View>
            <Text style={{ color: palette.text, fontSize: 13, fontWeight: '600' }}>{s.title}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: Bubble }) => {
    if (item.role === 'user') {
      return (
        <View style={[styles.row, styles.rowUser]}>
          <View style={[styles.bubble, styles.bubbleUser, { backgroundColor: alpha(primary, palette.mode === 'dark' ? 0.24 : 0.9) }]}>
            <Text style={{ color: palette.mode === 'dark' ? '#F2F6FF' : '#0E1526', fontSize: 15, lineHeight: 21 }}>{item.text}</Text>
          </View>
        </View>
      );
    }
    return (
      <View style={[styles.row, styles.rowAi]}>
        <View style={[styles.aiAvatar, { backgroundColor: primary }]}>
          <Ionicons name="sparkles" size={13} color={primaryText} />
        </View>
        <View style={[styles.bubble, styles.bubbleAi, { borderColor: palette.border, backgroundColor: palette.surface }]}>
          {item.text ? (
            <Text style={{ color: item.error ? palette.danger : palette.text, fontSize: 15, lineHeight: 21 }}>{item.text}</Text>
          ) : (
            <TypingDots color={primary} />
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      <AuroraBackdrop />
      {renderHeader()}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: keyboardOn ? 120 : 108 },
          messages.length === 0 && { flexGrow: 1 },
        ]}
        keyboardShouldPersistTaps="handled"
        extraData={scrollToBottom}
        onContentSizeChange={() => {
          if (messages.length) listRef.current?.scrollToEnd({ animated: true });
        }}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} pointerEvents="box-none">
        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <View style={[styles.composerBox, { borderColor: palette.border, backgroundColor: palette.surfaceRaised.startsWith('#') && palette.mode === 'dark' ? palette.surfaceRaised : palette.surface }]}>
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              placeholder="输入消息…"
              placeholderTextColor={palette.textFaint}
              multiline
              style={[styles.composerInput, { color: palette.text }]}
              onFocus={() => scrollToEnd()}
            />
            {sending ? (
              <Pressable onPress={stop} style={[styles.sendBtn, { backgroundColor: palette.surfaceSunken, borderColor: palette.border }]}>
                <Ionicons name="stop" size={17} color={palette.text} />
              </Pressable>
            ) : (
              <Pressable
                onPress={() => send(input)}
                disabled={!input.trim()}
                style={[
                  styles.sendBtn,
                  { backgroundColor: input.trim() ? primary : palette.surfaceSunken, borderColor: input.trim() ? primary : palette.border },
                ]}
              >
                <Ionicons name="arrow-up" size={17} color={input.trim() ? primaryText : palette.textFaint} />
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      <WorkspaceSheet
        visible={wsOpen}
        onClose={() => setWsOpen(false)}
        workspaces={workspaces}
        activeId={activeWs?.id ?? null}
        onSelect={chooseWs}
        onCreate={() => setWsOpen(false)}
      />
    </View>
  );
}

function TypingDots({ color }: { color: string }) {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0.2)).current, useRef(new Animated.Value(0.4)).current];
  useEffect(() => {
    const anim = Animated.loop(
      Animated.stagger(140, dots.map((d) => Animated.sequence([
        Animated.timing(d, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(d, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]))),
    );
    anim.start();
    return () => anim.stop();
  }, [dots]);
  return (
    <View style={styles.dots}>
      {dots.map((d, i) => (
        <Animated.View key={i} style={[styles.dot, { backgroundColor: color, opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }), transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }] }]} />
      ))}
    </View>
  );
}

function WorkspaceSheet({
  visible,
  onClose,
  workspaces,
  activeId,
  onSelect,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  workspaces: Workspace[];
  activeId: string | null;
  onSelect: (ws: Workspace | null) => void;
  onCreate: () => void;
}) {
  const { theme } = useTheme();
  const { palette, primary } = theme;
  const insets = useSafeAreaInsets();
  if (!visible) return null;
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.32)' }]} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16, borderColor: palette.border, backgroundColor: palette.mode === 'dark' ? '#121828' : '#FFFFFF' }]}>
        <View style={styles.sheetHandle} />
        <Text style={[styles.sheetTitle, { color: palette.text }]}>选择工作区</Text>
        <Text style={{ color: palette.textDim, fontSize: 13, marginBottom: 12 }}>
          {workspaces.length ? '选择后 AI 将结合该仓库上下文回答' : '还没有工作区，可先在「仓库」页创建'}
        </Text>
        <Pressable onPress={() => onSelect(null)} style={[styles.wsItem, { borderColor: activeId === null ? primary : palette.border }]}>
          <View style={[styles.wsIcon, { backgroundColor: alpha(primary, 0.1) }]}>
            <Ionicons name="globe-outline" size={18} color={activeId === null ? primary : palette.textDim} />
          </View>
          <Text style={{ color: palette.text, fontSize: 15, fontWeight: '600', flex: 1 }}>无工作区</Text>
          {activeId === null ? <Ionicons name="checkmark-circle" size={20} color={primary} /> : null}
        </Pressable>
        {workspaces.map((w) => (
          <Pressable key={w.id} onPress={() => onSelect(w)} style={[styles.wsItem, { borderColor: activeId === w.id ? primary : palette.border }]}>
            <View style={[styles.wsIcon, { backgroundColor: alpha(primary, 0.1) }]}>
              <Ionicons name="folder" size={18} color={activeId === w.id ? primary : palette.textDim} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: palette.text, fontSize: 15, fontWeight: '600' }}>{w.name}</Text>
              {w.repoFullName ? <Text style={{ color: palette.textFaint, fontSize: 12 }} numberOfLines={1}>{w.repoFullName}</Text> : null}
            </View>
            {activeId === w.id ? <Ionicons name="checkmark-circle" size={20} color={primary} /> : null}
          </Pressable>
        ))}
        <Pressable onPress={onCreate} style={[styles.wsItem, { borderColor: palette.border, borderStyle: 'dashed' }]}>
          <Ionicons name="add-circle-outline" size={20} color={palette.textDim} />
          <Text style={{ color: palette.textDim, fontSize: 14, fontWeight: '600' }}>在仓库页创建新工作区</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoDot: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerName: { fontSize: 17, fontWeight: '800' },
  headerSub: { fontSize: 11.5, marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: { paddingHorizontal: space.lg, paddingTop: 4 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  emptyLogo: {
    width: 76,
    height: 76,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.lg,
  },
  emptyTitle: { fontSize: 22, fontWeight: '800' },
  emptySub: { fontSize: 13, marginTop: 6, marginBottom: space.xl, textAlign: 'center' },
  suggestions: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  sug: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  sugIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', marginBottom: space.md },
  rowUser: { justifyContent: 'flex-end' },
  rowAi: { justifyContent: 'flex-start', gap: 8 },
  aiAvatar: { width: 30, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 11, borderRadius: radius.lg },
  bubbleUser: { borderBottomRightRadius: 6 },
  bubbleAi: { borderBottomLeftRadius: 6, borderWidth: 1 },
  dots: { flexDirection: 'row', gap: 5, height: 20, alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  composer: { paddingHorizontal: space.lg, paddingTop: 8 },
  composerBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 6,
    minHeight: 50,
  },
  composerInput: { flex: 1, fontSize: 15, paddingHorizontal: 8, paddingTop: 9, paddingBottom: 9, maxHeight: 120 },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: space.lg,
    paddingTop: 10,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#00000033', alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  wsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: 8,
  },
  wsIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
