import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import AppText from './AppText';

const Text = AppText;
import { useAppStore } from '../store/appStore';
import { typography } from '../theme/typography';
import { spacing, borderRadius } from '../theme/spacing';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onActionPress?: () => void;
  actionLabel?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onActionPress,
  actionLabel,
}) => {
  const { theme, permissions } = useAppStore();
  const allPermsOk =
    permissions.accessibilityGranted && permissions.usageStatsGranted;

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <View style={styles.titleRow}>
          <Text style={[typography.h1, { color: theme.textPrimary }]}>{title}</Text>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: allPermsOk
                  ? theme.accent + '22'
                  : theme.warning + '22',
                borderColor: allPermsOk ? theme.accent : theme.warning,
              },
            ]}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: allPermsOk ? theme.accent : theme.warning },
              ]}
            />
            <Text
              style={[
                typography.badge,
                { color: allPermsOk ? theme.accent : theme.warning },
              ]}>
              {allPermsOk ? 'ACTIVE' : 'SETUP NEEDED'}
            </Text>
          </View>
        </View>
        {subtitle ? (
          <Text
            style={[
              typography.caption,
              { color: theme.textSecondary, marginTop: spacing.xs },
            ]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {onActionPress && actionLabel ? (
        <TouchableOpacity
          onPress={onActionPress}
          style={[styles.actionBtn, { borderColor: theme.surfaceBorder }]}>
          <Text style={[typography.captionBold, { color: theme.primaryLight }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginLeft: spacing.sm,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  actionBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
});

