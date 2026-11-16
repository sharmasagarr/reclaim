import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/appStore';
import { Card } from '../../components/Card';
import { Header } from '../../components/Header';
import { StatBadge } from '../../components/StatBadge';
import { Button } from '../../components/Button';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

export const StatisticsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { theme, statistics, refreshStatistics } = useAppStore();

  const formatHoursMinutes = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 90,
        },
      ]}
      showsVerticalScrollIndicator={false}>
      <Header
        title="Statistics"
        subtitle="Real screen-time & distraction trends"
        onActionPress={refreshStatistics}
        actionLabel="Refresh"
      />

      {/* Primary Metrics Grid */}
      <View style={styles.metricsRow}>
        <StatBadge
          label="TOTAL SCREEN TIME"
          value={formatHoursMinutes(statistics.todayScreenTimeMinutes)}
          sublabel="device total today"
        />
        <StatBadge
          label="DISTRACTING APPS"
          value={formatHoursMinutes(statistics.distractingTimeMinutes)}
          sublabel="social & video feeds"
          accentColor={theme.warning}
        />
      </View>

      <View style={styles.metricsRow}>
        <StatBadge
          label="SHORTS INTERCEPTED"
          value={statistics.shortsBlocksCount}
          sublabel="Shorts loops stopped"
          accentColor={theme.danger}
        />
        <StatBadge
          label="FOCUS TIME"
          value={`${statistics.totalFocusMinutes}m`}
          sublabel={`${statistics.focusSessionsCompleted} sessions done`}
          accentColor={theme.accent}
        />
      </View>

      {/* Dynamic Island Scroll Tracking Metric */}
      <Card elevated style={styles.islandMetricCard}>
        <View style={styles.islandRow}>
          <View style={styles.islandIconBadge}>
            <Text style={styles.islandIcon}>⚡</Text>
          </View>
          <View style={styles.islandTextContainer}>
            <Text style={[typography.bodyBold, { color: theme.textPrimary }]}>
              Unblocked Shorts Counter
            </Text>
            <Text
              style={[
                typography.caption,
                { color: theme.textSecondary, marginTop: 2 },
              ]}>
              Streamed live to your phone&apos;s Dynamic Island / Live Alert pill
            </Text>
          </View>
          <View style={styles.islandCounterBadge}>
            <Text
              style={[typography.h2, { color: theme.islandAccent, fontWeight: '700' }]}>
              {statistics.unblockedShortsScrolledCount}
            </Text>
            <Text style={[typography.badge, { color: theme.textSecondary }]}>
              SCROLLED
            </Text>
          </View>
        </View>
      </Card>

      {/* Weekly Distraction Trends */}
      <Card>
        <Text style={[typography.h3, { color: theme.textPrimary }]}>
          Daily Habits Breakdown
        </Text>
        <Text
          style={[
            typography.caption,
            { color: theme.textSecondary, marginBottom: spacing.md },
          ]}>
          Time saved from infinite scrolling feeds this week:
        </Text>

        <View style={styles.barChartContainer}>
          {[
            { day: 'Mon', mins: 45 },
            { day: 'Tue', mins: 30 },
            { day: 'Wed', mins: 55 },
            { day: 'Thu', mins: 20 },
            { day: 'Fri', mins: 35 },
            { day: 'Sat', mins: 15 },
            { day: 'Today', mins: statistics.distractingTimeMinutes },
          ].map(item => {
            const heightPercent = Math.min(100, (item.mins / 90) * 100);
            return (
              <View key={item.day} style={styles.barColumn}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${heightPercent}%`,
                        backgroundColor:
                          item.day === 'Today'
                            ? theme.primaryLight
                            : theme.surfaceBorder,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    typography.caption,
                    {
                      color:
                        item.day === 'Today'
                          ? theme.primaryLight
                          : theme.textSecondary,
                      marginTop: 4,
                      fontSize: 11,
                    },
                  ]}>
                  {item.day}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      <Button
        title="Sync Device Usage Stats"
        onPress={refreshStatistics}
        variant="secondary"
        style={{ marginTop: spacing.md }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  islandMetricCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#38BDF8',
    marginVertical: spacing.sm,
  },
  islandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  islandIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#38BDF822',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  islandIcon: {
    fontSize: 18,
  },
  islandTextContainer: {
    flex: 1,
  },
  islandCounterBadge: {
    alignItems: 'center',
  },
  barChartContainer: {
    flexDirection: 'row',
    height: 140,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 14,
    height: 100,
    backgroundColor: '#1E232F',
    borderRadius: borderRadius.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: borderRadius.sm,
  },
});

