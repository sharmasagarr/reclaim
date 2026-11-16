import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AppText from '../../components/AppText';

const Text = AppText;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import PagerView from 'react-native-pager-view';
import LinearGradient from 'react-native-linear-gradient';
import { useAppStore } from '../../store/appStore';
import { FocusModeType, InstalledApp } from '../../types';
import { SelectAppsToBlockModal } from '../../components/SelectAppsToBlockModal';
import { ReclaimNative } from '../../bridge/ReclaimNative';

export const FocusScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {
    theme,
    focusSession,
    startFocusSession,
    pauseFocusSession,
    resumeFocusSession,
    stopFocusSession,
    statistics,
    blockingConfig,
  } = useAppStore();

  // Bottom Sheet Configuration State
  const bottomSheetRef = useRef<BottomSheet>(null);
  const pagerRef = useRef<PagerView>(null);
  const snapPoints = useMemo(() => ['65%', '88%'], []);

  const [selectedMode, setSelectedMode] = useState<FocusModeType>('timer');
  const [selectedDuration, setSelectedDuration] = useState<number>(25);
  const [selectedBreak] = useState<string>('1 break');
  const [strictMode, setStrictMode] = useState<boolean>(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showAppsModal, setShowAppsModal] = useState(false);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.75}
      />
    ),
    [],
  );

  useEffect(() => {
    ReclaimNative.getInstalledApps().then(apps => {
      if (apps && apps.length > 0) {
        setInstalledApps(apps);
      }
    });
  }, []);

  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartSession = async (customDuration?: number) => {
    bottomSheetRef.current?.close();
    await startFocusSession({
      durationMinutes: customDuration || selectedDuration,
      strictMode: strictMode,
      mode: selectedMode,
      tag: 'Untagged',
      blockedPackages: blockingConfig.blockedPackages,
      blockYouTubeShorts: blockingConfig.youtubeShortsBlocked,
      blockYouTubeHomepage: blockingConfig.youtubeHomepageBlocked,
      blockYouTubeCompletely: blockingConfig.youtubeCompletelyBlocked,
    });
  };

  const handleStopOrPause = () => {
    if (focusSession.strictMode) {
      Alert.alert(
        'Strict Mode Active',
        'Strict Mode prevents ending sessions early to build strong focus habits. Override?',
        [
          { text: 'Keep Focusing', style: 'cancel' },
          { text: 'End Session', style: 'destructive', onPress: () => stopFocusSession() },
        ],
      );
    } else {
      if (focusSession.isPaused) {
        resumeFocusSession();
      } else {
        pauseFocusSession();
      }
    }
  };

  const totalBlockedCount =
    blockingConfig.blockedPackages.length +
    (blockingConfig.youtubeCompletelyBlocked || blockingConfig.youtubeShortsBlocked ? 1 : 0);

  // -------------------------------------------------------------
  // ACTIVE SESSION VIEW (Image 2: Aurora Landscape + Active Timer)
  // -------------------------------------------------------------
  if (focusSession.isActive) {
    return (
      <View style={[styles.activeContainer, { backgroundColor: '#071611' }]}>
        <LinearGradient
          colors={['#062416', '#03140C', '#010805']}
          style={StyleSheet.absoluteFill}
        />
        {/* Subtle radial aurora gradient effect simulated by LinearGradient */}
        <LinearGradient
          colors={['rgba(34, 197, 94, 0.42)', 'rgba(16, 185, 129, 0.15)', 'transparent']}
          style={styles.auroraGlowOverlay}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.8 }}
        />

        <View
          style={[
            styles.activeContent,
            {
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 24,
            },
          ]}>
          {/* Dynamic Island Capsule preview pill */}
          <LinearGradient
            colors={['#102E20', '#071610']}
            style={styles.dynamicIslandCapsule}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}>
            <View style={styles.islandDot} />
            <Text style={styles.islandText}>
              {focusSession.isPaused ? '--- paused' : '--- focussing'}
            </Text>
          </LinearGradient>

          {/* Central Circular Timer Widget */}
          <View style={styles.timerCenterWrap}>
            <View style={styles.timerCircleCard}>
              <TouchableOpacity
                style={styles.tagSelectorRow}
                activeOpacity={0.7}
                onPress={() => {}}>
                <Text style={styles.tagText}>{focusSession.tag || 'Untagged'}</Text>
                <Text style={styles.tagArrow}>▾</Text>
              </TouchableOpacity>

              <Text style={styles.timerModeLabel}>Timer</Text>
              <Text style={styles.timerCountdownDigits}>
                {formatCountdown(focusSession.remainingSeconds)}
              </Text>

              <TouchableOpacity
                style={styles.takeBreakPill}
                onPress={() => pauseFocusSession()}
                activeOpacity={0.8}>
                <Text style={styles.takeBreakText}>Take a break</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Controls Row: Menu, Mascot, Lock */}
          <View style={styles.activeIconsRow}>
            <TouchableOpacity style={styles.iconCircleBtn} activeOpacity={0.7}>
              <Text style={styles.iconSymbol}>☰</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.mascotCircleBtn} activeOpacity={0.7}>
              <Text style={styles.mascotEmoji}>🐸</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.lockCircleBtn} activeOpacity={0.7}>
              <Text style={styles.lockEmoji}>🔒</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Primary Action: Pause / Resume / End */}
          <View style={styles.activeActionsRow}>
            <TouchableOpacity
              style={[
                styles.pauseButton,
                { backgroundColor: focusSession.isPaused ? '#22C55E' : '#142820' },
              ]}
              onPress={handleStopOrPause}
              activeOpacity={0.8}>
              <Text
                style={[
                  styles.pauseButtonText,
                  { color: focusSession.isPaused ? '#000000' : '#FFFFFF' },
                ]}>
                {focusSession.isPaused ? 'Resume' : 'Pause'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.endEarlyBtn}
              onPress={() => stopFocusSession()}
              activeOpacity={0.7}>
              <Text style={styles.endEarlyText}>End Session</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // -------------------------------------------------------------
  // IDLE FOCUS VIEW (Image 8: Target Goal, Screen Time, Start Button)
  // -------------------------------------------------------------
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Top Bar: Avatar & Hourglass */}
        <View style={styles.topBarRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>S</Text>
          </View>
          <View style={styles.topRightIconCircle}>
            <Text style={styles.topRightIcon}>⏳</Text>
          </View>
        </View>

        {/* Central Circular Progress Dial */}
        <View style={styles.dialContainer}>
          <View style={styles.dialOuterRing}>
            {/* Top Green Marker Circle with Arrow */}
            <View style={styles.dialTopMarker}>
              <Text style={styles.dialMarkerArrow}>→</Text>
            </View>

            {/* Inner Content */}
            <Text style={[styles.dialMainMinutes, { color: theme.textPrimary }]}>
              {selectedDuration}m
            </Text>
            <Text style={styles.dialSubGoal}>Focus goal 6h</Text>
          </View>
        </View>

        {/* Screen Time Card */}
        <View style={[styles.screenTimeCard, { backgroundColor: '#18181B' }]}>
          <View style={styles.screenTimeHeader}>
            <Text style={[styles.screenTimeHours, { color: theme.textPrimary }]}>
              {Math.floor(statistics.todayScreenTimeMinutes / 60)}h{' '}
              {statistics.todayScreenTimeMinutes % 60}m
            </Text>
            <View style={styles.screenTimeRightWrap}>
              <Text style={styles.screenTimeLabel}>Screen Time</Text>
              <Text style={styles.screenTimeChevron}>›</Text>
            </View>
          </View>

          {/* Color Progress Bar: Green (Focus) / Orange (Distracting) / Grey */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressSegment,
                { flex: statistics.totalFocusMinutes || 2, backgroundColor: '#22C55E' },
              ]}
            />
            <View
              style={[
                styles.progressSegment,
                { flex: statistics.distractingTimeMinutes || 4, backgroundColor: '#F97316' },
              ]}
            />
            <View style={[styles.progressSegment, { flex: 6, backgroundColor: '#27272A' }]} />
          </View>
        </View>
      </ScrollView>

      {/* Floating Bottom Action: Start Focus Timer (Pill with Play Circle) */}
      <View style={[styles.floatingActionWrap, { bottom: insets.bottom + 85 }]}>
        <TouchableOpacity
          style={styles.startFocusPill}
          onPress={() => bottomSheetRef.current?.expand()}
          activeOpacity={0.85}>
          <Text style={styles.startFocusPillText}>Start focus timer</Text>
          <LinearGradient
            colors={['#4ADE80', '#22C55E']}
            style={styles.playCircleIcon}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}>
            <Text style={styles.playTriangleText}>▶</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* -------------------------------------------------------------
          GORHOM BOTTOM SHEET (Timer / Stopwatch / Pomodoro via PagerView)
          ------------------------------------------------------------- */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.bottomSheetBg}
        handleIndicatorStyle={styles.dragHandle}>
        <BottomSheetView style={styles.sheetContent}>
          {/* Top Segmented Mode Tabs: Timer | Stopwatch | Pomodoro */}
          <View style={[styles.tabSegmentContainer, { backgroundColor: '#27272A' }]}>
            <TouchableOpacity
              style={[
                styles.segmentTab,
                selectedMode === 'timer' && styles.segmentTabActiveGreen,
              ]}
              onPress={() => {
                setSelectedMode('timer');
                pagerRef.current?.setPage(0);
              }}
              activeOpacity={0.8}>
              <Text
                style={[
                  styles.segmentTabText,
                  selectedMode === 'timer' && styles.segmentTabTextActive,
                ]}>
                Timer
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentTab,
                selectedMode === 'stopwatch' && styles.segmentTabActiveGreen,
              ]}
              onPress={() => {
                setSelectedMode('stopwatch');
                pagerRef.current?.setPage(1);
              }}
              activeOpacity={0.8}>
              <Text
                style={[
                  styles.segmentTabText,
                  selectedMode === 'stopwatch' && styles.segmentTabTextActive,
                ]}>
                Stopwatch
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentTab,
                selectedMode === 'pomodoro' && styles.segmentTabActiveGreen,
              ]}
              onPress={() => {
                setSelectedMode('pomodoro');
                pagerRef.current?.setPage(2);
              }}
              activeOpacity={0.8}>
              <Text
                style={[
                  styles.segmentTabText,
                  selectedMode === 'pomodoro' && styles.segmentTabTextActive,
                ]}>
                Pomodoro
              </Text>
            </TouchableOpacity>
          </View>

          {/* Swipeable PagerView */}
          <PagerView
            ref={pagerRef}
            style={styles.pagerView}
            initialPage={0}
            onPageSelected={e => {
              const pos = e.nativeEvent.position;
              if (pos === 0) setSelectedMode('timer');
              else if (pos === 1) setSelectedMode('stopwatch');
              else if (pos === 2) setSelectedMode('pomodoro');
            }}>
            {/* Page 0: Timer Mode */}
            <View key="0" style={styles.sheetBody}>
              {/* Duration Row */}
              <TouchableOpacity
                style={[styles.configRow, { backgroundColor: '#202024' }]}
                onPress={() => setShowDurationPicker(!showDurationPicker)}
                activeOpacity={0.7}>
                <Text style={[styles.configRowLabel, { color: theme.textPrimary }]}>
                  Focus time
                </Text>
                <Text style={styles.configRowValue}>
                  {selectedDuration} mins ›
                </Text>
              </TouchableOpacity>

              {/* Duration Picker Pills */}
              {showDurationPicker && (
                <View style={styles.durationPillsWrap}>
                  {[15, 25, 45, 60, 90].map(mins => (
                    <TouchableOpacity
                      key={mins}
                      style={[
                        styles.durationPresetPill,
                        selectedDuration === mins && styles.durationPresetPillActive,
                      ]}
                      onPress={() => {
                        setSelectedDuration(mins);
                        setShowDurationPicker(false);
                      }}>
                      <Text
                        style={[
                          styles.durationPresetText,
                          selectedDuration === mins && styles.durationPresetTextActive,
                        ]}>
                        {mins}m
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Break Row */}
              <View style={[styles.configRow, { backgroundColor: '#202024' }]}>
                <Text style={[styles.configRowLabel, { color: theme.textPrimary }]}>
                  Break
                </Text>
                <Text style={styles.configRowValue}>{selectedBreak} ›</Text>
              </View>

              {/* Two Feature Cards Side by Side */}
              <View style={styles.twoCardsRow}>
                <TouchableOpacity
                  style={[styles.featureCardLeft, { backgroundColor: '#132A1C' }]}
                  onPress={() => setShowAppsModal(true)}
                  activeOpacity={0.8}>
                  <View style={styles.featureCardTopRow}>
                    <Text style={styles.shieldSymbol}>🛡️</Text>
                    <View style={styles.appIconThumbGroup}>
                      <View style={[styles.miniAppCircle, { backgroundColor: '#FF0000' }]}>
                        <Text style={styles.miniIconText}>▶</Text>
                      </View>
                      <View style={[styles.miniAppCircle, { backgroundColor: '#3B82F6', marginLeft: -8 }]}>
                        <Text style={styles.miniIconText}>🎮</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.appsCountBadge}>
                    <Text style={styles.appsCountBadgeText}>
                      {totalBlockedCount} apps
                    </Text>
                  </View>

                  <Text style={styles.featureCardTitle}>Blocked apps</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.featureCardRight,
                    {
                      backgroundColor: strictMode ? '#14532D' : '#202024',
                      borderColor: strictMode ? '#22C55E' : '#2E2E34',
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => setStrictMode(!strictMode)}
                  activeOpacity={0.8}>
                  <Text style={styles.ultraLightningIcon}>⚡</Text>
                  <Text style={[styles.ultraFocusTitle, { color: theme.textPrimary }]}>Ultra focus</Text>
                  <Text style={[styles.ultraFocusSubtitle, { color: theme.textSecondary }]}>
                    {strictMode ? 'Strict mode enabled' : 'Enforce strict focus'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Bottom Continue Button */}
              <TouchableOpacity
                style={styles.continueButton}
                onPress={() => handleStartSession()}
                activeOpacity={0.85}>
                <Text style={styles.continueButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>

            {/* Page 1: Stopwatch Mode */}
            <View key="1" style={styles.sheetBody}>
              <View style={[styles.configRow, { backgroundColor: '#202024' }]}>
                <Text style={[styles.configRowLabel, { color: theme.textPrimary }]}>
                  Total duration
                </Text>
                <Text style={styles.configRowValue}>0 → ∞</Text>
              </View>

              <View style={[styles.configRow, { backgroundColor: '#202024' }]}>
                <Text style={[styles.configRowLabel, { color: theme.textPrimary }]}>
                  Break
                </Text>
                <Text style={styles.configRowValue}>{selectedBreak} ›</Text>
              </View>

              <View style={styles.twoCardsRow}>
                <TouchableOpacity
                  style={[styles.featureCardLeft, { backgroundColor: '#132A1C' }]}
                  onPress={() => setShowAppsModal(true)}
                  activeOpacity={0.8}>
                  <View style={styles.featureCardTopRow}>
                    <Text style={styles.shieldSymbol}>🛡️</Text>
                    <View style={styles.appIconThumbGroup}>
                      <View style={[styles.miniAppCircle, { backgroundColor: '#FF0000' }]}>
                        <Text style={styles.miniIconText}>▶</Text>
                      </View>
                      <View style={[styles.miniAppCircle, { backgroundColor: '#3B82F6', marginLeft: -8 }]}>
                        <Text style={styles.miniIconText}>🎮</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.appsCountBadge}>
                    <Text style={styles.appsCountBadgeText}>
                      {totalBlockedCount} apps
                    </Text>
                  </View>

                  <Text style={styles.featureCardTitle}>Blocked apps</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.featureCardRight,
                    {
                      backgroundColor: strictMode ? '#14532D' : '#202024',
                      borderColor: strictMode ? '#22C55E' : '#2E2E34',
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => setStrictMode(!strictMode)}
                  activeOpacity={0.8}>
                  <Text style={styles.ultraLightningIcon}>⚡</Text>
                  <Text style={[styles.ultraFocusTitle, { color: theme.textPrimary }]}>Ultra focus</Text>
                  <Text style={[styles.ultraFocusSubtitle, { color: theme.textSecondary }]}>
                    {strictMode ? 'Strict mode enabled' : 'Enforce strict focus'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.continueButton}
                onPress={() => handleStartSession()}
                activeOpacity={0.85}>
                <Text style={styles.continueButtonText}>Start Stopwatch</Text>
              </TouchableOpacity>
            </View>

            {/* Page 2: Pomodoro Mode */}
            <View key="2" style={styles.sheetBody}>
              <View style={[styles.pomodoroCard, { backgroundColor: '#18181B' }]}>
                <Text style={[styles.pomodoroTitle, { color: theme.textPrimary }]}>
                  Study better with{'\n'}Pomodoro intervals
                </Text>
                <View style={styles.pomodoroPillRow}>
                  <View style={[styles.pomodoroMiniCard, { backgroundColor: '#202024' }]}>
                    <Text style={styles.pomodoroMiniLabel}>Focus</Text>
                    <Text style={[styles.pomodoroMiniValue, { color: theme.primary }]}>25 min</Text>
                  </View>
                  <View style={[styles.pomodoroMiniCard, { backgroundColor: '#202024' }]}>
                    <Text style={styles.pomodoroMiniLabel}>Break</Text>
                    <Text style={[styles.pomodoroMiniValue, { color: '#38BDF8' }]}>5 min</Text>
                  </View>
                  <View style={[styles.pomodoroMiniCard, { backgroundColor: '#202024' }]}>
                    <Text style={styles.pomodoroMiniLabel}>Rounds</Text>
                    <Text style={[styles.pomodoroMiniValue, { color: '#E4E4E7' }]}>4 cycles</Text>
                  </View>
                </View>

                <View style={[styles.twoCardsRow, { width: '100%', marginBottom: 14 }]}>
                  <TouchableOpacity
                    style={[styles.featureCardLeft, { backgroundColor: '#132A1C' }]}
                    onPress={() => setShowAppsModal(true)}
                    activeOpacity={0.8}>
                    <View style={styles.featureCardTopRow}>
                      <Text style={styles.shieldSymbol}>🛡️</Text>
                      <View style={styles.appIconThumbGroup}>
                        <View style={[styles.miniAppCircle, { backgroundColor: '#FF0000' }]}>
                          <Text style={styles.miniIconText}>▶</Text>
                        </View>
                        <View style={[styles.miniAppCircle, { backgroundColor: '#3B82F6', marginLeft: -8 }]}>
                          <Text style={styles.miniIconText}>🎮</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.appsCountBadge}>
                      <Text style={styles.appsCountBadgeText}>
                        {totalBlockedCount} apps
                      </Text>
                    </View>
                    <Text style={styles.featureCardTitle}>Blocked apps</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.featureCardRight,
                      {
                        backgroundColor: strictMode ? '#14532D' : '#202024',
                        borderColor: strictMode ? '#22C55E' : '#2E2E34',
                        borderWidth: 1,
                      },
                    ]}
                    onPress={() => setStrictMode(!strictMode)}
                    activeOpacity={0.8}>
                    <Text style={styles.ultraLightningIcon}>⚡</Text>
                    <Text style={[styles.ultraFocusTitle, { color: theme.textPrimary }]}>Ultra focus</Text>
                    <Text style={[styles.ultraFocusSubtitle, { color: theme.textSecondary }]}>
                      {strictMode ? 'Strict mode enabled' : 'Enforce strict focus'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.continueButton, { width: '100%' }]}
                  onPress={() => handleStartSession(25)}
                  activeOpacity={0.85}>
                  <Text style={styles.continueButtonText}>Start Pomodoro</Text>
                </TouchableOpacity>
              </View>
            </View>
          </PagerView>
        </BottomSheetView>
      </BottomSheet>

      {/* Select Apps to Block Modal */}
      <SelectAppsToBlockModal
        visible={showAppsModal}
        onClose={() => setShowAppsModal(false)}
        installedApps={installedApps}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  topBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: '#D97706',
    fontSize: 18,
    fontWeight: '700',
  },
  topRightIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#27272A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topRightIcon: {
    fontSize: 18,
  },
  // Circular Dial
  dialContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 18,
  },
  dialOuterRing: {
    width: 230,
    height: 230,
    borderRadius: 115,
    borderWidth: 28,
    borderColor: '#202024',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dialTopMarker: {
    position: 'absolute',
    top: -24,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialMarkerArrow: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dialMainMinutes: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  dialSubGoal: {
    color: '#71717A',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  // Screen Time Card
  screenTimeCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },
  screenTimeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  screenTimeHours: {
    fontSize: 18,
    fontWeight: '700',
  },
  screenTimeRightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  screenTimeLabel: {
    color: '#A1A1AA',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 6,
  },
  screenTimeChevron: {
    color: '#71717A',
    fontSize: 16,
  },
  progressBarTrack: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    gap: 3,
  },
  progressSegment: {
    height: '100%',
    borderRadius: 4,
  },
  // Floating Action Pill
  floatingActionWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  startFocusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    width: '100%',
    paddingVertical: 10,
    paddingLeft: 24,
    paddingRight: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  startFocusPillText: {
    color: '#15803D',
    fontSize: 17,
    fontWeight: '800',
  },
  playCircleIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playTriangleText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 2,
  },
  // Active Timer View (Image 2)
  activeContainer: {
    flex: 1,
  },
  auroraGlowOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0A261B',
    opacity: 0.5,
  },
  activeContent: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dynamicIslandCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C2E26',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  islandDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4B6B5D',
    marginRight: 8,
  },
  islandText: {
    color: '#E4E4E7',
    fontSize: 13,
    fontWeight: '600',
  },
  timerCenterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerCircleCard: {
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: '#0F291E',
    borderWidth: 2.5,
    borderColor: '#E4E4E7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  tagSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tagText: {
    color: '#D4D4D8',
    fontSize: 13,
    fontWeight: '600',
  },
  tagArrow: {
    color: '#A1A1AA',
    fontSize: 12,
    marginLeft: 4,
  },
  timerModeLabel: {
    color: '#A1A1AA',
    fontSize: 12,
    marginTop: 6,
  },
  timerCountdownDigits: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginVertical: 8,
  },
  takeBreakPill: {
    backgroundColor: '#1C3E2E',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 4,
  },
  takeBreakText: {
    color: '#D4D4D8',
    fontSize: 11,
    fontWeight: '600',
  },
  activeIconsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 36,
  },
  iconCircleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1C2E26',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconSymbol: {
    color: '#D4D4D8',
    fontSize: 18,
  },
  mascotCircleBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1E3E2F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#34D399',
  },
  mascotEmoji: {
    fontSize: 26,
  },
  lockCircleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B3512',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockEmoji: {
    fontSize: 20,
  },
  activeActionsRow: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  pauseButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  pauseButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  endEarlyBtn: {
    paddingVertical: 8,
  },
  endEarlyText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  // Bottom Sheet
  bottomSheetBg: {
    backgroundColor: '#18181B',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 36,
  },
  pagerView: {
    minHeight: 460,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#52525B',
    alignSelf: 'center',
    marginBottom: 16,
  },
  tabSegmentContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentTabActiveGreen: {
    backgroundColor: '#15803D',
  },
  segmentTabText: {
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: '600',
  },
  segmentTabTextActive: {
    color: '#FFFFFF',
  },
  sheetBody: {
    gap: 12,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  configRowLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  configRowValue: {
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: '500',
  },
  durationPillsWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  durationPresetPill: {
    backgroundColor: '#27272A',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  durationPresetPillActive: {
    backgroundColor: '#22C55E',
  },
  durationPresetText: {
    color: '#E4E4E7',
    fontSize: 13,
    fontWeight: '700',
  },
  durationPresetTextActive: {
    color: '#000000',
  },
  twoCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 4,
  },
  featureCardLeft: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    justifyContent: 'space-between',
    minHeight: 125,
  },
  featureCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shieldSymbol: {
    fontSize: 20,
  },
  appIconThumbGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAppCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#132A1C',
  },
  miniIconText: {
    color: '#FFFFFF',
    fontSize: 10,
  },
  appsCountBadge: {
    backgroundColor: '#1E462E',
    borderRadius: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginVertical: 8,
  },
  appsCountBadgeText: {
    color: '#4ADE80',
    fontSize: 12,
    fontWeight: '700',
  },
  featureCardTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  featureCardRight: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    justifyContent: 'space-between',
    minHeight: 125,
  },
  ultraLightningIcon: {
    fontSize: 22,
    alignSelf: 'flex-end',
  },
  ultraFocusTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  ultraFocusSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  continueButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  continueButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
  // Pomodoro
  pomodoroCard: {
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
  },
  pomodoroTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  pomodoroPillRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  pomodoroMiniCard: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  pomodoroMiniLabel: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '600',
  },
  pomodoroMiniValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 3,
  },
});
