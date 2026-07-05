import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../theme/ThemeProvider';
import { Task } from '../types';
import { useAppStore } from '../store/AppStore';
import { PriorityBadge, ProgressBar, StatusBadge } from './ui';

export function TaskCard({ task }: { task: Task }) {
  const { theme } = useAppTheme();
  const { getUser } = useAppStore();
  const router = useRouter();
  const assignee = task.assignedTo ? getUser(task.assignedTo) : undefined;

  const isOverdue =
    task.dueDate &&
    task.dueDate < new Date().toISOString().slice(0, 10) &&
    !['completed', 'cancelled', 'failed'].includes(task.status);

  return (
    <Pressable
      onPress={() => router.push(`/task/${task.id}`)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {task.title}
        </Text>
        <PriorityBadge priority={task.priority} />
      </View>

      {task.description ? (
        <Text style={[styles.description, { color: theme.textMuted }]} numberOfLines={2}>
          {task.description}
        </Text>
      ) : null}

      <View style={styles.progressRow}>
        <ProgressBar progress={task.progress} />
        <Text style={[styles.progressLabel, { color: theme.textMuted }]}>{task.progress}%</Text>
      </View>

      <View style={styles.footerRow}>
        <StatusBadge status={task.status} />
        <View style={styles.footerRight}>
          {isOverdue ? (
            <Text style={[styles.overdue, { color: theme.danger }]}>Gecikti</Text>
          ) : task.dueDate ? (
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>{task.dueDate}</Text>
          ) : null}
          {assignee ? (
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>{assignee.name}</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  description: {
    fontSize: 13,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressLabel: {
    fontSize: 12,
    width: 36,
    textAlign: 'right',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerRight: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  overdue: {
    fontSize: 12,
    fontWeight: '700',
  },
});
