import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, EmptyState } from '../../src/components/ui';
import { useAppStore } from '../../src/store/AppStore';
import { useAppTheme } from '../../src/theme/ThemeProvider';
import { Conversation } from '../../src/types';

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

export default function MessagesScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { conversations, getConversationMessages, getOtherParticipant, unreadCountForConversation } = useAppStore();

  const rows = useMemo(() => {
    return conversations
      .map((c: Conversation) => {
        const other = getOtherParticipant(c);
        const msgs = getConversationMessages(c.id);
        const last = msgs[msgs.length - 1];
        const unread = unreadCountForConversation(c.id);
        return { conversation: c, other, last, unread };
      })
      .filter((r) => !!r.other)
      .sort((a, b) => {
        const at = a.last?.createdAt ?? a.conversation.createdAt;
        const bt = b.last?.createdAt ?? b.conversation.createdAt;
        return bt.localeCompare(at);
      });
  }, [conversations, getConversationMessages, getOtherParticipant, unreadCountForConversation]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.conversation.id}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <EmptyState message="Henüz bir sohbetin yok. Ekip sekmesinden bir üyeye mesaj gönderebilirsin." />
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`conversation-row-${item.other?.id}`}
            onPress={() => router.push(`/messages/${item.conversation.id}`)}
          >
            <Card
              style={{
                ...styles.card,
                borderColor: item.unread > 0 ? theme.accent : theme.border,
                backgroundColor: item.unread > 0 ? theme.accent + '14' : theme.card,
              }}
            >
              <View style={[styles.avatar, { backgroundColor: theme.accent + '22' }]}>
                <Ionicons name="person" size={18} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: item.unread > 0 ? '700' : '600' }}>
                  {item.other?.name}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ color: theme.textMuted, fontSize: 13, marginTop: 2 }}
                >
                  {item.last ? item.last.content : 'Henüz mesaj yok'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                {item.last && (
                  <Text style={{ color: theme.textMuted, fontSize: 11 }}>{timeAgo(item.last.createdAt)}</Text>
                )}
                {item.unread > 0 && (
                  <View style={[styles.badge, { backgroundColor: theme.danger }]}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                      {item.unread > 9 ? '9+' : item.unread}
                    </Text>
                  </View>
                )}
              </View>
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    minWidth: 16,
    height: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
});
