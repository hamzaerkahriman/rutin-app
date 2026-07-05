import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CircularProgress } from '../../src/components/Charts';
import { Card, PrimaryButton, ProgressBar, SectionTitle } from '../../src/components/ui';
import { getAiDailyComment } from '../../src/lib/aiAssist';
import { useAppStore } from '../../src/store/AppStore';
import { useAppTheme } from '../../src/theme/ThemeProvider';
import { Task } from '../../src/types';

function ChecklistRow({ task }: { task: Task }) {
  const { theme } = useAppTheme();
  const { updateTaskStatus } = useAppStore();
  const router = useRouter();
  const isDone = task.status === 'completed';

  return (
    <Card style={styles.row}>
      <Pressable
        onPress={() => updateTaskStatus(task.id, isDone ? 'pending' : 'completed')}
        style={[
          styles.checkbox,
          { borderColor: theme.accent, backgroundColor: isDone ? theme.success : 'transparent' },
        ]}
      >
        {isDone && <Ionicons name="checkmark" size={14} color="#fff" />}
      </Pressable>

      <Pressable style={{ flex: 1 }} onPress={() => router.push(`/task/${task.id}`)}>
        <Text
          style={[
            styles.rowTitle,
            { color: theme.text, textDecorationLine: isDone ? 'line-through' : 'none' },
          ]}
        >
          {task.title}
        </Text>
        <Text style={{ color: theme.textMuted, fontSize: 12 }}>{task.category ?? 'Genel'}</Text>
      </Pressable>

      <View style={styles.rowActions}>
        <Pressable onPress={() => updateTaskStatus(task.id, 'postponed')} hitSlop={8}>
          <Text style={{ color: theme.warning, fontSize: 12 }}>Ertele</Text>
        </Pressable>
        <Pressable onPress={() => updateTaskStatus(task.id, 'failed')} hitSlop={8}>
          <Text style={{ color: theme.danger, fontSize: 12 }}>Başarısız</Text>
        </Pressable>
      </View>
    </Card>
  );
}

export default function ChecklistScreen() {
  const { theme } = useAppTheme();
  const { tasks, currentUser, createTask, saveDay, todaySave } = useAppStore();
  const [quickAdd, setQuickAdd] = useState('');
  const [note, setNote] = useState('');
  const [aiComment, setAiComment] = useState<string | null>(null);
  const [commenting, setCommenting] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  const { todayItems, overdueItems } = useMemo(() => {
    const mine = tasks.filter((t) => t.assignedTo === currentUser.id);
    return {
      todayItems: mine.filter((t) => t.dueDate === todayStr),
      overdueItems: mine.filter(
        (t) => t.dueDate && t.dueDate < todayStr && !['completed', 'cancelled', 'failed'].includes(t.status)
      ),
    };
  }, [tasks, currentUser, todayStr]);

  const completedCount = todayItems.filter((t) => t.status === 'completed').length;
  const progressPct = todayItems.length ? Math.round((completedCount / todayItems.length) * 100) : 0;
  const existingSave = todaySave();

  const handleQuickAdd = () => {
    if (!quickAdd.trim()) return;
    createTask({ title: quickAdd.trim(), dueDate: todayStr, status: 'pending' }).catch((err) =>
      Alert.alert('Hata', err instanceof Error ? err.message : 'Görev eklenemedi')
    );
    setQuickAdd('');
  };

  const handleSaveDay = async () => {
    try {
      const save = await saveDay(note.trim());
      Alert.alert('Gün sonu kaydedildi', `Bugünkü başarı oranın: %${save.successRate}`);
      setNote('');
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Save alınamadı');
    }
  };

  const handleAiComment = async () => {
    if (!existingSave) return;
    setCommenting(true);
    try {
      const comment = await getAiDailyComment({
        completedTasks: existingSave.completedTasks,
        failedTasks: existingSave.failedTasks,
        postponedTasks: existingSave.postponedTasks,
        successRate: existingSave.successRate,
      });
      setAiComment(comment);
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'AI yorumu alınamadı');
    } finally {
      setCommenting(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <SectionTitle>Bugünün Checklist'i</SectionTitle>
      <View style={{ marginBottom: 16 }}>
        <ProgressBar progress={progressPct} />
        <Text style={{ color: theme.textMuted, marginTop: 6, fontSize: 12 }}>
          {completedCount}/{todayItems.length} tamamlandı (%{progressPct})
        </Text>
      </View>

      <View style={styles.quickAddRow}>
        <TextInput
          value={quickAdd}
          onChangeText={setQuickAdd}
          placeholder="Hızlı görev ekle..."
          placeholderTextColor={theme.textMuted}
          onSubmitEditing={handleQuickAdd}
          style={[styles.input, { borderColor: theme.border, color: theme.text }]}
        />
        <Pressable onPress={handleQuickAdd} style={[styles.addButton, { backgroundColor: theme.accent }]}>
          <Text style={{ color: theme.accentText, fontWeight: '700' }}>Ekle</Text>
        </Pressable>
      </View>

      <View style={{ gap: 10, marginBottom: 24 }}>
        {todayItems.length === 0 ? (
          <Text style={{ color: theme.textMuted }}>Bugün için görev yok — hızlı ekleme ile bir tane oluştur.</Text>
        ) : (
          todayItems.map((t) => <ChecklistRow key={t.id} task={t} />)
        )}
      </View>

      {overdueItems.length > 0 && (
        <View style={{ marginBottom: 24 }}>
          <SectionTitle>Geciken görevler</SectionTitle>
          <View style={{ gap: 10 }}>
            {overdueItems.map((t) => (
              <ChecklistRow key={t.id} task={t} />
            ))}
          </View>
        </View>
      )}

      <View style={styles.saveSection}>
        <SectionTitle>Gün Sonu Save</SectionTitle>
        {existingSave ? (
          <Card style={{ gap: 14 }}>
            <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }}>Bugün için save alındı</Text>
            <View style={styles.statRow}>
              <View style={[styles.statBox, { backgroundColor: theme.success + '14', borderLeftColor: theme.success }]}>
                <Text style={[styles.statBoxLabel, { color: theme.success }]}>TAMAMLANAN</Text>
                <Text style={[styles.statBoxValue, { color: theme.success }]}>{existingSave.completedTasks}</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: theme.danger + '14', borderLeftColor: theme.danger }]}>
                <Text style={[styles.statBoxLabel, { color: theme.danger }]}>BAŞARISIZ</Text>
                <Text style={[styles.statBoxValue, { color: theme.danger }]}>{existingSave.failedTasks}</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: theme.textMuted + '14', borderLeftColor: theme.textMuted }]}>
                <Text style={[styles.statBoxLabel, { color: theme.textMuted }]}>ERTELENEN</Text>
                <Text style={[styles.statBoxValue, { color: theme.textMuted }]}>{existingSave.postponedTasks}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'center', marginVertical: 8 }}>
              <CircularProgress progress={existingSave.successRate} size={140} sublabel="DİSİPLİN" />
            </View>
            {existingSave.dailyNote ? (
              <Text style={{ color: theme.textMuted }}>{existingSave.dailyNote}</Text>
            ) : null}
            <Pressable onPress={handleAiComment} disabled={commenting} style={{ alignSelf: 'flex-start' }}>
              <View style={[styles.aiChip, { borderColor: theme.accent }]}>
                <Ionicons name="sparkles-outline" size={14} color={theme.accent} />
                <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '600' }}>
                  {commenting ? 'Yorum alınıyor...' : 'AI Yorumu Al'}
                </Text>
              </View>
            </Pressable>
            {aiComment && <Text style={{ color: theme.text, fontSize: 13 }}>{aiComment}</Text>}
          </Card>
        ) : (
          <>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Bugünkü performansını nasıl değerlendirirsin?"
              placeholderTextColor={theme.textMuted}
              multiline
              style={[styles.textarea, { borderColor: theme.border, color: theme.text }]}
            />
            <PrimaryButton label="Gün sonu save al" onPress={handleSaveDay} variant="success" />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowActions: {
    gap: 6,
    alignItems: 'flex-end',
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addButton: {
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  saveSection: {
    gap: 10,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    borderRadius: 8,
    borderLeftWidth: 3,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 4,
  },
  statBoxLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statBoxValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
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
});
