import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, PrimaryButton, SectionTitle, SelectChip } from '../src/components/ui';
import { isSupabaseConfigured } from '../src/lib/supabase';
import { useAuth } from '../src/providers/AuthProvider';
import { useAppStore } from '../src/store/AppStore';
import { useAppTheme } from '../src/theme/ThemeProvider';

export default function ProfileScreen() {
  const { theme, mode, setMode } = useAppTheme();
  const { currentUser, workspace } = useAppStore();
  const { signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('[Rutin] çıkış yapılamadı:', err);
    }
    router.replace('/(auth)/sign-in');
  };

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Card style={{ gap: 4, marginBottom: 24 }}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>{currentUser.name}</Text>
        <Text style={{ color: theme.textMuted }}>{currentUser.email}</Text>
        <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }}>Workspace: {workspace.name}</Text>
      </Card>

      <SectionTitle>Görünüm</SectionTitle>
      <View style={styles.chipRow}>
        {(['system', 'dark', 'light'] as const).map((m) => {
          const label = m === 'system' ? 'Sistem' : m === 'dark' ? 'Karanlık' : 'Aydınlık';
          return <SelectChip key={m} label={label} active={mode === m} onPress={() => setMode(m)} />;
        })}
      </View>

      <View style={{ marginTop: 24 }}>
        <SectionTitle>Bağlantı Durumu</SectionTitle>
        <Card>
          <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 4 }}>
            {isSupabaseConfigured ? 'Supabase bağlı' : 'Mock veri modu'}
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>
            {isSupabaseConfigured
              ? 'Uygulama gerçek Supabase backend’ine bağlı.'
              : '.env dosyasına Supabase anahtarları eklenene kadar uygulama örnek (mock) veriyle çalışır.'}
          </Text>
        </Card>
      </View>

      <View style={{ marginTop: 24 }}>
        <SectionTitle>Bildirim Tercihleri</SectionTitle>
        <Card>
          <Text style={{ color: theme.textMuted, fontSize: 13 }}>
            Görev atama, son tarih, devir ve gün sonu save hatırlatmaları — MVP sonrası sürümde
            yapılandırılabilir hale gelecek.
          </Text>
        </Card>
      </View>

      <View style={{ marginTop: 32 }}>
        <PrimaryButton label="Çıkış Yap" variant="danger" onPress={handleSignOut} compact />
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
    gap: 8,
  },
});
