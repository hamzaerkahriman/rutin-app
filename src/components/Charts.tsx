import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';

// Basit, bağımlılıksız (react-native-svg vb. gerektirmeyen) grafik bileşenleri
// — sadece View yükseklik/genişlik yüzdeleriyle çiziliyor, bu yüzden
// web/iOS/Android'de aynı şekilde render olur.

export function TrendBarChart({ data }: { data: { label: string; value: number }[] }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.trendRow}>
      {data.map((d, i) => (
        <View key={i} style={styles.trendCol}>
          <Text style={{ color: theme.textMuted, fontSize: 10 }}>{d.value}</Text>
          <View style={[styles.trendTrack, { backgroundColor: theme.border + '55' }]}>
            <View
              style={[
                styles.trendFill,
                { height: `${Math.max(d.value, 2)}%`, backgroundColor: theme.accent },
              ]}
            />
          </View>
          <Text style={{ color: theme.textMuted, fontSize: 10 }}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
}

function barColor(theme: ReturnType<typeof useAppTheme>['theme'], percent: number): string {
  if (percent >= 70) return theme.success;
  if (percent >= 40) return theme.warning;
  return theme.danger;
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
  const color = barColor(theme, percent);
  return (
    <View style={{ gap: 4 }}>
      <View style={styles.barHeader}>
        <Text style={{ color: theme.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
        <Text style={{ color: theme.textMuted, fontSize: 12 }}>{rightLabel ?? `${completed}/${total}`}</Text>
      </View>
      <View style={[styles.barTrack, { backgroundColor: theme.border + '55' }]}>
        <View style={[styles.barFill, { width: `${Math.max(percent, 2)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  trendRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 110,
  },
  trendCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    height: '100%',
    justifyContent: 'flex-end',
  },
  trendTrack: {
    width: '100%',
    flex: 1,
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  trendFill: {
    width: '100%',
    borderRadius: 6,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
});
