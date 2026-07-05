import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { HorizontalBarRow, TrendBarChart } from '../../src/components/Charts';
import { Card, SectionTitle } from '../../src/components/ui';
import { useAppStore } from '../../src/store/AppStore';
import { useAppTheme } from '../../src/theme/ThemeProvider';

function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} dakika`;
  if (hours < 24) return `${hours.toFixed(1)} saat`;
  return `${(hours / 24).toFixed(1)} gün`;
}

export default function ReportsScreen() {
  const { theme } = useAppTheme();
  const { dailySaves, tasks, currentUser, members, handoffs, getUser } = useAppStore();

  const myDailySaves = dailySaves.filter((s) => s.userId === currentUser.id);
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonth = todayStr.slice(0, 7);

  const weeklyAvg = useMemo(() => {
    if (myDailySaves.length === 0) return 0;
    const last7 = myDailySaves.slice(0, 7);
    return Math.round(last7.reduce((sum, s) => sum + s.successRate, 0) / last7.length);
  }, [myDailySaves]);

  const monthlyAvg = useMemo(() => {
    const thisMonth = myDailySaves.filter((s) => s.date.startsWith(currentMonth));
    if (thisMonth.length === 0) return 0;
    return Math.round(thisMonth.reduce((sum, s) => sum + s.successRate, 0) / thisMonth.length);
  }, [myDailySaves, currentMonth]);

  const avgCompletionTime = useMemo(() => {
    const completed = tasks.filter((t) => t.status === 'completed');
    if (completed.length === 0) return null;
    const totalHours = completed.reduce((sum, t) => {
      const ms = new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime();
      return sum + ms / (1000 * 60 * 60);
    }, 0);
    return totalHours / completed.length;
  }, [tasks]);

  const categoryStats = useMemo(() => {
    const byCategory: Record<string, { total: number; completed: number; postponed: number }> = {};
    tasks.forEach((t) => {
      const cat = t.category ?? 'Diğer';
      byCategory[cat] ??= { total: 0, completed: 0, postponed: 0 };
      byCategory[cat].total += 1;
      if (t.status === 'completed') byCategory[cat].completed += 1;
      if (t.status === 'postponed') byCategory[cat].postponed += 1;
    });
    return Object.entries(byCategory).sort((a, b) => b[1].total - a[1].total);
  }, [tasks]);

  const mostPostponedCategory = useMemo(() => {
    const sorted = [...categoryStats].sort((a, b) => b[1].postponed - a[1].postponed);
    return sorted[0]?.[1].postponed > 0 ? sorted[0] : null;
  }, [categoryStats]);

  const mostCompletedCategory = useMemo(() => {
    const sorted = [...categoryStats].sort((a, b) => b[1].completed - a[1].completed);
    return sorted[0]?.[1].completed > 0 ? sorted[0] : null;
  }, [categoryStats]);

  const last7Days = useMemo(() => {
    const days: { label: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const save = myDailySaves.find((s) => s.date === dateStr);
      const label = d.toLocaleDateString('tr-TR', { weekday: 'short' }).replace('.', '');
      days.push({ label, value: save?.successRate ?? 0 });
    }
    return days;
  }, [myDailySaves]);

  const failedTasks = tasks.filter((t) => t.status === 'failed');

  const teamCompletion = useMemo(() => {
    const assigned = tasks.filter((t) => t.assignedTo);
    const completed = assigned.filter((t) => t.status === 'completed').length;
    return { completed, total: assigned.length };
  }, [tasks]);
  const teamSuccessRate =
    teamCompletion.total > 0 ? Math.round((teamCompletion.completed / teamCompletion.total) * 100) : 0;

  const teamEfficiencyScore = useMemo(() => {
    const assigned = tasks.filter((t) => t.assignedTo);
    if (assigned.length === 0) return 0;
    const completed = assigned.filter((t) => t.status === 'completed').length;
    const failed = assigned.filter((t) => t.status === 'failed').length;
    return Math.round(((completed - failed) / assigned.length) * 100);
  }, [tasks]);

  const handoffLeaders = useMemo(() => {
    const fromCounts: Record<string, number> = {};
    const toCounts: Record<string, number> = {};
    handoffs.forEach((h) => {
      fromCounts[h.fromUserId] = (fromCounts[h.fromUserId] ?? 0) + 1;
      toCounts[h.toUserId] = (toCounts[h.toUserId] ?? 0) + 1;
    });
    const topFrom = Object.entries(fromCounts).sort((a, b) => b[1] - a[1])[0];
    const topTo = Object.entries(toCounts).sort((a, b) => b[1] - a[1])[0];
    return {
      topSender: topFrom ? { user: getUser(topFrom[0]), count: topFrom[1] } : null,
      topReceiver: topTo ? { user: getUser(topTo[0]), count: topTo[1] } : null,
    };
  }, [handoffs, getUser]);

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <SectionTitle>Bireysel Analiz</SectionTitle>
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: theme.success }]}>
            %{myDailySaves[0]?.successRate ?? 0}
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>Son günlük başarı</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: theme.accent }]}>%{weeklyAvg}</Text>
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>Haftalık ortalama</Text>
        </Card>
      </View>
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: theme.purple }]}>%{monthlyAvg}</Text>
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>Aylık ortalama</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: theme.warning, fontSize: 16 }]}>
            {avgCompletionTime !== null ? formatDuration(avgCompletionTime) : '—'}
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>Ort. tamamlama süresi</Text>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle>7 Günlük Başarı Trendi</SectionTitle>
        <Card>
          <TrendBarChart data={last7Days} />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle>Kategoriye Göre Görevler</SectionTitle>
        {mostCompletedCategory && (
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>
            En çok tamamlanan kategori: <Text style={{ color: theme.success, fontWeight: '700' }}>{mostCompletedCategory[0]}</Text>
          </Text>
        )}
        {mostPostponedCategory && (
          <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 4 }}>
            En çok ertelenen kategori: <Text style={{ color: theme.warning, fontWeight: '700' }}>{mostPostponedCategory[0]}</Text>
          </Text>
        )}
        {categoryStats.length === 0 ? (
          <Text style={{ color: theme.textMuted, marginTop: 6 }}>Henüz görev yok.</Text>
        ) : (
          <Card style={{ gap: 14, marginTop: 6 }}>
            {categoryStats.map(([category, stat]) => (
              <HorizontalBarRow
                key={category}
                label={category}
                completed={stat.completed}
                total={stat.total}
                rightLabel={`${stat.completed}/${stat.total} · ${stat.postponed} ertelendi`}
              />
            ))}
          </Card>
        )}
      </View>

      <View style={styles.section}>
        <SectionTitle>Başarısız Görev Nedenleri</SectionTitle>
        {failedTasks.length === 0 ? (
          <Text style={{ color: theme.textMuted }}>Başarısız görev yok — böyle devam.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {failedTasks.map((t) => (
              <Card key={t.id}>
                <Text style={{ color: theme.text, fontWeight: '600' }}>{t.title}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>Son tarih: {t.dueDate}</Text>
              </Card>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <SectionTitle>Ekip Raporu</SectionTitle>
        <Card style={{ gap: 14, marginBottom: 10 }}>
          <HorizontalBarRow
            label="Ekip genel başarı oranı"
            completed={teamCompletion.completed}
            total={teamCompletion.total}
            rightLabel={`%${teamSuccessRate}`}
          />
          <Text style={{ color: theme.text }}>
            Takım verimlilik skoru: <Text style={{ fontWeight: '800', color: theme.accent }}>%{teamEfficiencyScore}</Text>
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>{members.length} üye üzerinden hesaplandı</Text>
        </Card>
        {(handoffLeaders.topSender || handoffLeaders.topReceiver) && (
          <Card style={{ gap: 6 }}>
            {handoffLeaders.topSender && (
              <Text style={{ color: theme.text, fontSize: 13 }}>
                En çok görev devreden: <Text style={{ fontWeight: '700' }}>{handoffLeaders.topSender.user?.name ?? '?'}</Text>{' '}
                ({handoffLeaders.topSender.count})
              </Text>
            )}
            {handoffLeaders.topReceiver && (
              <Text style={{ color: theme.text, fontSize: 13 }}>
                En çok görev devralan: <Text style={{ fontWeight: '700' }}>{handoffLeaders.topReceiver.user?.name ?? '?'}</Text>{' '}
                ({handoffLeaders.topReceiver.count})
              </Text>
            )}
          </Card>
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
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 18,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  section: {
    marginTop: 20,
    gap: 4,
  },
});
