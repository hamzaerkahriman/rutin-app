import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppStore } from '../store/AppStore';
import { priorityColors } from '../theme/colors';
import { useAppTheme } from '../theme/ThemeProvider';
import { Task } from '../types';
import { noSelectStyle } from './ui';

export function TaskCard({ task }: { task: Task }) {
  const { theme } = useAppTheme();
  const { getUser } = useAppStore();
  const router = useRouter();
  const assignees = task.assigneeIds.map((id) => getUser(id)).filter((u): u is NonNullable<typeof u> => !!u);
  const assigneeLabel =
    assignees.length > 1 ? `${assignees[0].name} +${assignees.length - 1}` : assignees[0]?.name;
  const priorityColor = priorityColors[task.priority];
  const isDone = task.status === 'completed';

  const isOverdue =
    task.dueDate &&
    task.dueDate < new Date().toISOString().slice(0, 10) &&
    !['completed', 'cancelled', 'failed'].includes(task.status);

  return (
    <Pressable
      onPress={() => router.push(`/task/${task.id}`)}
      style={({ pressed }) => [
        styles.card,
        noSelectStyle,
        {
          backgroundColor: theme.card,
          borderColor: theme.cardBorder,
          borderLeftColor: priorityColor,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.checkbox,
          { borderColor: isDone ? theme.success : theme.border, backgroundColor: isDone ? theme.success : 'transparent' },
        ]}
      >
        {isDone && <Ionicons name="checkmark" size={13} color={theme.accentText} />}
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <Text
          style={[styles.title, { color: theme.text, textDecorationLine: isDone ? 'line-through' : 'none' }]}
          numberOfLines={1}
        >
          {task.title}
        </Text>
        <View style={styles.metaRow}>
          <View style={[styles.badge, { backgroundColor: priorityColor + '1F' }]}>
            <Text style={[styles.badgeText, { color: priorityColor }]}>
              {task.priority === 'critical'
                ? 'Kritik'
                : task.priority === 'high'
                  ? 'Yüksek'
                  : task.priority === 'medium'
                    ? 'Orta'
                    : 'Düşük'}
            </Text>
          </View>
          {task.dueDate && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color={isOverdue ? theme.danger : theme.textMuted} />
              <Text style={{ color: isOverdue ? theme.danger : theme.textMuted, fontSize: 12, fontWeight: isOverdue ? '700' : '400' }}>
                {isOverdue ? 'Gecikti' : task.dueDate}
              </Text>
            </View>
          )}
          {assigneeLabel && (
            <Text style={{ color: theme.textMuted, fontSize: 12 }} numberOfLines={1}>
              {assigneeLabel}
            </Text>
          )}
        </View>
      </View>

      <Text style={[styles.progressText, { color: theme.textMuted }]}>
        {task.progressMode === 'checklist' && task.checklist.length > 0
          ? `${task.checklist.filter((c) => c.completed).length}/${task.checklist.length}`
          : `${task.progress}%`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
