import { useEffect, useState } from 'react';
import {
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import { useFloatingTabBarClearance } from '@/components/floating-tab-bar';
import { Typography } from '@/constants/typography';
import { useProfile } from '@/contexts/profile-context';

const C = {
  background: '#F5F7F2',
  surface: '#FFFFFF',
  green: '#123D32',
  greenLight: '#E7F0E9',
  lime: '#B7E36A',
  text: '#26352F',
  muted: '#87918A',
  border: '#E9EDE7',
  orange: '#E9A34B',
  red: '#D9534F',
};

/**
 * Extracts initials dynamically from any display name.
 * e.g., "WattWise User" -> "WU", "Alex" -> "AL", "" -> "WW"
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'WW';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Simple email validation helper.
 */
function isValidEmail(email: string): boolean {
  if (!email.trim()) return true; // Email is optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export default function ProfileScreen() {
  const router = useRouter();
  const bottomClearance = useFloatingTabBarClearance();

  // Android hardware back button handler: returns reliably to Settings
  useEffect(() => {
    const onBackPress = () => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/settings');
      }
      return true;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );

    return () => subscription.remove();
  }, [router]);

  // Personal Information (Shared via ProfileContext)
  const { displayName, email, updateProfile } = useProfile();
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);

  // Temporary edit buffers for personal information
  const [editName, setEditName] = useState(displayName);
  const [editEmail, setEditEmail] = useState(email);

  // Electricity Preferences (Configurable component state with sample defaults)
  const [tariff, setTariff] = useState('8.63');
  const [monthlyBudget, setMonthlyBudget] = useState('3000');
  const [dailyGoal, setDailyGoal] = useState('10.0');

  // Device configuration source (from environment if configured, otherwise 'Not configured')
  const configuredDeviceId = process.env.EXPO_PUBLIC_DEVICE_ID || 'Not configured';

  // Personal details save action with validation
  const handleSavePersonal = () => {
    const trimmedName = editName.trim();
    const trimmedEmail = editEmail.trim();

    if (!trimmedName) {
      Alert.alert('Invalid Name', 'Display name cannot be empty. Please enter a name.');
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      Alert.alert(
        'Invalid Email',
        'Please enter a valid email address (e.g., user@example.com) or leave the field empty.'
      );
      return;
    }

    // Persist to shared ProfileContext
    updateProfile({ displayName: trimmedName, email: trimmedEmail });
    setIsEditingPersonal(false);
    Alert.alert('Profile Updated', 'Your personal details have been updated.');
  };

  // Personal details cancel action
  const handleCancelPersonal = () => {
    setEditName(displayName);
    setEditEmail(email);
    setIsEditingPersonal(false);
  };

  // Electricity preferences save action
  const handleSavePreferences = () => {
    const numTariff = parseFloat(tariff);
    const numBudget = parseFloat(monthlyBudget);
    const numGoal = parseFloat(dailyGoal);

    if (isNaN(numTariff) || numTariff <= 0) {
      Alert.alert('Invalid Tariff', 'Please enter a valid positive electricity tariff rate.');
      return;
    }

    if (isNaN(numBudget) || numBudget <= 0) {
      Alert.alert('Invalid Budget', 'Please enter a valid positive monthly budget amount.');
      return;
    }

    if (isNaN(numGoal) || numGoal <= 0) {
      Alert.alert('Invalid Goal', 'Please enter a valid positive daily consumption goal in kWh.');
      return;
    }

    Alert.alert(
      'Preferences Updated',
      `Settings saved for this session:\n• Tariff: ৳${numTariff.toFixed(2)}/kWh\n• Monthly Budget: ৳${numBudget.toFixed(0)}\n• Daily Target: ${numGoal.toFixed(1)} kWh`
    );
  };

  // Electricity preferences reset action
  const handleResetPreferences = () => {
    setTariff('8.63');
    setMonthlyBudget('3000');
    setDailyGoal('10.0');
    Alert.alert('Preferences Reset', 'Sample electricity defaults restored.');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingBottom: bottomClearance }]}
        >
          {/* Top Navigation Bar */}
          <View style={styles.topBar}>
            <Pressable
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/settings');
                }
              }}
              style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel="Go back to Settings"
            >
              <Text style={styles.backButtonIcon}>‹</Text>
              <Text style={styles.backButtonLabel}>Settings</Text>
            </Pressable>

            <Text style={styles.topBarTitle}>My Profile</Text>

            <View style={styles.topBarRightPlaceholder} />
          </View>

          {/* Profile Header Card */}
          <View style={styles.headerCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
            </View>

            <Text style={styles.profileName}>{displayName}</Text>

            <Text style={styles.profileEmail}>
              {email ? email : 'No email provided · Local user'}
            </Text>

            <View style={styles.accountBadge}>
              <View style={styles.accountBadgeDot} />
              <Text style={styles.accountBadgeText}>LOCAL PROFILE</Text>
            </View>
          </View>

          {/* Section: Personal Information */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>PERSONAL INFORMATION</Text>
            {!isEditingPersonal && (
              <Pressable
                onPress={() => {
                  setEditName(displayName);
                  setEditEmail(email);
                  setIsEditingPersonal(true);
                }}
                style={({ pressed }) => [styles.inlineEditBtn, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel="Edit Personal Information"
              >
                <Text style={styles.inlineEditBtnText}>Edit</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.card}>
            {!isEditingPersonal ? (
              // View Mode
              <View style={styles.infoCol}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Display Name</Text>
                  <Text style={styles.infoValue}>{displayName}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email Address</Text>
                  <Text style={email ? styles.infoValue : styles.infoValueEmpty}>
                    {email ? email : 'Not specified (optional)'}
                  </Text>
                </View>
              </View>
            ) : (
              // Edit Mode
              <View style={styles.formCol}>
                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>DISPLAY NAME</Text>
                  <TextInput
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="e.g. WattWise User"
                    placeholderTextColor={C.muted}
                    autoCapitalize="words"
                    style={styles.textInput}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.inputLabel}>EMAIL ADDRESS (OPTIONAL)</Text>
                  <TextInput
                    value={editEmail}
                    onChangeText={setEditEmail}
                    placeholder="e.g. user@example.com"
                    placeholderTextColor={C.muted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.textInput}
                  />
                </View>

                <View style={styles.formActionsRow}>
                  <Pressable
                    style={[styles.actionBtn, styles.cancelBtn]}
                    onPress={handleCancelPersonal}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.actionBtn, styles.saveBtn]}
                    onPress={handleSavePersonal}
                  >
                    <Text style={styles.saveBtnText}>Save</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {/* Section: Electricity Preferences (UI Preparation) */}
          <Text style={styles.sectionHeading}>ELECTRICITY PREFERENCES</Text>

          <View style={styles.card}>
            {/* Standard Non-Configurable Parameters */}
            <View style={styles.paramGrid}>
              <View style={styles.paramBox}>
                <Text style={styles.paramLabel}>CURRENCY</Text>
                <Text style={styles.paramValue}>BDT (৳)</Text>
                <Text style={styles.paramSub}>Bangladeshi Taka</Text>
              </View>

              <View style={styles.paramBox}>
                <Text style={styles.paramLabel}>ENERGY UNIT</Text>
                <Text style={styles.paramValue}>kWh</Text>
                <Text style={styles.paramSub}>Kilowatt-hour</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Editable Preference Inputs */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>ELECTRICITY TARIFF (SAMPLE RATE)</Text>
              <View style={styles.inputWithAddon}>
                <View style={styles.addonLeft}>
                  <Text style={styles.addonText}>৳</Text>
                </View>
                <TextInput
                  value={tariff}
                  onChangeText={setTariff}
                  keyboardType="decimal-pad"
                  placeholder="8.63"
                  placeholderTextColor={C.muted}
                  style={styles.inputField}
                />
                <View style={styles.addonRight}>
                  <Text style={styles.addonText}>/ kWh</Text>
                </View>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>MONTHLY ELECTRICITY BUDGET</Text>
              <View style={styles.inputWithAddon}>
                <View style={styles.addonLeft}>
                  <Text style={styles.addonText}>৳</Text>
                </View>
                <TextInput
                  value={monthlyBudget}
                  onChangeText={setMonthlyBudget}
                  keyboardType="numeric"
                  placeholder="3000"
                  placeholderTextColor={C.muted}
                  style={styles.inputField}
                />
                <View style={styles.addonRight}>
                  <Text style={styles.addonText}>/ month</Text>
                </View>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>DAILY ENERGY GOAL</Text>
              <View style={styles.inputWithAddon}>
                <TextInput
                  value={dailyGoal}
                  onChangeText={setDailyGoal}
                  keyboardType="decimal-pad"
                  placeholder="10.0"
                  placeholderTextColor={C.muted}
                  style={styles.inputField}
                />
                <View style={styles.addonRight}>
                  <Text style={styles.addonText}>kWh / day</Text>
                </View>
              </View>
            </View>

            <View style={styles.prefActionsRow}>
              <Pressable
                style={[styles.prefBtn, styles.prefResetBtn]}
                onPress={handleResetPreferences}
              >
                <Text style={styles.prefResetBtnText}>Reset Defaults</Text>
              </Pressable>

              <Pressable
                style={[styles.prefBtn, styles.prefSaveBtn]}
                onPress={handleSavePreferences}
              >
                <Text style={styles.prefSaveBtnText}>Save Preferences</Text>
              </Pressable>
            </View>

            <Text style={styles.prefDisclaimer}>
              Values above are sample defaults for UI preparation. Local persistence and billing synchronization will be connected in Phase 2.
            </Text>
          </View>

          {/* Section: Device Information (Truthful Status) */}
          <Text style={styles.sectionHeading}>DEVICE INFORMATION</Text>

          <View style={styles.deviceCard}>
            <View style={styles.deviceHeader}>
              <View style={styles.deviceIconBox}>
                <Text style={styles.deviceIconSymbol}>ϟ</Text>
              </View>

              <View style={styles.deviceMeta}>
                <Text style={styles.deviceName}>WattWise Energy Monitor</Text>
                <Text style={styles.deviceIdLabel}>
                  Device ID:{' '}
                  <Text style={styles.deviceIdHighlight}>{configuredDeviceId}</Text>
                </Text>
              </View>

              <View style={styles.deviceStatusBadge}>
                <View style={styles.deviceStatusDot} />
                <Text style={styles.deviceStatusText}>Awaiting hardware</Text>
              </View>
            </View>

            <View style={styles.deviceDivider} />

            <View style={styles.deviceSpecsGrid}>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Controller</Text>
                <Text style={styles.specValue}>ESP32</Text>
              </View>

              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Sensor IC</Text>
                <Text style={styles.specValue}>PZEM-004T</Text>
              </View>

              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Connection</Text>
                <Text style={styles.specValue}>Wi-Fi / REST</Text>
              </View>
            </View>

            <Text style={styles.deviceNote}>
              Hardware is not connected yet. Once the ESP32 is powered on and reporting measurements to the backend, status will update automatically.
            </Text>
          </View>

          <Text style={styles.footerNote}>WattWise Profile · Phase 1</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 12,
  },

  /* Top Navigation Bar */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 6,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingRight: 10,
  },
  backButtonIcon: {
    ...Typography.heading.bold,
    fontSize: 26,
    color: C.green,
    marginRight: 4,
    lineHeight: 28,
  },
  backButtonLabel: {
    ...Typography.body.semiBold,
    fontSize: 13,
    color: C.green,
  },
  topBarTitle: {
    ...Typography.heading.bold,
    fontSize: 17,
    color: C.green,
  },
  topBarRightPlaceholder: {
    width: 60,
  },

  /* Profile Header Card */
  headerCard: {
    backgroundColor: C.surface,
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: {
    ...Typography.heading.bold,
    fontSize: 28,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  profileName: {
    ...Typography.heading.bold,
    fontSize: 20,
    color: C.green,
    marginBottom: 4,
  },
  profileEmail: {
    ...Typography.body.regular,
    fontSize: 12,
    color: C.muted,
    marginBottom: 12,
  },
  accountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.greenLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  accountBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.green,
  },
  accountBadgeText: {
    ...Typography.body.bold,
    fontSize: 9,
    color: C.green,
    letterSpacing: 0.8,
  },

  /* Section Headers */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 6,
  },
  sectionHeading: {
    ...Typography.heading.bold,
    color: C.muted,
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 6,
  },
  inlineEditBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  inlineEditBtnText: {
    ...Typography.body.bold,
    color: C.green,
    fontSize: 11,
  },

  /* Shared Card Style */
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    marginBottom: 24,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 14,
  },

  /* Information View Mode */
  infoCol: {
    gap: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    ...Typography.body.regular,
    fontSize: 12,
    color: C.muted,
  },
  infoValue: {
    ...Typography.body.semiBold,
    fontSize: 13,
    color: C.text,
  },
  infoValueEmpty: {
    ...Typography.body.regular,
    fontSize: 12,
    color: C.muted,
    fontStyle: 'italic',
  },

  /* Personal Form Edit Mode */
  formCol: {
    gap: 14,
  },
  formGroup: {
    gap: 6,
  },
  inputLabel: {
    ...Typography.body.bold,
    fontSize: 9,
    color: C.muted,
    letterSpacing: 0.8,
  },
  textInput: {
    ...Typography.body.regular,
    backgroundColor: C.background,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: C.text,
  },
  formActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: C.background,
    borderWidth: 1,
    borderColor: C.border,
  },
  cancelBtnText: {
    ...Typography.body.semiBold,
    color: C.text,
    fontSize: 12,
  },
  saveBtn: {
    backgroundColor: C.green,
  },
  saveBtnText: {
    ...Typography.body.bold,
    color: '#FFFFFF',
    fontSize: 12,
  },

  /* Parameter Grid */
  paramGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  paramBox: {
    flex: 1,
    backgroundColor: C.background,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  paramLabel: {
    ...Typography.body.bold,
    fontSize: 9,
    color: C.muted,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  paramValue: {
    ...Typography.number.bold,
    fontSize: 16,
    color: C.green,
    marginBottom: 2,
  },
  paramSub: {
    ...Typography.body.regular,
    fontSize: 10,
    color: C.muted,
  },

  /* Input With Addon */
  inputWithAddon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.background,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  addonLeft: {
    marginRight: 6,
  },
  addonRight: {
    marginLeft: 6,
  },
  addonText: {
    ...Typography.body.semiBold,
    fontSize: 12,
    color: C.muted,
  },
  inputField: {
    ...Typography.number.bold,
    flex: 1,
    fontSize: 14,
    color: C.text,
    paddingVertical: 0,
  },

  /* Preferences Actions */
  prefActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  prefBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  prefResetBtn: {
    backgroundColor: C.background,
    borderWidth: 1,
    borderColor: C.border,
  },
  prefResetBtnText: {
    ...Typography.body.semiBold,
    color: C.muted,
    fontSize: 11,
  },
  prefSaveBtn: {
    backgroundColor: C.green,
  },
  prefSaveBtnText: {
    ...Typography.body.bold,
    color: '#FFFFFF',
    fontSize: 11,
  },
  prefDisclaimer: {
    ...Typography.body.regular,
    fontSize: 10,
    color: C.muted,
    lineHeight: 14,
    marginTop: 12,
    textAlign: 'center',
  },

  /* Device Card */
  deviceCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    marginBottom: 24,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deviceIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: C.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceIconSymbol: {
    ...Typography.heading.bold,
    fontSize: 20,
    color: C.green,
  },
  deviceMeta: {
    flex: 1,
  },
  deviceName: {
    ...Typography.heading.bold,
    fontSize: 14,
    color: C.text,
    marginBottom: 2,
  },
  deviceIdLabel: {
    ...Typography.body.regular,
    fontSize: 11,
    color: C.muted,
  },
  deviceIdHighlight: {
    ...Typography.body.semiBold,
    color: C.text,
  },
  deviceStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 5,
  },
  deviceStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.orange,
  },
  deviceStatusText: {
    ...Typography.body.bold,
    fontSize: 9,
    color: '#8A5300',
  },
  deviceDivider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 14,
  },
  deviceSpecsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  specItem: {
    alignItems: 'flex-start',
  },
  specLabel: {
    ...Typography.body.regular,
    fontSize: 9,
    color: C.muted,
    marginBottom: 2,
  },
  specValue: {
    ...Typography.body.semiBold,
    fontSize: 12,
    color: C.text,
  },
  deviceNote: {
    ...Typography.body.regular,
    fontSize: 10,
    color: C.muted,
    lineHeight: 14,
  },

  /* Footer */
  footerNote: {
    ...Typography.body.regular,
    textAlign: 'center',
    color: C.muted,
    fontSize: 10,
    marginBottom: 8,
  },
});
