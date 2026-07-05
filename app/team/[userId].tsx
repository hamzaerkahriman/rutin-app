import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { TaskCard } from '../../src/components/TaskCard';
import { Card, elevatedCircleStyle, EmptyState, PrimaryButton, SectionTitle, SelectChip } from '../../src/components/ui';
import { confirmAction, notify } from '../../src/lib/confirm';
import { useAppStore } from '../../src/store/AppStore';
import { useAppTheme } from '../../src/theme/ThemeProvider';
import { INVITE_ROLE_LABELS, InviteRole } from '../../src/types';

const EDITABLE_ROLES: InviteRole[] = ['admin', 'member', 'viewer'];

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

export default function TeamMemberProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { theme } = useAppTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const {
    currentUser,
    members,
    tasks,
    getUser,
    getOrCreateConversation,
    getConversationMessages,
    loadMessages,
    sendMessage,
    removeMember,
    updateMemberRole,
  } = useAppStore();

  const member = members.find((m) => m.userId === userId);
  const user = getUser(userId);
  const myRole = members.find((m) => m.userId === currentUser.id)?.role;
  const canManage = myRole === 'owner' || myRole === 'admin';
  const isSelf = userId === currentUser.id;

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: user?.name ?? 'Profil' });
  }, [navigation, user?.name]);

  useEffect(() => {
    if (!userId || isSelf) return;
    getOrCreateConversation(userId)
      .then((c) => {
        setConversationId(c.id);
        loadMessages(c.id);
      })
      .catch(() => {});
  }, [userId, isSelf, getOrCreateConversation, loadMessages]);

  if (!member || !user) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <EmptyState message="Üye bulunamadı." />
      </View>
    );
  }

  const chatMessages = conversationId ? getConversationMessages(conversationId) : [];
  const lastMessage = chatMessages[chatMessages.length - 1];

  const memberTasks = tasks.filter((t) => t.assignedTo === userId);
  const activeTasks = memberTasks.filter((t) => !['completed', 'cancelled', 'failed'].includes(t.status));
  const historyTasks = memberTasks.filter((t) => t.status === 'completed').slice(0, 6);

  const handleSendQuick = async () => {
    const content = draft.trim();
    if (!content || !conversationId) return;
    setSending(true);
    setDraft('');
    try {
      await sendMessage(conversationId, content);
    } catch (err) {
      setDraft(content);
      notify('Hata', err instanceof Error ? err.message : 'Mesaj gönderilemedi');
    } finally {
      setSending(false);
    }
  };

  const handleRoleChange = async (role: InviteRole) => {
    if (role === member.role) return;
    setUpdatingRole(true);
    try {
      await updateMemberRole(userId, role);
    } catch (err) {
      notify('Hata', err instanceof Error ? err.message : 'Rol güncellenemedi');
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleRemove = async () => {
    const confirmed = await confirmAction(
      'Üyeyi çıkar',
      `${user.name} bu workspace'ten çıkarılacak.`,
      'Çıkar'
    );
    if (!confirmed) return;
    setRemoving(true);
    try {
      await removeMember(userId);
      router.back();
    } catch (err) {
      notify('Hata', err instanceof Error ? err.message : 'Üye çıkarılamadı');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={[styles.avatar, { backgroundColor: theme.accent + '22' }]}>
          <Ionicons name="person" size={40} color={theme.accent} />
        </View>
        <Text style={[styles.name, { color: theme.text }]}>{user.name}</Text>
        <Text style={[styles.role, { color: theme.textMuted }]}>{ROLE_LABELS[member.role]}</Text>

        {!isSelf && (
          <View style={{ width: '100%', maxWidth: 220, marginTop: 8 }}>
            <PrimaryButton
              label="Mesaj Gönder"
              onPress={() => conversationId && router.push(`/messages/${conversationId}`)}
              disabled={!conversationId}
            />
          </View>
        )}

        {canManage && !isSelf && member.role !== 'owner' && (
          <View style={{ width: '100%', maxWidth: 280, marginTop: 20 }}>
            <Text style={[styles.adminLabel, { color: theme.textMuted }]}>Yönetici İşlemleri</Text>
            <Text style={[styles.roleFieldLabel, { color: theme.textMuted }]}>Rol</Text>
            <View style={styles.roleChipRow}>
              {EDITABLE_ROLES.map((r) => (
                <SelectChip
                  key={r}
                  label={INVITE_ROLE_LABELS[r]}
                  active={member.role === r}
                  onPress={() => handleRoleChange(r)}
                  compact
                />
              ))}
            </View>
            {updatingRole && <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 8 }}>Güncelleniyor...</Text>}
            <PrimaryButton
              label={removing ? 'Çıkarılıyor...' : 'Ekipten Çıkar'}
              variant="danger"
              onPress={handleRemove}
              disabled={removing}
            />
          </View>
        )}
      </View>

      {canManage && (
        <>
          <View style={styles.sectionHeaderRow}>
            <SectionTitle>Günlük Görevler</SectionTitle>
            <View style={[styles.countBadge, { backgroundColor: theme.info + '1F' }]}>
              <Text style={{ color: theme.info, fontSize: 12, fontWeight: '700' }}>{activeTasks.length} Aktif</Text>
            </View>
          </View>
          {activeTasks.length === 0 ? (
            <Text style={{ color: theme.textMuted, marginBottom: 20 }}>Aktif görevi yok.</Text>
          ) : (
            <View style={{ gap: 10, marginBottom: 24 }}>
              {activeTasks.map((t) => (
                <TaskCard key={t.id} task={t} />
              ))}
            </View>
          )}

          <SectionTitle>Görev Geçmişi</SectionTitle>
          {historyTasks.length === 0 ? (
            <Text style={{ color: theme.textMuted, marginBottom: 20 }}>Henüz tamamlanmış görev yok.</Text>
          ) : (
            <Card style={{ marginBottom: 24, gap: 2, padding: 8 }}>
              {historyTasks.map((t) => (
                <View key={t.id} style={styles.historyRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <Ionicons name="checkmark-circle" size={18} color={theme.success} />
                    <Text style={{ color: theme.textMuted, textDecorationLine: 'line-through', flex: 1 }} numberOfLines={1}>
                      {t.title}
                    </Text>
                  </View>
                  <Text style={{ color: theme.textMuted, fontSize: 11 }}>{t.dueDate ?? ''}</Text>
                </View>
              ))}
            </Card>
          )}
        </>
      )}

      {!isSelf && (
        <>
          <SectionTitle>Hızlı Mesaj</SectionTitle>
          <Card style={{ gap: 12 }}>
            {lastMessage ? (
              <View style={{ gap: 4 }}>
                <Text style={{ color: theme.text }}>{lastMessage.content}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 11 }}>
                  {lastMessage.senderId === currentUser.id ? 'Sen gönderdin' : `${user.name} gönderdi`}
                </Text>
              </View>
            ) : (
              <Text style={{ color: theme.textMuted }}>Henüz mesaj yok.</Text>
            )}
            <View style={styles.quickRow}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Mesaj yaz..."
                placeholderTextColor={theme.textMuted}
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              />
              <Pressable
                testID="quick-message-send"
                onPress={handleSendQuick}
                disabled={!draft.trim() || sending || !conversationId}
                style={({ pressed }) => [
                  styles.sendBtn,
                  { backgroundColor: theme.accent, opacity: !draft.trim() || sending ? 0.5 : 1 },
                  draft.trim() && !sending && elevatedCircleStyle(pressed),
                ]}
              >
                <Ionicons name="send" size={16} color={theme.accentText} />
              </Pressable>
            </View>
            {conversationId && (
              <Pressable onPress={() => router.push(`/messages/${conversationId}`)}>
                <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '600' }}>Tüm sohbeti gör →</Text>
              </Pressable>
            )}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
  },
  role: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 16,
  },
  adminLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    textAlign: 'center',
  },
  roleFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  roleChipRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
