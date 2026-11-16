import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import {
  PermissionStatus,
  BlockingConfig,
  DailyStatistics,
  AppLimit,
  InstalledApp,
  StrictModeProtections,
} from '../types';

const { ReclaimModule } = NativeModules;

const eventEmitter = ReclaimModule ? new NativeEventEmitter(ReclaimModule) : null;

export const ReclaimNative = {
  isAvailable(): boolean {
    return Platform.OS === 'android' && Boolean(ReclaimModule);
  },

  async checkPermissions(): Promise<PermissionStatus> {
    if (this.isAvailable()) {
      try {
        return await ReclaimModule.checkPermissions();
      } catch (e) {
        console.warn('[ReclaimNative] checkPermissions failed:', e);
      }
    }
    return {
      accessibilityGranted: false,
      usageStatsGranted: false,
      overlayGranted: false,
      notificationGranted: false,
      deviceAdminGranted: false,
    };
  },

  async requestPermission(
    type: 'accessibility' | 'usageStats' | 'overlay' | 'notifications' | 'deviceAdmin',
  ): Promise<void> {
    if (this.isAvailable()) {
      return await ReclaimModule.requestPermission(type);
    }
  },

  async setBlockingConfig(config: BlockingConfig): Promise<void> {
    if (this.isAvailable()) {
      return await ReclaimModule.setBlockingConfig(config);
    }
  },

  async getBlockingConfig(): Promise<BlockingConfig | null> {
    if (this.isAvailable()) {
      try {
        return await ReclaimModule.getBlockingConfig();
      } catch (e) {
        console.warn('[ReclaimNative] getBlockingConfig failed:', e);
      }
    }
    return null;
  },

  async setSchedules(schedulesJson: string): Promise<void> {
    if (this.isAvailable()) {
      return await ReclaimModule.setSchedules(schedulesJson);
    }
  },

  async getSchedules(): Promise<string> {
    if (this.isAvailable()) {
      try {
        return await ReclaimModule.getSchedules();
      } catch (e) {
        console.warn('[ReclaimNative] getSchedules failed:', e);
      }
    }
    return '[]';
  },

  async getInstalledApps(): Promise<InstalledApp[]> {
    if (this.isAvailable()) {
      try {
        return await ReclaimModule.getInstalledApps();
      } catch (e) {
        console.warn('[ReclaimNative] getInstalledApps failed:', e);
      }
    }
    return [];
  },

  async getAppLimits(): Promise<AppLimit[]> {
    if (this.isAvailable()) {
      try {
        return await ReclaimModule.getAppLimits();
      } catch (e) {
        console.warn('[ReclaimNative] getAppLimits failed:', e);
      }
    }
    return [];
  },

  async setAppLimits(limits: AppLimit[]): Promise<void> {
    if (this.isAvailable()) {
      return await ReclaimModule.setAppLimits(limits);
    }
  },

  async getBlockedWebsites(): Promise<string[]> {
    if (this.isAvailable()) {
      try {
        return await ReclaimModule.getBlockedWebsites();
      } catch (e) {
        console.warn('[ReclaimNative] getBlockedWebsites failed:', e);
      }
    }
    return [];
  },

  async setBlockedWebsites(websites: string[]): Promise<void> {
    if (this.isAvailable()) {
      return await ReclaimModule.setBlockedWebsites(websites);
    }
  },

  async getProtections(): Promise<StrictModeProtections> {
    if (this.isAvailable()) {
      try {
        return await ReclaimModule.getProtections();
      } catch (e) {
        console.warn('[ReclaimNative] getProtections failed:', e);
      }
    }
    return {
      blockUninstall: false,
      blockSplitScreen: false,
      blockFloatingWindow: false,
      deviceAdminActive: false,
    };
  },

  async setProtections(protections: StrictModeProtections): Promise<void> {
    if (this.isAvailable()) {
      return await ReclaimModule.setProtections(protections);
    }
  },

  async startFocusSession(config: {
    durationMinutes: number;
    strictMode: boolean;
    blockedPackages?: string[];
    blockYouTubeShorts?: boolean;
    blockYouTubeHomepage?: boolean;
    blockYouTubeCompletely?: boolean;
    mode?: string;
    tag?: string;
  }): Promise<boolean> {
    if (this.isAvailable()) {
      return await ReclaimModule.startFocusSession(config);
    }
    return true;
  },

  async pauseFocusSession(): Promise<boolean> {
    if (this.isAvailable()) {
      return await ReclaimModule.pauseFocusSession();
    }
    return true;
  },

  async resumeFocusSession(): Promise<boolean> {
    if (this.isAvailable()) {
      return await ReclaimModule.resumeFocusSession();
    }
    return true;
  },

  async stopFocusSession(): Promise<boolean> {
    if (this.isAvailable()) {
      return await ReclaimModule.stopFocusSession();
    }
    return true;
  },

  async getFocusSessionState(): Promise<{
    isActive: boolean;
    isPaused: boolean;
    remainingSeconds: number;
    strictMode: boolean;
    mode: string;
    tag: string;
  } | null> {
    if (this.isAvailable()) {
      try {
        return await ReclaimModule.getFocusSessionState();
      } catch (e) {
        console.warn('[ReclaimNative] getFocusSessionState failed:', e);
      }
    }
    return null;
  },

  async getDailyStatistics(): Promise<DailyStatistics> {
    if (this.isAvailable()) {
      try {
        return await ReclaimModule.getDailyStatistics();
      } catch (e) {
        console.warn('[ReclaimNative] getDailyStatistics failed:', e);
      }
    }
    return {
      todayScreenTimeMinutes: 0,
      distractingTimeMinutes: 0,
      shortsBlocksCount: 0,
      unblockedShortsScrolledCount: 0,
      focusSessionsCompleted: 0,
      totalFocusMinutes: 0,
    };
  },

  async setDynamicIslandCounter(enabled: boolean): Promise<void> {
    if (this.isAvailable()) {
      return await ReclaimModule.setDynamicIslandCounter(enabled);
    }
  },

  onShortsBlocked(callback: (data: { timestamp: number }) => void) {
    if (!eventEmitter) return { remove: () => {} };
    return (eventEmitter as any).addListener('onShortsBlocked', callback);
  },

  onShortsScrolled(callback: (data: { count: number; timestamp: number }) => void) {
    if (!eventEmitter) return { remove: () => {} };
    return (eventEmitter as any).addListener('onShortsScrolled', callback);
  },

  onFocusSessionUpdate(
    callback: (data: { remainingSeconds: number; isActive: boolean }) => void,
  ) {
    if (!eventEmitter) return { remove: () => {} };
    return (eventEmitter as any).addListener('onFocusSessionUpdate', callback);
  },

  onPermissionStatusChanged(callback: (status: PermissionStatus) => void) {
    if (!eventEmitter) return { remove: () => {} };
    return (eventEmitter as any).addListener('onPermissionStatusChanged', callback);
  },

  onShortsBlockedConfigChanged(callback: (data: { isBlocked: boolean }) => void) {
    if (!eventEmitter) return { remove: () => {} };
    return (eventEmitter as any).addListener('onShortsBlockedConfigChanged', callback);
  },

  onProtectionStatusChanged(callback: () => void) {
    if (!eventEmitter) return { remove: () => {} };
    return (eventEmitter as any).addListener('onProtectionStatusChanged', callback);
  },
};
