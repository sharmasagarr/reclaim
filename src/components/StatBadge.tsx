import React from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from './AppText';

const Text = AppText;
import { useAppStore } from '../store/appStore';
import { typography } from '../theme/typography';
import { spacing, borderRadius } from '../theme/spacing';

interface StatBadgeProps {
  label: string;
  value: string | number;
  sublabel?: string;
  accentColor?: string;
}

export const StatBadge: React.FC<StatBadgeProps> = ({
  label,
  value,
  sublabel,
  accentColor,
}) => {
  const { theme } = useAppStore();
  const color = accentColor || theme.primaryLight;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surfaceElevated,
          borderColor: theme.surfaceBorder,
        },
      ]}>
      <Text style={[typography.caption, { color: theme.textSecondary }]}>
        {label}
      </Text>
      <Text style={[typography.statNumber, { color }]}>{value}</Text>
      {sublabel ? (
        <Text
          style={[
            typography.caption,
            { color: theme.textMuted, marginTop: spacing.xs },
          ]}>
          {sublabel}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.xs,
  },
});

