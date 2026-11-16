export const darkPalette = {
  background: '#08080A',        // Near-black background matching screenshots
  surface: '#121214',           // Dark grey cards
  surfaceElevated: '#18181C',
  surfaceBorder: '#222226',
  cardDashedBorder: '#2E2E34',  // Dashed border for App Limits
  primary: '#22C55E',           // Vivid green accent
  primaryLight: '#4ADE80',
  primaryDark: '#16A34A',
  accent: '#22C55E',            // Green accent
  addButtonBg: '#222226',       // Rounded grey Add button
  addButtonText: '#F4F4F5',
  warning: '#F59E0B',
  danger: '#EF4444',
  textPrimary: '#FFFFFF',       // Pure white title
  textSecondary: '#8E8E93',     // Muted grey
  textMuted: '#636366',
  islandBackground: '#000000',
  islandText: '#FFFFFF',
  islandAccent: '#38BDF8',
};

export const lightPalette = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#F1F5F9',
  surfaceBorder: '#E2E8F0',
  cardDashedBorder: '#CBD5E1',
  primary: '#16A34A',
  primaryLight: '#22C55E',
  primaryDark: '#15803D',
  accent: '#16A34A',
  addButtonBg: '#E2E8F0',
  addButtonText: '#0F172A',
  warning: '#D97706',
  danger: '#DC2626',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  islandBackground: '#0F172A',
  islandText: '#FFFFFF',
  islandAccent: '#38BDF8',
};

export type ThemeColors = typeof darkPalette;
