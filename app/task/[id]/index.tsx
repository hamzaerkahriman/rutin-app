import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  Card,
  EmptyState,
  PrimaryButton,
  PriorityBadge,
  ProgressBar,
  SectionTitle,
  SelectChip,
  StatusBadge,
} from '../../../src/components/ui';
import { TaskAttachmentsSection } from '../../../src/components/TaskAttachments';
import { getAiTaskSummary } from '../../../src/lib/aiAssist';
import { useAppStore } from '../../../src/store/AppStore';
import { useAppTheme } from '../../../src/theme/ThemeProvider';
import { NOTE_TYPE_LABELS } from '../../../src/types';

const HANDOFF_STATUS_LABELS: Record<string, string> = {
  pending: 'onay bekliyor',
  accepted: 'kabul edildi',
  rejected: 'reddedildi',
};

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useAppTheme();
  const router = useRouter();
  const {
    currentUser,
    members,
    getTask,
    getUser,
    getTaskNotes,
    getTaskHandoffs,
    getSubtasks,
    toggleChecklistItem,
    addChecklistItem,
    addNote,
    addSubtask,
    updateTaskStatus,
    acceptHandoff,
    rejectHandoff,
  } = useAppStore();

  const [newChecklistText, setNewChecklistText] = useState('');
  const [newNote, setNewNote] = useState('');
  const [responding, setResponding] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskAssignee, setNewSubtaskAssignee] = useState<string | null>(null);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  const task = getTask(id);

  if (!task) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <EmptyState message="Görev bulunamadı." />
      </View>
    );
  }

  const assignee = task.assignedTo ? getUser(task.assignedTo) : undefined;
  const creator = getUser(task.createdBy);
  const notes = getTaskNotes(task.id);
  const handoffs = getTaskHandoffs(task.id);
  const subtasks = getSubtasks(task.id);
  const parentTask = task.parentTaskId ? getTask(task.parentTaskId) : undefined;
  const isTerminal = ['completed', 'failed', 'cancelled'].includes(task.status);
  const pendingHandoff = handoffs.find((h) => h.acceptedStatus === 'pending');
  const isRecipient = pendingHandoff?.toUserId === currentUser.id;

  const assigneeBreakdown = useMemo(() => {
    const byAssignee = new Map<string, { total: number; completed: number }>();
    subtasks.forEach((s) => {
      const key = s.assignedTo ?? 'unassigned';
      const entry = byAssignee.get(key) ?? { total: 0, completed: 0 };
      entry.total += 1;
      if (s.status === 'completed') entry.completed += 1;
      byAssignee.set(key, entry);
    });
    return Array.from(byAssignee.entries()).map(([userId, stat]) => ({
      user: userId === 'unassigned' ? undefined : getUser(userId),
      total: stat.total,
      completed: stat.completed,
      percent: Math.round((stat.completed / stat.total) * 100),
    }));
  }, [subtasks, getUser]);

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;
    setAddingSubtask(true);
    try {
      await addSubtask(task.id, {
        title: newSubtaskTitle.trim(),
        assignedTo: newSubtaskAssignee ?? undefined,
      });
      setNewSubtaskTitle('');
      setNewSubtaskAssignee(null);
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Alt görev eklenemedi');
    } finally {
      setAddingSubtask(false);
    }
  };

  const handleAcceptHandoff = async () => {
    if (!pendingHandoff) return;
    setResponding(true);
    try {
      await acceptHandoff(pendingHandoff.id);
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Devir kabul edilemedi');
    } finally {
      setResponding(false);
    }
  };

  const handleSummarize = async () => {
    setSummarizing(true);
    try {
      const summary = await getAiTaskSummary(task.id);
      setAiSummary(summary);
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'AI özeti alınamadı');
    } finally {
      setSummarizing(false);
    }
  };

  const handleRejectHandoff = async () => {
    if (!pendingHandoff) return;
    setResponding(true);
    try {
      await rejectHandoff(pendingHandoff.id);
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Devir reddedilemedi');
    } finally {
      setResponding(false);
    }
  };

  const activity = [
    { at: task.createdAt, label: `Görev oluşturuldu (${creator?.name ?? 'bilinmiyor'})` },
    ...handoffs.map((h) => ({
      at: h.createdAt,
      label: `${getUser(h.fromUserId)?.name ?? '?'} → ${getUser(h.toUserId)?.name ?? '?'} kişisine devir ${HANDOFF_STATUS_LABELS[h.acceptedStatus]}`,
    })),
    { at: task.updatedAt, label: `Son güncelleme — durum: ${task.status}` },
  ].sort((a, b) => a.at.localeCompare(b.at));

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      {parentTask && (
        <Pressable onPress={() => router.push(`/task/${parentTask.id}`)} style={{ marginBottom: 6 }}>
          <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '600' }}>← {parentTask.title}</Text>
        </Pressable>
      )}
      <Text style={[styles.title, { color: theme.text }]}>{task.title}</Text>
      {task.description ? (
        <Text style={{ color: theme.textMuted, marginBottom: 12 }}>{task.description}</Text>
      ) : null}

      <View style={styles.badgeRow}>
        <StatusBadge status={task.status} />
        <PriorityBadge priority={task.priority} />
      </View>

      <View style={styles.metaRow}>
        <Text style={{ color: theme.textMuted, fontSize: 13 }}>Atanan: {assignee?.name ?? '—'}</Text>
        <Text style={{ color: theme.textMuted, fontSize: 13 }}>Son tarih: {task.dueDate ?? '—'}</Text>
      </View>

      {task.tags.length > 0 && (
        <View style={styles.tagRow}>
          {task.tags.map((tag) => (
            <View key={tag} style={[styles.tagChip, { backgroundColor: theme.accentLight, borderColor: theme.accent }]}>
              <Text style={{ color: theme.accent, fontWeight: '600', fontSize: 12 }}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ marginVertical: 16 }}>
        <ProgressBar progress={task.progress} />
        <Text style={{ color: theme.textMuted, marginTop: 6, fontSize: 12 }}>İlerleme: %{task.progress}</Text>
      </View>

      <View style={styles.section}>
        <SectionTitle>Checklist</SectionTitle>
        <View style={{ gap: 8 }}>
          {task.checklist.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => toggleChecklistItem(task.id, c.id)}
              style={styles.checklistRow}
            >
              <View
                style={[
                  styles.checkbox,
                  { borderColor: theme.accent, backgroundColor: c.completed ? theme.success : 'transparent' },
                ]}
              >
                {c.completed && <Ionicons name="checkmark" size={13} color="#fff" />}
              </View>
              <Text
                style={{
                  color: theme.text,
                  textDecorationLine: c.completed ? 'line-through' : 'none',
                  flex: 1,
                }}
              >
                {c.text}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.addRow}>
          <TextInput
            value={newChecklistText}
            onChangeText={setNewChecklistText}
            placeholder="Checklist maddesi ekle..."
            placeholderTextColor={theme.textMuted}
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            onSubmitEditing={() => {
              if (newChecklistText.trim()) {
                addChecklistItem(task.id, newChecklistText.trim());
                setNewChecklistText('');
              }
            }}
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionTitle>Alt Görevler</SectionTitle>
        <View style={{ gap: 8 }}>
          {subtasks.length === 0 ? (
            <Text style={{ color: theme.textMuted }}>Henüz alt görev yok.</Text>
          ) : (
            subtasks.map((s) => {
              const subAssignee = s.assignedTo ? getUser(s.assignedTo) : undefined;
              return (
                <Pressable key={s.id} testID={`subtask-item-${s.id}`} onPress={() => router.push(`/task/${s.id}`)}>
                  <Card style={{ gap: 6 }}>
                    <View style={styles.subtaskHeader}>
                      <Text style={{ color: theme.text, fontWeight: '600', flexShrink: 1 }}>{s.title}</Text>
                      <StatusBadge status={s.status} />
                    </View>
                    <View style={styles.subtaskHeader}>
                      <View style={{ flex: 1 }}>
                        <ProgressBar progress={s.progress} />
                      </View>
                      <Text
                        style={{ color: theme.textMuted, fontSize: 12, maxWidth: 110 }}
                        numberOfLines={1}
                      >
                        {subAssignee?.name ?? 'Atanmamış'}
                      </Text>
                    </View>
                  </Card>
                </Pressable>
              );
            })
          )}
        </View>

        {assigneeBreakdown.length > 0 && (
          <Card style={{ gap: 6, marginTop: 4 }}>
            <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>Kişi Bazlı İlerleme</Text>
            {assigneeBreakdown.map((b, i) => (
              <Text key={i} style={{ color: theme.textMuted, fontSize: 13 }}>
                {b.user?.name ?? 'Atanmamış'}: {b.completed}/{b.total} (%{b.percent})
              </Text>
            ))}
          </Card>
        )}

        <View style={styles.addRow}>
          <TextInput
            value={newSubtaskTitle}
            onChangeText={setNewSubtaskTitle}
            placeholder="Alt görev ekle..."
            placeholderTextColor={theme.textMuted}
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            onSubmitEditing={handleAddSubtask}
          />
          <View style={styles.chipRow}>
            {members.map((m) => {
              const active = newSubtaskAssignee === m.userId;
              return (
                <SelectChip
                  key={m.userId}
                  testID={`subtask-assignee-${m.userId}`}
                  compact
                  label={m.user.name}
                  active={active}
                  onPress={() => setNewSubtaskAssignee(active ? null : m.userId)}
                />
              );
            })}
          </View>
          <PrimaryButton
            label={addingSubtask ? 'Ekleniyor...' : '+ Alt Görev Ekle'}
            variant="outline"
            disabled={!newSubtaskTitle.trim() || addingSubtask}
            onPress={handleAddSubtask}
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionTitle>Notlar ve Mesajlar</SectionTitle>
        <Pressable onPress={handleSummarize} disabled={summarizing} style={{ alignSelf: 'flex-start' }}>
          <View style={[styles.aiChip, { borderColor: theme.accent }]}>
            <Ionicons name="sparkles-outline" size={14} color={theme.accent} />
            <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '600' }}>
              {summarizing ? 'Özetleniyor...' : 'AI ile Özetle'}
            </Text>
          </View>
        </Pressable>
        {aiSummary && (
          <Card style={{ borderColor: theme.accent }}>
            <Text style={{ color: theme.text, fontSize: 13 }}>{aiSummary}</Text>
          </Card>
        )}
        <View style={{ gap: 8 }}>
          {notes.length === 0 ? (
            <Text style={{ color: theme.textMuted }}>Henüz not yok.</Text>
          ) : (
            notes.map((n) => (
              <Card key={n.id} style={{ gap: 4 }}>
                <View style={styles.noteHeader}>
                  <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>
                    {getUser(n.userId)?.name ?? '?'}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 11 }}>{NOTE_TYPE_LABELS[n.type]}</Text>
                </View>
                <Text style={{ color: theme.textMuted }}>{n.content}</Text>
              </Card>
            ))
          )}
        </View>
        <View style={styles.addRow}>
          <TextInput
            value={newNote}
            onChangeText={setNewNote}
            placeholder="Yorum yaz..."
            placeholderTextColor={theme.textMuted}
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            onSubmitEditing={() => {
              if (newNote.trim()) {
                addNote(task.id, newNote.trim());
                setNewNote('');
              }
            }}
          />
        </View>
      </View>

      <TaskAttachmentsSection taskId={task.id} />

      <View style={styles.section}>
        <SectionTitle>Aktivite Geçmişi</SectionTitle>
        <View style={{ gap: 6 }}>
          {activity.map((a, i) => (
            <Text key={i} style={{ color: theme.textMuted, fontSize: 12 }}>
              {new Date(a.at).toLocaleString('tr-TR')} — {a.label}
            </Text>
          ))}
        </View>
      </View>

      {pendingHandoff ? (
        isRecipient ? (
          <View style={styles.section}>
            <SectionTitle>Devir Onayı Bekliyor</SectionTitle>
            <Card style={{ gap: 8, borderColor: theme.accent }}>
              <Text style={{ color: theme.text }}>
                <Text style={{ fontWeight: '700' }}>{getUser(pendingHandoff.fromUserId)?.name ?? '?'}</Text> bu
                görevi sana devretmek istiyor.
              </Text>
              <View style={styles.actionsRow}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton label="Reddet" variant="outline" disabled={responding} onPress={handleRejectHandoff} />
                </View>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    label="Kabul Et"
                    variant="success"
                    disabled={responding}
                    onPress={handleAcceptHandoff}
                  />
                </View>
              </View>
            </Card>
          </View>
        ) : (
          <Card style={{ marginTop: 24 }}>
            <Text style={{ color: theme.textMuted }}>
              {getUser(pendingHandoff.toUserId)?.name ?? '?'} kişisine devredildi, onayı bekleniyor.
            </Text>
          </Card>
        )
      ) : (
        !isTerminal && (
          <View style={styles.actionsRow}>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                label="Devret"
                variant="outline"
                onPress={() => router.push(`/task/${task.id}/handoff`)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                label="Tamamla"
                variant="success"
                onPress={() => updateTaskStatus(task.id, 'completed')}
              />
            </View>
          </View>
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 60,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tagChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  section: {
    marginTop: 24,
    gap: 8,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRow: {
    marginTop: 8,
    gap: 8,
  },
  subtaskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  aiChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
});
