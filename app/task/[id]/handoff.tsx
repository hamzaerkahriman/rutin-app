import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { EmptyState, PrimaryButton, SectionTitle, SelectChip } from '../../../src/components/ui';
import { getAiHandoffDraft } from '../../../src/lib/aiAssist';
import { useAppStore } from '../../../src/store/AppStore';
import { useAppTheme } from '../../../src/theme/ThemeProvider';
import { TASK_STATUS_LABELS } from '../../../src/types';

export default function HandoffScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useAppTheme();
  const router = useRouter();
  const { getTask, members, currentUser, handoffTask } = useAppStore();

  const task = getTask(id);

  const [toUserId, setToUserId] = useState<string | null>(null);
  const [doneSoFar, setDoneSoFar] = useState('');
  const [remainingWork, setRemainingWork] = useState('');
  const [cautionNotes, setCautionNotes] = useState('');
  const [draftingAi, setDraftingAi] = useState(false);

  if (!task) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <EmptyState message="Görev bulunamadı." />
      </View>
    );
  }

  const candidates = members.filter((m) => m.userId !== currentUser.id);

  const [submitting, setSubmitting] = useState(false);
  const canSubmit =
    Boolean(toUserId) && doneSoFar.trim().length > 0 && remainingWork.trim().length > 0 && !submitting;

  const handleAiDraft = async () => {
    setDraftingAi(true);
    try {
      const draft = await getAiHandoffDraft(task.id);
      setDoneSoFar(draft.doneSoFar);
      setRemainingWork(draft.remainingWork);
      if (draft.cautionNotes) setCautionNotes(draft.cautionNotes);
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'AI taslağı oluşturulamadı');
    } finally {
      setDraftingAi(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || !toUserId) return;
    setSubmitting(true);
    try {
      await handoffTask({
        taskId: task.id,
        toUserId,
        doneSoFar: doneSoFar.trim(),
        remainingWork: remainingWork.trim(),
        cautionNotes: cautionNotes.trim() || undefined,
      });
      Alert.alert('Devir talebi gönderildi', 'Karşı taraf kabul edince görev ona geçecek.');
      router.replace(`/task/${task.id}`);
    } catch (err) {
      setSubmitting(false);
      Alert.alert('Hata', err instanceof Error ? err.message : 'Görev devredilemedi');
    }
  };

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Text style={{ color: theme.textMuted, marginBottom: 16 }}>
        "{task.title}" görevini devret. Bir sonraki kişinin kaldığı yerden anlayarak devam etmesi için
        aşağıdaki alanları eksiksiz doldur.
      </Text>

      <SectionTitle>Devredilecek Kişi *</SectionTitle>
      {candidates.length === 0 && (
        <Text style={{ color: theme.textMuted, marginBottom: 16 }}>
          Bu workspace'te devredebileceğin başka bir üye yok — önce Ekip ekranından birini davet et.
        </Text>
      )}
      <View style={styles.chipRow}>
        {candidates.map((m) => (
          <SelectChip key={m.userId} label={m.user.name} active={toUserId === m.userId} onPress={() => setToUserId(m.userId)} />
        ))}
      </View>

      <SectionTitle>Görevin Mevcut Durumu</SectionTitle>
      <View style={[styles.readonlyBox, { borderColor: theme.border }]}>
        <Text style={{ color: theme.textMuted }}>{TASK_STATUS_LABELS[task.status]}</Text>
      </View>

      <Pressable onPress={handleAiDraft} disabled={draftingAi} style={{ alignSelf: 'flex-start', marginBottom: 16 }}>
        <View style={[styles.aiChip, { borderColor: theme.accent }]}>
          <Ionicons name="sparkles-outline" size={14} color={theme.accent} />
          <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '600' }}>
            {draftingAi ? 'Taslak oluşturuluyor...' : 'AI ile taslak oluştur'}
          </Text>
        </View>
      </Pressable>

      <SectionTitle>Şu Ana Kadar Yapılanlar *</SectionTitle>
      <TextInput
        value={doneSoFar}
        onChangeText={setDoneSoFar}
        placeholder="Bu göreve dair şu ana kadar tamamlanan işleri yaz..."
        placeholderTextColor={theme.textMuted}
        multiline
        style={[styles.textarea, { borderColor: theme.border, color: theme.text }]}
      />

      <SectionTitle>Kalan İşler *</SectionTitle>
      <TextInput
        value={remainingWork}
        onChangeText={setRemainingWork}
        placeholder="Devralan kişinin yapması gerekenler..."
        placeholderTextColor={theme.textMuted}
        multiline
        style={[styles.textarea, { borderColor: theme.border, color: theme.text }]}
      />

      <SectionTitle>Dikkat Edilmesi Gerekenler</SectionTitle>
      <TextInput
        value={cautionNotes}
        onChangeText={setCautionNotes}
        placeholder="Özel notlar, riskler, tuzaklar..."
        placeholderTextColor={theme.textMuted}
        multiline
        style={[styles.textarea, { borderColor: theme.border, color: theme.text }]}
      />

      <View style={{ marginTop: 16 }}>
        <PrimaryButton
          label={submitting ? 'Devrediliyor...' : 'Görevi Devret'}
          onPress={handleSubmit}
          disabled={!canSubmit}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 60,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  readonlyBox: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 16,
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
