import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { PrimaryButton, SectionTitle } from '../../src/components/ui';
import { useAppStore } from '../../src/store/AppStore';
import { useAppTheme } from '../../src/theme/ThemeProvider';
import { TASK_PRIORITY_LABELS, TaskPriority } from '../../src/types';

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'critical'];

export default function CreateTaskScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { createTask, members, currentUser } = useAppStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [assignedTo, setAssignedTo] = useState(currentUser.id);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const myRole = members.find((m) => m.userId === currentUser.id)?.role;
  const isViewer = myRole === 'viewer';

  const [submitting, setSubmitting] = useState(false);
  const canSubmit = title.trim().length > 0 && !submitting && !isViewer;

  const handleAddTag = () => {
    const value = tagInput.trim();
    if (!value || tags.includes(value)) {
      setTagInput('');
      return;
    }
    setTags((prev) => [...prev, value]);
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const task = await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        priority,
        dueDate,
        assignedTo,
        tags,
        progressMode: 'manual',
      });
      router.replace(`/task/${task.id}`);
    } catch (err) {
      setSubmitting(false);
      Alert.alert('Hata', err instanceof Error ? err.message : 'Görev oluşturulamadı');
    }
  };

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      {isViewer && (
        <View style={[styles.viewerNotice, { backgroundColor: theme.danger + '14', borderColor: theme.danger }]}>
          <Text style={{ color: theme.danger, fontSize: 13 }}>
            Viewer rolündeki üyeler görev oluşturamaz — bu formu sadece görüntüleyebilirsin.
          </Text>
        </View>
      )}
      <SectionTitle>Başlık *</SectionTitle>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Görev başlığı"
        placeholderTextColor={theme.textMuted}
        style={[styles.input, { borderColor: theme.border, color: theme.text }]}
      />

      <SectionTitle>Açıklama</SectionTitle>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Görev detayları..."
        placeholderTextColor={theme.textMuted}
        multiline
        style={[styles.textarea, { borderColor: theme.border, color: theme.text }]}
      />

      <SectionTitle>Kategori</SectionTitle>
      <TextInput
        value={category}
        onChangeText={setCategory}
        placeholder="ör. design, backend, içerik..."
        placeholderTextColor={theme.textMuted}
        style={[styles.input, { borderColor: theme.border, color: theme.text }]}
      />

      <SectionTitle>Öncelik</SectionTitle>
      <View style={styles.chipRow}>
        {PRIORITIES.map((p) => {
          const active = priority === p;
          return (
            <Pressable
              key={p}
              onPress={() => setPriority(p)}
              style={[
                styles.chip,
                { backgroundColor: active ? theme.accent : theme.card, borderColor: active ? theme.accent : theme.border },
              ]}
            >
              <Text style={{ color: active ? theme.accentText : theme.text, fontWeight: '600', fontSize: 13 }}>
                {TASK_PRIORITY_LABELS[p]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SectionTitle>Etiketler</SectionTitle>
      <View style={styles.tagInputRow}>
        <TextInput
          value={tagInput}
          onChangeText={setTagInput}
          onSubmitEditing={handleAddTag}
          placeholder="Etiket ekle ve Enter'a bas"
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { flex: 1, marginBottom: 0, borderColor: theme.border, color: theme.text }]}
        />
        <Pressable onPress={handleAddTag} style={[styles.addTagButton, { backgroundColor: theme.accent }]}>
          <Text style={{ color: theme.accentText, fontWeight: '700' }}>Ekle</Text>
        </Pressable>
      </View>
      {tags.length > 0 && (
        <View style={styles.chipRow}>
          {tags.map((tag) => (
            <Pressable key={tag} onPress={() => handleRemoveTag(tag)} style={[styles.chip, { backgroundColor: theme.accentLight, borderColor: theme.accent }]}>
              <Text style={{ color: theme.accent, fontWeight: '600', fontSize: 13 }}>{tag} ✕</Text>
            </Pressable>
          ))}
        </View>
      )}

      <SectionTitle>Son Tarih</SectionTitle>
      <TextInput
        value={dueDate}
        onChangeText={setDueDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={theme.textMuted}
        style={[styles.input, { borderColor: theme.border, color: theme.text }]}
      />

      <SectionTitle>Atanan Kişi</SectionTitle>
      <View style={styles.chipRow}>
        {members.map((m) => {
          const active = assignedTo === m.userId;
          return (
            <Pressable
              key={m.userId}
              testID={`create-assignee-${m.userId}`}
              onPress={() => setAssignedTo(m.userId)}
              style={[
                styles.chip,
                { backgroundColor: active ? theme.accent : theme.card, borderColor: active ? theme.accent : theme.border },
              ]}
            >
              <Text style={{ color: active ? theme.accentText : theme.text, fontWeight: '600', fontSize: 13 }}>
                {m.user.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ marginTop: 24 }}>
        <PrimaryButton
          label={submitting ? 'Oluşturuluyor...' : 'Görevi Oluştur'}
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
    gap: 4,
  },
  input: {
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
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tagInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  viewerNotice: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  addTagButton: {
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
