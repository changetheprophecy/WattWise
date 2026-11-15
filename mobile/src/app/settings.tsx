
import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useFloatingTabBarClearance } from '@/components/floating-tab-bar';
import { Typography } from '@/constants/typography';

const C = {
  background: '#F5F7F2',
  surface: '#FFFFFF',
  green: '#123D32',
  greenLight: '#E7F0E9',
  lime: '#B7E36A',
  text: '#26352F',
  muted: '#87918A',
  border: '#E9EDE7',
};

export default function SettingsScreen() {
  const [tariff, setTariff] = useState('8.63');
  const [alerts, setAlerts] = useState(true);
  const [highUsage, setHighUsage] = useState(true);
  const [connectionAlerts, setConnectionAlerts] = useState(true);

  const saveTariff = () => {
    const value = Number(tariff);

    if (!tariff.trim() || !Number.isFinite(value) || value <= 0) {
      Alert.alert('Invalid tariff', 'Please enter a valid electricity rate.');
      return;
    }

    Alert.alert(
      'Tariff updated',
      `Your sample tariff is now ৳${value.toFixed(2)} per kWh.`
    );
  };

  const SettingRow = ({
    title,
    description,
    value,
    onValueChange,
  }: {
    title: string;
    description: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
  }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingText}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#D9DED8', true: '#9DCB79' }}
        thumbColor={value ? C.green : '#FFFFFF'}
      />
    </View>
  );

  const bottomClearance = useFloatingTabBarClearance();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomClearance }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.heading}>Settings</Text>
          <Text style={styles.subtitle}>
            Manage your WattWise experience
          </Text>
        </View>

        {/* Device status */}
        <Text style={styles.sectionHeading}>CONNECTED DEVICE</Text>

        <View style={styles.deviceCard}>
          <View style={styles.deviceTop}>
            <View style={styles.deviceIcon}>
              <Text style={styles.deviceIconText}>ϟ</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.deviceName}>WattWise Monitor</Text>
              <Text style={styles.deviceId}>wattwise-001</Text>
            </View>

            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online</Text>
            </View>
          </View>

          <View style={styles.deviceDivider} />

          <View style={styles.deviceDetails}>
            <View>
              <Text style={styles.detailLabel}>Controller</Text>
              <Text style={styles.detailValue}>ESP32</Text>
            </View>
            <View>
              <Text style={styles.detailLabel}>Connection</Text>
              <Text style={styles.detailValue}>Wi-Fi</Text>
            </View>
            <View>
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={styles.detailValue}>Connected</Text>
            </View>
          </View>
        </View>

        {/* Electricity tariff */}
        <Text style={styles.sectionHeading}>ELECTRICITY SETTINGS</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Electricity tariff</Text>
          <Text style={styles.cardDescription}>
            Set your electricity rate to estimate energy expenses.
          </Text>

          <View style={styles.inputRow}>
            <View style={styles.currencyBox}>
              <Text style={styles.currencyText}>৳</Text>
            </View>

            <TextInput
              value={tariff}
              onChangeText={setTariff}
              keyboardType="decimal-pad"
              placeholder="Enter rate"
              placeholderTextColor={C.muted}
              style={styles.tariffInput}
            />

            <Text style={styles.perUnit}>/ kWh</Text>
          </View>

          <Pressable style={styles.saveButton} onPress={saveTariff}>
            <Text style={styles.saveButtonText}>Save tariff</Text>
          </Pressable>

          <Text style={styles.helperText}>
            This is a sample flat rate. Actual electricity bills may use
            different tariff slabs and additional charges.
          </Text>
        </View>

        {/* Notifications */}
        <Text style={styles.sectionHeading}>NOTIFICATIONS</Text>

        <View style={styles.card}>
          <SettingRow
            title="Notifications"
            description="Enable or disable app notifications"
            value={alerts}
            onValueChange={setAlerts}
          />

          <View style={styles.rowDivider} />

          <SettingRow
            title="High energy usage"
            description="Get notified when consumption is unusually high"
            value={highUsage}
            onValueChange={setHighUsage}
          />

          <View style={styles.rowDivider} />

          <SettingRow
            title="Device connection"
            description="Get notified about connection changes"
            value={connectionAlerts}
            onValueChange={setConnectionAlerts}
          />
        </View>

        {/* About */}
        <Text style={styles.sectionHeading}>ABOUT</Text>

        <View style={styles.card}>
          <View style={styles.aboutRow}>
            <View>
              <Text style={styles.cardTitle}>WattWise</Text>
              <Text style={styles.cardDescription}>
                Single-Point Appliance Energy Monitoring
              </Text>
            </View>
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>v1.0.0</Text>
            </View>
          </View>

          <View style={styles.rowDivider} />

          <Pressable
            style={styles.aboutLink}
            onPress={() =>
              Alert.alert(
                'About WattWise',
                'WattWise is an IoT-based energy monitoring project using ESP32 and power measurement sensors.'
              )
            }
          >
            <Text style={styles.aboutLinkText}>About this project</Text>
            <Text style={styles.arrow}>›</Text>
          </Pressable>

          <View style={styles.rowDivider} />

          <View style={styles.aboutLink}>
            <Text style={styles.aboutLinkText}>Hardware</Text>
            <Text style={styles.hardwareValue}>ESP32 + PZEM</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Made with care · WattWise
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.background,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 17,
    paddingBottom: 35,
  },
  header: {
    marginBottom: 27,
  },
  heading: {
    ...Typography.heading.extraBold,
    color: C.green,
    fontSize: 26,
    letterSpacing: -0.8,
  },
  subtitle: {
    ...Typography.body.regular,
    color: C.muted,
    fontSize: 12,
    marginTop: 5,
  },
  sectionHeading: {
    ...Typography.heading.bold,
    color: C.muted,
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 12,
    marginTop: 8,
  },
  deviceCard: {
    backgroundColor: C.green,
    borderRadius: 21,
    padding: 19,
    marginBottom: 25,
  },
  deviceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deviceIcon: {
    height: 45,
    width: 45,
    borderRadius: 14,
    backgroundColor: '#285447',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceIconText: {
    color: C.lime,
    fontSize: 25,
    fontWeight: '800',
  },
  deviceName: {
    ...Typography.heading.bold,
    color: '#FFFFFF',
    fontSize: 14,
  },
  deviceId: {
    ...Typography.body.regular,
    color: '#B6C9BE',
    fontSize: 10,
    marginTop: 4,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#285447',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },
  onlineDot: {
    height: 6,
    width: 6,
    borderRadius: 3,
    backgroundColor: C.lime,
  },
  onlineText: {
    ...Typography.body.bold,
    color: C.lime,
    fontSize: 9,
  },
  deviceDivider: {
    height: 1,
    backgroundColor: '#45665A',
    marginVertical: 18,
  },
  deviceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    ...Typography.body.regular,
    color: '#B6C9BE',
    fontSize: 9,
    marginBottom: 5,
  },
  detailValue: {
    ...Typography.body.bold,
    color: '#FFFFFF',
    fontSize: 11,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: C.border,
    padding: 17,
    marginBottom: 24,
  },
  cardTitle: {
    ...Typography.heading.bold,
    color: C.text,
    fontSize: 13,
  },
  cardDescription: {
    ...Typography.body.regular,
    color: C.muted,
    fontSize: 10,
    lineHeight: 16,
    marginTop: 5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.background,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    marginTop: 16,
    paddingHorizontal: 12,
    height: 49,
  },
  currencyBox: {
    marginRight: 8,
  },
  currencyText: {
    ...Typography.body.bold,
    color: C.green,
    fontSize: 18,
  },
  tariffInput: {
    ...Typography.number.bold,
    flex: 1,
    color: C.text,
    fontSize: 15,
    paddingVertical: 0,
  },
  perUnit: {
    ...Typography.body.regular,
    color: C.muted,
    fontSize: 10,
  },
  saveButton: {
    backgroundColor: C.green,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonText: {
    ...Typography.body.bold,
    color: '#FFFFFF',
    fontSize: 11,
  },
  helperText: {
    ...Typography.body.regular,
    color: C.muted,
    fontSize: 9,
    lineHeight: 15,
    marginTop: 11,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    ...Typography.body.bold,
    color: C.text,
    fontSize: 11,
  },
  settingDescription: {
    ...Typography.body.regular,
    color: C.muted,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 4,
  },
  rowDivider: {
    height: 1,
    backgroundColor: C.border,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
  },
  versionBadge: {
    backgroundColor: C.greenLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  versionText: {
    ...Typography.body.bold,
    color: C.green,
    fontSize: 9,
  },
  aboutLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  aboutLinkText: {
    ...Typography.body.semiBold,
    color: C.text,
    fontSize: 11,
  },
  arrow: {
    color: C.muted,
    fontSize: 21,
  },
  hardwareValue: {
    ...Typography.body.regular,
    color: C.muted,
    fontSize: 10,
  },
  footer: {
    ...Typography.body.regular,
    textAlign: 'center',
    color: C.muted,
    fontSize: 10,
    marginTop: 7,
  },
});
