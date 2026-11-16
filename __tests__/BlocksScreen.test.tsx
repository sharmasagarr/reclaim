import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { BlocksScreen } from '../src/screens/Blocks/BlocksScreen';
import { AppProvider } from '../src/store/appStore';

// Mock dependencies
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 40, bottom: 20, left: 0, right: 0 }),
}));

jest.mock('../src/bridge/ReclaimNative', () => ({
  ReclaimNative: {
    getInstalledApps: jest.fn().mockResolvedValue([
      { packageName: 'com.google.android.youtube', appName: 'YouTube', iconUri: null, todayUsageMinutes: 30 },
    ]),
    setBlockingConfig: jest.fn().mockResolvedValue(true),
    setAppLimits: jest.fn().mockResolvedValue(true),
    setBlockedWebsites: jest.fn().mockResolvedValue(true),
    setProtections: jest.fn().mockResolvedValue(true),
    setSchedules: jest.fn().mockResolvedValue(true),
    getSchedules: jest.fn().mockResolvedValue('[]'),
    startFocusSession: jest.fn().mockResolvedValue(true),
    pauseFocusSession: jest.fn().mockResolvedValue(true),
    resumeFocusSession: jest.fn().mockResolvedValue(true),
    stopFocusSession: jest.fn().mockResolvedValue(true),
    requestPermission: jest.fn().mockResolvedValue(true),
    checkPermissions: jest.fn().mockResolvedValue({
      accessibilityGranted: true,
      usageStatsGranted: true,
      overlayGranted: true,
      notificationGranted: true,
      deviceAdminGranted: false,
    }),
    getDailyStatistics: jest.fn().mockResolvedValue({
      todayScreenTimeMinutes: 60,
      distractingTimeMinutes: 20,
      shortsBlocksCount: 5,
      unblockedShortsScrolledCount: 0,
      lastUpdatedTimestamp: Date.now(),
    }),
    onShortsBlocked: jest.fn(() => ({ remove: jest.fn() })),
    onShortsScrolled: jest.fn(() => ({ remove: jest.fn() })),
    onFocusSessionUpdate: jest.fn(() => ({ remove: jest.fn() })),
    onPermissionStatusChanged: jest.fn(() => ({ remove: jest.fn() })),
    onShortsBlockedConfigChanged: jest.fn(() => ({ remove: jest.fn() })),
    onProtectionStatusChanged: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

describe('BlocksScreen', () => {
  it('renders all sections correctly', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <AppProvider>
          <BlocksScreen />
        </AppProvider>,
      );
    });

    const root = renderer!.root;
    // Check titles
    const textNodes = root.findAllByType('Text' as any);
    const texts = textNodes.map(node => node.props.children).flat();

    expect(texts).toContain('Blocks');
    expect(texts).toContain('App Limits');
    expect(texts).toContain('Block Shorts');
    expect(texts).toContain('Other blocks');
    expect(texts).toContain('Strict Mode Protections');
    expect(texts).toContain('YouTube Shorts');
    expect(texts).toContain('IG Reels');
    expect(texts).toContain('Snapchat Spotlight');
    expect(texts).toContain('Block Websites');
    expect(texts).toContain('Block Reclaim app uninstall');
    expect(texts).toContain('Block split screen');
    expect(texts).toContain('Block floating window');
  });
});
