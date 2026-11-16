import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
} from 'react-native';
import AppText from '../../components/AppText';

const Text = AppText;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/appStore';
import { ScheduleItem, InstalledApp } from '../../types';
import { SelectAppsToBlockModal } from '../../components/SelectAppsToBlockModal';
import { ReclaimNative } from '../../bridge/ReclaimNative';

const DAYS = [
  { id: 1, label: 'M' },
  { id: 2, label: 'T' },
  { id: 3, label: 'W' },
  { id: 4, label: 'T' },
  { id: 5, label: 'F' },
  { id: 6, label: 'S' },
  { id: 7, label: 'S' },
];

export const ScheduleScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { theme, schedules, saveSchedule, removeSchedule, toggleSchedule } =
    useAppStore();

  const [activePageIndex] = useState(0);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);

  // Editor form state
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('08:00');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [blockYTShorts, setBlockYTShorts] = useState(true);
  const [blockYTHomepage, setBlockYTHomepage] = useState(false);
  const [blockYTCompletely, setBlockYTCompletely] = useState(false);
  const [blockAdult, setBlockAdult] = useState(true);
  const [showAppsModal, setShowAppsModal] = useState(false);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);

  useEffect(() => {
    ReclaimNative.getInstalledApps().then(apps => {
      if (apps && apps.length > 0) setInstalledApps(apps);
    });
  }, []);

  const openCreateModal = () => {
    setEditingSchedule(null);
    setTitle('Morning Study');
    setStartTime('06:00');
    setEndTime('08:00');
    setSelectedDays([1, 2, 3, 4, 5]);
    setBlockYTShorts(true);
    setBlockYTHomepage(false);
    setBlockYTCompletely(false);
    setBlockAdult(true);
    setShowEditorModal(true);
  };

  const openEditModal = (schedule: ScheduleItem) => {
    setEditingSchedule(schedule);
    setTitle(schedule.title);
    setStartTime(schedule.startTime);
    setEndTime(schedule.endTime);
    setSelectedDays(schedule.daysOfWeek);
    setBlockYTShorts(schedule.blockYouTubeShorts);
    setBlockYTHomepage(schedule.blockYouTubeHomepage);
    setBlockYTCompletely(schedule.blockYouTubeCompletely);
    setBlockAdult(schedule.blockAdultContent);
    setShowEditorModal(true);
  };

  const handleSaveSchedule = async () => {
    if (!title.trim()) return;
    const scheduleToSave: ScheduleItem = {
      id: editingSchedule?.id || `schedule_${Date.now()}`,
      title: title.trim(),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      daysOfWeek: selectedDays,
      enabled: editingSchedule ? editingSchedule.enabled : true,
      blockedPackages: editingSchedule ? editingSchedule.blockedPackages : ['com.instagram.android'],
      blockYouTubeShorts: blockYTShorts,
      blockYouTubeHomepage: blockYTHomepage,
      blockYouTubeCompletely: blockYTCompletely,
      blockAdultContent: blockAdult,
    };

    await saveSchedule(scheduleToSave);
    setShowEditorModal(false);
  };

  const toggleDaySelection = (dayId: number) => {
    if (selectedDays.includes(dayId)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter(d => d !== dayId));
      }
    } else {
      setSelectedDays([...selectedDays, dayId].sort());
    }
  };

  const formatDaysSummary = (days: number[]) => {
    if (days.length === 7) return 'Every day';
    if (days.length === 5 && !days.includes(6) && !days.includes(7)) return 'Mon - Fri';
    if (days.length === 2 && days.includes(6) && days.includes(7)) return 'Weekends';
    return `${days.length} days / week`;
  };

  return (
    <View style={[styles.container, { backgroundColor: '#071611' }]}>
      {/* Subtle background glow */}
      <View style={styles.backgroundGlow} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 80,
            paddingBottom: insets.bottom + 120,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Main Title (Image 11) */}
        <Text style={[styles.mainTitle, { color: theme.textPrimary }]}>
          Create your{'\n'}study schedule
        </Text>

        {/* Carousel / Cards List */}
        <View style={styles.carouselContainer}>
          {schedules.map((schedule, idx) => (
            <TouchableOpacity
              key={schedule.id}
              style={[
                styles.scheduleCard,
                { backgroundColor: '#18181B' },
                idx === activePageIndex && styles.activeCardBorder,
              ]}
              onPress={() => openEditModal(schedule)}
              activeOpacity={0.85}>
              <View style={styles.cardInfoWrap}>
                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                  {schedule.title}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {schedule.startTime} - {schedule.endTime} | {formatDaysSummary(schedule.daysOfWeek)}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.cardActionCircle}
                onPress={() => toggleSchedule(schedule.id, !schedule.enabled)}
                activeOpacity={0.7}>
                <Text style={[styles.cardActionIcon, { color: schedule.enabled ? '#22C55E' : '#71717A' }]}>
                  {schedule.enabled ? '✓' : '+'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        {/* Pagination Dots Indicator */}
        <View style={styles.paginationDotsRow}>
          {schedules.map((s, idx) => (
            <View
              key={s.id}
              style={[
                styles.dot,
                idx === activePageIndex && styles.activeDot,
              ]}
            />
          ))}
        </View>
      </ScrollView>

      {/* Floating Bottom Button: Create Schedule (White Pill Button) */}
      <View style={[styles.floatingActionWrap, { bottom: insets.bottom + 85 }]}>
        <TouchableOpacity
          style={styles.createScheduleButton}
          onPress={openCreateModal}
          activeOpacity={0.85}>
          <Text style={styles.createScheduleButtonText}>Create Schedule</Text>
        </TouchableOpacity>
      </View>

      {/* -------------------------------------------------------------
          SCHEDULE CREATION & EDIT MODAL
          ------------------------------------------------------------- */}
      <Modal visible={showEditorModal} animationType="slide" transparent>
        <View style={[styles.modalBackdrop, { paddingTop: insets.top + 20 }]}>
          <View style={[styles.modalCard, { backgroundColor: '#18181B' }]}>
            {/* Header */}
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                {editingSchedule ? 'Edit Schedule' : 'New Schedule'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowEditorModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}>
              {/* Schedule Title */}
              <Text style={styles.fieldLabel}>Schedule Title</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: '#27272A', color: theme.textPrimary }]}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Morning Study"
                placeholderTextColor="#71717A"
              />

              {/* Time Range */}
              <View style={styles.timeRangeRow}>
                <View style={styles.timeFieldWrap}>
                  <Text style={styles.fieldLabel}>Start Time (HH:mm)</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: '#27272A', color: theme.textPrimary }]}
                    value={startTime}
                    onChangeText={setStartTime}
                    placeholder="06:00"
                    placeholderTextColor="#71717A"
                  />
                </View>

                <View style={styles.timeFieldWrap}>
                  <Text style={styles.fieldLabel}>End Time (HH:mm)</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: '#27272A', color: theme.textPrimary }]}
                    value={endTime}
                    onChangeText={setEndTime}
                    placeholder="08:00"
                    placeholderTextColor="#71717A"
                  />
                </View>
              </View>

              {/* Day Selector Pills */}
              <Text style={styles.fieldLabel}>Active Days</Text>
              <View style={styles.daysRow}>
                {DAYS.map(day => {
                  const isSelected = selectedDays.includes(day.id);
                  return (
                    <TouchableOpacity
                      key={day.id}
                      style={[
                        styles.dayCircle,
                        isSelected && styles.dayCircleSelected,
                      ]}
                      onPress={() => toggleDaySelection(day.id)}
                      activeOpacity={0.7}>
                      <Text
                        style={[
                          styles.dayText,
                          isSelected && styles.dayTextSelected,
                        ]}>
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* YouTube Specific Content Toggles */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                Content Restrictions
              </Text>

              <View style={[styles.toggleRow, { backgroundColor: '#202024' }]}>
                <Text style={[styles.toggleLabel, { color: theme.textPrimary }]}>
                  Block YouTube Shorts
                </Text>
                <Switch
                  trackColor={{ false: '#3F3F46', true: '#22C55E' }}
                  thumbColor="#FFFFFF"
                  value={blockYTShorts}
                  onValueChange={setBlockYTShorts}
                />
              </View>

              <View style={[styles.toggleRow, { backgroundColor: '#202024' }]}>
                <Text style={[styles.toggleLabel, { color: theme.textPrimary }]}>
                  Block YouTube Homepage
                </Text>
                <Switch
                  trackColor={{ false: '#3F3F46', true: '#22C55E' }}
                  thumbColor="#FFFFFF"
                  value={blockYTHomepage}
                  onValueChange={setBlockYTHomepage}
                />
              </View>

              <View style={[styles.toggleRow, { backgroundColor: '#202024' }]}>
                <Text style={[styles.toggleLabel, { color: theme.textPrimary }]}>
                  Block YouTube Completely
                </Text>
                <Switch
                  trackColor={{ false: '#3F3F46', true: '#22C55E' }}
                  thumbColor="#FFFFFF"
                  value={blockYTCompletely}
                  onValueChange={setBlockYTCompletely}
                />
              </View>

              <View style={[styles.toggleRow, { backgroundColor: '#202024' }]}>
                <Text style={[styles.toggleLabel, { color: theme.textPrimary }]}>
                  Block Adult Content & Browsers
                </Text>
                <Switch
                  trackColor={{ false: '#3F3F46', true: '#22C55E' }}
                  thumbColor="#FFFFFF"
                  value={blockAdult}
                  onValueChange={setBlockAdult}
                />
              </View>

              {/* Configure Apps to Block */}
              <TouchableOpacity
                style={[styles.selectAppsBtn, { backgroundColor: '#27272A' }]}
                onPress={() => setShowAppsModal(true)}
                activeOpacity={0.8}>
                <Text style={styles.selectAppsBtnText}>
                  🛡️ Select Blocked Apps ({editingSchedule?.blockedPackages.length || 1})
                </Text>
              </TouchableOpacity>

              {/* Action Buttons */}
              <View style={styles.modalActionButtonsRow}>
                {editingSchedule && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={async () => {
                      await removeSchedule(editingSchedule.id);
                      setShowEditorModal(false);
                    }}
                    activeOpacity={0.7}>
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                  onPress={handleSaveSchedule}
                  activeOpacity={0.85}>
                  <Text style={styles.saveBtnText}>Save Schedule</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  backgroundGlow: {
    position: 'absolute',
    top: -100,
    left: -50,
    right: -50,
    height: 400,
    backgroundColor: '#0F2F23',
    opacity: 0.6,
    borderRadius: 200,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 24,
  },
  carouselContainer: {
    width: '100%',
    gap: 12,
  },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  activeCardBorder: {
    borderColor: '#22C55E',
  },
  cardInfoWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardSubtitle: {
    color: '#71717A',
    fontSize: 13,
    marginTop: 4,
  },
  cardActionCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#27272A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardActionIcon: {
    fontSize: 20,
    fontWeight: '700',
  },
  paginationDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3F3F46',
  },
  activeDot: {
    backgroundColor: '#FFFFFF',
    width: 16,
  },
  floatingActionWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
  createScheduleButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  createScheduleButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeIcon: {
    color: '#A1A1AA',
    fontSize: 20,
    padding: 4,
  },
  modalScrollView: {
    flexGrow: 0,
  },
  fieldLabel: {
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 10,
  },
  textInput: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  timeRangeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeFieldWrap: {
    flex: 1,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#27272A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleSelected: {
    backgroundColor: '#22C55E',
  },
  dayText: {
    color: '#71717A',
    fontSize: 14,
    fontWeight: '700',
  },
  dayTextSelected: {
    color: '#000000',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectAppsBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  selectAppsBtnText: {
    color: '#E4E4E7',
    fontSize: 14,
    fontWeight: '700',
  },
  modalActionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  deleteBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: '#3F1A1A',
    alignItems: 'center',
  },
  deleteBtnText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '800',
  },
});
