import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { priorityColors, statusColors } from '../theme/colors';
import { useAppTheme } from '../theme/ThemeProvider';
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, TaskPriority, TaskStatus } from '../types';

// Basılabilir öğelere "3D tuş" hissi veren gölge/basma stilleri — tek yerden
// ayarlanabilsin diye tüm dolu-renkli butonlar (PrimaryButton ve app genelindeki
// küçük "Ekle"/gönder/oynat butonları) bu iki yardımcıyı paylaşıyor.
export function elevatedStyle(pressed: boolean): ViewStyle {
  return {
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(0,0,0,0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: pressed ? 1 : 4 },
    shadowOpacity: pressed ? 0.1 : 0.22,
    shadowRadius: pressed ? 3 : 8,
    elevation: pressed ? 1 : 5,
    transform: [{ translateY: pressed ? 2 : 0 }],
  };
}

export function elevatedCircleStyle(pressed: boolean): ViewStyle {
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: pressed ? 1 : 3 },
    shadowOpacity: pressed ? 0.1 : 0.25,
    shadowRadius: pressed ? 2 : 6,
    elevation: pressed ? 1 : 4,
    transform: [{ translateY: pressed ? 1 : 0 }, { scale: pressed ? 0.94 : 1 }],
  };
}

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { theme } = useAppTheme();
  return (
    <View style={[{ flex: 1, backgroundColor: theme.background }, style]}>{children}</View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { theme } = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.cardBorder },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  const { theme } = useAppTheme();
  return <Text style={[styles.sectionTitle, { color: theme.text }]}>{children}</Text>;
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const color = statusColors[status];
  return (
    <View style={[styles.badge, { backgroundColor: color + '1F' }]}>
      <Text style={[styles.badgeText, { color }]}>{TASK_STATUS_LABELS[status]}</Text>
    </View>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const color = priorityColors[priority];
  return (
    <View style={[styles.badge, { backgroundColor: color + '1F' }]}>
      <Text style={[styles.badgeText, { color }]}>{TASK_PRIORITY_LABELS[priority]}</Text>
    </View>
  );
}

export function ProgressBar({ progress }: { progress: number }) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.progressTrack, { backgroundColor: theme.cardBorder }]}>
      <View
        style={[
          styles.progressFill,
          { width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: theme.success },
        ]}
      />
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  variant = 'accent',
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'accent' | 'success' | 'danger' | 'outline';
  disabled?: boolean;
}) {
  const { theme } = useAppTheme();

  const bg =
    variant === 'accent' || variant === 'success'
      ? theme.accent
      : variant === 'danger'
        ? theme.danger
        : 'transparent';
  const textColor = variant === 'outline' ? theme.text : theme.accentText;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: theme.border, opacity: disabled ? 0.5 : 1 },
        variant === 'outline' && { borderWidth: 1, backgroundColor: pressed ? theme.accentLight + '55' : 'transparent' },
        variant !== 'outline' && !disabled && elevatedStyle(pressed),
      ]}
    >
      <Text style={[styles.buttonText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({ message }: { message: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.emptyState}>
      <Text style={{ color: theme.textMuted, textAlign: 'center' }}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: 8,
    borderRadius: 999,
  },
  button: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyState: {
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
});
