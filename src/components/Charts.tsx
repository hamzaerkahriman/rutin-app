import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useAnimatedProgress } from '../hooks/useAnimatedProgress';
import { useAppTheme } from '../theme/ThemeProvider';

// "Rutin Adaptive System" (Stitch tasarımı) grafik bileşenleri —
// react-native-svg ile, mockup'lardaki dairesel ilerleme halkası, donut ve
// yumuşak çizgi trend grafiğini birebir yakalamak için.

export function CircularProgress({
  progress,
  size = 160,
  strokeWidth = 10,
  label,
  sublabel,
  color,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  color?: string;
}) {
  const { theme } = useAppTheme();
  const clamped = Math.max(0, Math.min(100, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ringColor = color ?? theme.accent;

  const animatedValue = useAnimatedProgress(clamped);
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const id = animatedValue.addListener(({ value }) => setDisplayed(value));
    return () => animatedValue.removeListener(id);
  }, [animatedValue]);
  const dashoffset = circumference * (1 - Math.max(0, Math.min(100, displayed)) / 100);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.cardBorder}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={[styles.ringLabel, { color: ringColor }]}>{label ?? `${Math.round(displayed)}%`}</Text>
        {sublabel && <Text style={[styles.ringSublabel, { color: theme.textMuted }]}>{sublabel}</Text>}
      </View>
    </View>
  );
}

export function DonutChart({
  data,
  size = 140,
  strokeWidth = 16,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
}) {
  const { theme } = useAppTheme();
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let offsetAccum = 0;
  const segments = data.map((d) => {
    const fraction = d.value / total;
    const segment = {
      ...d,
      dasharray: `${circumference * fraction} ${circumference}`,
      dashoffset: -offsetAccum * circumference,
    };
    offsetAccum += fraction;
    return segment;
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={theme.cardBorder} strokeWidth={strokeWidth} fill="none" />
        {segments.map((s, i) => (
          <Circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={s.color}
            strokeWidth={strokeWidth}
            strokeDasharray={s.dasharray}
            strokeDashoffset={s.dashoffset}
            fill="none"
          />
        ))}
      </Svg>
    </View>
  );
}

export function DonutLegend({ data }: { data: { label: string; value: number; color: string }[] }) {
  const { theme } = useAppTheme();
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  return (
    <View style={{ gap: 8 }}>
      {data.map((d, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: d.color }} />
          <Text style={{ color: theme.text, fontSize: 13, flex: 1 }}>{d.label}</Text>
          <Text style={{ color: theme.textMuted, fontSize: 13 }}>{Math.round((d.value / total) * 100)}%</Text>
        </View>
      ))}
    </View>
  );
}

export function TrendLineChart({
  data,
  height = 140,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  const { theme } = useAppTheme();
  const width = 320;
  const padding = 12;
  const max = Math.max(100, ...data.map((d) => d.value));
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;

  const points = data.map((d, i) => ({
    x: padding + i * stepX,
    y: padding + (1 - d.value / max) * (height - padding * 2),
  }));

  const path = points
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const midX = (prev.x + p.x) / 2;
      return `Q ${midX} ${prev.y} ${p.x} ${p.y}`;
    })
    .join(' ');

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Path d={path} fill="none" stroke={theme.accent} strokeWidth={3} strokeLinecap="round" />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={4} fill={theme.accent} stroke={theme.card} strokeWidth={2} />
        ))}
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: padding }}>
        {data.map((d, i) => (
          <Text key={i} style={{ color: theme.textMuted, fontSize: 10 }}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function HorizontalBarRow({
  label,
  completed,
  total,
  rightLabel,
}: {
  label: string;
  completed: number;
  total: number;
  rightLabel?: string;
}) {
  const { theme } = useAppTheme();
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const animatedValue = useAnimatedProgress(Math.max(percent, 2));
  const width = animatedValue.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' });
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: theme.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
        <Text style={{ color: theme.textMuted, fontSize: 12 }}>{rightLabel ?? `${completed}/${total}`}</Text>
      </View>
      <View style={[styles.barTrack, { backgroundColor: theme.cardBorder }]}>
        <Animated.View style={[styles.barFill, { width, backgroundColor: theme.accent }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLabel: {
    fontSize: 26,
    fontWeight: '700',
  },
  ringSublabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  barTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
  },
});
