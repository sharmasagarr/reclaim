import React from 'react';
import { StyleSheet, View, Switch } from 'react-native';
import AppText from './AppText';

const Text = AppText;
import { useAppStore } from '../store/appStore';
import { typography } from '../theme/typography';
import { spacing, borderRadius } from '../theme/spacing';

interface SwitchRowProps {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  disabled?: boolean;
  badge?: string;
  badgeColor?: string;
  icon?: string;
}

export const SwitchRow: React.FC<SwitchRowProps> = ({
  title,
  subtitle,
  value,
  onValueChange,
  disabled = false,
  badge,
  badgeColor,
  icon,
}) => {
  const { theme } = useAppStore();

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <View style={styles.titleRow}>
          {icon ? <Text style={styles.icon}>{icon}</Text> : null}
          <Text style={[typography.bodyBold, { color: theme.textPrimary }]}>
            {title}
          </Text>
          {badge ? (
            <View
              style={[
                styles.badge,
                { backgroundColor: badgeColor || theme.primaryDark },
              ]}>
              <Text style={[typography.badge, styles.badgeText]}>{badge}</Text>
            </View>
          ) : null}
        </View>
        {subtitle ? (
          <Text
            style={[
              typography.caption,
              styles.subtitleText,
              { color: theme.textSecondary },
            ]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{
          false: theme.surfaceElevated,
          true: theme.primary,
        }}
        thumbColor={value ? '#FFFFFF' : theme.textMuted}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  textContainer: {
    flex: 1,
    paddingRight: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  badgeText: {
    color: '#FFFFFF',
  },
  subtitleText: {
    marginTop: spacing.xs,
  },
});
