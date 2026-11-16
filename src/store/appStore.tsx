import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import { storage } from './mmkv';
import { ReclaimNative } from '../bridge/ReclaimNative';
import {
  PermissionStatus,
  FocusSession,
  FocusModeType,
  BlockingConfig,
  DailyStatistics,
  AppSettings,
  AppLimit,
  StrictModeProtections,
  ScheduleItem,
} from '../types';
import { darkPalette, lightPalette, ThemeColors } from '../theme/colors';

interface AppContextType {
  blockingConfig: BlockingConfig;
  focusSession: FocusSession;
  schedules: ScheduleItem[];
  permissions: PermissionStatus;
  statistics: DailyStatistics;
  settings: AppSettings;
  appLimits: AppLimit[];
  blockedWebsites: string[];
  protections: StrictModeProtections;
  theme: ThemeColors;
  isDark: boolean;
  updateBlockingConfig: (patch: Partial<BlockingConfig>) => Promise<void>;
  toggleYouTubeShorts: (enabled: boolean) => Promise<void>;
  toggleYouTubeHomepage: (enabled: boolean) => Promise<void>;
  toggleYouTubeCompletely: (enabled: boolean) => Promise<void>;
  toggleInstagramCompletely: (enabled: boolean) => Promise<void>;
  toggleInstagramReels: (enabled: boolean) => Promise<void>;
  toggleSnapchatSpotlight: (enabled: boolean) => Promise<void>;
  toggleAppBlocked: (packageName: string, blocked: boolean) => Promise<void>;
  toggleDynamicIslandCounter: (enabled: boolean) => Promise<void>;
  saveAppLimit: (app: AppLimit) => Promise<void>;
  removeAppLimit: (packageName: string) => Promise<void>;
  addBlockedWebsite: (domain: string) => Promise<void>;
  removeBlockedWebsite: (domain: string) => Promise<void>;
  toggleProtection: (key: keyof StrictModeProtections, enabled: boolean) => Promise<void>;
  saveSchedule: (schedule: ScheduleItem) => Promise<void>;
  removeSchedule: (id: string) => Promise<void>;
  toggleSchedule: (id: string, enabled: boolean) => Promise<void>;
  startFocusSession: (config: {
    durationMinutes: number;
    strictMode: boolean;
    mode?: FocusModeType;
    tag?: string;
    blockedPackages?: string[];
    blockYouTubeShorts?: boolean;
    blockYouTubeHomepage?: boolean;
    blockYouTubeCompletely?: boolean;
  }) => Promise<void>;
  pauseFocusSession: () => Promise<void>;
  resumeFocusSession: () => Promise<void>;
  stopFocusSession: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
  refreshStatistics: () => Promise<void>;
  updateThemeSetting: (theme: 'system' | 'dark' | 'light') => void;
  setPin: (pin: string | null) => void;
}

const STORAGE_KEYS = {
  BLOCKING_CONFIG: 'reclaim_blocking_config',
  FOCUS_SESSION: 'reclaim_focus_session',
  SCHEDULES: 'reclaim_schedules',
  SETTINGS: 'reclaim_settings',
  STATISTICS: 'reclaim_statistics',
  APP_LIMITS: 'reclaim_app_limits',
  BLOCKED_WEBSITES: 'reclaim_blocked_websites',
  PROTECTIONS: 'reclaim_protections',
};

const defaultBlockingConfig: BlockingConfig = {
  youtubeCompletelyBlocked: false,
  youtubeHomepageBlocked: false,
  youtubeShortsBlocked: true,
  instagramCompletelyBlocked: false,
  instagramReelsBlocked: true,
  snapchatSpotlightBlocked: true,
  blockedPackages: ['com.instagram.android'],
  blockAdultContent: false,
  studyMode: false,
  dynamicIslandLiveCounterEnabled: true,
};

const defaultFocusSession: FocusSession = {
  isActive: false,
  mode: 'timer',
  startTime: null,
  durationMinutes: 25,
  remainingSeconds: 25 * 60,
  totalDurationSeconds: 25 * 60,
  strictMode: false,
  isPaused: false,
  tag: 'Untagged',
  blockedPackages: ['com.google.android.youtube', 'com.instagram.android', 'com.smashkarts.app'],
  blockYouTubeShorts: true,
  blockYouTubeHomepage: false,
  blockYouTubeCompletely: false,
};

const defaultSchedules: ScheduleItem[] = [
  {
    id: 'morning_study',
    title: 'Morning Study',
    startTime: '06:00',
    endTime: '08:00',
    daysOfWeek: [1, 2, 3, 4, 5],
    enabled: true,
    blockedPackages: ['com.instagram.android', 'com.smashkarts.app'],
    blockYouTubeShorts: true,
    blockYouTubeHomepage: false,
    blockYouTubeCompletely: false,
    blockAdultContent: true,
  },
  {
    id: 'evening_focus',
    title: 'Evening Focus',
    startTime: '19:00',
    endTime: '22:00',
    daysOfWeek: [1, 2, 3, 4, 5, 6],
    enabled: false,
    blockedPackages: ['com.instagram.android', 'com.google.android.youtube'],
    blockYouTubeShorts: true,
    blockYouTubeHomepage: true,
    blockYouTubeCompletely: false,
    blockAdultContent: true,
  },
];

const defaultPermissions: PermissionStatus = {
  accessibilityGranted: false,
  usageStatsGranted: false,
  overlayGranted: false,
  notificationGranted: false,
  deviceAdminGranted: false,
};

const defaultStatistics: DailyStatistics = {
  todayScreenTimeMinutes: 142,
  distractingTimeMinutes: 38,
  shortsBlocksCount: 14,
  unblockedShortsScrolledCount: 3,
  focusSessionsCompleted: 2,
  totalFocusMinutes: 50,
};

const defaultSettings: AppSettings = {
  theme: 'dark',
  pinProtected: false,
  pinHash: null,
  strictModeEnabled: false,
  dynamicIslandCounter: true,
};

const defaultAppLimits: AppLimit[] = [
  {
    packageName: 'com.google.android.youtube',
    appName: 'YouTube',
    limitMinutes: 160,
    enabled: true,
    todayUsageMinutes: 32,
  },
  {
    packageName: 'com.smashkarts.app',
    appName: 'Smash Karts',
    limitMinutes: 40,
    enabled: true,
    todayUsageMinutes: 15,
  },
];

const defaultBlockedWebsites: string[] = [
  'reddit.com',
  'tiktok.com',
  'twitter.com',
  'x.com',
];

const defaultProtections: StrictModeProtections = {
  blockUninstall: false,
  blockSplitScreen: false,
  blockFloatingWindow: false,
  deviceAdminActive: false,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();

  const [blockingConfig, setBlockingConfigState] = useState<BlockingConfig>(() => {
    const raw = storage.getString(STORAGE_KEYS.BLOCKING_CONFIG);
    return raw ? { ...defaultBlockingConfig, ...JSON.parse(raw) } : defaultBlockingConfig;
  });

  const [focusSession, setFocusSessionState] = useState<FocusSession>(() => {
    const raw = storage.getString(STORAGE_KEYS.FOCUS_SESSION);
    return raw ? { ...defaultFocusSession, ...JSON.parse(raw) } : defaultFocusSession;
  });

  const [schedules, setSchedulesState] = useState<ScheduleItem[]>(() => {
    const raw = storage.getString(STORAGE_KEYS.SCHEDULES);
    return raw ? JSON.parse(raw) : defaultSchedules;
  });

  const [settings, setSettingsState] = useState<AppSettings>(() => {
    const raw = storage.getString(STORAGE_KEYS.SETTINGS);
    return raw ? JSON.parse(raw) : defaultSettings;
  });

  const [statistics, setStatisticsState] = useState<DailyStatistics>(() => {
    const raw = storage.getString(STORAGE_KEYS.STATISTICS);
    return raw ? JSON.parse(raw) : defaultStatistics;
  });

  const [appLimits, setAppLimitsState] = useState<AppLimit[]>(() => {
    const raw = storage.getString(STORAGE_KEYS.APP_LIMITS);
    return raw ? JSON.parse(raw) : defaultAppLimits;
  });

  const [blockedWebsites, setBlockedWebsitesState] = useState<string[]>(() => {
    const raw = storage.getString(STORAGE_KEYS.BLOCKED_WEBSITES);
    return raw ? JSON.parse(raw) : defaultBlockedWebsites;
  });

  const [protections, setProtectionsState] = useState<StrictModeProtections>(() => {
    const raw = storage.getString(STORAGE_KEYS.PROTECTIONS);
    return raw ? JSON.parse(raw) : defaultProtections;
  });

  const [permissions, setPermissions] = useState<PermissionStatus>(defaultPermissions);

  const isDark =
    settings.theme === 'system'
      ? systemColorScheme === 'dark'
      : settings.theme === 'dark';
  const theme = isDark ? darkPalette : lightPalette;

  const refreshPermissions = useCallback(async () => {
    const status = await ReclaimNative.checkPermissions();
    setPermissions(status);
    if (typeof status.deviceAdminGranted === 'boolean') {
      setProtectionsState(prev => ({
        ...prev,
        deviceAdminActive: status.deviceAdminGranted,
      }));
    }
  }, []);

  const refreshStatistics = useCallback(async () => {
    const stats = await ReclaimNative.getDailyStatistics();
    if (stats && stats.todayScreenTimeMinutes > 0) {
      setStatisticsState(prev => {
        const merged = { ...prev, ...stats };
        storage.set(STORAGE_KEYS.STATISTICS, JSON.stringify(merged));
        return merged;
      });
    }
  }, []);

  // Sync to native on mount and subscribe to native events
  useEffect(() => {
    refreshPermissions();
    refreshStatistics();

    // Initial native config sync
    ReclaimNative.setBlockingConfig(blockingConfig);
    ReclaimNative.setAppLimits(appLimits);
    ReclaimNative.setBlockedWebsites(blockedWebsites);
    ReclaimNative.setProtections(protections);
    ReclaimNative.setSchedules(JSON.stringify(schedules));

    const subBlocked = ReclaimNative.onShortsBlocked(() => {
      setStatisticsState(prev => {
        const updated = {
          ...prev,
          shortsBlocksCount: prev.shortsBlocksCount + 1,
        };
        storage.set(STORAGE_KEYS.STATISTICS, JSON.stringify(updated));
        return updated;
      });
    });

    const subScrolled = ReclaimNative.onShortsScrolled(({ count }) => {
      setStatisticsState(prev => {
        const updated = {
          ...prev,
          unblockedShortsScrolledCount: count,
        };
        storage.set(STORAGE_KEYS.STATISTICS, JSON.stringify(updated));
        return updated;
      });
    });

    const subSession = ReclaimNative.onFocusSessionUpdate(({ remainingSeconds, isActive }) => {
      setFocusSessionState(prev => {
        const updated: FocusSession = {
          ...prev,
          isActive,
          remainingSeconds,
        };
        storage.set(STORAGE_KEYS.FOCUS_SESSION, JSON.stringify(updated));
        return updated;
      });
    });

    const subPerms = ReclaimNative.onPermissionStatusChanged(async status => {
      if (status && typeof status.accessibilityGranted === 'boolean') {
        setPermissions(status);
      } else {
        await refreshPermissions();
      }
    });

    const subConfig = ReclaimNative.onShortsBlockedConfigChanged(({ isBlocked }) => {
      setBlockingConfigState(prev => {
        const updated = { ...prev, youtubeShortsBlocked: isBlocked };
        storage.set(STORAGE_KEYS.BLOCKING_CONFIG, JSON.stringify(updated));
        return updated;
      });
    });

    const subProtection = ReclaimNative.onProtectionStatusChanged(async () => {
      await refreshPermissions();
    });

    return () => {
      subBlocked.remove();
      subScrolled.remove();
      subSession.remove();
      subPerms.remove();
      subConfig.remove();
      subProtection.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshPermissions, refreshStatistics]);

  // Blocking Actions
  const updateBlockingConfig = async (patch: Partial<BlockingConfig>) => {
    const updated = { ...blockingConfig, ...patch };
    setBlockingConfigState(updated);
    storage.set(STORAGE_KEYS.BLOCKING_CONFIG, JSON.stringify(updated));
    await ReclaimNative.setBlockingConfig(updated);
  };

  const toggleYouTubeShorts = async (enabled: boolean) => {
    await updateBlockingConfig({ youtubeShortsBlocked: enabled });
  };

  const toggleYouTubeHomepage = async (enabled: boolean) => {
    await updateBlockingConfig({ youtubeHomepageBlocked: enabled });
  };

  const toggleYouTubeCompletely = async (enabled: boolean) => {
    await updateBlockingConfig({ youtubeCompletelyBlocked: enabled });
  };

  const toggleInstagramCompletely = async (enabled: boolean) => {
    await updateBlockingConfig({ instagramCompletelyBlocked: enabled });
  };

  const toggleInstagramReels = async (enabled: boolean) => {
    await updateBlockingConfig({ instagramReelsBlocked: enabled });
  };

  const toggleSnapchatSpotlight = async (enabled: boolean) => {
    await updateBlockingConfig({ snapchatSpotlightBlocked: enabled });
  };

  const toggleAppBlocked = async (packageName: string, blocked: boolean) => {
    const cur = new Set(blockingConfig.blockedPackages);
    if (blocked) {
      cur.add(packageName);
    } else {
      cur.delete(packageName);
    }
    await updateBlockingConfig({ blockedPackages: Array.from(cur) });
  };

  const toggleDynamicIslandCounter = async (enabled: boolean) => {
    await updateBlockingConfig({ dynamicIslandLiveCounterEnabled: enabled });
    await ReclaimNative.setDynamicIslandCounter(enabled);
  };

  // App Limits
  const saveAppLimit = async (app: AppLimit) => {
    setAppLimitsState(prev => {
      const idx = prev.findIndex(item => item.packageName === app.packageName);
      const updated = idx >= 0
        ? [...prev.slice(0, idx), app, ...prev.slice(idx + 1)]
        : [...prev, app];
      storage.set(STORAGE_KEYS.APP_LIMITS, JSON.stringify(updated));
      ReclaimNative.setAppLimits(updated);
      return updated;
    });
  };

  const removeAppLimit = async (packageName: string) => {
    setAppLimitsState(prev => {
      const updated = prev.filter(item => item.packageName !== packageName);
      storage.set(STORAGE_KEYS.APP_LIMITS, JSON.stringify(updated));
      ReclaimNative.setAppLimits(updated);
      return updated;
    });
  };

  // Blocked Websites
  const addBlockedWebsite = async (domain: string) => {
    const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!clean) return;
    setBlockedWebsitesState(prev => {
      if (prev.includes(clean)) return prev;
      const updated = [...prev, clean];
      storage.set(STORAGE_KEYS.BLOCKED_WEBSITES, JSON.stringify(updated));
      ReclaimNative.setBlockedWebsites(updated);
      return updated;
    });
  };

  const removeBlockedWebsite = async (domain: string) => {
    setBlockedWebsitesState(prev => {
      const updated = prev.filter(s => s !== domain.toLowerCase());
      storage.set(STORAGE_KEYS.BLOCKED_WEBSITES, JSON.stringify(updated));
      ReclaimNative.setBlockedWebsites(updated);
      return updated;
    });
  };

  // Protections
  const toggleProtection = async (key: keyof StrictModeProtections, enabled: boolean) => {
    if (key === 'blockUninstall' && enabled && !permissions.deviceAdminGranted) {
      await ReclaimNative.requestPermission('deviceAdmin');
    }
    const updated = { ...protections, [key]: enabled };
    setProtectionsState(updated);
    storage.set(STORAGE_KEYS.PROTECTIONS, JSON.stringify(updated));
    await ReclaimNative.setProtections(updated);
  };

  // Schedules
  const saveSchedule = async (schedule: ScheduleItem) => {
    setSchedulesState(prev => {
      const idx = prev.findIndex(s => s.id === schedule.id);
      const updated = idx >= 0
        ? [...prev.slice(0, idx), schedule, ...prev.slice(idx + 1)]
        : [...prev, schedule];
      storage.set(STORAGE_KEYS.SCHEDULES, JSON.stringify(updated));
      ReclaimNative.setSchedules(JSON.stringify(updated));
      return updated;
    });
  };

  const removeSchedule = async (id: string) => {
    setSchedulesState(prev => {
      const updated = prev.filter(s => s.id !== id);
      storage.set(STORAGE_KEYS.SCHEDULES, JSON.stringify(updated));
      ReclaimNative.setSchedules(JSON.stringify(updated));
      return updated;
    });
  };

  const toggleSchedule = async (id: string, enabled: boolean) => {
    setSchedulesState(prev => {
      const updated = prev.map(s => (s.id === id ? { ...s, enabled } : s));
      storage.set(STORAGE_KEYS.SCHEDULES, JSON.stringify(updated));
      ReclaimNative.setSchedules(JSON.stringify(updated));
      return updated;
    });
  };

  // Focus Sessions
  const startFocusSession = async (config: {
    durationMinutes: number;
    strictMode: boolean;
    mode?: FocusModeType;
    tag?: string;
    blockedPackages?: string[];
    blockYouTubeShorts?: boolean;
    blockYouTubeHomepage?: boolean;
    blockYouTubeCompletely?: boolean;
  }) => {
    const mode = config.mode || 'timer';
    const tag = config.tag || 'Untagged';
    const totalSecs = config.durationMinutes * 60;
    const pkgs = config.blockedPackages || focusSession.blockedPackages;

    const newSession: FocusSession = {
      isActive: true,
      mode,
      startTime: Date.now(),
      durationMinutes: config.durationMinutes,
      remainingSeconds: totalSecs,
      totalDurationSeconds: totalSecs,
      strictMode: config.strictMode,
      isPaused: false,
      tag,
      blockedPackages: pkgs,
      blockYouTubeShorts: config.blockYouTubeShorts ?? true,
      blockYouTubeHomepage: config.blockYouTubeHomepage ?? false,
      blockYouTubeCompletely: config.blockYouTubeCompletely ?? false,
    };

    setFocusSessionState(newSession);
    storage.set(STORAGE_KEYS.FOCUS_SESSION, JSON.stringify(newSession));

    await ReclaimNative.startFocusSession({
      durationMinutes: config.durationMinutes,
      strictMode: config.strictMode,
      mode,
      tag,
      blockedPackages: pkgs,
      blockYouTubeShorts: config.blockYouTubeShorts ?? true,
      blockYouTubeHomepage: config.blockYouTubeHomepage ?? false,
      blockYouTubeCompletely: config.blockYouTubeCompletely ?? false,
    });
  };

  const pauseFocusSession = async () => {
    setFocusSessionState(prev => {
      const updated = { ...prev, isPaused: true };
      storage.set(STORAGE_KEYS.FOCUS_SESSION, JSON.stringify(updated));
      return updated;
    });
    await ReclaimNative.pauseFocusSession();
  };

  const resumeFocusSession = async () => {
    setFocusSessionState(prev => {
      const updated = { ...prev, isPaused: false };
      storage.set(STORAGE_KEYS.FOCUS_SESSION, JSON.stringify(updated));
      return updated;
    });
    await ReclaimNative.resumeFocusSession();
  };

  const stopFocusSession = async () => {
    setFocusSessionState(prev => {
      const updated: FocusSession = {
        ...prev,
        isActive: false,
        isPaused: false,
        remainingSeconds: 0,
      };
      storage.set(STORAGE_KEYS.FOCUS_SESSION, JSON.stringify(updated));
      return updated;
    });
    await ReclaimNative.stopFocusSession();
  };

  const updateThemeSetting = (newTheme: 'system' | 'dark' | 'light') => {
    const updated = { ...settings, theme: newTheme };
    setSettingsState(updated);
    storage.set(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  };

  const setPin = (pin: string | null) => {
    const updated: AppSettings = {
      ...settings,
      pinProtected: Boolean(pin),
      pinHash: pin ? `hash_${pin}` : null,
    };
    setSettingsState(updated);
    storage.set(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  };

  return (
    <AppContext.Provider
      value={{
        blockingConfig,
        focusSession,
        schedules,
        permissions,
        statistics,
        settings,
        appLimits,
        blockedWebsites,
        protections,
        theme,
        isDark,
        updateBlockingConfig,
        toggleYouTubeShorts,
        toggleYouTubeHomepage,
        toggleYouTubeCompletely,
        toggleInstagramCompletely,
        toggleInstagramReels,
        toggleSnapchatSpotlight,
        toggleAppBlocked,
        toggleDynamicIslandCounter,
        saveAppLimit,
        removeAppLimit,
        addBlockedWebsite,
        removeBlockedWebsite,
        toggleProtection,
        saveSchedule,
        removeSchedule,
        toggleSchedule,
        startFocusSession,
        pauseFocusSession,
        resumeFocusSession,
        stopFocusSession,
        refreshPermissions,
        refreshStatistics,
        updateThemeSetting,
        setPin,
      }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
};
