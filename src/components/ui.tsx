import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { gradients, priorityColors, statusColors } from '../theme/colors';
import { useAppTheme } from '../theme/ThemeProvider';
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, TaskPriority, TaskStatus } from '../types';

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
    <View style={[styles.badge, { backgroundColor: color + '26', borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{TASK_STATUS_LABELS[status]}</Text>
    </View>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const color = priorityColors[priority];
  return (
    <View style={[styles.badge, { backgroundColor: color + '26', borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{TASK_PRIORITY_LABELS[priority]}</Text>
    </View>
  );
}

export function ProgressBar({ progress }: { progress: number }) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
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

  if (variant === 'accent') {
    return (
      <Pressable onPress={disabled ? undefined : onPress} disabled={disabled}>
        {({ pressed }) => (
          <LinearGradient
            colors={gradients.gold}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[styles.button, { opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }]}
          >
            <Text style={[styles.buttonText, { color: theme.accentText }]}>{label}</Text>
          </LinearGradient>
        )}
      </Pressable>
    );
  }

  const bg = variant === 'success' ? theme.success : variant === 'danger' ? theme.danger : 'transparent';
  const textColor = variant === 'outline' ? theme.text : '#FFFFFF';
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: theme.border, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        variant === 'outline' && { borderWidth: 1 },
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
    borderRadius: 16,
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
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
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
    borderRadius: 12,
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
