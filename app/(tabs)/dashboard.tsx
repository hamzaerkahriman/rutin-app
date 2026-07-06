import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TaskCard } from '../../src/components/TaskCard';
import { Card, PrimaryButton, SectionTitle } from '../../src/components/ui';
import { useAppStore } from '../../src/store/AppStore';
import { useAppTheme } from '../../src/theme/ThemeProvider';
import { INVITE_ROLE_LABELS } from '../../src/types';

export default function DashboardScreen() {
  const { theme } = useAppTheme();
  const {
    tasks,
    currentUser,
    myInvites,
    acceptInvite,
    declineInvite,
    myPendingHandoffs,
    getTask,
    getUser,
    acceptHandoff,
    rejectHandoff,
  } = useAppStore();
  const router = useRouter();
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const handleAccept = async (inviteId: string) => {
    setRespondingId(inviteId);
    try {
      await acceptInvite(inviteId);
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Davet kabul edilemedi');
    } finally {
      setRespondingId(null);
    }
  };

  const handleDecline = async (inviteId: string) => {
    setRespondingId(inviteId);
    try {
      await declineInvite(inviteId);
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Davet reddedilemedi');
    } finally {
      setRespondingId(null);
    }
  };

  const handleAcceptHandoff = async (handoffId: string) => {
    setRespondingId(handoffId);
    try {
      await acceptHandoff(handoffId);
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Devir kabul edilemedi');
    } finally {
      setRespondingId(null);
    }
  };

  const handleRejectHandoff = async (handoffId: string) => {
    setRespondingId(handoffId);
    try {
      await rejectHandoff(handoffId);
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Devir reddedilemedi');
    } finally {
      setRespondingId(null);
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const myTasks = tasks.filter((t) => t.assigneeIds.includes(currentUser.id));
    const todayTasks = myTasks.filter((t) => t.dueDate === todayStr);
    const completed = myTasks.filter((t) => t.status === 'completed').length;
    const postponed = myTasks.filter((t) => t.status === 'postponed').length;
    const overdue = myTasks.filter(
      (t) => t.dueDate && t.dueDate < todayStr && !['completed', 'cancelled', 'failed'].includes(t.status)
    ).length;
    const successRate = todayTasks.length
      ? Math.round((todayTasks.filter((t) => t.status === 'completed').length / todayTasks.length) * 100)
      : 0;
    return { todayTasks, completed, postponed, overdue, successRate };
  }, [tasks, currentUser, todayStr]);

  const fromTeam = tasks
    .filter((t) => t.assigneeIds.includes(currentUser.id) && t.createdBy !== currentUser.id)
    .slice(0, 3);

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.greeting, { color: theme.text }]}>Merhaba, {currentUser.name.split(' ')[0]}</Text>
      <Text style={{ color: theme.textMuted, marginBottom: 16 }}>Bugün {stats.todayTasks.length} görevin var.</Text>

      {myInvites.length > 0 && (
        <View style={styles.section}>
          <SectionTitle>Bekleyen Davetlerin</SectionTitle>
          <View style={{ gap: 10 }}>
            {myInvites.map((inv) => (
              <Card key={inv.id} style={{ gap: 8, borderColor: theme.accent }}>
                <Text style={{ color: theme.text }}>
                  Bir workspace'e <Text style={{ fontWeight: '700' }}>{INVITE_ROLE_LABELS[inv.role]}</Text> olarak
                  davet edildin.
                </Text>
                <View style={styles.inviteActions}>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton
                      label="Reddet"
                      variant="outline"
                      disabled={respondingId === inv.id}
                      onPress={() => handleDecline(inv.id)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton
                      label="Kabul Et"
                      variant="success"
                      disabled={respondingId === inv.id}
                      onPress={() => handleAccept(inv.id)}
                    />
                  </View>
                </View>
              </Card>
            ))}
          </View>
        </View>
      )}

      {myPendingHandoffs.length > 0 && (
        <View style={styles.section}>
          <SectionTitle>Bekleyen Devir Talepleri</SectionTitle>
          <View style={{ gap: 10 }}>
            {myPendingHandoffs.map((h) => {
              const task = getTask(h.taskId);
              const fromUser = getUser(h.fromUserId);
              return (
                <Card key={h.id} style={{ gap: 8, borderColor: theme.accent }}>
                  <Text style={{ color: theme.text }}>
                    <Text style={{ fontWeight: '700' }}>{fromUser?.name ?? 'Bir kullanıcı'}</Text>,{' '}
                    <Text style={{ fontWeight: '700' }}>{task?.title ?? 'bir görevi'}</Text> görevini sana devretmek
                    istiyor.
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 13 }}>{h.remainingWork}</Text>
                  <View style={styles.inviteActions}>
                    <View style={{ flex: 1 }}>
                      <PrimaryButton
                        label="Reddet"
                        variant="outline"
                        disabled={respondingId === h.id}
                        onPress={() => handleRejectHandoff(h.id)}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <PrimaryButton
                        label="Kabul Et"
                        variant="success"
                        disabled={respondingId === h.id}
                        onPress={() => handleAcceptHandoff(h.id)}
                      />
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        </View>
      )}

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: theme.success }]}>{stats.completed}</Text>
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>Tamamlanan</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: theme.warning }]}>{stats.postponed}</Text>
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>Ertelenen</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: theme.danger }]}>{stats.overdue}</Text>
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>Geciken</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: theme.accent }]}>%{stats.successRate}</Text>
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>Günlük başarı</Text>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle>Bugünkü görevlerin</SectionTitle>
        {stats.todayTasks.length === 0 ? (
          <Text style={{ color: theme.textMuted }}>Bugün için planlanmış görev yok.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {stats.todayTasks.map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
          </View>
        )}
      </View>

      {fromTeam.length > 0 && (
        <View style={styles.section}>
          <SectionTitle>Ekipten gelenler</SectionTitle>
          <View style={{ gap: 10 }}>
            {fromTeam.map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
          </View>
        </View>
      )}

      <View style={{ marginTop: 8 }}>
        <PrimaryButton label="+ Yeni görev oluştur" onPress={() => router.push('/task/create')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flexBasis: '47%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 18,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  section: {
    marginBottom: 24,
    gap: 10,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 10,
  },
});
