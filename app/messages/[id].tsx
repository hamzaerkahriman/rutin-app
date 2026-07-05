import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { elevatedCircleStyle, EmptyState } from '../../src/components/ui';
import { useAppStore } from '../../src/store/AppStore';
import { useAppTheme } from '../../src/theme/ThemeProvider';

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useAppTheme();
  const navigation = useNavigation();
  const {
    currentUser,
    conversations,
    getConversationMessages,
    getOtherParticipant,
    loadMessages,
    sendMessage,
    markConversationRead,
  } = useAppStore();

  const conversation = conversations.find((c) => c.id === id);
  const other = conversation ? getOtherParticipant(conversation) : undefined;
  const chatMessages = id ? getConversationMessages(id) : [];

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: other?.name ?? 'Sohbet' });
  }, [navigation, other?.name]);

  useEffect(() => {
    if (id) loadMessages(id);
  }, [id, loadMessages]);

  useEffect(() => {
    if (id) markConversationRead(id);
  }, [id, chatMessages.length, markConversationRead]);

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || !id) return;
    setSending(true);
    setDraft('');
    try {
      await sendMessage(id, content);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (err) {
      setDraft(content);
    } finally {
      setSending(false);
    }
  };

  if (!conversation) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <EmptyState message="Sohbet bulunamadı." />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={chatMessages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.content}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={<EmptyState message="Henüz mesaj yok — ilk mesajı sen gönder." />}
        renderItem={({ item }) => {
          const mine = item.senderId === currentUser.id;
          return (
            <View style={[styles.bubbleRow, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
              <View
                style={[
                  styles.bubble,
                  {
                    backgroundColor: mine ? theme.accent : theme.card,
                    borderColor: mine ? theme.accent : theme.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <Text style={{ color: mine ? theme.accentText : theme.text }}>{item.content}</Text>
                <Text
                  style={{
                    color: mine ? theme.accentText : theme.textMuted,
                    opacity: 0.7,
                    fontSize: 10,
                    marginTop: 4,
                    textAlign: 'right',
                  }}
                >
                  {formatTime(item.createdAt)}
                </Text>
              </View>
            </View>
          );
        }}
      />

      <View style={[styles.inputRow, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
        <TextInput
          testID="message-input"
          value={draft}
          onChangeText={setDraft}
          placeholder="Mesaj yaz..."
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          multiline
        />
        <Pressable
          testID="message-send-button"
          onPress={handleSend}
          disabled={!draft.trim() || sending}
          style={({ pressed }) => [
            styles.sendBtn,
            { backgroundColor: theme.accent, opacity: !draft.trim() || sending ? 0.5 : 1 },
            draft.trim() && !sending && elevatedCircleStyle(pressed),
          ]}
        >
          <Ionicons name="send" size={16} color={theme.accentText} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
