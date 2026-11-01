/**
 * PocketDev 新 UI 底层 · 聊天组件
 * 负责消息气泡（宽度/滚动/流式）、输入栏、AI 思考/工具状态反馈与建议卡片。
 * 业务主页仅组装数据与事件，渲染细节全部下沉到此层。
 */
import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { alpha, radius, space, useTheme } from '@/theme';
import { elevation } from './tokens';

export type ChatRole = 'user' | 'assistant';

export interface ChatBubbleData {
  id: string;
  role: ChatRole;
  text: string;
  streaming?: boolean;
  error?: boolean;
  plan?: boolean;
  /** AI 正在思考的提示（可选）。 */
  thinking?: string;
  /** 当前正在使用的工具描述（可选）。 */
  tool?: string;
}

/* ---------- 打字点动效 ---------- */
export function TypingDots({ color, small }: { color: string; small?: boolean }) {
  const dots = useMemo(
    () => [new Animated.Value(0), new Animated.Value(0.2), new Animated.Value(0.4)],
    [],
  );
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
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: color,
              width: small ? 5 : 7,
              height: small ? 5 : 7,
              opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
              transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }],
            },
          ]}
        />
      ))}
    </View>
  );
}

/* ---------- AI 工具状态反馈条 ---------- */
export function ToolStatusBar({ label }: { label: string }) {
  const { theme } = useTheme();
  const { palette, primary } = theme;
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);
  return (
    <View style={[styles.toolBar, { backgroundColor: alpha(primary, 0.08), borderColor: alpha(primary, 0.24) }]}>
      <Animated.View
        style={{
          width: 7,
          height: 7,
          borderRadius: 4,
          backgroundColor: primary,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
        }}
      />
      <Text style={[styles.toolText, { color: palette.textDim }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/* ---------- 单条气泡 ---------- */
export interface ChatBubbleProps {
  data: ChatBubbleData;
  onTranslate?: (text: string) => void;
  onSpeak?: (text: string) => void;
  canTranslate?: boolean;
  canSpeak?: boolean;
  showPlanConfirm?: boolean;
  onConfirmPlan?: () => void;
}

export function ChatBubble({ data, onTranslate, onSpeak, canTranslate, canSpeak, showPlanConfirm, onConfirmPlan }: ChatBubbleProps) {
  const { theme } = useTheme();
  const { palette, primary, primaryText } = theme;
  const isUser = data.role === 'user';

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAi]}>
      {isUser ? (
        <View style={[styles.bubble, styles.bubbleUser, { backgroundColor: alpha(primary, palette.mode === 'dark' ? 0.28 : 0.92), borderColor: alpha(primary, palette.mode === 'dark' ? 0.4 : 0.24) }]}>
          <Text style={{ color: palette.mode === 'dark' ? '#F2F6FF' : '#0E1526', fontSize: 15, lineHeight: 21 }}>{data.text}</Text>
        </View>
      ) : (
        <>
          <View style={[styles.aiAvatar, { backgroundColor: primary }]}>
            <Ionicons name="sparkles" size={13} color={primaryText} />
          </View>
          <View style={{ flex: 1 }}>
            {data.thinking && !data.text ? <ToolStatusBar label={data.thinking} /> : null}
            <View style={[styles.bubble, styles.bubbleAi, { borderColor: alpha(primary, palette.mode === 'dark' ? 0.16 : 0.12), backgroundColor: palette.surface }]}>
              {data.text ? (
                <Text style={{ color: data.error ? palette.danger : palette.text, fontSize: 15, lineHeight: 22 }}>{data.text}</Text>
              ) : (
                <TypingDots color={primary} />
              )}
            </View>
            {data.text && !data.streaming && canTranslate ? (
              <View style={styles.msgActions}>
                {onTranslate ? (
                  <Pressable hitSlop={8} onPress={() => onTranslate(data.text)} style={styles.msgAction}>
                    <Ionicons name="language-outline" size={15} color={palette.textFaint} />
                  </Pressable>
                ) : null}
                {canSpeak && onSpeak ? (
                  <Pressable hitSlop={8} onPress={() => onSpeak(data.text)} style={styles.msgAction}>
                    <Ionicons name="volume-medium-outline" size={15} color={palette.textFaint} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            {showPlanConfirm && onConfirmPlan ? (
              <Pressable
                onPress={onConfirmPlan}
                style={[styles.planConfirm, { borderColor: alpha(primary, 0.55), backgroundColor: alpha(primary, 0.12) }]}
              >
                <Ionicons name="play-circle" size={15} color={primary} />
                <Text style={{ color: primary, fontSize: 13, fontWeight: '700' }}>确认执行计划</Text>
              </Pressable>
            ) : null}
          </View>
        </>
      )}
    </View>
  );
}

/* ---------- 输入栏 ---------- */
export interface ComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop?: () => void;
  sending?: boolean;
  pendingText?: string | null;
  onSendNow?: () => void;
  placeholder?: string;
  disabled?: boolean;
  onFocus?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
}

export function Composer({
  value,
  onChange,
  onSend,
  onStop,
  sending,
  pendingText,
  onSendNow,
  placeholder = '输入消息…',
  disabled,
  onFocus,
  inputRef,
}: ComposerProps) {
  const { theme } = useTheme();
  const { palette, primary, primaryText } = theme;
  const canSend = !!value.trim() && !disabled;
  return (
    <View>
      {pendingText ? (
        <View style={[styles.pendingBar, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Ionicons name="time-outline" size={14} color={palette.textFaint} />
          <Text style={{ color: palette.textDim, fontSize: 12, flex: 1 }} numberOfLines={1}>
            待发送：{pendingText}
          </Text>
          {onSendNow ? (
            <Pressable onPress={onSendNow} style={[styles.pendingBtn, { backgroundColor: alpha(primary, 0.14), borderColor: alpha(primary, 0.45) }]}>
              <Text style={{ color: primary, fontSize: 12, fontWeight: '700' }}>立即发送</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <View
        style={[
          styles.composerBox,
          { borderColor: palette.border, backgroundColor: palette.mode === 'dark' ? palette.surfaceRaised : palette.surface },
        ]}
      >
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={palette.textFaint}
          multiline
          style={[styles.composerInput, { color: palette.text }]}
          onFocus={onFocus}
        />
        {sending && onStop ? (
          <Pressable onPress={onStop} style={[styles.sendBtn, { backgroundColor: palette.surfaceSunken, borderColor: palette.border }]}>
            <Ionicons name="stop" size={17} color={palette.text} />
          </Pressable>
        ) : (
          <Pressable
            onPress={onSend}
            disabled={!canSend}
            style={[
              styles.sendBtn,
              { backgroundColor: canSend ? primary : palette.surfaceSunken, borderColor: canSend ? primary : palette.border },
            ]}
          >
            <Ionicons name="arrow-up" size={17} color={canSend ? primaryText : palette.textFaint} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

/* ---------- 建议卡片（空态引导） ---------- */
export interface SuggestionCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function SuggestionCard({ icon, title, onPress, style }: SuggestionCardProps) {
  const { theme } = useTheme();
  const { palette, primary } = theme;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.sug,
        { borderColor: palette.border, backgroundColor: palette.surface, opacity: pressed ? 0.8 : 1 },
        style,
      ]}
    >
      <View style={[styles.sugIcon, { backgroundColor: alpha(primary, 0.12) }]}>
        <Ionicons name={icon} size={16} color={primary} />
      </View>
      <Text style={{ color: palette.text, fontSize: 13, fontWeight: '600' }}>{title}</Text>
      <Ionicons name="arrow-up-outline" size={13} color={palette.textFaint} />
    </Pressable>
  );
}

/* ---------- 样式 ---------- */
const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: space.md },
  rowUser: { justifyContent: 'flex-end' },
  rowAi: { justifyContent: 'flex-start', gap: 8 },
  aiAvatar: { width: 30, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  bubble: {
    maxWidth: '88%',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: radius.xl,
    ...elevation.card,
  },
  bubbleUser: { borderBottomRightRadius: 8 },
  bubbleAi: { borderBottomLeftRadius: 8 },
  msgActions: { flexDirection: 'row', gap: 12, marginTop: 6, paddingHorizontal: 2 },
  msgAction: { paddingVertical: 2 },
  planConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  toolBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    marginBottom: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  toolText: { fontSize: 12.5, fontWeight: '600' },
  dots: { flexDirection: 'row', gap: 5, height: 20, alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  pendingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  pendingBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  composerBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: 6,
    minHeight: 50,
    ...elevation.card,
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
});