import React from 'react';
import {
  ActivityIndicator,
  KeyboardTypeOptions,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alpha, radius, space, type, useTheme } from '@/theme';

export function AuroraBackdrop() {
  const { theme } = useTheme();
  const { palette, accent } = theme;
  const dark = palette.mode === 'dark';
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={dark ? ['#070A15', '#0A1024', '#080B16'] : ['#F6F9FF', '#EEF3FD', '#E8EEFA']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[palette.auroraA, 'transparent']}
        start={{ x: 0.1, y: 0.05 }}
        end={{ x: 0.85, y: 0.75 }}
        style={[styles.aurora, { top: -170, left: -110, width: 430, height: 430, opacity: dark ? 0.85 : 0.95 }]}
      />
      <LinearGradient
        colors={[palette.auroraB, 'transparent']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.1, y: 0.9 }}
        style={[styles.aurora, { top: 90, right: -190, width: 420, height: 420, opacity: dark ? 0.7 : 0.8 }]}
      />
      <LinearGradient
        colors={[palette.auroraC, 'transparent']}
        start={{ x: 0.2, y: 1 }}
        end={{ x: 0.9, y: 0.1 }}
        style={[styles.aurora, { bottom: -190, left: -140, width: 400, height: 400, opacity: dark ? 0.55 : 0.7 }]}
      />
      <LinearGradient
        colors={[alpha(accent.primary, dark ? 0.2 : 0.14), 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.aurora, { bottom: '18%', right: '6%', width: 240, height: 240, borderRadius: 120 }]}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? 'rgba(4,6,12,0.18)' : 'rgba(255,255,255,0.22)' }]} />
    </View>
  );
}

export function Screen({
  children,
  style,
  edges = true,
  backdrop = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: boolean;
  backdrop?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: theme.palette.bg,
          paddingTop: edges ? insets.top : 0,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
        style,
      ]}
    >
      {backdrop ? <AuroraBackdrop /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.palette.bg }]} />}
      {children}
    </View>
  );
}

export function Surface({
  children,
  style,
  tone = 'default',
  padded = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'raised' | 'sunken';
  padded?: boolean;
}) {
  const { theme } = useTheme();
  const { palette } = theme;
  const bg =
    tone === 'raised' ? alpha(palette.surfaceRaised.startsWith('#') ? palette.surfaceRaised : '#FFFFFF', palette.mode === 'dark' ? 0.9 : 1) : palette.surface;
  return (
    <View
      style={[
        styles.surface,
        {
          borderColor: palette.border,
          backgroundColor: tone === 'sunken' ? palette.surfaceSunken : bg,
          shadowColor: palette.shadow,
        },
        style,
      ]}
    >
      {tone !== 'sunken' ? (
        <BlurView
          intensity={palette.mode === 'dark' ? 32 : 46}
          tint={palette.mode === 'dark' ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={[styles.surfaceInner, padded && { padding: space.lg }]}>{children}</View>
    </View>
  );
}

export function SubScreen({
  title,
  onBack,
  children,
  right,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { palette } = theme;
  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <AuroraBackdrop />
      <View style={[styles.subHeader, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onBack} hitSlop={10} style={[styles.subBack, { borderColor: palette.border }]}>
          <Ionicons name="chevron-back" size={20} color={palette.text} />
        </Pressable>
        <Text style={[styles.subTitle, { color: palette.text }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.subRight}>{right}</View>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}

export function SectionLabel({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { theme } = useTheme();
  return (
    <View style={[{ paddingHorizontal: space.lg, marginTop: space.xl, marginBottom: space.sm }, style]}>
      <Text
        style={{
          color: theme.palette.textFaint,
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 1.1,
          textTransform: 'uppercase',
        }}
      >
        {children}
      </Text>
    </View>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function Spacer({ h = space.md }: { h?: number }) {
  return <View style={{ height: h }} />;
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  small = false,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  const { palette, primary, primaryText } = theme;
  const off = disabled || loading;
  const height = small ? 36 : 50;
  const textColor =
    variant === 'primary' ? primaryText : variant === 'danger' ? '#FFFFFF' : palette.text;

  const inner = (
    <View style={[styles.btnInner, { height, paddingHorizontal: small ? space.md : space.xl }]}>
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={small ? 15 : 18} color={textColor} style={{ marginRight: 6 }} /> : null}
          <Text style={{ color: textColor, fontSize: small ? 13 : 15, fontWeight: '600' }} numberOfLines={1}>
            {title}
          </Text>
        </>
      )}
    </View>
  );

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={off}
        style={({ pressed }) => [
          { borderRadius: radius.lg, overflow: 'hidden', opacity: off ? 0.5 : pressed ? 0.9 : 1, transform: [{ scale: pressed && !off ? 0.985 : 1 }] },
          style,
        ]}
      >
        <LinearGradient colors={[primary, alpha(primary, 0.78)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          {inner}
        </LinearGradient>
      </Pressable>
    );
  }

  if (variant === 'secondary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={off}
        style={({ pressed }) => [
          {
            borderRadius: radius.lg,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: palette.borderStrong,
            backgroundColor: palette.surface,
            opacity: off ? 0.5 : pressed ? 0.9 : 1,
          },
          style,
        ]}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.btnInner,
        {
          height,
          paddingHorizontal: small ? space.md : space.xl,
          borderRadius: radius.lg,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: palette.borderStrong,
          backgroundColor: variant === 'danger' ? palette.danger : 'transparent',
          opacity: off ? 0.5 : pressed ? 0.88 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Row style={{ gap: 6 }}>
          {icon ? <Ionicons name={icon} size={small ? 15 : 18} color={textColor} /> : null}
          <Text style={{ color: textColor, fontSize: small ? 13 : 15, fontWeight: '600' }} numberOfLines={1}>
            {title}
          </Text>
        </Row>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  size = 40,
  color,
  tone = 'default',
  accessibilityLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: number;
  color?: string;
  tone?: 'default' | 'primary';
  accessibilityLabel?: string;
}) {
  const { theme } = useTheme();
  const { palette, primary, primaryText } = theme;
  const isPrimary = tone === 'primary';
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.iconBtn,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: isPrimary ? primary : palette.border,
          backgroundColor: isPrimary ? primary : palette.surface,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={[primary, alpha(primary, 0.8)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
        />
      ) : null}
      <Ionicons name={icon} size={size * 0.48} color={color ?? (isPrimary ? primaryText : palette.text)} />
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  keyboardType,
  multiline,
  secureTextEntry,
  autoCapitalize = 'none',
  autoFocus,
  onSubmitEditing,
  returnKeyType,
}: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  hint?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send';
}) {
  const { theme } = useTheme();
  const { palette } = theme;
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={{ marginBottom: space.md }}>
      {label ? (
        <Text style={{ color: palette.textDim, fontSize: 12, fontWeight: '600', marginBottom: 6, marginLeft: 2 }}>
          {label}
        </Text>
      ) : null}
      <View
        style={{
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: focused ? alpha(theme.primary, 0.65) : palette.border,
          backgroundColor: palette.surfaceSunken,
          overflow: 'hidden',
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.textFaint}
          keyboardType={keyboardType}
          multiline={multiline}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          style={[
            styles.input,
            { color: palette.text },
            multiline && { minHeight: 92, textAlignVertical: 'top', paddingTop: 12 },
          ]}
        />
      </View>
      {hint ? <Text style={{ color: palette.textFaint, fontSize: 11, marginTop: 6, marginLeft: 2 }}>{hint}</Text> : null}
    </View>
  );
}

export function Pill({
  text,
  color,
  icon,
}: {
  text: string;
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const { theme } = useTheme();
  const c = color ?? theme.primary;
  return (
    <View style={[styles.pill, { backgroundColor: alpha(c, 0.14), borderColor: alpha(c, 0.34) }]}>
      {icon ? <Ionicons name={icon} size={11} color={c} style={{ marginRight: 4 }} /> : null}
      <Text style={{ color: c, fontSize: 11, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const { theme } = useTheme();
  const { palette, primary } = theme;
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: alpha(primary, 0.12), borderColor: alpha(primary, 0.28) }]}>
        <Ionicons name={icon} size={26} color={primary} />
      </View>
      <Text style={{ color: palette.text, fontSize: 16, fontWeight: '700', marginTop: space.md }}>{title}</Text>
      {subtitle ? (
        <Text style={{ color: palette.textDim, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 }}>
          {subtitle}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: space.lg }}>{action}</View> : null}
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const { theme } = useTheme();
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: theme.palette.border }, style]} />;
}

export { space, radius, type };

const styles = StyleSheet.create({
  aurora: { position: 'absolute', borderRadius: 210 },
  screen: { flex: 1 },
  surface: {
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  surfaceInner: {},
  row: { flexDirection: 'row', alignItems: 'center' },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 48,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  empty: { alignItems: 'center', paddingVertical: 44, paddingHorizontal: space.xl },
  emptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  subBack: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subTitle: { flex: 1, fontSize: 18, fontWeight: '800' },
  subRight: { minWidth: 36, alignItems: 'flex-end' },
});
