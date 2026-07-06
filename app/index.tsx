import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CircularProgress } from '../src/components/Charts';
import { Card, elevatedStyle } from '../src/components/ui';
import { pickDailyMotivation } from '../src/data/mockData';
import { supabase } from '../src/lib/supabase';
import { useAppStore } from '../src/store/AppStore';
import { useAppTheme } from '../src/theme/ThemeProvider';

export default function SplashScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { tasks, currentUser } = useAppStore();
  const [quote, setQuote] = useState(() => pickDailyMotivation().quote);

  useEffect(() => {
    // Hata olursa (offline dahil) başlangıç state'indeki mockData sözü
    // ekranda kalır — zaten istenen fallback davranışı bu.
    supabase
      .from('motivation_contents')
      .select('quote')
      .then(
        ({ data, error }) => {
          if (error || !data || data.length === 0) return;
          const random = data[Math.floor(Math.random() * data.length)];
          setQuote(random.quote);
        },
        (err) => console.error('[Rutin] motivasyon sözü alınamadı:', err)
      );
  }, []);

  const todayStr = new Date().toISOString().slice(0, 10);
  const myTodayTasks = tasks.filter((t) => t.assigneeIds.includes(currentUser.id) && t.dueDate === todayStr);
  const completed = myTodayTasks.filter((t) => t.status === 'completed').length;
  const progressPct = myTodayTasks.length ? Math.round((completed / myTodayTasks.length) * 100) : 0;

  const formattedDate = useMemo(
    () =>
      new Date().toLocaleDateString('tr-TR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
    []
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.top}>
            <Text style={[styles.brand, { color: theme.accent }]}>RUTİN</Text>
            <Text style={[styles.date, { color: theme.textMuted }]}>{formattedDate}</Text>
          </View>

          <Card style={styles.progressCard}>
            <CircularProgress progress={progressPct} sublabel="İLERLEME" />
            <Text style={[styles.progressCaption, { color: theme.text }]}>Bugünkü İlerleme</Text>
          </Card>

          <Card style={{ ...styles.quoteCard, backgroundColor: theme.accent + '14', borderColor: theme.accent }}>
            <Ionicons name="chatbox-ellipses-outline" size={28} color={theme.accent} />
            <Text style={[styles.quote, { color: theme.text }]}>&ldquo;{quote}&rdquo;</Text>
            <Pressable
              onPress={() => router.replace('/(tabs)/dashboard')}
              style={({ pressed }) => [styles.button, { backgroundColor: theme.accent }, elevatedStyle(pressed)]}
            >
              <Text style={[styles.buttonText, { color: theme.accentText }]}>Bugüne başla</Text>
            </Pressable>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    gap: 20,
    flexGrow: 1,
    justifyContent: 'center',
  },
  top: {
    gap: 4,
    marginBottom: 8,
  },
  brand: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 4,
  },
  date: {
    fontSize: 14,
    textTransform: 'capitalize',
  },
  progressCard: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 12,
  },
  progressCaption: {
    fontSize: 16,
    fontWeight: '700',
  },
  quoteCard: {
    gap: 14,
    borderLeftWidth: 4,
  },
  quote: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 30,
  },
  button: {
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 4,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
