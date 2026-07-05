import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, noSelectStyle, PrimaryButton, ProgressBar, SectionTitle, SelectChip } from '../../src/components/ui';
import { useAppStore } from '../../src/store/AppStore';
import { useAppTheme } from '../../src/theme/ThemeProvider';
import { INVITE_ROLE_LABELS, INVITE_STATUS_LABELS, InviteRole } from '../../src/types';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

const INVITE_ROLES: InviteRole[] = ['admin', 'member', 'viewer'];

export default function TeamScreen() {
  const { theme } = useAppTheme();
  const {
    members,
    tasks,
    workspace,
    workspaces,
    currentUser,
    sentInvites,
    switchWorkspace,
    inviteMember,
    cancelInvite,
    getOrCreateConversation,
  } = useAppStore();
  const router = useRouter();
  const todayStr = new Date().toISOString().slice(0, 10);

  const myRole = members.find((m) => m.userId === currentUser.id)?.role;
  const canManage = myRole === 'owner' || myRole === 'admin';

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InviteRole>('member');
  const [sending, setSending] = useState(false);

  const memberStats = useMemo(
    () =>
      members.map((m) => {
        const memberTasks = tasks.filter((t) => t.assignedTo === m.userId);
        const completed = memberTasks.filter((t) => t.status === 'completed').length;
        const overdue = memberTasks.filter(
          (t) => t.dueDate && t.dueDate < todayStr && !['completed', 'cancelled', 'failed'].includes(t.status)
        ).length;
        const active = memberTasks.filter((t) => !['completed', 'cancelled', 'failed'].includes(t.status)).length;
        const completionRate = memberTasks.length ? Math.round((completed / memberTasks.length) * 100) : 0;
        return { ...m, total: memberTasks.length, completed, overdue, active, completionRate };
      }),
    [members, tasks, todayStr]
  );

  const pendingInvites = sentInvites.filter((i) => i.status === 'pending');
  const resolvedInvites = sentInvites.filter((i) => i.status !== 'pending');

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) return;
    setSending(true);
    try {
      await inviteMember(email, inviteRole);
      setInviteEmail('');
      Alert.alert('Davet gönderildi', `${email} adresine davet gönderildi.`);
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Davet gönderilemedi');
    } finally {
      setSending(false);
    }
  };

  const handleCancelInvite = (inviteId: string) => {
    cancelInvite(inviteId).catch((err) =>
      Alert.alert('Hata', err instanceof Error ? err.message : 'Davet iptal edilemedi')
    );
  };

  const handleMessage = async (userId: string) => {
    try {
      const conversation = await getOrCreateConversation(userId);
      router.push(`/messages/${conversation.id}`);
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Sohbet açılamadı');
    }
  };

  const handleSwitchWorkspace = (workspaceId: string) => {
    switchWorkspace(workspaceId).catch((err) =>
      Alert.alert('Hata', err instanceof Error ? err.message : 'Workspace değiştirilemedi')
    );
  };

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      {workspaces.length > 1 && (
        <View style={styles.chipRow}>
          {workspaces.map((w) => (
            <SelectChip key={w.id} label={w.name} active={w.id === workspace.id} onPress={() => handleSwitchWorkspace(w.id)} />
          ))}
        </View>
      )}

      <Text style={[styles.workspaceName, { color: theme.text }]}>{workspace.name}</Text>
      <Text style={{ color: theme.textMuted, marginBottom: 20 }}>{members.length} üye</Text>

      <SectionTitle>Üye Performansı</SectionTitle>
      <View style={{ gap: 12, marginBottom: 24 }}>
        {memberStats.map((m) => (
          <Pressable key={m.id} onPress={() => router.push(`/team/${m.userId}`)} style={noSelectStyle}>
            <Card style={{ gap: 8 }}>
              <View style={styles.memberHeader}>
                <View>
                  <Text style={{ color: theme.text, fontWeight: '700', fontSize: 15 }}>{m.user.name}</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 12 }}>{ROLE_LABELS[m.role]}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {canManage && <Text style={{ color: theme.accent, fontWeight: '700' }}>%{m.completionRate}</Text>}
                  {m.userId !== currentUser.id && (
                    <Pressable
                      testID={`message-member-${m.userId}`}
                      onPress={() => handleMessage(m.userId)}
                      hitSlop={8}
                      style={[styles.messageBtn, { borderColor: theme.border }]}
                    >
                      <Ionicons name="chatbubble-outline" size={16} color={theme.accent} />
                    </Pressable>
                  )}
                </View>
              </View>
              {canManage && (
                <>
                  <ProgressBar progress={m.completionRate} />
                  <View style={styles.memberFooter}>
                    <Text style={{ color: theme.textMuted, fontSize: 12 }}>{m.active} aktif görev</Text>
                    <Text style={{ color: theme.textMuted, fontSize: 12 }}>{m.completed} tamamlandı</Text>
                    <Text style={{ color: m.overdue > 0 ? theme.danger : theme.textMuted, fontSize: 12 }}>
                      {m.overdue} geciken
                    </Text>
                  </View>
                </>
              )}
            </Card>
          </Pressable>
        ))}
      </View>

      {canManage && (
        <>
          <SectionTitle>Üye Davet Et</SectionTitle>
          <Text style={{ color: theme.textMuted, fontSize: 13, marginBottom: 12 }}>
            Davet ettiğin kişinin Rutin'e kayıtlı olması gerekmez — giriş yaptığında (veya kayıt olduğunda)
            daveti Dashboard'da görüp kabul edebilir.
          </Text>
          <TextInput
            value={inviteEmail}
            onChangeText={setInviteEmail}
            placeholder="E-posta adresi"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          />
          <View style={styles.chipRow}>
            {INVITE_ROLES.map((r) => (
              <SelectChip key={r} label={INVITE_ROLE_LABELS[r]} active={inviteRole === r} onPress={() => setInviteRole(r)} />
            ))}
          </View>
          <View style={{ marginBottom: 24 }}>
            <PrimaryButton
              label={sending ? 'Gönderiliyor...' : 'Davet Gönder'}
              onPress={handleInvite}
              disabled={!inviteEmail.trim() || sending}
              compact
            />
          </View>

          {pendingInvites.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <SectionTitle>Bekleyen Davetler</SectionTitle>
              <View style={{ gap: 10 }}>
                {pendingInvites.map((inv) => (
                  <Card key={inv.id} style={styles.inviteRow}>
                    <View>
                      <Text style={{ color: theme.text, fontWeight: '600' }}>{inv.email}</Text>
                      <Text style={{ color: theme.textMuted, fontSize: 12 }}>{INVITE_ROLE_LABELS[inv.role]}</Text>
                    </View>
                    <Pressable onPress={() => handleCancelInvite(inv.id)} hitSlop={8}>
                      <Text style={{ color: theme.danger, fontSize: 13, fontWeight: '600' }}>İptal Et</Text>
                    </Pressable>
                  </Card>
                ))}
              </View>
            </View>
          )}

          {resolvedInvites.length > 0 && (
            <View>
              <SectionTitle>Geçmiş Davetler</SectionTitle>
              <View style={{ gap: 10 }}>
                {resolvedInvites.map((inv) => (
                  <Card key={inv.id} style={styles.inviteRow}>
                    <Text style={{ color: theme.textMuted }}>{inv.email}</Text>
                    <Text style={{ color: theme.textMuted, fontSize: 12 }}>{INVITE_STATUS_LABELS[inv.status]}</Text>
                  </Card>
                ))}
              </View>
            </View>
          )}
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
  workspaceName: {
    fontSize: 22,
    fontWeight: '800',
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  inviteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageBtn: {
    borderWidth: 1,
    borderRadius: 999,
    padding: 6,
  },
});
