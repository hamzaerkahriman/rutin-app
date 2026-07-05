import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBackground } from '../src/components/AppBackground';
import { pickDailyMotivation } from '../src/data/mockData';
import { supabase } from '../src/lib/supabase';
import { useAppStore } from '../src/store/AppStore';
import { gradients, palette } from '../src/theme/colors';
import { pickRandomBackground } from '../src/theme/backgrounds';

export default function SplashScreen() {
  const router = useRouter();
  const { tasks, currentUser } = useAppStore();
  // useState(() => ...) ile lazy init: bileşen her mount olduğunda (yani her
  // "ana sayfadan çıkılıp" splash'e dönüldüğünde) yeni bir rastgele arka
  // plan ve söz seçilir.
  const [background] = useState(() => pickRandomBackground());
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
  const myTodayTasks = tasks.filter((t) => t.assignedTo === currentUser.id && t.dueDate === todayStr);
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
    <AppBackground background={background}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.top}>
          <Text style={styles.brand}>RUTİN</Text>
          <Text style={styles.date}>{formattedDate}</Text>
        </View>

        <View style={styles.middle}>
          <View style={styles.quoteDividerTop} />
          <Text style={styles.quote}>{quote}</Text>
          <View style={styles.quoteDivider} />
        </View>

        <BlurView intensity={40} tint="dark" style={styles.card}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Bugünkü ilerleme</Text>
            <Text style={styles.progressValue}>%{progressPct}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
          <Pressable onPress={() => router.replace('/(tabs)/dashboard')}>
            {({ pressed }) => (
              <LinearGradient
                colors={gradients.gold}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[styles.button, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={styles.buttonText}>Bugüne başla</Text>
              </LinearGradient>
            )}
          </Pressable>
        </BlurView>
      </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  top: {
    gap: 4,
  },
  brand: {
    color: '#F2F1ED',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 4,
  },
  date: {
    color: 'rgba(242,241,237,0.7)',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  middle: {
    flex: 1,
    justifyContent: 'center',
  },
  quoteDividerTop: {
    marginBottom: 20,
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(242,241,237,0.4)',
  },
  quote: {
    color: '#F2F1ED',
    fontSize: 27,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: 0.2,
  },
  quoteDivider: {
    marginTop: 24,
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: palette.gold,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    gap: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: 'rgba(242,241,237,0.75)',
    fontSize: 14,
  },
  progressValue: {
    color: '#F2F1ED',
    fontSize: 14,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 999,
    backgroundColor: palette.emerald,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: palette.sapphire,
    fontSize: 15,
    fontWeight: '700',
  },
});
