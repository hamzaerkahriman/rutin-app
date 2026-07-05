import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { TaskCard } from '../../src/components/TaskCard';
import { EmptyState, PrimaryButton, SelectChip } from '../../src/components/ui';
import { useAppStore } from '../../src/store/AppStore';
import { useAppTheme } from '../../src/theme/ThemeProvider';
import { Task } from '../../src/types';

type FilterKey =
  | 'today'
  | 'week'
  | 'overdue'
  | 'assigned_to_me'
  | 'created_by_me'
  | 'handed_off'
  | 'completed'
  | 'failed';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'today', label: 'Bugün' },
  { key: 'week', label: 'Bu hafta' },
  { key: 'overdue', label: 'Gecikenler' },
  { key: 'assigned_to_me', label: 'Bana atananlar' },
  { key: 'created_by_me', label: 'Oluşturduklarım' },
  { key: 'handed_off', label: 'Devredilenler' },
  { key: 'completed', label: 'Tamamlananlar' },
  { key: 'failed', label: 'Başarısız olanlar' },
];

export default function TasksScreen() {
  const { theme } = useAppTheme();
  const { tasks, currentUser } = useAppStore();
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>('assigned_to_me');

  const todayStr = new Date().toISOString().slice(0, 10);
  const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    // Alt görevler burada değil, kendi üst görevlerinin detay sayfasında listelenir.
    return tasks.filter((t) => !t.parentTaskId).filter((t: Task) => {
      switch (filter) {
        case 'today':
          return t.dueDate === todayStr;
        case 'week':
          return t.dueDate && t.dueDate >= todayStr && t.dueDate <= weekAhead;
        case 'overdue':
          return t.dueDate && t.dueDate < todayStr && !['completed', 'cancelled', 'failed'].includes(t.status);
        case 'assigned_to_me':
          return t.assignedTo === currentUser.id;
        case 'created_by_me':
          return t.createdBy === currentUser.id;
        case 'handed_off':
          return t.status === 'handed_off';
        case 'completed':
          return t.status === 'completed';
        case 'failed':
          return t.status === 'failed';
        default:
          return true;
      }
    });
  }, [tasks, filter, currentUser, todayStr, weekAhead]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={styles.filterBarWrap}>
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(f) => f.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
          renderItem={({ item }) => (
            <SelectChip label={item.label} active={filter === item.key} onPress={() => setFilter(item.key)} />
          )}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <TaskCard task={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={<EmptyState message="Bu filtreye uyan görev yok." />}
      />

      <View style={styles.fabWrap}>
        <PrimaryButton label="+ Yeni görev" onPress={() => router.push('/task/create')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  filterBarWrap: {
    paddingTop: 8,
  },
  filterBar: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  fabWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
});
