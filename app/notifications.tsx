import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, EmptyState, PrimaryButton } from '../src/components/ui';
import { useAppStore } from '../src/store/AppStore';
import { useAppTheme } from '../src/theme/ThemeProvider';
import { NotificationType } from '../src/types';

const NOTIFICATION_ICONS: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  task_assigned: 'bookmark-outline',
  task_due_soon: 'time-outline',
  task_overdue: 'alert-circle-outline',
  task_note_added: 'chatbubble-outline',
  task_handoff_received: 'swap-horizontal-outline',
  daily_save_reminder: 'calendar-outline',
  checklist_incomplete: 'checkmark-done-outline',
  weekly_report_ready: 'bar-chart-outline',
  workspace_invite_received: 'people-outline',
  message_received: 'chatbubbles-outline',
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'az önce';
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

export default function NotificationsScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { notifications, markNotificationRead, markAllNotificationsRead, unreadNotificationCount } = useAppStore();

  const handlePress = (notif: (typeof notifications)[number]) => {
    if (!notif.read) markNotificationRead(notif.id);
    if (notif.type === 'message_received' && notif.conversationId) {
      router.push(`/messages/${notif.conversationId}`);
    } else if (notif.taskId) {
      router.push(`/task/${notif.taskId}`);
    } else if (notif.type === 'workspace_invite_received' || notif.type === 'daily_save_reminder') {
      router.push('/(tabs)/dashboard');
    } else if (notif.type === 'weekly_report_ready') {
      router.push('/(tabs)/reports');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {unreadNotificationCount > 0 && (
        <View style={styles.markAllRow}>
          <PrimaryButton
            label={`Tümünü okundu işaretle (${unreadNotificationCount})`}
            variant="outline"
            onPress={markAllNotificationsRead}
          />
        </View>
      )}
      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={<EmptyState message="Henüz bildirim yok." />}
        renderItem={({ item }) => (
          <Pressable onPress={() => handlePress(item)}>
            <Card
              style={{
                ...styles.card,
                borderColor: item.read ? theme.border : theme.accent,
                backgroundColor: item.read ? theme.card : theme.accent + '14',
              }}
            >
              <Ionicons
                name={NOTIFICATION_ICONS[item.type] ?? 'notifications-outline'}
                size={20}
                color={item.read ? theme.textMuted : theme.accent}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: item.read ? '400' : '700' }}>
                  {item.message ?? 'Bildirim'}
                </Text>
                <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>
                  {timeAgo(item.createdAt)}
                </Text>
              </View>
              {!item.read && <View style={[styles.dot, { backgroundColor: theme.accent }]} />}
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  markAllRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
});
