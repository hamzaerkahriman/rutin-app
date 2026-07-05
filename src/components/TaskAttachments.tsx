import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
  requestRecordingPermissionsAsync,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppStore } from '../store/AppStore';
import { useAppTheme } from '../theme/ThemeProvider';
import { TaskAttachment } from '../types';
import { Card, elevatedCircleStyle, SectionTitle } from './ui';

function formatDuration(seconds?: number): string {
  if (!seconds || Number.isNaN(seconds)) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function VoicePlayerButton({ url }: { url: string }) {
  const { theme } = useAppTheme();
  const player = useAudioPlayer(url);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    if (playing) {
      player.pause();
      setPlaying(false);
    } else {
      player.seekTo(0);
      player.play();
      setPlaying(true);
    }
  };

  return (
    <Pressable
      onPress={toggle}
      hitSlop={8}
      style={({ pressed }) => [styles.playBtn, { backgroundColor: theme.accent }, elevatedCircleStyle(pressed)]}
    >
      <Ionicons name={playing ? 'pause' : 'play'} size={14} color={theme.accentText} />
    </Pressable>
  );
}

function AttachmentRow({ attachment, canDelete }: { attachment: TaskAttachment; canDelete: boolean }) {
  const { theme } = useAppTheme();
  const { getAttachmentUrl, getUser, deleteAttachment } = useAppStore();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAttachmentUrl(attachment.storagePath)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [attachment.storagePath, getAttachmentUrl]);

  const uploader = getUser(attachment.uploadedBy);

  const handleDelete = () => {
    const message = `"${attachment.fileName}" silinsin mi?`;
    const doDelete = () => deleteAttachment(attachment.id).catch((err) => Alert.alert('Hata', err.message));

    // Alert.alert'in çok butonlu (onay/vazgeç) hâli react-native-web'de hiçbir
    // şey yapmıyor (dialog hiç açılmıyor) — web'de window.confirm'e düşüyoruz.
    if (Platform.OS === 'web') {
      if (window.confirm(message)) doDelete();
      return;
    }
    Alert.alert('Eki sil', message, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: doDelete },
    ]);
  };

  return (
    <Card style={styles.row}>
      {attachment.kind === 'image' && url ? (
        <Pressable onPress={() => Linking.openURL(url)}>
          <Image source={{ uri: url }} style={styles.thumb} contentFit="cover" />
        </Pressable>
      ) : attachment.kind === 'voice' && url ? (
        <VoicePlayerButton url={url} />
      ) : (
        <View style={[styles.fileIcon, { backgroundColor: theme.accent + '22' }]}>
          <Ionicons name="document-outline" size={18} color={theme.accent} />
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.text, fontWeight: '600', fontSize: 13 }} numberOfLines={1}>
          {attachment.kind === 'voice' ? `Sesli not ${formatDuration(attachment.durationSeconds)}` : attachment.fileName}
        </Text>
        <Text style={{ color: theme.textMuted, fontSize: 11 }}>
          {uploader?.name ?? '?'} · {formatSize(attachment.sizeBytes)}
        </Text>
      </View>

      {attachment.kind === 'file' && url && (
        <Pressable onPress={() => Linking.openURL(url)} hitSlop={8} style={{ padding: 4 }}>
          <Ionicons name="open-outline" size={18} color={theme.accent} />
        </Pressable>
      )}
      {canDelete && (
        <Pressable testID={`delete-attachment-${attachment.id}`} onPress={handleDelete} hitSlop={8} style={{ padding: 4 }}>
          <Ionicons name="trash-outline" size={18} color={theme.danger} />
        </Pressable>
      )}
    </Card>
  );
}

export function TaskAttachmentsSection({ taskId }: { taskId: string }) {
  const { theme } = useAppTheme();
  const { getTaskAttachments, uploadAttachment } = useAppStore();
  const attachments = getTaskAttachments(taskId);
  const [uploading, setUploading] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const handlePickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('İzin gerekli', 'Fotoğraf eklemek için galeri izni vermelisin.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      await uploadAttachment(taskId, {
        uri: asset.uri,
        name: asset.fileName ?? `foto-${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? 'image/jpeg',
        kind: 'image',
      });
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Fotoğraf yüklenemedi');
    } finally {
      setUploading(false);
    }
  };

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      await uploadAttachment(taskId, {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? 'application/octet-stream',
        kind: 'file',
      });
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Dosya yüklenemedi');
    } finally {
      setUploading(false);
    }
  };

  const handleToggleRecording = async () => {
    if (recorderState.isRecording) {
      await recorder.stop();
      const durationSeconds = recorderState.durationMillis ? recorderState.durationMillis / 1000 : undefined;
      if (recorder.uri) {
        setUploading(true);
        try {
          await uploadAttachment(taskId, {
            uri: recorder.uri,
            name: `sesli-not-${Date.now()}.m4a`,
            mimeType: 'audio/m4a',
            kind: 'voice',
            durationSeconds,
          });
        } catch (err) {
          Alert.alert('Hata', err instanceof Error ? err.message : 'Sesli not yüklenemedi');
        } finally {
          setUploading(false);
        }
      }
      return;
    }

    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('İzin gerekli', 'Sesli not kaydetmek için mikrofon izni vermelisin.');
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  return (
    <View style={styles.section}>
      <SectionTitle>Ekler</SectionTitle>
      <View style={{ gap: 8 }}>
        {attachments.length === 0 ? (
          <Text style={{ color: theme.textMuted }}>Henüz ek yok.</Text>
        ) : (
          attachments.map((a) => <AttachmentRow key={a.id} attachment={a} canDelete />)
        )}
      </View>

      {uploading && <ActivityIndicator color={theme.accent} style={{ marginTop: 8 }} />}

      <View style={styles.actionsRow}>
        <Pressable onPress={handlePickImage} disabled={uploading} style={[styles.actionBtn, { borderColor: theme.border }]}>
          <Ionicons name="image-outline" size={16} color={theme.accent} />
          <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600' }}>Fotoğraf</Text>
        </Pressable>
        <Pressable onPress={handlePickFile} disabled={uploading} style={[styles.actionBtn, { borderColor: theme.border }]}>
          <Ionicons name="document-attach-outline" size={16} color={theme.accent} />
          <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600' }}>Dosya</Text>
        </Pressable>
        <Pressable
          testID="voice-record-toggle"
          onPress={handleToggleRecording}
          disabled={uploading}
          style={[
            styles.actionBtn,
            { borderColor: recorderState.isRecording ? theme.danger : theme.border },
          ]}
        >
          <Ionicons
            name={recorderState.isRecording ? 'stop-circle-outline' : 'mic-outline'}
            size={16}
            color={recorderState.isRecording ? theme.danger : theme.accent}
          />
          <Text style={{ color: recorderState.isRecording ? theme.danger : theme.text, fontSize: 12, fontWeight: '600' }}>
            {recorderState.isRecording ? `Durdur ${formatDuration((recorderState.durationMillis ?? 0) / 1000)}` : 'Sesli Not'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  fileIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
