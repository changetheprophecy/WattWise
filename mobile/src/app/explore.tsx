
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { mockReadings } from '@/services/mockData';

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

const liveSamples = [35, 48, 42, 62, 50, 75, 58, 68, 45, 82, 65, 72, 55, 90, 70, 60, 78, 52];

export default function LiveScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Live Monitoring</Text>
            <Text style={styles.subtitle}>Your electrical activity</Text>
          </View>

          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        {/* Device status */}
        <View style={styles.deviceCard}>
          <View style={styles.deviceIcon}>
            <Text style={styles.deviceIconText}>⚡</Text>
          </View>

          <View style={styles.deviceInfo}>
            <Text style={styles.deviceName}>WattWise Sensor</Text>
            <Text style={styles.deviceId}>{mockReadings.deviceId}</Text>
          </View>

          <View style={styles.connectedBadge}>
            <Text style={styles.connectedText}>Connected</Text>
          </View>
        </View>

        {/* Main power */}
        <View style={styles.mainCard}>
          <Text style={styles.mainLabel}>INSTANTANEOUS POWER</Text>

          <View style={styles.mainValueRow}>
            <Text style={styles.mainValue}>
              {mockReadings.power.toFixed(1)}
            </Text>
            <Text style={styles.mainUnit}>W</Text>
          </View>

          <Text style={styles.mainDescription}>
            Current electrical power consumption
          </Text>

          <View style={styles.mainDivider} />

          <View style={styles.energyRow}>
            <View>
              <Text style={styles.energyLabel}>Today's energy</Text>
              <Text style={styles.energyValue}>
                {mockReadings.energy.toFixed(2)} kWh
              </Text>
            </View>

            <View style={styles.energyRight}>
              <Text style={styles.energyLabel}>Frequency</Text>
              <Text style={styles.energyValue}>
                {mockReadings.frequency.toFixed(1)} Hz
              </Text>
            </View>
          </View>
        </View>

        {/* Electrical parameters */}
        <Text style={styles.sectionTitle}>Electrical parameters</Text>
        <Text style={styles.sectionSubtitle}>
          Detailed measurements from your sensor
        </Text>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricSymbol}>V</Text>
            <Text style={styles.metricLabel}>Voltage</Text>
            <Text style={styles.metricValue}>
              {mockReadings.voltage}
              <Text style={styles.metricUnit}> V</Text>
            </Text>
            <Text style={styles.metricHint}>Supply voltage</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricSymbol}>A</Text>
            <Text style={styles.metricLabel}>Current</Text>
            <Text style={styles.metricValue}>
              {mockReadings.current.toFixed(2)}
              <Text style={styles.metricUnit}> A</Text>
            </Text>
            <Text style={styles.metricHint}>Load current</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricSymbol}>W</Text>
            <Text style={styles.metricLabel}>Active power</Text>
            <Text style={styles.metricValue}>
              {mockReadings.power.toFixed(1)}
              <Text style={styles.metricUnit}> W</Text>
            </Text>
            <Text style={styles.metricHint}>Real power</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricSymbol}>PF</Text>
            <Text style={styles.metricLabel}>Power factor</Text>
            <Text style={styles.metricValue}>
              {mockReadings.powerFactor.toFixed(2)}
            </Text>
            <Text style={styles.metricHint}>Power efficiency indicator</Text>
          </View>
        </View>

        {/* Power graph */}
        <View style={styles.graphCard}>
          <View style={styles.graphHeader}>
            <View>
              <Text style={styles.sectionTitle}>Power activity</Text>
              <Text style={styles.sectionSubtitle}>Sample power profile</Text>
            </View>
            <Text style={styles.graphUnit}>W</Text>
          </View>

          <View style={styles.graph}>
            {liveSamples.map((height, index) => (
              <View
                key={index}
                style={[
                  styles.graphBar,
                  { height },
                  index === liveSamples.length - 1 && styles.lastBar,
                ]}
              />
            ))}
          </View>

          <View style={styles.graphLabels}>
            <Text style={styles.graphLabel}>Earlier</Text>
            <Text style={styles.graphLabel}>Latest sample</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Measurement information</Text>
          <Text style={styles.infoText}>
            These are demonstration readings generated from local mock data.
            Real-time ESP32 sensor integration will be added in a later phase.
          </Text>
        </View>

        <Text style={styles.footer}>
          WattWise · Monitor smarter
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
    paddingTop: 15,
    paddingBottom: 35,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 23,
  },
  brand: {
    fontSize: 24,
    fontWeight: '800',
    color: C.green,
    letterSpacing: -0.7,
  },
  subtitle: {
    color: C.muted,
    fontSize: 12,
    marginTop: 5,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E7F0E9',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 20,
  },
  liveDot: {
    height: 7,
    width: 7,
    borderRadius: 4,
    backgroundColor: '#48A66B',
  },
  liveText: {
    color: C.green,
    fontSize: 10,
    fontWeight: '800',
  },
  deviceCard: {
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  deviceIcon: {
    height: 42,
    width: 42,
    borderRadius: 13,
    backgroundColor: C.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deviceIconText: {
    fontSize: 22,
  },
  deviceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  deviceName: {
    fontSize: 13,
    fontWeight: '700',
    color: C.text,
  },
  deviceId: {
    fontSize: 10,
    color: C.muted,
    marginTop: 4,
  },
  connectedBadge: {
    backgroundColor: '#E7F5E9',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
  },
  connectedText: {
    fontSize: 9,
    color: '#348052',
    fontWeight: '700',
  },
  mainCard: {
    backgroundColor: C.green,
    borderRadius: 24,
    padding: 22,
    marginBottom: 26,
  },
  mainLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    color: '#B6C9BE',
    fontWeight: '700',
  },
  mainValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 13,
  },
  mainValue: {
    fontSize: 53,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -2,
  },
  mainUnit: {
    fontSize: 19,
    color: '#D0DDD5',
    marginLeft: 7,
  },
  mainDescription: {
    fontSize: 11,
    color: '#B6C9BE',
    marginTop: 2,
  },
  mainDivider: {
    height: 1,
    backgroundColor: '#45665A',
    marginVertical: 20,
  },
  energyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  energyRight: {
    alignItems: 'flex-end',
  },
  energyLabel: {
    color: '#B6C9BE',
    fontSize: 10,
    marginBottom: 7,
  },
  energyValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: C.muted,
    fontSize: 10,
    marginTop: 5,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
    marginBottom: 25,
  },
  metricCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  metricSymbol: {
    color: C.green,
    fontSize: 15,
    fontWeight: '800',
    backgroundColor: C.greenLight,
    overflow: 'hidden',
    borderRadius: 9,
    padding: 8,
    alignSelf: 'flex-start',
    marginBottom: 13,
  },
  metricLabel: {
    color: C.muted,
    fontSize: 11,
  },
  metricValue: {
    color: C.text,
    fontSize: 23,
    fontWeight: '800',
    marginTop: 7,
  },
  metricUnit: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricHint: {
    color: C.muted,
    fontSize: 9,
    marginTop: 7,
  },
  graphCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 20,
  },
  graphHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  graphUnit: {
    color: C.muted,
    fontSize: 11,
  },
  graph: {
    height: 125,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 4,
    marginTop: 20,
  },
  graphBar: {
    flex: 1,
    maxWidth: 12,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    backgroundColor: '#DCE9DC',
  },
  lastBar: {
    backgroundColor: C.green,
  },
  graphLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 11,
  },
  graphLabel: {
    color: C.muted,
    fontSize: 9,
  },
  infoCard: {
    backgroundColor: '#EEF2EA',
    borderRadius: 15,
    padding: 15,
  },
  infoTitle: {
    fontSize: 11,
    color: C.green,
    fontWeight: '800',
    marginBottom: 6,
  },
  infoText: {
    color: '#65746A',
    fontSize: 10,
    lineHeight: 17,
  },
  footer: {
    textAlign: 'center',
    color: C.muted,
    fontSize: 10,
    marginTop: 24,
  },
});
