import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store/appStore';
import { Card } from '../../components/Card';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { SwitchRow } from '../../components/SwitchRow';
import { StatBadge } from '../../components/StatBadge';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

export const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const {
    theme,
    blockingConfig,
    toggleYouTubeShorts,
    toggleDynamicIslandCounter,
    toggleInstagramReels,
    statistics,
    focusSession,
    permissions,
  } = useAppStore();

  const needsPermissionSetup =
    !permissions?.accessibilityGranted || !permissions?.usageStatsGranted;

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
      {/* Header */}
      <Header
        title="Reclaim"
        subtitle="Mindful screen time & distraction blocker"
        onActionPress={() => navigation.navigate('Permissions')}
        actionLabel={needsPermissionSetup ? 'Permissions' : undefined}
      />

      {/* Permission Setup Alert if required */}
      {needsPermissionSetup ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Permissions')}>
          <Card
            style={[
              styles.alertCard,
              {
                backgroundColor: theme.warning + '18',
                borderColor: theme.warning,
              },
            ]}>
            <View style={styles.alertContent}>
              <Text style={styles.alertIcon}>⚠️</Text>
              <View style={styles.alertTextWrap}>
                <Text
                  style={[typography.bodyBold, { color: theme.textPrimary }]}>
                  Accessibility Service Required
                </Text>
                <Text
                  style={[
                    typography.caption,
                    { color: theme.textSecondary, marginTop: 2 },
                  ]}>
                  Tap to grant permissions so Reclaim can detect YouTube Shorts
                  without blocking regular videos.
                </Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      ) : null}

      {/* Screen Time & Distraction Overview */}
      <View style={styles.statsRow}>
        <StatBadge
          label="TODAY'S SCREEN TIME"
          value={`${Math.floor(statistics.todayScreenTimeMinutes / 60)}h ${
            statistics.todayScreenTimeMinutes % 60
          }m`}
          sublabel="device usage"
        />
        <StatBadge
          label="SHORTS BLOCKED"
          value={statistics.shortsBlocksCount}
          sublabel="habits intercepted"
          accentColor={theme.danger}
        />
      </View>

      {/* Dynamic Island / Aqua Dynamics Feature Highlight Card */}
      <Card elevated style={styles.islandCard}>
        <View style={styles.islandHeader}>
          <View style={styles.islandPill}>
            <Text style={styles.islandPillDot}>●</Text>
            <Text style={styles.islandPillText}>DYNAMIC ISLAND AWARENESS</Text>
          </View>
          <Text
            style={[
              typography.captionBold,
              { color: theme.islandAccent, letterSpacing: 0.5 },
            ]}>
            OXYGENOS / COLOROS
          </Text>
        </View>

        <Text
          style={[
            typography.body,
            { color: theme.textSecondary, marginTop: spacing.sm },
          ]}>
          When Shorts or Reels are temporarily unblocked, Reclaim displays a live
          counter inside your phone&apos;s Dynamic Island / punch-hole capsule to keep
          you consciously mindful of every short video scrolled.
        </Text>

        <View style={styles.counterRow}>
          <View style={styles.counterMetric}>
            <Text
              style={[typography.caption, { color: theme.textSecondary }]}>
              Scrolled While Unblocked
            </Text>
            <Text
              style={[typography.h2, { color: theme.warning, marginTop: 2 }]}>
              ⚡ {statistics.unblockedShortsScrolledCount} Shorts
            </Text>
          </View>
          <SwitchRow
            title="Live Island Counter"
            value={blockingConfig.dynamicIslandLiveCounterEnabled}
            onValueChange={toggleDynamicIslandCounter}
            badge="LIVE"
            badgeColor={theme.islandAccent}
          />
        </View>
      </Card>

      {/* Content-Level Blocking Rules */}
      <Card>
        <Text style={[typography.h3, { color: theme.textPrimary }]}>
          Content-Level Blocking
        </Text>
        <Text
          style={[
            typography.caption,
            { color: theme.textSecondary, marginBottom: spacing.sm },
          ]}>
          Blocks short-form loops while preserving regular videos, search & feeds.
        </Text>

        {/* Core Feature: YouTube Shorts */}
        <SwitchRow
          title="YouTube Shorts"
          subtitle="Block Shorts player while allowing regular YouTube videos & search"
          value={blockingConfig.youtubeShortsBlocked}
          onValueChange={toggleYouTubeShorts}
          icon="▶️"
          badge="PRIORITY"
          badgeColor={theme.danger}
        />

        <View style={[styles.divider, { backgroundColor: theme.surfaceBorder }]} />

        {/* Instagram Reels */}
        <SwitchRow
          title="Instagram Reels"
          subtitle="Block Reels viewer while keeping messaging and posts"
          value={blockingConfig.instagramReelsBlocked}
          onValueChange={toggleInstagramReels}
          icon="📸"
        />
      </Card>

      {/* Active Focus Session or Quick Start */}
      <Card elevated>
        <View style={styles.focusHeader}>
          <View>
            <Text style={[typography.h3, { color: theme.textPrimary }]}>
              {focusSession.isActive ? 'Active Focus Session' : 'Focus Mode'}
            </Text>
            <Text style={[typography.caption, { color: theme.textSecondary }]}>
              {focusSession.isActive
                ? `${Math.floor(focusSession.remainingSeconds / 60)} minutes remaining`
                : 'Lock distracting short-form content'}
            </Text>
          </View>
          {focusSession.isActive ? (
            <View
              style={[
                styles.liveBadge,
                { backgroundColor: theme.accent + '22', borderColor: theme.accent },
              ]}>
              <Text style={[typography.badge, { color: theme.accent }]}>
                IN PROGRESS
              </Text>
            </View>
          ) : null}
        </View>

        <Button
          title={
            focusSession.isActive
              ? 'View Active Session'
              : 'Start 25m Focus Session'
          }
          onPress={() => navigation.navigate('Focus')}
          variant={focusSession.isActive ? 'outline' : 'primary'}
          style={{ marginTop: spacing.md }}
        />
      </Card>
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
  alertCard: {
    marginBottom: spacing.md,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  alertTextWrap: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  islandCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#38BDF8',
  },
  islandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  islandPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  islandPillDot: {
    color: '#38BDF8',
    fontSize: 10,
    marginRight: 6,
  },
  islandPillText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  counterRow: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#272E3D',
  },
  counterMetric: {
    marginBottom: spacing.xs,
  },
  divider: {
    height: 1,
    marginVertical: spacing.xs,
  },
  focusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
});

