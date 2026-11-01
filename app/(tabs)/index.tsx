import { AuroraBackdrop, ChatBubble, Composer, SuggestionCard, WorkspaceSwitcher, type ChatBubbleData } from '@/ui';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
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
import { useAppStore, useActiveWorkspace, type Workspace } from '@/store/app';
import { streamChat, translateText, TRANSLATE_LANGS, ChatError } from '@/api/ai';
import { speak } from '@/api/speech';
import { inspectDir, listDir, writeTextFile } from '@/api/localfs';
import { FileManager } from '@/components/FileManager';

type Bubble = ChatBubbleData;

const SUGGESTIONS = [
  { icon: 'code-slash' as const, title: '写个工具函数', prompt: '写个 TypeScript 工具函数' },
  { icon: 'git-branch' as const, title: '分析仓库', prompt: '分析这个仓库的结构' },
  { icon: 'bulb' as const, title: '出技术方案', prompt: '给这个需求出技术方案' },
  { icon: 'search' as const, title: '解释代码', prompt: '解释这段代码' },
];

export default function ChatScreen() {  const { theme } = useTheme();
  const { palette, primary, primaryText } = theme;
  const insets = useSafeAreaInsets();
  const { provider, workspaces, setTabBarVisible, prefs, setPrefs } = useAppStore();
  const planMode = prefs.planMode;
  const activeWs = useActiveWorkspace();

  const [messages, setMessages] = useState<Bubble[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [wsOpen, setWsOpen] = useState(false);
  const [keyboardOn, setKeyboardOn] = useState(false);
  const [scrollToBottom, setScrollToBottom] = useState(0);
  const [translateMsg, setTranslateMsg] = useState<{ text: string; result: string; lang: string } | null>(null);
  const [translating, setTranslating] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [wsContext, setWsContext] = useState('');
  const [planAwaiting, setPlanAwaiting] = useState<string | null>(null);
  const [nearBottom, setNearBottom] = useState(true);
  const [fileOpen, setFileOpen] = useState(false);
  const listRef = useRef<FlatList<Bubble>>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<TextInput>(null);
  const messagesRef = useRef<Bubble[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const kShow = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardOn(true);
      setTabBarVisible(false);
    });
    const kHide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardOn(false);
      setTabBarVisible(true);
    });
    return () => {
      kShow.remove();
      kHide.remove();
      setTabBarVisible(true);
    };
  }, [setTabBarVisible]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // 预计算工作区上下文（本地目录列出文件清单，远端仓库携带仓库信息）。
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!activeWs) {
        setWsContext('');
        return;
      }
      if (activeWs.kind === 'local' && activeWs.root) {
        const info = await inspectDir(activeWs.root);
        const files = info.readable ? await listDir(activeWs.root, 80) : [];
        if (!alive) return;
        setWsContext(
          `当前工作区是手机本地目录：${activeWs.root}（${info.readable ? `${info.entries} 个条目` : '不可读'}）\n目录中的文件（前 ${files.length} 项）：\n${files.map((f) => `- ${f}`).join('\n')}`,
        );
      } else if (activeWs.repoFullName) {
        if (!alive) return;
        setWsContext(`当前工作区：${activeWs.name}（仓库：${activeWs.repoFullName}${activeWs.branch ? `，分支 ${activeWs.branch}` : ''}）`);
      } else {
        if (!alive) return;
        setWsContext(`当前工作区：${activeWs.name}`);
      }
    })();
    return () => {
      alive = false;
    };
  }, [activeWs]);

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
    (opts?: { execute?: boolean }) => {
      const parts = [
        '你是 PocketDev 的 AI 开发助手，回答简洁、结构清晰，代码用 Markdown 代码块并标注语言。',
      ];
      if (wsContext) parts.push(`${wsContext}\n优先结合该工作区上下文回答。`);
      if (planMode && !opts?.execute) {
        parts.push('当前处于计划模式：先输出编号的分步骤执行计划，结尾询问「是否按计划执行？」，等待确认后再实现细节。');
      }
      return parts.join('\n');
    },
    [wsContext, planMode],
  );

  const runTurn = useCallback(
    async (content: string, historySrc: Bubble[], opts?: { execute?: boolean }) => {
      const aid = `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      append({ id: aid, role: 'assistant', text: '', streaming: true, thinking: 'AI 正在思考…' });
      setSending(true);
      scrollToEnd();

      const history = historySrc
        .filter((m) => !m.error)
        .map((m) => ({ role: m.role, content: m.text }))
        .slice(-14);
      const controller = new AbortController();
      abortRef.current = controller;
      let full = '';
      const planned = planMode && !opts?.execute;

      try {
        full = await streamChat(
          provider,
          [{ role: 'system', content: systemPrompt(opts) }, ...history, { role: 'user', content }],
          {
            signal: controller.signal,
            onDelta: (d) => {
              patch(aid, (b) => ({ ...b, text: b.text + d }));
              scrollToEnd();
            },
          },
        );
        patch(aid, (b) => ({ ...b, text: full, streaming: false, plan: planned || undefined }));
        if (planned) setPlanAwaiting(aid);

        // 计划工作区流动输出：计划模式下，把 AI 计划落到本地工作区文件，形成可留存的产出。
        if (planned && activeWs?.kind === 'local' && activeWs.root && full.trim()) {
          const ts = new Date();
          const filePath = `${activeWs.root.replace(/\/+$/, '')}/pocketdev-plan-${ts.getTime()}.md`;
          const header = `# PocketDev 执行计划\n\n- 生成时间：${ts.toLocaleString()}\n- 工作区：${activeWs.name}\n\n`;
          const ok = await writeTextFile(filePath, header + full);
          append({
            id: `f-${Date.now()}`,
            role: 'assistant',
            text: ok
              ? `计划已写入工作区文件：\n${filePath}`
              : `写入工作区文件失败：${filePath}`,
            error: !ok,
          });
        }
      } catch (e) {
        const err = e as Error;
        patch(aid, (b) => ({
          ...b,
          text:
            err.name === 'AbortError'
              ? `${b.text || ''}${b.text ? '\n' : ''}（已停止）`
              : err instanceof ChatError
                ? err.message
                : '请求失败，请检查网络或服务商配置',
          streaming: false,
          error: err.name === 'AbortError' ? undefined : true,
        }));
      } finally {
        setSending(false);
        abortRef.current = null;
      }
    },
    [append, patch, scrollToEnd, provider, systemPrompt, planMode, activeWs],
  );

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content) return;
      if (!provider.apiKey.trim()) {
        append({ id: `sys-${Date.now()}`, role: 'assistant', text: '尚未配置服务商。请前往「设置 → 自定义服务商」填写 API Key 与模型。', error: true });
        setWsOpen(true);
        return;
      }
      setInput('');
      append({ id: `u-${Date.now()}`, role: 'user', text: content });
      if (sending) {
        setPending(content);
        return;
      }
      await runTurn(content, messagesRef.current);
    },
    [provider, sending, append, runTurn],
  );

  // 当前回复结束后自动发送排队中的消息。
  useEffect(() => {
    if (sending || !pending) return;
    const next = pending;
    setPending(null);
    void runTurn(next, messagesRef.current);
  }, [sending, pending, runTurn]);

  const sendNow = useCallback(() => {
    if (!pending) return;
    const next = pending;
    setPending(null);
    abortRef.current?.abort();
    append({ id: `u-${Date.now()}`, role: 'user', text: next });
    setSending(false);
    requestAnimationFrame(() => void runTurn(next, messagesRef.current));
  }, [pending, append, runTurn]);

  const confirmPlan = useCallback(() => {
    setPlanAwaiting(null);
    void runTurn('请按上面的计划开始执行。', messagesRef.current, { execute: true });
  }, [runTurn]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setSending(false);
    setPending(null);
    setPlanAwaiting(null);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setSending(false);
    setPending(null);
    setPlanAwaiting(null);
  }, []);

  const doTranslate = useCallback(
    async (text: string, lang: string) => {
      if (!provider.apiKey.trim()) {
        append({ id: `sys-${Date.now()}`, role: 'assistant', text: '尚未配置服务商，无法翻译。请先在设置中配置 API Key。', error: true });
        return;
      }
      setTranslateMsg({ text, result: '', lang });
      setTranslating(true);
      try {
        const out = await translateText(provider, text, lang);
        setTranslateMsg({ text, result: out, lang });
      } catch (e) {
        const msg = e instanceof ChatError ? e.message : '翻译失败，请检查服务商配置';
        setTranslateMsg({ text, result: msg, lang });
      } finally {
        setTranslating(false);
      }
    },
    [provider, append],
  );

  const doSpeak = useCallback(
    (text: string) => {
      if (!prefs.voiceEnabled || !text.trim()) return;
      if (prefs.language === 'en') speak(text, 'en-US');
      else speak(text, 'zh-CN');
    },
    [prefs.voiceEnabled, prefs.language],
  );

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
        {messages.length > 0 ? (
          <Pressable onPress={clearChat} hitSlop={8} style={[styles.iconWrap, { borderColor: palette.border }]}>
            <Ionicons name="trash-outline" size={16} color={palette.textFaint} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.headerActions}>
        <Pressable
          onPress={() => setPrefs({ planMode: !prefs.planMode })}
          style={[
            styles.wsChip,
            { borderColor: prefs.planMode ? alpha(primary, 0.5) : palette.border },
          ]}
        >
          <Ionicons
            name={prefs.planMode ? 'list-circle' : 'list-circle-outline'}
            size={13}
            color={prefs.planMode ? primary : palette.textFaint}
          />
          <Text
            style={{
              color: prefs.planMode ? primary : palette.textFaint,
              fontSize: 12,
              fontWeight: '600',
            }}
          >
            计划
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <View
        style={[
          styles.emptyLogo,
          {
            backgroundColor: alpha(primary, 0.14),
            borderColor: alpha(primary, 0.34),
            shadowColor: primary,
            shadowOpacity: 0.28,
            shadowRadius: 22,
            shadowOffset: { width: 0, height: 8 },
            elevation: 6,
          },
        ]}
      >
        <Ionicons name="sparkles" size={32} color={primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: palette.text }]}>有什么可以帮你？</Text>
      <Text style={[styles.emptySub, { color: palette.textDim }]}>
        {provider.model ? `当前模型：${provider.model}` : '先在设置中配置自定义服务商'}
      </Text>
      <View style={styles.suggestions}>
        {SUGGESTIONS.map((s) => (
          <SuggestionCard key={s.title} icon={s.icon} title={s.title} onPress={() => send(s.prompt)} style={styles.sug} />
        ))}
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: Bubble }) => (
    <ChatBubble
      data={item}
      canTranslate={!!item.text && !item.streaming && prefs.translateEnabled}
      canSpeak={prefs.voiceEnabled}
      onTranslate={item.role === 'assistant' ? (t) => doTranslate(t, prefs.language === 'en' ? 'zh' : 'en') : undefined}
      onSpeak={(t) => doSpeak(t)}
      showPlanConfirm={!!item.plan && planAwaiting === item.id}
      onConfirmPlan={confirmPlan}
    />
  );

  const TAB_BAR_HEIGHT = 58;
  const composerPad = keyboardOn ? Math.max(insets.bottom, 8) : TAB_BAR_HEIGHT + Math.max(insets.bottom, 10) + 12;

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
          { paddingBottom: keyboardOn ? 120 : composerPad + 116 },
          messages.length === 0 && { flexGrow: 1 },
        ]}
        keyboardShouldPersistTaps="handled"
        extraData={scrollToBottom}
        onScroll={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          setNearBottom(contentOffset.y + layoutMeasurement.height >= contentSize.height - 80);
        }}
        scrollEventThrottle={64}
        onContentSizeChange={() => {
          if (messages.length && nearBottom) listRef.current?.scrollToEnd({ animated: !sending });
        }}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} pointerEvents="box-none">
        <View style={[styles.composer, { paddingBottom: composerPad }]}>
          <WorkspaceSwitcher
            name={activeWs?.name ?? null}
            kind={activeWs?.kind}
            onPress={() => setWsOpen(true)}
            onManageFiles={activeWs ? () => setFileOpen(true) : undefined}
          />
          <Composer
            value={input}
            onChange={setInput}
            onSend={() => send(input)}
            onStop={stop}
            sending={sending}
            pendingText={pending}
            onSendNow={sendNow}
            placeholder="输入消息…"
            onFocus={() => scrollToEnd()}
            inputRef={inputRef}
          />
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

      {activeWs?.root ? (
        <FileManager
          visible={fileOpen}
          onClose={() => setFileOpen(false)}
          root={activeWs.root}
        />
      ) : null}

      {translateMsg ? (
        <TranslateSheet
          data={translateMsg}
          translating={translating}
          onClose={() => setTranslateMsg(null)}
          onLang={(lang) => doTranslate(translateMsg.text, lang)}
          onSpeak={() => doSpeak(translateMsg.result)}
          canSpeak={prefs.voiceEnabled}
        />
      ) : null}
    </View>
  );
}

function TranslateSheet({
  data,
  translating,
  onClose,
  onLang,
  onSpeak,
  canSpeak,
}: {
  data: { text: string; result: string; lang: string };
  translating: boolean;
  onClose: () => void;
  onLang: (lang: string) => void;
  onSpeak: () => void;
  canSpeak: boolean;
}) {
  const { theme } = useTheme();
  const { palette, primary } = theme;
  const insets = useSafeAreaInsets();
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.34)' }]} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16, borderColor: palette.border, backgroundColor: palette.mode === 'dark' ? '#121828' : '#FFFFFF' }]}>
        <View style={styles.sheetHandle} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[styles.sheetTitle, { color: palette.text }]}>翻译</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {canSpeak ? (
              <Pressable onPress={onSpeak} hitSlop={8}>
                <Ionicons name="volume-high-outline" size={20} color={palette.textDim} />
              </Pressable>
            ) : null}
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={palette.textDim} />
            </Pressable>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginVertical: 12 }}>
          {TRANSLATE_LANGS.map((l) => (
            <Pressable
              key={l.code}
              onPress={() => onLang(l.code)}
              style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: data.lang === l.code ? primary : palette.border }}
            >
              <Text style={{ color: data.lang === l.code ? primary : palette.textDim, fontSize: 12.5, fontWeight: '600' }}>{l.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={{ color: palette.textFaint, fontSize: 11.5, marginBottom: 4 }}>原文</Text>
        <Text style={{ color: palette.textDim, fontSize: 13.5, lineHeight: 20, marginBottom: 14 }}>{data.text}</Text>
        <Text style={{ color: palette.textFaint, fontSize: 11.5, marginBottom: 4 }}>译文{translating ? '（翻译中…）' : ''}</Text>
        <ScrollView style={{ maxHeight: 240 }} contentContainerStyle={{ paddingBottom: 8 }}>
          <Text style={{ color: palette.text, fontSize: 14.5, lineHeight: 22 }}>{data.result || '…'}</Text>
        </ScrollView>
      </View>
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
  sug: { flexGrow: 1, minWidth: '45%', maxWidth: '48%' },
  composer: { paddingHorizontal: space.lg, paddingTop: 8 },
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
