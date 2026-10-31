import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme';

const MARK_LINES = [
  { x1: 0.4, y1: 0.32, x2: 0.3, y2: 0.5 },
  { x1: 0.3, y1: 0.5, x2: 0.4, y2: 0.68 },
  { x1: 0.6, y1: 0.32, x2: 0.7, y2: 0.5 },
  { x1: 0.7, y1: 0.5, x2: 0.6, y2: 0.68 },
  { x1: 0.53, y1: 0.32, x2: 0.47, y2: 0.68 },
];

function Mark({ size, color }: { size: number; color: string }) {
  const stroke = size * 0.055;
  return (
    <View style={{ width: size, height: size }}>
      {MARK_LINES.map((l, i) => {
        const x1 = l.x1 * size;
        const y1 = l.y1 * size;
        const x2 = l.x2 * size;
        const y2 = l.y2 * size;
        const len = Math.hypot(x2 - x1, y2 - y1);
        const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: cx - len / 2,
              top: cy - stroke / 2,
              width: len,
              height: stroke,
              borderRadius: stroke / 2,
              backgroundColor: color,
              transform: [{ rotate: `${angle}deg` }],
            }}
          />
        );
      })}
    </View>
  );
}

export function LaunchScreen({ onFinish }: { onFinish?: () => void }) {
  const { theme } = useTheme();
  const { palette, primary } = theme;

  const glow = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.72)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.6)).current;
  const ringOpacity = useRef(new Animated.Value(0.7)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textShift = useRef(new Animated.Value(12)).current;
  const exit = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(glow, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 520, useNativeDriver: true }),
        Animated.timing(ringScale, { toValue: 1.9, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 0, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(textShift, { toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.delay(520),
      Animated.timing(exit, { toValue: 0, duration: 420, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) onFinish?.();
    });
  }, [glow, logoScale, logoOpacity, ringScale, ringOpacity, textOpacity, textShift, exit]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: exit }]}>
      <LinearGradient
        colors={palette.mode === 'dark' ? ['#060912', '#0B1226', '#070A14'] : ['#F7FAFF', '#EDF2FE', '#E7EDFA']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        style={[
          styles.glow,
          {
            backgroundColor: primary,
            opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, palette.mode === 'dark' ? 0.28 : 0.2] }),
            transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
          },
        ]}
      />
      <View style={styles.center}>
        <Animated.View
          style={[
            styles.ring,
            {
              borderColor: primary,
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            },
          ]}
        />
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          }}
        >
          <LinearGradient
            colors={[primary, theme.accent.id === 'azure' ? '#A97BFF' : primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoPlate}
          >
            <Mark size={54} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>
        <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textShift }] }}>
          <Text style={[styles.title, { color: palette.text }]}>PocketDev</Text>
          <Text style={[styles.sub, { color: palette.textDim }]}>AI 开发工作台</Text>
        </Animated.View>
      </View>
      <Animated.View style={[styles.footer, { opacity: textOpacity }]}>
        <Text style={{ color: palette.textFaint, fontSize: 11, letterSpacing: 1 }}>AGPL-3.0</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 340, height: 340, borderRadius: 170 },
  center: { alignItems: 'center' },
  ring: { position: 'absolute', width: 128, height: 128, borderRadius: 64, borderWidth: 1.5 },
  logoPlate: {
    width: 92,
    height: 92,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 25, fontWeight: '800', letterSpacing: 0.4, textAlign: 'center', marginTop: 26 },
  sub: { fontSize: 12.5, textAlign: 'center', marginTop: 6, letterSpacing: 0.6 },
  footer: { position: 'absolute', bottom: 46 },
});
