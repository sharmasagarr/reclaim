import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import AppText from '../../components/AppText';

const Text = AppText;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/appStore';
import { ReclaimNative } from '../../bridge/ReclaimNative';
import { AppLimit, InstalledApp } from '../../types';
import { SelectAppsToBlockModal } from '../../components/SelectAppsToBlockModal';

export const BlocksScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const {
    theme,
    blockingConfig,
    toggleYouTubeShorts,
    toggleInstagramReels,
    toggleSnapchatSpotlight,
    appLimits,
    saveAppLimit,
    removeAppLimit,
    blockedWebsites,
    addBlockedWebsite,
    removeBlockedWebsite,
    protections,
    toggleProtection,
  } = useAppStore();

  // Modals state
  const [showAddAppModal, setShowAddAppModal] = useState(false);
  const [showSelectAppsModal, setShowSelectAppsModal] = useState(false);
  const [showWebsitesModal, setShowWebsitesModal] = useState(false);
  const [showLimitConfigModal, setShowLimitConfigModal] = useState(false);

  // App Selection state
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [searchAppQuery, setSearchAppQuery] = useState('');
  const [selectedAppForLimit, setSelectedAppForLimit] = useState<InstalledApp | AppLimit | null>(null);
  const [customLimitMinutes, setCustomLimitMinutes] = useState(60);

  // Website adding state
  const [newWebsiteDomain, setNewWebsiteDomain] = useState('');

  // Load installed launchable apps when Add App modal is opened
  const handleOpenAddApp = async () => {
    setShowAddAppModal(true);
    setLoadingApps(true);
    try {
      const apps = await ReclaimNative.getInstalledApps();
      setInstalledApps(apps);
    } catch {
      // Fallback
    } finally {
      setLoadingApps(false);
    }
  };

  const filteredApps = useMemo(() => {
    if (!searchAppQuery.trim()) return installedApps;
    const q = searchAppQuery.toLowerCase();
    return installedApps.filter(
      a => a.appName.toLowerCase().includes(q) || a.packageName.toLowerCase().includes(q),
    );
  }, [installedApps, searchAppQuery]);

  const handleSelectAppToConfigure = (app: InstalledApp) => {
    setSelectedAppForLimit(app);
    // If it already has a limit, set it, else default to 40m
    const existing = appLimits.find(l => l.packageName === app.packageName);
    setCustomLimitMinutes(existing ? existing.limitMinutes : 40);
    setShowAddAppModal(false);
    setShowLimitConfigModal(true);
  };

  const handleSaveAppLimit = async () => {
    if (!selectedAppForLimit) return;
    const newLimit: AppLimit = {
      packageName: selectedAppForLimit.packageName,
      appName: selectedAppForLimit.appName,
      limitMinutes: customLimitMinutes,
      enabled: true,
      iconUri: selectedAppForLimit.iconUri,
    };
    await saveAppLimit(newLimit);
    setShowLimitConfigModal(false);
    setSelectedAppForLimit(null);
  };

  const formatLimit = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m Limit`;
    if (h > 0) return `${h}h Limit`;
    return `${m}m Limit`;
  };

  const handleAddWebsite = async () => {
    if (!newWebsiteDomain.trim()) return;
    await addBlockedWebsite(newWebsiteDomain.trim());
    setNewWebsiteDomain('');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 90, // Keep space for bottom tab bar
          },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>
            Blocks
          </Text>
        </View>

        {/* SECTION 1: App Limits */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            App Limits
          </Text>
          <View style={styles.appLimitsHeaderActions}>
            <TouchableOpacity onPress={() => setShowSelectAppsModal(true)} activeOpacity={0.7}>
              <Text style={[styles.addActionGreen, { color: theme.textSecondary, marginRight: 12 }]}>
                Select Apps
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleOpenAddApp} activeOpacity={0.7}>
              <Text style={[styles.addActionGreen, { color: theme.primary }]}>
                + Add App
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Limits Cards */}
        {appLimits.map(app => (
          <View
            key={app.packageName}
            style={[styles.appLimitCard, { borderColor: theme.cardDashedBorder, backgroundColor: theme.surface }]}>
            <View style={styles.cardLeft}>
              {app.iconUri ? (
                <Image source={{ uri: app.iconUri }} style={styles.appIconImage} />
              ) : app.packageName.includes('youtube') ? (
                <View style={[styles.appIconCircle, { backgroundColor: '#FF0000' }]}>
                  <Text style={styles.appIconTextSymbol}>▶</Text>
                </View>
              ) : (
                <View style={[styles.appIconCircle, { backgroundColor: '#3B82F6' }]}>
                  <Text style={styles.appIconLetter}>{app.appName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.cardTextWrap}>
                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                  {app.appName}
                </Text>
                <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                  {formatLimit(app.limitMinutes)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.actionPillButton, { backgroundColor: theme.addButtonBg }]}
              onPress={() => {
                setSelectedAppForLimit(app);
                setCustomLimitMinutes(app.limitMinutes);
                setShowLimitConfigModal(true);
              }}
              activeOpacity={0.7}>
              <Text style={[styles.actionPillText, { color: theme.addButtonText }]}>
                {app.enabled ? '✓ Added' : '+ Add'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* SECTION 2: Block Shorts */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Block Shorts
          </Text>
        </View>

        {/* 1. YouTube Shorts */}
        <View style={[styles.solidCard, { backgroundColor: theme.surface }]}>
          <View style={styles.cardLeft}>
            <View style={[styles.shortsIconBox, { backgroundColor: '#FF0000' }]}>
              <Text style={styles.shortsLogoSymbol}>⚡</Text>
            </View>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
              YouTube Shorts
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.actionPillButton,
              {
                backgroundColor: blockingConfig.youtubeShortsBlocked
                  ? theme.primary + '22'
                  : theme.addButtonBg,
              },
            ]}
            onPress={() => toggleYouTubeShorts(!blockingConfig.youtubeShortsBlocked)}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.actionPillText,
                {
                  color: blockingConfig.youtubeShortsBlocked
                    ? theme.primary
                    : theme.addButtonText,
                },
              ]}>
              {blockingConfig.youtubeShortsBlocked ? '✓ Added' : '+ Add'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 2. IG Reels */}
        <View style={[styles.solidCard, { backgroundColor: theme.surface }]}>
          <View style={styles.cardLeft}>
            <View style={[styles.shortsIconBox, { backgroundColor: '#E1306C' }]}>
              <Text style={styles.shortsLogoSymbol}>🎬</Text>
            </View>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
              IG Reels
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.actionPillButton,
              {
                backgroundColor: blockingConfig.instagramReelsBlocked
                  ? theme.primary + '22'
                  : theme.addButtonBg,
              },
            ]}
            onPress={() => toggleInstagramReels(!blockingConfig.instagramReelsBlocked)}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.actionPillText,
                {
                  color: blockingConfig.instagramReelsBlocked
                    ? theme.primary
                    : theme.addButtonText,
                },
              ]}>
              {blockingConfig.instagramReelsBlocked ? '✓ Added' : '+ Add'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. Snapchat Spotlight */}
        <View style={[styles.solidCard, { backgroundColor: theme.surface }]}>
          <View style={styles.cardLeft}>
            <View style={[styles.shortsIconBox, { backgroundColor: '#FFFC00' }]}>
              <Text style={styles.shortsLogoSymbolDark}>👻</Text>
            </View>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
              Snapchat Spotlight
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.actionPillButton,
              {
                backgroundColor: blockingConfig.snapchatSpotlightBlocked
                  ? theme.primary + '22'
                  : theme.addButtonBg,
              },
            ]}
            onPress={() => toggleSnapchatSpotlight(!blockingConfig.snapchatSpotlightBlocked)}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.actionPillText,
                {
                  color: blockingConfig.snapchatSpotlightBlocked
                    ? theme.primary
                    : theme.addButtonText,
                },
              ]}>
              {blockingConfig.snapchatSpotlightBlocked ? '✓ Added' : '+ Add'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* SECTION 3: Other blocks */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Other blocks
          </Text>
        </View>

        {/* Block Websites */}
        <View style={[styles.solidCard, { backgroundColor: theme.surface }]}>
          <View style={styles.cardLeft}>
            <View style={[styles.shortsIconBox, { backgroundColor: '#27272A' }]}>
              <Text style={styles.shortsLogoSymbol}>🌐</Text>
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                Block Websites
              </Text>
              {blockedWebsites.length > 0 && (
                <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                  {blockedWebsites.length} sites blocked
                </Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.actionPillButton, { backgroundColor: theme.addButtonBg }]}
            onPress={() => setShowWebsitesModal(true)}
            activeOpacity={0.7}>
            <Text style={[styles.actionPillText, { color: theme.addButtonText }]}>
              {blockedWebsites.length > 0 ? 'Manage' : '+ Add'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* SECTION 4: Strict Mode Protections */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Strict Mode Protections
          </Text>
        </View>

        {/* 1. Block Reclaim app uninstall */}
        <View style={[styles.protectionCard, { backgroundColor: theme.surface }]}>
          <View style={styles.protectionTextWrap}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
              Block Reclaim app uninstall
            </Text>
            <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
              Cannot uninstall or log out of the Reclaim app.
            </Text>
            {protections.deviceAdminActive && (
              <Text style={[styles.protectionActiveBadge, { color: theme.primary }]}>
                🛡️ Android Device Admin Active
              </Text>
            )}
          </View>
          <Switch
            value={protections.blockUninstall}
            onValueChange={val => toggleProtection('blockUninstall', val)}
            trackColor={{ false: '#27272A', true: theme.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* 2. Block split screen */}
        <View style={[styles.protectionCard, { backgroundColor: theme.surface }]}>
          <View style={styles.protectionTextWrap}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
              Block split screen
            </Text>
            <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
              Cannot use blocked apps in split screen.
            </Text>
          </View>
          <Switch
            value={protections.blockSplitScreen}
            onValueChange={val => toggleProtection('blockSplitScreen', val)}
            trackColor={{ false: '#27272A', true: theme.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* 3. Block floating window */}
        <View style={[styles.protectionCard, { backgroundColor: theme.surface }]}>
          <View style={styles.protectionTextWrap}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
              Block floating window
            </Text>
            <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
              Cannot use blocked apps in floating window.
            </Text>
          </View>
          <Switch
            value={protections.blockFloatingWindow}
            onValueChange={val => toggleProtection('blockFloatingWindow', val)}
            trackColor={{ false: '#27272A', true: theme.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </ScrollView>

      {/* MODAL 1: Add App from Installed Apps */}
      <Modal visible={showAddAppModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Select Application</Text>
              <TouchableOpacity onPress={() => setShowAddAppModal(false)}>
                <Text style={[styles.modalCloseText, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.searchInput, { backgroundColor: theme.surfaceElevated, color: theme.textPrimary }]}
              placeholder="Search apps..."
              placeholderTextColor={theme.textMuted}
              value={searchAppQuery}
              onChangeText={setSearchAppQuery}
            />

            {loadingApps ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator color={theme.primary} size="large" />
                <Text style={[styles.modalLoadingText, { color: theme.textSecondary }]}>
                  Reading installed apps from device...
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.appListScroll} showsVerticalScrollIndicator={false}>
                {filteredApps.map(app => (
                  <TouchableOpacity
                    key={app.packageName}
                    style={styles.appPickRow}
                    onPress={() => handleSelectAppToConfigure(app)}
                    activeOpacity={0.7}>
                    {app.iconUri ? (
                      <Image source={{ uri: app.iconUri }} style={styles.appIconImage} />
                    ) : (
                      <View style={[styles.appIconCircle, { backgroundColor: '#3B82F6' }]}>
                        <Text style={styles.appIconLetter}>{app.appName.charAt(0)}</Text>
                      </View>
                    )}
                    <View style={styles.appPickTextWrap}>
                      <Text style={[styles.appPickName, { color: theme.textPrimary }]}>
                        {app.appName}
                      </Text>
                      <Text style={[styles.appPickPackage, { color: theme.textMuted }]}>
                        {app.packageName}
                      </Text>
                    </View>
                    <Text style={[styles.selectActionText, { color: theme.primary }]}>Select</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Configure Daily Limit */}
      <Modal visible={showLimitConfigModal} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              Set Daily Limit: {selectedAppForLimit?.appName}
            </Text>
            <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>
              Choose maximum screen time allowed per day. Reclaim will block access once exceeded.
            </Text>

            {/* Limit preset buttons */}
            <View style={styles.limitPresetsRow}>
              {[15, 30, 40, 60, 90, 120, 160].map(mins => (
                <TouchableOpacity
                  key={mins}
                  style={[
                    styles.presetPill,
                    {
                      backgroundColor:
                        customLimitMinutes === mins ? theme.primary : theme.surfaceElevated,
                    },
                  ]}
                  onPress={() => setCustomLimitMinutes(mins)}>
                  <Text
                    style={[
                      styles.presetText,
                      { color: customLimitMinutes === mins ? '#000000' : theme.textPrimary },
                    ]}>
                    {formatLimit(mins)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: theme.surfaceElevated }]}
                onPress={() => {
                  setShowLimitConfigModal(false);
                  if (selectedAppForLimit) {
                    removeAppLimit(selectedAppForLimit.packageName);
                  }
                }}>
                <Text style={[styles.modalCancelText, { color: theme.danger }]}>Remove Limit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: theme.primary }]}
                onPress={handleSaveAppLimit}>
                <Text style={styles.modalSaveText}>Save Limit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: Manage Blocked Websites */}
      <Modal visible={showWebsitesModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Block Websites</Text>
              <TouchableOpacity onPress={() => setShowWebsitesModal(false)}>
                <Text style={[styles.modalCloseText, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>
              Restricts access in Chrome, Firefox and other browsers on this device.
            </Text>

            <View style={styles.addWebsiteRow}>
              <TextInput
                style={[styles.websiteInput, { backgroundColor: theme.surfaceElevated, color: theme.textPrimary }]}
                placeholder="e.g. reddit.com or tiktok.com"
                placeholderTextColor={theme.textMuted}
                value={newWebsiteDomain}
                onChangeText={setNewWebsiteDomain}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.addWebsiteBtn, { backgroundColor: theme.primary }]}
                onPress={handleAddWebsite}>
                <Text style={styles.addWebsiteBtnText}>+ Add</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.websiteListScroll}>
              {blockedWebsites.map(site => (
                <View key={site} style={[styles.websiteItemRow, { borderBottomColor: theme.surfaceBorder }]}>
                  <Text style={styles.websiteGlobeIcon}>🌐</Text>
                  <Text style={[styles.websiteText, { color: theme.textPrimary }]}>{site}</Text>
                  <TouchableOpacity onPress={() => removeBlockedWebsite(site)}>
                    <Text style={[styles.websiteRemoveText, { color: theme.danger }]}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL: Select Apps to Block */}
      <SelectAppsToBlockModal
        visible={showSelectAppsModal}
        onClose={() => setShowSelectAppsModal(false)}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  helpIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  helpText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  appLimitsHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  addActionGreen: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Dashed Card for App Limits
  appLimitCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.2,
    borderStyle: 'dashed',
    padding: 16,
    marginBottom: 10,
  },
  // Solid Card for Block Shorts & Other Blocks
  solidCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  protectionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  protectionTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  protectionActiveBadge: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  appIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  appIconImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 14,
  },
  appIconTextSymbol: {
    color: '#FFFFFF',
    fontSize: 18,
    marginLeft: 2,
  },
  appIconLetter: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  shortsIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  shortsLogoSymbol: {
    fontSize: 22,
  },
  shortsLogoSymbolDark: {
    fontSize: 22,
  },
  cardTextWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    flexShrink: 1,
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  actionPillButton: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalCloseText: {
    fontSize: 18,
    paddingHorizontal: 8,
  },
  modalDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  searchInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 13,
    marginBottom: 12,
  },
  modalLoading: {
    padding: 30,
    alignItems: 'center',
  },
  modalLoadingText: {
    marginTop: 12,
    fontSize: 13,
  },
  appListScroll: {
    maxHeight: 380,
  },
  appPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  appPickTextWrap: {
    flex: 1,
  },
  appPickName: {
    fontSize: 14,
    fontWeight: '600',
  },
  appPickPackage: {
    fontSize: 11,
    marginTop: 2,
  },
  selectActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  limitPresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 12,
  },
  presetPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    marginBottom: 6,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '700',
  },
  addWebsiteRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  websiteInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  addWebsiteBtn: {
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  addWebsiteBtnText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 13,
  },
  websiteListScroll: {
    maxHeight: 240,
  },
  websiteItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  websiteGlobeIcon: {
    fontSize: 15,
    marginRight: 10,
  },
  websiteText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  websiteRemoveText: {
    fontSize: 12,
    fontWeight: '600',
  },
  helpParagraph: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
});
