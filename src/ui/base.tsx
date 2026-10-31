import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alpha, useTheme } from '@/theme';
import { motion, radius, space, type } from './tokens';

/** 极光背景层：统一全站图形语言。 */
export function AuroraLayer() {
  const { theme } = useTheme();
  const { palette } = theme;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[palette.bgDeep, palette.bg, palette.bgDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[palette.auroraA, 'transparent']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 0.8 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[palette.auroraB, 'transparent']}
        start={{ x: 0.9, y: 0.1 }}
        end={{ x: 0.1, y: 0.9 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

/** 毛玻璃容器：新 UI 底层的通用玻璃面。 */
export function GlassPane({
  children,
  style,
  intensity = 28,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
}) {
  const { theme } = useTheme();
  const { palette } = theme;
  return (
    <View style={[styles.glassWrap, { borderColor: palette.border }, style]}>
      <BlurView
        intensity={intensity}
        tint={palette.mode === 'dark' ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: palette.mode === 'dark' ? 'rgba(10,14,26,0.42)' : 'rgba(255,255,255,0.55)' },
        ]}
      />
      {children}
    </View>
  );
}

/** 下载/安装进度条。 */
export function ProgressBar({
  percent,
  tone,
  height = 8,
  indeterminate = false,
}: {
  percent: number;
  tone?: string;
  height?: number;
  indeterminate?: boolean;
}) {
  const { theme } = useTheme();
  const { palette, primary } = theme;
  const color = tone ?? primary;
  const width = Math.max(0, Math.min(100, percent));
  const anim = useRef(new Animated.Value(indeterminate ? 0 : width)).current;

  useEffect(() => {
    if (indeterminate) {
      Animated.loop(
        Animated.timing(anim, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ).start();
      return;
    }
    Animated.timing(anim, {
      toValue: width,
      duration: motion.base,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [width, indeterminate, anim]);

  return (
    <View style={[styles.progressTrack, { height, borderRadius: height / 2, backgroundColor: palette.surfaceSunken }]}>
      {indeterminate ? (
        <Animated.View
          style={[
            styles.progressFill,
            { backgroundColor: color, borderRadius: height / 2 },
            {
              width: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['8%', '46%', '8%'] }),
              transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-60, 320] }) }],
            },
          ]}
        />
      ) : (
        <Animated.View
          style={[
            styles.progressFill,
            { backgroundColor: color, borderRadius: height / 2 },
            { width: anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', `${width}%`] }) },
          ]}
        />
      )}
    </View>
  );
}

/** 分段控件。 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { theme } = useTheme();
  const { palette, primary } = theme;
  return (
    <View style={[styles.segmented, { borderColor: palette.border, backgroundColor: palette.surfaceSunken }]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[
              styles.segment,
              on && { backgroundColor: alpha(primary, palette.mode === 'dark' ? 0.2 : 0.14), borderColor: alpha(primary, 0.4) },
            ]}
          >
            <Text style={{ color: on ? primary : palette.textDim, ...type.label }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 底部抽屉。 */
export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  maxHeightRatio = 0.82,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxHeightRatio?: number;
}) {
  const { theme } = useTheme();
  const { palette } = theme;
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: visible ? motion.base : motion.fast,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.sheetRoot}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: palette.overlay }]} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + space.lg,
              borderColor: palette.border,
              backgroundColor: palette.mode === 'dark' ? '#101625' : '#FFFFFF',
              transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [420, 0] }) }],
              opacity: slide,
            },
          ]}
        >
          <View style={[styles.sheetHandle, { backgroundColor: palette.borderStrong }]} />
          {title ? <Text style={{ color: palette.text, ...type.heading, marginBottom: space.md }}>{title}</Text> : null}
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** 设置/功能列表行。 */
export function ListRow({
  icon,
  title,
  subtitle,
  value,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const { theme } = useTheme();
  const { palette, primary } = theme;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.listRow,
        { borderColor: palette.border, backgroundColor: palette.surface, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <View style={[styles.listIcon, { backgroundColor: alpha(danger ? palette.danger : primary, 0.12) }]}>
        <Ionicons name={icon} size={17} color={danger ? palette.danger : primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: danger ? palette.danger : palette.text, ...type.bodyStrong }}>{title}</Text>
        {subtitle ? <Text style={{ color: palette.textFaint, ...type.caption, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={{ color: palette.textFaint, ...type.caption }}>{value}</Text> : null}
      {onPress ? <Ionicons name="chevron-forward" size={16} color={palette.textFaint} /> : null}
    </Pressable>
  );
}

/** 更新转场动画：发现新版本时的极光扫描动效。 */
export function UpdateTransition({ visible, progress }: { visible: boolean; progress: number }) {
  const { theme } = useTheme();
  const { palette, primary } = theme;
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    sweep.setValue(0);
    Animated.loop(
      Animated.timing(sweep, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ).start();
  }, [visible, sweep]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: alpha(primary, 0.06),
            transform: [
              { rotate: '18deg' },
              { translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-260, 260] }) },
            ],
          },
        ]}
      />
      <View style={[styles.transitionBadge, { borderColor: palette.border, backgroundColor: palette.surfaceRaised }]}>
        <Text style={{ color: palette.textDim, ...type.caption }}>正在获取更新 · {Math.round(progress)}%</Text>
      </View>
    </View>
  );
}

/** 可点击的代码/文本块。 */
export function CodeBlock({ value, onCopy }: { value: string; onCopy?: () => void }) {
  const { theme } = useTheme();
  const { palette } = theme;
  return (
    <Pressable onPress={onCopy} style={[styles.codeBlock, { borderColor: palette.border, backgroundColor: palette.surfaceSunken }]}>
      <Text selectable style={{ color: palette.textDim, ...type.mono }}>{value}</Text>
    </Pressable>
  );
}

/** 开关按钮组（开/关）。 */
export function TogglePair({
  on,
  onLabels = ['开', '关'],
  onChange,
}: {
  on: boolean;
  onLabels?: [string, string];
  onChange: (v: boolean) => void;
}) {
  const { theme } = useTheme();
  const { palette, primary } = theme;
  return (
    <View style={[styles.togglePair, { borderColor: palette.border, backgroundColor: palette.surfaceSunken }]}>
      {([true, false] as const).map((v) => {
        const active = v === on;
        return (
          <Pressable
            key={String(v)}
            onPress={() => onChange(v)}
            style={[
              styles.toggleItem,
              active && { backgroundColor: alpha(primary, palette.mode === 'dark' ? 0.22 : 0.14), borderColor: alpha(primary, 0.45) },
            ]}
          >
            <Text style={{ color: active ? primary : palette.textDim, ...type.label }}>
              {v ? onLabels[0] : onLabels[1]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 折叠/展开内容区（引导协议等长文本用）。 */
export function Collapsible({
  title,
  body,
  expanded,
  onToggle,
  trailing,
}: {
  title: string;
  body: string;
  expanded: boolean;
  onToggle: () => void;
  trailing?: React.ReactNode;
}) {
  const { theme } = useTheme();
  const { palette, primary } = theme;
  const height = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(height, {
      toValue: expanded ? 1 : 0,
      duration: motion.base,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [expanded, height]);

  const toggle = useCallback(() => onToggle(), [onToggle]);

  return (
    <View style={[styles.collapsible, { borderColor: palette.border, backgroundColor: palette.surface }]}>
      <Pressable onPress={toggle} style={styles.collapsibleHead}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: palette.text, ...type.bodyStrong }}>{title}</Text>
          {!expanded ? (
            <Text style={{ color: palette.textFaint, ...type.caption, marginTop: 2 }} numberOfLines={2}>
              {body}
            </Text>
          ) : null}
        </View>
        {trailing}
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={palette.textFaint} />
      </Pressable>
      <Animated.View
        style={{
          opacity: height,
          maxHeight: height.interpolate({ inputRange: [0, 1], outputRange: [0, 600] }),
        }}
      >
        <Text style={{ color: palette.textDim, ...type.caption, lineHeight: 19, paddingHorizontal: space.lg, paddingBottom: space.lg }}>
          {body}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  glassWrap: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  progressTrack: { width: '100%', overflow: 'hidden' },
  progressFill: { height: '100%' },
  segmented: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.md, padding: 3, gap: 3 },
  segment: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, borderWidth: 1, paddingHorizontal: space.lg, paddingTop: space.md },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: space.md },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderWidth: 1, borderRadius: radius.md, padding: space.md },
  listIcon: { width: 34, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  transitionBadge: { position: 'absolute', bottom: space.xxl, alignSelf: 'center', borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space.lg, paddingVertical: 6 },
  codeBlock: { borderWidth: 1, borderRadius: radius.sm, padding: space.md },
  togglePair: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.md, padding: 3, gap: 3 },
  toggleItem: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  collapsible: { borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  collapsibleHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md },
});
