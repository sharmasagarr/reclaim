import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store/appStore';
import { Card } from '../../components/Card';
import { Header } from '../../components/Header';
import { SwitchRow } from '../../components/SwitchRow';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

export const SettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const {
    theme,
    settings,
    updateThemeSetting,
    setPin,
    blockingConfig,
    toggleDynamicIslandCounter,
  } = useAppStore();

  const [pinInput, setPinInput] = useState<string>('');
  const [showPinDialog, setShowPinDialog] = useState<boolean>(false);

  const handleTogglePin = () => {
    if (settings.pinProtected) {
      Alert.prompt
        ? Alert.prompt(
            'Enter Current PIN',
            'Provide your PIN to remove protection',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Remove PIN',
                onPress: input => {
                  if (input === settings.pinHash) {
                    setPin(null);
                  } else {
                    Alert.alert('Incorrect PIN', 'Protection remains active.');
                  }
                },
              },
            ],
            'secure-text',
          )
        : Alert.alert(
            'Remove PIN',
            'Are you sure you want to remove PIN protection?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: () => setPin(null) },
            ],
          );
    } else {
      setShowPinDialog(true);
    }
  };

  const handleSavePin = () => {
    if (pinInput.length >= 4) {
      setPin(pinInput);
      setPinInput('');
      setShowPinDialog(false);
      Alert.alert('PIN Configured', 'Settings and strict focus are now protected.');
    } else {
      Alert.alert('Invalid PIN', 'PIN must be at least 4 digits.');
    }
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
        title="Settings"
        subtitle="Customization, protection & notifications"
      />

      {/* Dynamic Island / Device Awareness Settings */}
      <Card elevated>
        <Text style={[typography.h3, { color: theme.textPrimary }]}>
          Device Dynamic Island / Live Alerts
        </Text>
        <Text
          style={[
            typography.caption,
            { color: theme.textSecondary, marginBottom: spacing.sm },
          ]}>
          Display real-time awareness metrics around your front-camera punch hole
          on OxygenOS, ColorOS and Android.
        </Text>

        <SwitchRow
          title="Dynamic Island Reel Counter"
          subtitle="Display live scrolled count when Shorts or Reels are temporarily unblocked"
          value={blockingConfig.dynamicIslandLiveCounterEnabled}
          onValueChange={toggleDynamicIslandCounter}
          icon="⚡"
          badge="AQUA DYNAMICS"
          badgeColor={theme.islandAccent}
        />
      </Card>

      {/* Theme Settings */}
      <Card>
        <Text style={[typography.h3, { color: theme.textPrimary }]}>
          Appearance
        </Text>
        <Text
          style={[
            typography.caption,
            { color: theme.textSecondary, marginBottom: spacing.md },
          ]}>
          Choose your interface theme.
        </Text>

        <View style={styles.themeRow}>
          {(['system', 'dark', 'light'] as const).map(option => {
            const isSelected = settings.theme === option;
            return (
              <TouchableOpacity
                key={option}
                activeOpacity={0.8}
                onPress={() => updateThemeSetting(option)}
                style={[
                  styles.themeBtn,
                  {
                    backgroundColor: isSelected
                      ? theme.primary
                      : theme.surfaceElevated,
                    borderColor: isSelected
                      ? theme.primaryLight
                      : theme.surfaceBorder,
                  },
                ]}>
                <Text
                  style={[
                    typography.bodyBold,
                    {
                      color: isSelected ? '#FFFFFF' : theme.textPrimary,
                      textTransform: 'capitalize',
                    },
                  ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      {/* Security & Strict Mode */}
      <Card>
        <Text style={[typography.h3, { color: theme.textPrimary }]}>
          Protection & Strict Mode
        </Text>
        <Text
          style={[
            typography.caption,
            { color: theme.textSecondary, marginBottom: spacing.sm },
          ]}>
          Prevent impulsive changes during focus hours.
        </Text>

        <SwitchRow
          title="PIN Protection"
          subtitle={
            settings.pinProtected
              ? 'PIN active for modifying rules'
              : 'Require PIN to edit settings'
          }
          value={settings.pinProtected}
          onValueChange={handleTogglePin}
          icon="🔒"
        />

        {showPinDialog ? (
          <View
            style={[
              styles.pinBox,
              {
                backgroundColor: theme.surfaceElevated,
                borderColor: theme.surfaceBorder,
              },
            ]}>
            <Text
              style={[typography.captionBold, { color: theme.textPrimary }]}>
              Enter 4-digit PIN:
            </Text>
            <View style={styles.pinActionsRow}>
              {(['1234', '5678', '9999'] as const).map(quickPin => (
                <TouchableOpacity
                  key={quickPin}
                  onPress={() => setPinInput(quickPin)}
                  style={[
                    styles.quickPinBtn,
                    {
                      backgroundColor:
                        pinInput === quickPin ? theme.primary : theme.surface,
                    },
                  ]}>
                  <Text
                    style={[
                      typography.captionBold,
                      {
                        color:
                          pinInput === quickPin
                            ? '#FFFFFF'
                            : theme.textSecondary,
                      },
                    ]}>
                    {quickPin}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={handleSavePin}
                style={[styles.savePinBtn, { backgroundColor: theme.primary }]}>
                <Text style={[typography.captionBold, { color: '#FFFFFF' }]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </Card>

      {/* Permissions Management Shortcut */}
      <Card>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Permissions')}
          style={styles.navRow}>
          <View style={styles.navText}>
            <Text style={[typography.bodyBold, { color: theme.textPrimary }]}>
              System Permissions & Privacy
            </Text>
            <Text
              style={[
                typography.caption,
                { color: theme.textSecondary, marginTop: 2 },
              ]}>
              Review Accessibility, Usage Access and Overlay permissions
            </Text>
          </View>
          <Text style={[styles.arrow, { color: theme.textSecondary }]}>›</Text>
        </TouchableOpacity>
      </Card>

      {/* About Reclaim */}
      <View style={styles.aboutContainer}>
        <Text style={[typography.captionBold, { color: theme.textMuted }]}>
          RECLAIM v1.0.0
        </Text>
        <Text
          style={[
            typography.caption,
            { color: theme.textMuted, textAlign: 'center', marginTop: 4 },
          ]}>
          100% Offline &bull; Zero Data Collection &bull; Content-Level Focus
        </Text>
      </View>
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
  themeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  themeBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    marginHorizontal: spacing.xs,
  },
  pinBox: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  pinActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  quickPinBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
  },
  savePinBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    marginLeft: 'auto',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navText: {
    flex: 1,
  },
  arrow: {
    fontSize: 24,
    fontWeight: '300',
    marginLeft: spacing.md,
  },
  aboutContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
});

