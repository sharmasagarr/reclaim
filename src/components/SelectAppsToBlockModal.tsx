import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Image,
} from 'react-native';
import AppText from './AppText';

const Text = AppText;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store/appStore';
import { InstalledApp } from '../types';

interface SelectAppsToBlockModalProps {
  visible: boolean;
  onClose: () => void;
  installedApps: InstalledApp[];
}

export const SelectAppsToBlockModal: React.FC<SelectAppsToBlockModalProps> = ({
  visible,
  onClose,
  installedApps,
}) => {
  const insets = useSafeAreaInsets();
  const {
    theme,
    blockingConfig,
    updateBlockingConfig,
    toggleAppBlocked,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');

  const filteredApps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return installedApps.filter(app => {
      // Don't show YouTube in general list as it has its own dedicated card
      if (app.packageName.includes('youtube')) return false;
      if (!q) return true;
      return (
        app.appName.toLowerCase().includes(q) ||
        app.packageName.toLowerCase().includes(q)
      );
    });
  }, [installedApps, searchQuery]);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.modalBackdrop, { paddingTop: insets.top + 20 }]}>
        <View style={[styles.modalCard, { backgroundColor: '#18181B' }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              Select Apps to Block
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={[styles.searchBar, { backgroundColor: '#27272A' }]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.searchInput, { color: theme.textPrimary }]}
              placeholder="Search apps"
              placeholderTextColor="#71717A"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <ScrollView
            style={styles.scrollList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}>
            {/* 1. Dedicated YouTube Card */}
            {(!searchQuery || 'youtube'.includes(searchQuery.toLowerCase())) && (
              <View style={[styles.groupCard, { backgroundColor: '#202024' }]}>
                {/* Main app row */}
                <View style={styles.appRow}>
                  <View style={[styles.appIconCircle, { backgroundColor: '#FF0000' }]}>
                    <Text style={styles.playIconText}>▶</Text>
                  </View>
                  <View style={styles.appInfoWrap}>
                    <Text style={[styles.appName, { color: theme.textPrimary }]}>
                      YouTube
                    </Text>
                    <Text style={[styles.appSubtitle, { color: theme.textSecondary }]}>
                      {blockingConfig.youtubeCompletelyBlocked
                        ? 'Blocked completely'
                        : 'Custom restrictions'}
                    </Text>
                  </View>
                  <Switch
                    trackColor={{ false: '#3F3F46', true: '#22C55E' }}
                    thumbColor="#FFFFFF"
                    value={blockingConfig.youtubeCompletelyBlocked}
                    onValueChange={val =>
                      updateBlockingConfig({ youtubeCompletelyBlocked: val })
                    }
                  />
                </View>

                {/* Sub-options (indented) */}
                <View style={styles.subOptionsContainer}>
                  {/* Block Shorts */}
                  <View style={styles.subOptionRow}>
                    <Text style={styles.subOptionIcon}>⚡</Text>
                    <Text
                      style={[
                        styles.subOptionLabel,
                        {
                          color: blockingConfig.youtubeCompletelyBlocked
                            ? '#71717A'
                            : theme.textPrimary,
                        },
                      ]}>
                      Block Shorts
                    </Text>
                    <Switch
                      disabled={blockingConfig.youtubeCompletelyBlocked}
                      trackColor={{ false: '#3F3F46', true: '#22C55E' }}
                      thumbColor="#FFFFFF"
                      value={
                        blockingConfig.youtubeCompletelyBlocked ||
                        blockingConfig.youtubeShortsBlocked
                      }
                      onValueChange={val =>
                        updateBlockingConfig({ youtubeShortsBlocked: val })
                      }
                    />
                  </View>

                  {/* Block Homepage */}
                  <View style={styles.subOptionRow}>
                    <Text style={styles.subOptionIcon}>🏠</Text>
                    <Text
                      style={[
                        styles.subOptionLabel,
                        {
                          color: blockingConfig.youtubeCompletelyBlocked
                            ? '#71717A'
                            : theme.textPrimary,
                        },
                      ]}>
                      Block homepage
                    </Text>
                    <Switch
                      disabled={blockingConfig.youtubeCompletelyBlocked}
                      trackColor={{ false: '#3F3F46', true: '#22C55E' }}
                      thumbColor="#FFFFFF"
                      value={
                        blockingConfig.youtubeCompletelyBlocked ||
                        blockingConfig.youtubeHomepageBlocked
                      }
                      onValueChange={val =>
                        updateBlockingConfig({ youtubeHomepageBlocked: val })
                      }
                    />
                  </View>

                  {/* Study Mode */}
                  <View style={styles.subOptionRow}>
                    <Text style={styles.subOptionIcon}>📚</Text>
                    <Text
                      style={[
                        styles.subOptionLabel,
                        {
                          color: blockingConfig.youtubeCompletelyBlocked
                            ? '#71717A'
                            : theme.textPrimary,
                        },
                      ]}>
                      Study Mode
                    </Text>
                    <Switch
                      disabled={blockingConfig.youtubeCompletelyBlocked}
                      trackColor={{ false: '#3F3F46', true: '#22C55E' }}
                      thumbColor="#FFFFFF"
                      value={
                        blockingConfig.youtubeCompletelyBlocked ||
                        blockingConfig.studyMode
                      }
                      onValueChange={val =>
                        updateBlockingConfig({ studyMode: val })
                      }
                    />
                  </View>
                </View>
              </View>
            )}

            {/* 2. Dedicated Browser Apps Card */}
            {(!searchQuery || 'browser'.includes(searchQuery.toLowerCase()) || 'chrome'.includes(searchQuery.toLowerCase())) && (
              <View style={[styles.groupCard, { backgroundColor: '#202024' }]}>
                <View style={styles.appRow}>
                  <View style={[styles.appIconCircle, { backgroundColor: '#2563EB' }]}>
                    <Text style={styles.browserIconText}>🌐</Text>
                  </View>
                  <View style={styles.appInfoWrap}>
                    <Text style={[styles.appName, { color: theme.textPrimary }]}>
                      Browser apps
                    </Text>
                    <Text style={[styles.appSubtitle, { color: theme.textSecondary }]}>
                      {blockingConfig.blockedPackages.includes('com.android.chrome')
                        ? 'Blocked completely'
                        : 'Web protection active'}
                    </Text>
                  </View>
                  <Switch
                    trackColor={{ false: '#3F3F46', true: '#22C55E' }}
                    thumbColor="#FFFFFF"
                    value={blockingConfig.blockedPackages.includes('com.android.chrome')}
                    onValueChange={val =>
                      toggleAppBlocked('com.android.chrome', val)
                    }
                  />
                </View>

                {/* Sub-options */}
                <View style={styles.subOptionsContainer}>
                  <View style={styles.subOptionRow}>
                    <Text style={styles.subOptionIcon}>🔞</Text>
                    <Text style={[styles.subOptionLabel, { color: theme.textPrimary }]}>
                      Block adult content
                    </Text>
                    <Switch
                      trackColor={{ false: '#3F3F46', true: '#22C55E' }}
                      thumbColor="#FFFFFF"
                      value={blockingConfig.blockAdultContent}
                      onValueChange={val =>
                        updateBlockingConfig({ blockAdultContent: val })
                      }
                    />
                  </View>

                  <View style={styles.subOptionRow}>
                    <Text style={styles.subOptionIcon}>📚</Text>
                    <Text style={[styles.subOptionLabel, { color: theme.textPrimary }]}>
                      Study Mode
                    </Text>
                    <Switch
                      trackColor={{ false: '#3F3F46', true: '#22C55E' }}
                      thumbColor="#FFFFFF"
                      value={blockingConfig.studyMode}
                      onValueChange={val =>
                        updateBlockingConfig({ studyMode: val })
                      }
                    />
                  </View>
                </View>
              </View>
            )}

            {/* 3. Distracting / Installed Apps Section */}
            <View style={styles.categoryHeaderRow}>
              <Text style={styles.categoryExpandIcon}>▾</Text>
              <Text style={[styles.categoryTitle, { color: theme.textPrimary }]}>
                Distracting ({filteredApps.length})
              </Text>
            </View>

            {filteredApps.map(app => {
              const isBlocked = blockingConfig.blockedPackages.includes(app.packageName);
              return (
                <View
                  key={app.packageName}
                  style={[styles.appItemCard, { backgroundColor: '#202024' }]}>
                  <View style={styles.appRow}>
                    {app.iconUri ? (
                      <Image source={{ uri: app.iconUri }} style={styles.appIconThumb} />
                    ) : (
                      <View
                        style={[
                          styles.appIconCircle,
                          {
                            backgroundColor: app.packageName.includes('instagram')
                              ? '#E1306C'
                              : '#3B82F6',
                          },
                        ]}>
                        <Text style={styles.appIconLetter}>
                          {app.appName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.appInfoWrap}>
                      <Text
                        style={[styles.appName, { color: theme.textPrimary }]}
                        numberOfLines={1}>
                        {app.appName}
                      </Text>
                      <Text
                        style={[styles.appSubtitle, { color: theme.textSecondary }]}
                        numberOfLines={1}>
                        {isBlocked ? 'Blocked completely' : 'Not blocked'}
                      </Text>
                    </View>
                    <Switch
                      trackColor={{ false: '#3F3F46', true: '#22C55E' }}
                      thumbColor="#FFFFFF"
                      value={isBlocked}
                      onValueChange={val => toggleAppBlocked(app.packageName, val)}
                    />
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeIcon: {
    color: '#A1A1AA',
    fontSize: 20,
    padding: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  scrollList: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  groupCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  appItemCard: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  appIconThumb: {
    width: 44,
    height: 44,
    borderRadius: 12,
    marginRight: 14,
  },
  playIconText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginLeft: 2,
  },
  browserIconText: {
    fontSize: 22,
  },
  appIconLetter: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  appInfoWrap: {
    flex: 1,
    marginRight: 12,
  },
  appName: {
    fontSize: 14,
    fontWeight: '600',
  },
  appSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  subOptionsContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#27272A',
  },
  subOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
  },
  subOptionIcon: {
    fontSize: 15,
    marginRight: 10,
  },
  subOptionLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  categoryExpandIcon: {
    color: '#A1A1AA',
    fontSize: 13,
    marginRight: 6,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
});

