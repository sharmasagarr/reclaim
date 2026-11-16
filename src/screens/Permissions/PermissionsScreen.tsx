import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  AppState,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../store/appStore';
import { ReclaimNative } from '../../bridge/ReclaimNative';

export const PermissionsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { permissions, refreshPermissions } = useAppStore();

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmOption, setConfirmOption] = useState<'yes' | 'no'>('yes');
  const [showWhyModal, setShowWhyModal] = useState(false);

  // Auto-refresh permission status when user returns from Android Settings
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        refreshPermissions().then(() => {
          if (currentStep > 0 && !showTutorialModal) {
            setShowConfirmModal(true);
          }
        });
      }
    });
    return () => sub.remove();
  }, [currentStep, refreshPermissions, showTutorialModal]);

  const handleAllowClick = async () => {
    setShowTutorialModal(true);
  };

  const proceedToNativeSettings = async () => {
    setShowTutorialModal(false);
    if (currentStep === 1) {
      await ReclaimNative.requestPermission('usageStats');
    } else if (currentStep === 2) {
      await ReclaimNative.requestPermission('overlay');
    } else if (currentStep === 3) {
      await ReclaimNative.requestPermission('accessibility');
    }
  };

  const handleConfirmNext = () => {
    setShowConfirmModal(false);
    if (confirmOption === 'yes') {
      if (currentStep < 3) {
        setCurrentStep(prev => prev + 1);
      } else {
        navigation.navigate('MainTabs');
      }
    }
  };

  // -------------------------------------------------------------
  // STEP 0: INTRO SCREEN (Image 12)
  // -------------------------------------------------------------
  if (currentStep === 0) {
    return (
      <View style={[styles.container, { backgroundColor: '#071611' }]}>
        <View style={styles.topStatusGlow} />
        <View
          style={[
            styles.introContent,
            {
              paddingTop: insets.top + 60,
              paddingBottom: insets.bottom + 40,
            },
          ]}>
          <View style={styles.mascotIntroWrap}>
            {/* Speech bubble */}
            <View style={styles.speechBubbleIntro}>
              <Text style={styles.speechBubbleIntroText}>
                We need a few permissions to help you block distractions
              </Text>
            </View>

            {/* Mascot in circle */}
            <View style={styles.mascotCircleLarge}>
              <Text style={styles.mascotBigEmoji}>🐸</Text>
            </View>
          </View>

          {/* Bottom Button */}
          <TouchableOpacity
            style={styles.whitePillButton}
            onPress={() => setCurrentStep(1)}
            activeOpacity={0.85}>
            <Text style={styles.whitePillButtonText}>Complete the last step</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // -------------------------------------------------------------
  // STEPS 1, 2, 3: PERMISSIONS ONBOARDING (Images 9, 13, 15)
  // -------------------------------------------------------------
  const stepConfigs = [
    {
      step: 1,
      title: 'Usage permission',
      speech: 'To find your distracting apps, we need usage access.',
      keyword: 'find your distracting apps',
      granted: permissions?.usageStatsGranted ?? false,
      footerText: 'Accelerated by Google',
    },
    {
      step: 2,
      title: 'Display over other apps',
      speech: 'Blocking distracting apps requires permission to display over other apps.',
      keyword: 'Blocking distracting apps',
      granted: permissions?.overlayGranted ?? false,
      footerText: 'Accelerated by Google',
    },
    {
      step: 3,
      title: 'Background permission',
      speech: 'To keep the focus timer running, we need background access.',
      keyword: 'keep the focus timer running',
      granted: permissions?.accessibilityGranted ?? false,
      footerText: 'Your privacy matters to us 💚',
    },
  ];

  const activeConfig = stepConfigs[currentStep - 1] || stepConfigs[0];

  return (
    <View style={[styles.container, { backgroundColor: '#071611' }]}>
      <View
        style={[
          styles.stepContent,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 30,
          },
        ]}>
        {/* Top Progress Bar */}
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${(currentStep / 3) * 100}%` },
            ]}
          />
        </View>

        {/* Mascot + Speech Bubble */}
        <View style={styles.mascotSpeechRow}>
          <View style={styles.mascotCircleSmall}>
            <Text style={styles.mascotSmallEmoji}>🐸</Text>
          </View>
          <View style={styles.speechBubbleCard}>
            <Text style={styles.speechBubbleText}>
              {activeConfig.speech}
            </Text>
          </View>
        </View>

        {/* Permission Action Card */}
        <View style={[styles.permCard, { backgroundColor: '#18181B' }]}>
          <Text style={styles.permCardTitle}>{activeConfig.title}</Text>
          <TouchableOpacity
            style={[
              styles.allowButton,
              activeConfig.granted && styles.allowButtonGranted,
            ]}
            onPress={handleAllowClick}
            activeOpacity={0.85}>
            <Text
              style={[
                styles.allowButtonText,
                activeConfig.granted && styles.allowButtonTextGranted,
              ]}>
              {activeConfig.granted ? 'Granted ✓' : 'Allow'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer info & Why link */}
        <View style={styles.footerWrap}>
          <Text style={styles.footerSubtext}>{activeConfig.footerText}</Text>

          <TouchableOpacity
            style={styles.whyLinkBtn}
            onPress={() => setShowWhyModal(true)}
            activeOpacity={0.7}>
            <Text style={styles.whyLinkText}>? Why these permissions? ›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* -------------------------------------------------------------
          TUTORIAL GUIDE MODAL (Image 10)
          ------------------------------------------------------------- */}
      <Modal visible={showTutorialModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.tutorialCard, { backgroundColor: '#18181B' }]}>
            {/* Preview header */}
            <View style={styles.tutorialPreviewBox}>
              <Text style={styles.tutorialPreviewTitle}>
                {activeConfig.title}
              </Text>
              <Text style={styles.tutorialPreviewDesc}>
                This permission allows background apps to appear on the screen and accurately intercept distracting feeds.
              </Text>
              <View style={styles.step4Badge}>
                <Text style={styles.step4BadgeText}>Step 4 👆</Text>
              </View>
            </View>

            {/* Numbered Steps List */}
            <View style={styles.stepsList}>
              <View style={styles.stepItemRow}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={styles.stepInstructionText}>Scroll down and tap on "Apps"</Text>
              </View>

              <View style={styles.stepItemRow}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={styles.stepInstructionText}>Tap on "Special App Access"</Text>
              </View>

              <View style={styles.stepItemRow}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={styles.stepInstructionText}>Tap on "{activeConfig.title}"</Text>
              </View>

              <View style={styles.stepItemRow}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>4</Text>
                </View>
                <Text style={styles.stepInstructionText}>Scroll down and tap on "Reclaim"</Text>
              </View>

              <View style={styles.stepItemRow}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>5</Text>
                </View>
                <Text style={styles.stepInstructionText}>Turn on the permission toggle</Text>
              </View>
            </View>

            {/* Got it Button */}
            <TouchableOpacity
              style={styles.whitePillButton}
              onPress={proceedToNativeSettings}
              activeOpacity={0.85}>
              <Text style={styles.whitePillButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* -------------------------------------------------------------
          CONFIRMATION MODAL (Image 14)
          ------------------------------------------------------------- */}
      <Modal visible={showConfirmModal} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.confirmCard, { backgroundColor: '#18181B' }]}>
            <Text style={styles.confirmTitle}>
              Have you finished all the steps?
            </Text>

            <TouchableOpacity
              style={styles.radioRow}
              onPress={() => setConfirmOption('yes')}
              activeOpacity={0.7}>
              <View
                style={[
                  styles.radioOuter,
                  confirmOption === 'yes' && styles.radioOuterSelected,
                ]}>
                {confirmOption === 'yes' && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>Yes, I have finished</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.radioRow}
              onPress={() => setConfirmOption('no')}
              activeOpacity={0.7}>
              <View
                style={[
                  styles.radioOuter,
                  confirmOption === 'no' && styles.radioOuterSelected,
                ]}>
                {confirmOption === 'no' && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>No, I didn't</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.whitePillButton, { marginTop: 24 }]}
              onPress={handleConfirmNext}
              activeOpacity={0.85}>
              <Text style={styles.whitePillButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Why Permissions Info Modal */}
      <Modal visible={showWhyModal} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.confirmCard, { backgroundColor: '#18181B' }]}>
            <Text style={styles.confirmTitle}>Privacy & Offline First</Text>
            <Text style={styles.whyInfoText}>
              • <Text style={{ fontWeight: '700', color: '#FFFFFF' }}>Zero Backend</Text>: All rules, limits, and monitoring happen 100% locally on your phone.{'\n\n'}
              • <Text style={{ fontWeight: '700', color: '#FFFFFF' }}>No Personal Data</Text>: Reclaim never inspects keystrokes, messages, passwords, or personal photos.{'\n\n'}
              • <Text style={{ fontWeight: '700', color: '#FFFFFF' }}>Targeted Detection</Text>: Accessibility is used strictly to identify vertical scrolling reels/shorts without blocking normal productive tools.
            </Text>
            <TouchableOpacity
              style={[styles.whitePillButton, { marginTop: 16 }]}
              onPress={() => setShowWhyModal(false)}
              activeOpacity={0.85}>
              <Text style={styles.whitePillButtonText}>Understood</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topStatusGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: '#0F2F23',
    opacity: 0.5,
  },
  introContent: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mascotIntroWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  speechBubbleIntro: {
    backgroundColor: '#202024',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 18,
    marginBottom: 32,
    maxWidth: '90%',
  },
  speechBubbleIntroText: {
    color: '#E4E4E7',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 26,
  },
  mascotCircleLarge: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#132A1C',
    borderWidth: 2,
    borderColor: '#34D399',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascotBigEmoji: {
    fontSize: 68,
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  progressBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#27272A',
    width: '100%',
    overflow: 'hidden',
    marginBottom: 40,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  mascotSpeechRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 40,
  },
  mascotCircleSmall: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#132A1C',
    borderWidth: 1.5,
    borderColor: '#34D399',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  mascotSmallEmoji: {
    fontSize: 28,
  },
  speechBubbleCard: {
    flex: 1,
    backgroundColor: '#202024',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  speechBubbleText: {
    color: '#E4E4E7',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  permCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 'auto',
  },
  permCardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  allowButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  allowButtonGranted: {
    backgroundColor: '#1E462E',
  },
  allowButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
  allowButtonTextGranted: {
    color: '#4ADE80',
  },
  footerWrap: {
    alignItems: 'center',
    width: '100%',
  },
  footerSubtext: {
    color: '#71717A',
    fontSize: 14,
    marginBottom: 16,
  },
  whyLinkBtn: {
    backgroundColor: '#202024',
    borderRadius: 16,
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
  },
  whyLinkText: {
    color: '#A1A1AA',
    fontSize: 14,
    fontWeight: '600',
  },
  whyInfoText: {
    color: '#D4D4D8',
    fontSize: 14,
    lineHeight: 22,
    marginVertical: 14,
  },
  whitePillButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  whitePillButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  tutorialCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 36,
  },
  tutorialPreviewBox: {
    backgroundColor: '#27272A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  tutorialPreviewTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  tutorialPreviewDesc: {
    color: '#A1A1AA',
    fontSize: 12,
    lineHeight: 18,
  },
  step4Badge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'center',
    marginTop: 12,
  },
  step4BadgeText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '700',
  },
  stepsList: {
    gap: 14,
    marginBottom: 24,
  },
  stepItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
  },
  stepInstructionText: {
    color: '#E4E4E7',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 36,
  },
  confirmTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 20,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#71717A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  radioOuterSelected: {
    borderColor: '#22C55E',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
  },
  radioLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
