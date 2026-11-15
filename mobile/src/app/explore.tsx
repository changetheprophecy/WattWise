import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';

import { getLatestReading } from '@/services/api';
import { mockReadings } from '@/services/mockData';
import { Reading } from '@/services/types';

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

const INITIAL_SAMPLES = [35, 48, 42, 62, 50, 68, 55, 60, 45, 70, 52];

export default function LiveScreen() {
  const [reading, setReading] = useState<Reading | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState<boolean>(false);
  const [demoMode, setDemoMode] = useState<boolean>(false);
  const [liveBars, setLiveBars] = useState<number[]>(INITIAL_SAMPLES);

  const fetchReading = useCallback(async () => {
    const result = await getLatestReading();
    if (result.error) {
      setError(result.error);
    } else if (result.isEmpty) {
      setReading(null);
      setIsEmpty(true);
      setError(null);
    } else {
      setReading(result.data);
      setError(null);
      setIsEmpty(false);

      // Append actual power height to graph history without simulated randomization
      if (result.data) {
        const normalizedHeight = Math.min(
          Math.max(Math.round((result.data.power / 250) * 90), 18),
          95
        );
        setLiveBars((prev) => {
          const updated = [...prev.slice(-14), normalizedHeight];
          return updated;
        });
      }
    }
  }, []);

  // Configurable periodic polling (every 4s) strictly when the screen is focused
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      (async () => {
        setLoading(true);
        await fetchReading();
        if (isMounted) setLoading(false);
      })();

      const intervalId = setInterval(() => {
        if (!demoMode) {
          fetchReading();
        }
      }, 4000);

      return () => {
        isMounted = false;
        clearInterval(intervalId);
      };
    }, [demoMode, fetchReading])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReading();
    setRefreshing(false);
  }, [fetchReading]);

  const activeReading = demoMode ? mockReadings : reading;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[C.green]}
            tintColor={C.green}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Live Monitoring</Text>
            <Text style={styles.subtitle}>
              {demoMode
                ? "Demonstration mode"
                : "Continuous backend polling"}
            </Text>
          </View>

          <View style={styles.liveBadge}>
            <View
              style={[
                styles.liveDot,
                demoMode ? { backgroundColor: C.orange } : {},
              ]}
            />
            <Text
              style={[
                styles.liveText,
                demoMode ? { color: C.orange } : {},
              ]}
            >
              {demoMode ? "DEMO" : "LIVE · TEST"}
            </Text>
          </View>
        </View>

        {/* Offline / Error notice */}
        {error && !demoMode && (
          <View style={styles.errorBanner}>
            <View style={styles.errorTextCol}>
              <Text style={styles.errorTitle}>Live Stream Unavailable</Text>
              <Text style={styles.errorDescription}>{error}</Text>
            </View>
            <View style={styles.errorActions}>
              <Pressable onPress={fetchReading} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
              <Pressable
                onPress={() => setDemoMode(true)}
                style={styles.demoButton}
              >
                <Text style={styles.demoButtonText}>Demo Mode</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Demo Mode Notice */}
        {demoMode && (
          <View style={styles.demoBanner}>
            <Text style={styles.demoBannerText}>
              Displaying local mock parameters.
            </Text>
            <Pressable
              onPress={() => {
                setDemoMode(false);
                fetchReading();
              }}
              style={styles.exitDemoButton}
            >
              <Text style={styles.exitDemoButtonText}>Exit Demo</Text>
            </Pressable>
          </View>
        )}

        {/* Device status (Distinguishing backend vs physical hardware) */}
        <View style={styles.deviceCard}>
          <View style={styles.deviceIcon}>
            <Text style={styles.deviceIconText}>⚡</Text>
          </View>

          <View style={styles.deviceInfo}>
            <Text style={styles.deviceName}>
              {demoMode ? "Demo Sensor" : "Atlas Test Stream"}
            </Text>
            <Text style={styles.deviceId}>
              {demoMode
                ? mockReadings.deviceId
                : activeReading?.deviceId || "No active device"}
            </Text>
          </View>

          <View
            style={[
              styles.connectedBadge,
              error && !demoMode ? styles.badgeOffline : styles.badgeConnected,
            ]}
          >
            <Text
              style={[
                styles.connectedText,
                error && !demoMode
                  ? styles.textOffline
                  : styles.textConnected,
              ]}
            >
              {demoMode
                ? "Demo Mode"
                : error
                ? "Backend Offline"
                : isEmpty
                ? "Empty DB"
                : "Backend Online"}
            </Text>
          </View>
        </View>

        {/* Main power */}
        <View style={styles.mainCard}>
          <Text style={styles.mainLabel}>INSTANTANEOUS POWER</Text>

          {loading && !activeReading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={C.green} size="large" />
              <Text style={styles.loadingText}>Fetching live parameters...</Text>
            </View>
          ) : (
            <>
              <View style={styles.mainValueRow}>
                <Text style={styles.mainValue}>
                  {(activeReading?.power ?? 0).toFixed(1)}
                </Text>
                <Text style={styles.mainUnit}>W</Text>
              </View>

              <Text style={styles.mainDescription}>
                {demoMode
                  ? "Demonstration power consumption"
                  : "Latest database reading (PZEM sensor pending)"}
              </Text>

              <View style={styles.mainDivider} />

              <View style={styles.energyRow}>
                <View>
                  <Text style={styles.energyLabel}>Accumulated energy</Text>
                  <Text style={styles.energyValue}>
                    {(activeReading?.energy ?? 0).toFixed(2)} kWh
                  </Text>
                </View>

                <View style={styles.energyRight}>
                  <Text style={styles.energyLabel}>Line frequency</Text>
                  <Text style={styles.energyValue}>
                    {(activeReading?.frequency ?? 50.0).toFixed(1)} Hz
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Electrical parameters */}
        <Text style={styles.sectionTitle}>Electrical parameters</Text>
        <Text style={styles.sectionSubtitle}>
          Measurements from MongoDB test database
        </Text>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricSymbol}>V</Text>
            <Text style={styles.metricLabel}>Voltage</Text>
            <Text style={styles.metricValue}>
              {activeReading?.voltage ?? 0}
              <Text style={styles.metricUnit}> V</Text>
            </Text>
            <Text style={styles.metricHint}>Supply voltage</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricSymbol}>A</Text>
            <Text style={styles.metricLabel}>Current</Text>
            <Text style={styles.metricValue}>
              {(activeReading?.current ?? 0).toFixed(2)}
              <Text style={styles.metricUnit}> A</Text>
            </Text>
            <Text style={styles.metricHint}>Load current</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricSymbol}>W</Text>
            <Text style={styles.metricLabel}>Active power</Text>
            <Text style={styles.metricValue}>
              {(activeReading?.power ?? 0).toFixed(1)}
              <Text style={styles.metricUnit}> W</Text>
            </Text>
            <Text style={styles.metricHint}>Real power</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricSymbol}>PF</Text>
            <Text style={styles.metricLabel}>Power factor</Text>
            <Text style={styles.metricValue}>
              {(activeReading?.powerFactor ?? 0).toFixed(2)}
            </Text>
            <Text style={styles.metricHint}>Power efficiency</Text>
          </View>
        </View>

        {/* Power graph */}
        <View style={styles.graphCard}>
          <View style={styles.graphHeader}>
            <View>
              <Text style={styles.sectionTitle}>Power activity</Text>
              <Text style={styles.sectionSubtitle}>
                Sequential reading profile
              </Text>
            </View>
            <Text style={styles.graphUnit}>W</Text>
          </View>

          <View style={styles.graph}>
            {liveBars.map((height, index) => (
              <View
                key={index}
                style={[
                  styles.graphBar,
                  { height },
                  index === liveBars.length - 1 && styles.lastBar,
                ]}
              />
            ))}
          </View>

          <View style={styles.graphLabels}>
            <Text style={styles.graphLabel}>Earlier</Text>
            <Text style={styles.graphLabel}>
              {!demoMode && reading?.timestamp
                ? "Sample: " +
                  new Date(reading.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "Latest sample"}
            </Text>
          </View>
        </View>

        {/* Footer info card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Test Status Notice</Text>
          <Text style={styles.infoText}>
            These measurements represent test documents stored in MongoDB
            Atlas. Physical ESP32 and PZEM sensor hardware integration is
            currently pending.
          </Text>
        </View>

        <Text style={styles.footer}>WattWise · Monitor smarter</Text>
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
  errorBanner: {
    backgroundColor: '#FDECEA',
    borderWidth: 1,
    borderColor: '#F5C6CB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  errorTextCol: {
    marginBottom: 10,
  },
  errorTitle: {
    color: '#721C24',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  errorDescription: {
    color: '#721C24',
    fontSize: 11,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 10,
  },
  retryButton: {
    backgroundColor: C.green,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  demoButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9DED8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  demoButtonText: {
    color: C.text,
    fontSize: 11,
    fontWeight: '600',
  },
  demoBanner: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEEBA',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  demoBannerText: {
    color: '#856404',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  exitDemoButton: {
    backgroundColor: '#856404',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  exitDemoButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
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
    height: 40,
    width: 40,
    borderRadius: 14,
    backgroundColor: C.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deviceIconText: {
    fontSize: 18,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    color: C.text,
    fontSize: 14,
    fontWeight: '700',
  },
  deviceId: {
    color: C.muted,
    fontSize: 11,
    marginTop: 2,
  },
  connectedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeConnected: {
    backgroundColor: C.greenLight,
  },
  badgeOffline: {
    backgroundColor: '#FDECEA',
  },
  connectedText: {
    fontSize: 10,
    fontWeight: '700',
  },
  textConnected: {
    color: C.green,
  },
  textOffline: {
    color: C.red,
  },
  mainCard: {
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 20,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: C.border,
  },
  mainLabel: {
    color: C.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  loadingContainer: {
    paddingVertical: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: C.muted,
    fontSize: 12,
    marginTop: 10,
  },
  mainValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 10,
  },
  mainValue: {
    fontSize: 48,
    fontWeight: '800',
    color: C.green,
    letterSpacing: -1.5,
  },
  mainUnit: {
    fontSize: 18,
    color: C.muted,
    marginLeft: 6,
    fontWeight: '600',
  },
  mainDescription: {
    color: C.muted,
    fontSize: 12,
    marginTop: 4,
  },
  mainDivider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 18,
  },
  energyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  energyLabel: {
    color: C.muted,
    fontSize: 10,
    marginBottom: 4,
  },
  energyValue: {
    color: C.green,
    fontSize: 15,
    fontWeight: '700',
  },
  energyRight: {
    alignItems: 'flex-end',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.green,
  },
  sectionSubtitle: {
    color: C.muted,
    fontSize: 11,
    marginTop: 3,
    marginBottom: 14,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 22,
  },
  metricCard: {
    width: '48%',
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: C.border,
  },
  metricSymbol: {
    fontSize: 16,
    fontWeight: '800',
    color: C.green,
    marginBottom: 6,
  },
  metricLabel: {
    color: C.muted,
    fontSize: 10,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
  },
  metricUnit: {
    fontSize: 12,
    color: C.muted,
    fontWeight: '500',
  },
  metricHint: {
    color: C.muted,
    fontSize: 9,
    marginTop: 4,
  },
  graphCard: {
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: C.border,
  },
  graphHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  graphUnit: {
    color: C.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  graph: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 105,
    gap: 6,
    paddingBottom: 6,
  },
  graphBar: {
    flex: 1,
    backgroundColor: '#CCE0D6',
    borderRadius: 4,
    minHeight: 10,
  },
  lastBar: {
    backgroundColor: C.green,
  },
  graphLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  graphLabel: {
    color: C.muted,
    fontSize: 10,
  },
  infoCard: {
    backgroundColor: '#F0F5F2',
    borderRadius: 18,
    padding: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#DDE8E1',
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: C.green,
    marginBottom: 4,
  },
  infoText: {
    color: '#4B6256',
    fontSize: 11,
    lineHeight: 16,
  },
  footer: {
    textAlign: 'center',
    color: C.muted,
    fontSize: 11,
  },
});
