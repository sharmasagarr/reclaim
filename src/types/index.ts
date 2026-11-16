export interface PermissionStatus {
  accessibilityGranted: boolean;
  usageStatsGranted: boolean;
  overlayGranted: boolean;
  notificationGranted: boolean;
  deviceAdminGranted: boolean;
}

export interface BlockingConfig {
  youtubeCompletelyBlocked: boolean;
  youtubeHomepageBlocked: boolean;
  youtubeShortsBlocked: boolean;
  instagramCompletelyBlocked: boolean;
  instagramReelsBlocked: boolean;
  snapchatSpotlightBlocked: boolean;
  blockedPackages: string[];
  blockAdultContent: boolean;
  studyMode: boolean;
  dynamicIslandLiveCounterEnabled: boolean;
}

export type FocusModeType = 'timer' | 'stopwatch' | 'pomodoro';

export interface FocusSession {
  isActive: boolean;
  mode: FocusModeType;
  startTime: number | null;
  durationMinutes: number;
  remainingSeconds: number;
  totalDurationSeconds: number;
  strictMode: boolean;
  isPaused: boolean;
  tag: string;
  blockedPackages: string[];
  blockYouTubeShorts: boolean;
  blockYouTubeHomepage: boolean;
  blockYouTubeCompletely: boolean;
}

export interface ScheduleItem {
  id: string;
  title: string;
  startTime: string; // e.g. "06:00"
  endTime: string;   // e.g. "08:00"
  daysOfWeek: number[]; // 1 = Monday .. 7 = Sunday
  enabled: boolean;
  blockedPackages: string[];
  blockYouTubeShorts: boolean;
  blockYouTubeHomepage: boolean;
  blockYouTubeCompletely: boolean;
  blockAdultContent: boolean;
}

export interface AppLimit {
  packageName: string;
  appName: string;
  limitMinutes: number;
  enabled: boolean;
  todayUsageMinutes?: number;
  iconUri?: string;
}

export interface InstalledApp {
  packageName: string;
  appName: string;
  iconUri?: string;
  todayUsageMinutes?: number;
}

export interface StrictModeProtections {
  blockUninstall: boolean;
  blockSplitScreen: boolean;
  blockFloatingWindow: boolean;
  deviceAdminActive: boolean;
}

export interface DailyStatistics {
  todayScreenTimeMinutes: number;
  distractingTimeMinutes: number;
  shortsBlocksCount: number;
  unblockedShortsScrolledCount: number;
  focusSessionsCompleted: number;
  totalFocusMinutes: number;
}

export interface AppSettings {
  theme: 'system' | 'dark' | 'light';
  pinProtected: boolean;
  pinHash: string | null;
  strictModeEnabled: boolean;
  dynamicIslandCounter: boolean;
}
