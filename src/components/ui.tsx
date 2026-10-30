import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  KeyboardTypeOptions,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme';

export function GlassBackdrop() {
  const { theme } = useTheme();
  const { palette, accent } = theme;
  const strong = palette.mode === 'dark' ? 0.16 : 0.32;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.blob,
          {
            width: 280,
            height: 280,
            borderRadius: 140,
            backgroundColor: accent.primary,
            opacity: strong,
            top: -70,
            right: -90,
          },
        ]}
      />
      <View
        style={[
          styles.blob,
          {
            width: 220,
            height: 220,
            borderRadius: 110,
            backgroundColor: accent.primary,
            opacity: strong * 0.6,
            top: '38%',
            left: -110,
          },
        ]}
      />
      <View
        style={[
          styles.blob,
          {
            width: 180,
            height: 180,
            borderRadius: 90,
            backgroundColor: accent.primary,
            opacity: strong * 0.45,
            bottom: -50,
            right: '20%',
          },
        ]}
      />
      <View
        style={[
          styles.blob,
          {
            width: 140,
            height: 140,
            borderRadius: 70,
            backgroundColor: palette.mode === 'dark' ? '#A78BFA' : '#7C3AED',
            opacity: strong * 0.5,
            bottom: '28%',
            left: '12%',
          },
        ]}
      />
    </View>
  );
}

export function Card({ children, style, glow = false }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; glow?: boolean }) {
  const { theme } = useTheme();
  const { palette, accent } = theme;
  return (
    <View
      style={[
        styles.card,
        { borderColor: palette.glassBorder },
        glow && {
          shadowColor: accent.primary,
          shadowOpacity: theme.mode === 'dark' ? 0.45 : 0.3,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        },
        style,
      ]}
    >
      <BlurView intensity={36} tint={palette.mode === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.glass }]} />
      <LinearGradient
        colors={[palette.glassHighlight, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardSheen}
      />
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return <Text style={[styles.sectionTitle, { color: theme.palette.textDim }]}>{children}</Text>;
}

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function Spacer({ h = 8 }: { h?: number }) {
  return <View style={{ height: h }} />;
}

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'subtle';

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  small = false,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
}) {
  const { theme } = useTheme();
  const { palette, primary, primaryText, accent } = theme;
  const isDisabled = disabled || loading;
  const base = {
    borderRadius: 14,
    paddingVertical: small ? 9 : 12,
    paddingHorizontal: small ? 12 : 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    opacity: isDisabled ? 0.5 : 1,
  };

  const content = loading ? (
    <ActivityIndicator color={variant === 'primary' ? primaryText : primary} size="small" />
  ) : (
    <Text style={[styles.btnText, { color: variant === 'primary' ? primaryText : variant === 'danger' ? '#FFFFFF' : palette.text, fontSize: small ? 13 : 15 }]}>
      {title}
    </Text>
  );

  if (variant === 'primary') {
    return (
      <Pressable onPress={onPress} disabled={isDisabled} style={({ pressed }) => [{ opacity: isDisabled ? 0.5 : pressed ? 0.86 : 1, borderRadius: 14, overflow: 'hidden', shadowColor: accent.primary, shadowOpacity: theme.mode === 'dark' ? 0.5 : 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 6 }]}>
        <LinearGradient colors={[primary, shade(primary, -18)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={base}>
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  if (variant === 'danger') {
    return (
      <Pressable onPress={onPress} disabled={isDisabled} style={({ pressed }) => [base, { backgroundColor: palette.danger, opacity: isDisabled ? 0.5 : pressed ? 0.86 : 1 }]}>
        {content}
      </Pressable>
    );
  }

  const ghostStyle: StyleProp<ViewStyle> =
    variant === 'ghost' ? { borderWidth: 1, borderColor: primary } : { backgroundColor: palette.surfaceAlt };

  return (
    <Pressable onPress={onPress} disabled={isDisabled} style={({ pressed }) => [base, ghostStyle, { opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1 }]}>
      {content}
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  secureTextEntry,
  autoCapitalize = 'none',
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  const { theme } = useTheme();
  const { palette } = theme;
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.fieldLabel, { color: palette.textDim }]}>{label}</Text>
      <View style={{ borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: palette.glassBorder }}>
        <BlurView intensity={24} tint={palette.mode === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.glass }]} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.textDim}
          keyboardType={keyboardType}
          multiline={multiline}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          style={[styles.input, { color: palette.text }, multiline && { height: 80, textAlignVertical: 'top' }]}
        />
      </View>
    </View>
  );
}

export function StatusPill({ text, color }: { text: string; color: string }) {
  const { theme } = useTheme();
  const { palette } = theme;
  return (
    <View style={[styles.pill, { backgroundColor: color + '2B', borderColor: color + '55' }]}>
      <Text style={[styles.pillText, { color }]}>{text}</Text>
    </View>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  const { theme } = useTheme();
  const { palette, primary } = theme;
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIconBox, { backgroundColor: primary + '1F', borderColor: primary + '44' }]}>
        <Text style={[styles.emptyIcon, { color: primary }]}>{icon}</Text>
      </View>
      <Text style={[styles.emptyTitle, { color: palette.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.emptySub, { color: palette.textDim }]}>{subtitle}</Text> : null}
    </View>
  );
}

export function Screen({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { theme } = useTheme();
  return (
    <View style={[{ flex: 1, backgroundColor: theme.palette.bg }, style]}>
      <GlassBackdrop />
      {children}
    </View>
  );
}

function shade(hex: string, percent: number): string {
  const n = hex.replace('#', '');
  const num = parseInt(n, 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amt));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amt));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

const styles = StyleSheet.create({
  blob: { position: 'absolute' },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  cardSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
  },
  cardBody: { padding: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  btnText: { fontWeight: '600' },
  fieldLabel: { fontSize: 13, marginBottom: 6 },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 44,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  pillText: { fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 12,
  },
  emptyIcon: { fontSize: 30 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  emptySub: { fontSize: 13, textAlign: 'center' },
});
