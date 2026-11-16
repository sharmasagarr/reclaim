# Reclaim – Digital Wellbeing & App Blocking

Reclaim is a production-quality digital wellbeing application designed to help users regain control over screen time and break addictive scrolling habits without losing access to useful tools.

**Core Capabilities**:
1. **Content-level blocking** of **YouTube Shorts**, **Instagram Reels**, and **Snapchat Spotlight** while preserving full access to regular feeds, search, subscriptions, profiles, and messages.
2. **App Limits Engine**: Configurable daily screen time limits with launchable app detection and proactive blocking when exceeded.
3. **Domain-level Website Blocking**: Real-time URL interception across major Android web browsers (Chrome, Firefox, Edge, Opera, Samsung Internet).
4. **Strict Mode Protections**:
   - **Device Admin Protection** preventing unauthorized uninstallation.
   - **Multi-Window & Split Screen Protection** preventing app restriction bypass.
   - **Floating Window & Picture-in-Picture Protection**.
5. **Pixel-Perfect Target UI**: Matches the dark-themed modern wellbeing design with customizable App Limits, independent YouTube content blocking, and clean persistent bottom navigation (`Focus`, `Schedule`, `Blocks`). Zero PRO paywalls or badges.
6. **Edge-to-Edge & Status Bar Inset Protection**: Zero overlap with camera notches, punch-holes, or battery indicators on modern Android 15/16 devices.

---

## 1. System Architecture Overview

```
reclaim/
├── android/
│   └── app/src/main/
│       ├── java/com/reclaim/
│       │   ├── MainActivity.kt               # Main React Native Activity
│       │   ├── MainApplication.kt            # React Application entry point
│       │   ├── accessibility/
│       │   │   └── ReclaimAccessibilityService.kt  # Unified UI inspector (Shorts, Reels, Spotlight, Limits, Web, Strict)
│       │   ├── admin/
│       │   │   └── ReclaimDeviceAdminReceiver.kt   # Device Admin protection receiver
│       │   ├── detection/
│       │   │   ├── ShortsDetectionEngine.kt   # YouTube Shorts screen classification
│       │   │   └── DetectionState.kt          # State machine & confidence scoring
│       │   ├── blocking/
│       │   │   ├── BlockingActivity.kt        # Edge-to-edge safe native blocking UI
│       │   │   └── BlockingManager.kt         # Manages overlay & Grace Pass lifecycle
│       │   ├── island/
│       │   │   └── DynamicIslandManager.kt    # OxygenOS / Android capsule live counter
│       │   ├── session/
│       │   │   └── FocusSessionManager.kt     # Persistent native session timer
│       │   ├── stats/
│       │   │   └── UsageStatsHelper.kt        # Foreground usage & today's screen time
│       │   └── bridge/
│       │       ├── ReclaimNativeModule.kt     # React Native Bridge API (Limits, Sites, Protections, Apps)
│       │       └── ReclaimPackage.kt          # Native module package registration
│       ├── res/
│       │   ├── layout/activity_blocking.xml   # Native blocking view layout with fitsSystemWindows
│       │   ├── xml/accessibility_service_config.xml # Global interactive window monitoring
│       │   └── xml/device_admin.xml           # Device administration policy definition
│       └── AndroidManifest.xml
│
├── src/
│   ├── components/                          # Reusable UI components (Card, Button, Header, SwitchRow)
│   ├── screens/
│   │   ├── Blocks/                          # Blocks Screen (App Limits, Shorts, Sites, Strict Protections)
│   │   ├── Focus/                           # Active session timer & controls
│   │   ├── Schedule/                        # Mindful routines & automated downtime
│   │   ├── Home/                            # Activity Dashboard & status
│   │   ├── Statistics/                      # Screen time & distraction metrics
│   │   ├── Permissions/                     # Transparent permissions onboarding
│   │   └── Settings/                        # Strict mode, PIN, preferences
│   ├── navigation/                          # React Navigation 3-tab custom persistent bar
│   ├── store/                               # Local state & persistence (MMKV)
│   ├── bridge/                              # TypeScript native module wrapper
│   ├── theme/                               # Design tokens (near-black bg, dashed borders, green accent)
│   └── types/                               # TypeScript domain models
│
└── __tests__/                               # Automated unit & integration tests
```

---

## 2. Environment & Configuration Status

| Component | Target / Installed Version | Status |
| :--- | :--- | :--- |
| **React Native** | `0.88.1` | Installed & verified |
| **React** | `19.3.0` | Installed & verified |
| **Hermes** | Enabled (`hermesEnabled=true`) | Active |
| **New Architecture** | Enabled (`newArchEnabled=true`) | Active |
| **Edge-to-Edge** | Enabled (`edgeToEdgeEnabled=true`) | Active with safe-area insets |
| **Kotlin** | `2.2.0` | Configured & compiled |
| **Gradle** | `9.4.1` with OpenJDK 17 | Verified |
| **compileSdk / targetSdk** | `compileSdk=37`, `targetSdk=36`, `minSdk=24` | Configured |
| **Connected Test Device** | OnePlus CPH2717, Android 16 | Attached & Verified |
| **Target App on Device** | YouTube (`com.google.android.youtube` v21.42.243) | Verified |
| **In-App Overlay Blocker** | `ShortsOverlayBlocker.kt` (Dynamic coordinates, audio focus) | Verified on device |
| **Debug APK Build** | `assembleDebug` with offline bundle | Verified (`app-debug.apk`) |
| **Unit Tests** | Jest 29.6.3 | Passed (`npm.cmd test`) |
| **Linting** | ESLint 8.19.0 | Clean (`npm.cmd run lint`) |

---

## 3. In-App Style Shorts Blocking Overlay

Reclaim implements an in-app overlay for YouTube Shorts that leaves YouTube's native bottom navigation bar intact and interactive:

1. **Dynamic Bounds Calculation**:
   - Inspects `rootInActiveWindow` via BFS to detect `com.google.android.youtube:id/bottom_bar_container` or navigation nodes.
   - Top offset: dynamically resolves `status_bar_height` so the system status bar and camera punch-hole are never covered.
   - Height: dynamically set to `bottomBarTop - statusBarHeight`, leaving YouTube's bottom navigation bar (`Home`, `Shorts`, `Create`, `Subscriptions`, `You`) 100% uncovered.

2. **Window Layering & Focus Isolation**:
   - Uses `WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY` with fallback to `TYPE_APPLICATION_OVERLAY`.
   - Window flags: `FLAG_NOT_FOCUSABLE or FLAG_NOT_TOUCH_MODAL or FLAG_LAYOUT_IN_SCREEN`.
   - `FLAG_NOT_FOCUSABLE` ensures YouTube retains primary window focus, allowing touches to pass directly to YouTube's native bottom navigation bar without destroying the overlay.

3. **Background Media Pause**:
   - Requests `AudioManager.AUDIOFOCUS_GAIN_TRANSIENT` upon attaching overlay, immediately pausing YouTube video and audio playback behind the blocking card.
   - Abandons audio focus upon dismissal, allowing normal YouTube videos to play cleanly.

4. **Return & Breather Navigation**:
   - **Return to Productive Viewing**: Clicks the native YouTube `Home` node via `AccessibilityNodeInfo.ACTION_CLICK` with a 2.5-second transient grace period.
   - **Take a 5-minute breather**: Grants a 5-minute temporary pass and activates the Dynamic Island live counter in the status bar.

---

## 4. Screen Structure: Blocks Screen

Following the reference UI:

### A. Header
- **Title**: `Blocks`
- **Right Action**: `[ 💬 Help ]` pill button opening comprehensive guidance modal.
- **Top Safe-Area**: Dynamic padding (`insets.top + 16`) to guarantee zero status bar or camera notch collision.

### B. App Limits
- **Title**: `App Limits`
- **Action**: `+ Add App` in bright green (`#22C55E`).
- **Cards**:
  - Border: Dashed `#2E2E34`, 1.2px width, 16px radius.
  - App icon (retrieved dynamically from Android Package Manager as Base64 PNG).
  - App name and daily limit (e.g. `YouTube – 2h 40m Limit`, `Smash Karts – 40m Limit`).
  - Action pill button: `+ Add` / `✓ Added`.
- **Installed App Picker**: Fast searchable modal querying all launchable apps on the device in a background thread.
- **Limit Configurator**: Presets (15m, 30m, 40m, 1h, 1h 30m, 2h, 2h 40m) + custom slider.

### C. Block Shorts
- Dedicated content restriction controls for short-form addictive feeds.
- **YouTube Shorts** (`⚡` icon, red background): Blocks vertical Shorts player while allowing regular YouTube videos, subscriptions, search, and home feed.
- **IG Reels** (`🎬` icon, Instagram gradient/magenta background): Blocks Instagram Reels viewer while keeping feed, messages, and profiles accessible.
- **Snapchat Spotlight** (`👻` icon, Snapchat yellow background): Blocks vertical Spotlight scrolling while keeping Snaps and chats accessible.

### D. Other Blocks
- **Block Websites** (`🌐` icon, dark card):
  - Manages blocked domains (e.g. `twitter.com`, `reddit.com`, `tiktok.com`, `instagram.com`).
  - Native Accessibility Service reads URL bar across Chrome, Firefox, Edge, Brave, Samsung Internet and immediately blocks restricted URLs.

### E. Strict Mode Protections
- **Block Reclaim app uninstall**: Uses Android `DevicePolicyManager` (Device Administrator API) and Settings interception to prevent removing Reclaim during active sessions.
- **Block split screen**: Inspects multi-window bounds vs real display metrics; blocks blocked apps from running in split-screen mode.
- **Block floating window**: Detects Picture-in-Picture (PiP) and OEM floating mini-windows.

---

## 4. Bottom Navigation Tabs

The persistent navigation bar contains 3 tabs:
1. **Focus** (⏳ Hourglass)
2. **Schedule** (📅 Calendar)
3. **Blocks** (⊘ Prohibition circle with active green pill highlight `#22C55E`)

---

## 5. Safe Area & Edge-to-Edge Strategy

On Android 15 & 16, edge-to-edge rendering is mandatory.
- **React Native**: Every screen wraps its scroll container with `useSafeAreaInsets()`, applying `paddingTop: insets.top + 16` and `paddingBottom: insets.bottom + 90`.
- **Native Android (`BlockingActivity`)**:
  - `fitsSystemWindows="true"` on the root `ScrollView`.
  - `ViewCompat.setOnApplyWindowInsetsListener` applies top insets dynamically to ensure the motivational message, Reclaim branding, and return buttons never collide with status bar items or camera cutouts.
- **Graceful Return Flow**: Clicking "Return to Normal YouTube" sets a 60-second grace pass and launches YouTube's home launcher intent, cleanly exiting the Shorts player without looping.
